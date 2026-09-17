import { readFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import z from "@deepseek-ai/schemastery";
import { parse as parseYaml } from "yaml";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

/**
 * `dsh-on-fire` — melhorias opinativas para o DeepSeek Harness, como um bundle de perfil.
 *
 * O plugin faz duas coisas, e só elas:
 *
 * 1. **Regras de comportamento viram seções de prompt.** Cada regra habilitada em
 *    `assets/regras/` entra no system prompt numa posição nomeada, em vez de virar linha
 *    de um `AGENTS.md`. Desligar uma regra é mudar a config da row — não é cirurgia de `sed`.
 * 2. **As skills viram um provedor do registro de skills.** Mesmo mecanismo do
 *    `dsh-skill-badge`: as skills são lidas de `assets/skills/` em tempo de descoberta e
 *    entram com `BUNDLED_SKILL_RANK` (600), a precedência **mais baixa** que existe.
 *
 * O rank é a propriedade que faz este bundle ser seguro de instalar: uma cópia em
 * `~/.agents/skills/<nome>/SKILL.md` (rank 500) ou em `<projeto>/.agents/skills` (200)
 * **ganha** do bundle. Ou seja, o bundle é padrão e nunca sobrescreve o que a pessoa já tem.
 *
 * @module dsh-on-fire
 */

/** Nome do plugin cordis. */
const name = "on-fire";

/** Serviços exigidos: o registro de prompt e o registro de skills, ambos no plano do host. */
const inject = ["systemPrompt", "skills"];

/** Nome do provedor de skills, para diagnóstico no catálogo. */
const PROVIDER = "on-fire";

const REGRAS_BASE = new URL("../assets/regras/", import.meta.url);
const SKILLS_BASE = new URL("../assets/skills/", import.meta.url);

/**
 * As regras comportamentais, na ordem em que entram no prompt.
 *
 * `chave` é o nome da opção booleana na config da row; `arquivo` é o markdown em
 * `assets/regras/`. A ordem daqui é a ordem no prompt.
 */
const REGRAS = [
	{ chave: "idioma", arquivo: "idioma.md" },
	{ chave: "espera", arquivo: "espera.md" },
	{ chave: "graphify", arquivo: "graphify.md" },
	{ chave: "adhd", arquivo: "adhd.md" }
];

/** Esquema de configuração da row `on-fire`. Todo toggle é independente. */
const Config = z.object({
	/** Toda saída ao usuário em português do Brasil, sem exceção. */
	idioma: z.boolean().default(true),
	/** Esperar subagente/job por notificação ou por uma chamada com `wait`, nunca em laço. */
	espera: z.boolean().default(true),
	/** Consultar o grafo de código antes e sincronizá-lo depois; nunca ler `graph.json`. */
	graphify: z.boolean().default(true),
	/** Estilo de saída para leitor com ADHD. */
	adhd: z.boolean().default(true),
	/** Ligar/desligar o provedor de skills inteiro. */
	skills: z.boolean().default(true),
	/** Skills do bundle a omitir do catálogo, por nome de diretório em `assets/skills/`. */
	skillsDesativadas: z.array(z.string()).default([])
});

/**
 * Aplica o bundle: registra as seções de prompt habilitadas e o provedor de skills.
 *
 * @param ctx contexto cordis com os serviços `systemPrompt` e `skills`
 * @param config os toggles validados por {@link Config}
 */
function apply(ctx, config) {
	const ordemBase = ctx.systemPrompt.getSectionOrder("PLAN_POLICY");

	REGRAS.forEach((regra, indice) => {
		if (config[regra.chave] !== true) return;
		const texto = lerRegra(ctx, regra.arquivo);
		if (texto === undefined) return;
		ctx.effect(
			() =>
				ctx.systemPrompt.section({
					name: `${PROVIDER}:${regra.chave}`,
					order: ordemBase + indice,
					text: texto
				}),
			`${PROVIDER}.regra(${regra.chave})`
		);
	});

	if (config.skills === true) {
		ctx.skills.registerProvider(() => criarProvedor(config.skillsDesativadas ?? []));
	}
}

/**
 * Lê o markdown de uma regra. Uma regra ausente ou vazia é omitida em vez de derrubar o boot —
 * o bundle é um padrão, não uma dependência dura.
 */
function lerRegra(ctx, arquivo) {
	try {
		const texto = readFileSync(new URL(arquivo, REGRAS_BASE), "utf8").trim();
		return texto.length > 0 ? texto : undefined;
	} catch (erro) {
		ctx.logger?.warn?.(`${PROVIDER}: regra '${arquivo}' ilegível: ${erro.message}`);
		return undefined;
	}
}

/**
 * Monta o provedor de skills que lê `assets/skills/<dir>/SKILL.md`.
 *
 * `list` devolve os candidatos (só o frontmatter, sem o corpo) e `get` carrega o corpo do
 * candidato vencedor. O corpo vai sem o frontmatter, como no `dsh-skill-badge`.
 *
 * **Sem cache, de propósito.** A primeira versão guardava o resultado da descoberta, com o
 * argumento de que o conjunto de skills de um pacote versionado não muda em tempo de execução.
 * Isso é verdade em produção e falso no fluxo de trabalho real: numa sessão em que se acabou de
 * acrescentar uma skill ao pacote, o provedor continuava servindo o catálogo antigo e a skill
 * nova ficava invisível. Descobrir a cada `list()` custa algumas leituras de arquivo pequenos —
 * e devolve sempre o que está no disco. O provedor de filesystem do DSH resolve o mesmo problema
 * observando os arquivos e chamando `control.invalidate()`; aqui, sem watcher, não guardar nada
 * é a correção mais simples que não mente.
 */
function criarProvedor(desativadas) {
	const excluidas = new Set(desativadas);

	async function descobrir() {
		const candidatos = [];
		let entradas;
		try {
			entradas = await readdir(SKILLS_BASE, { withFileTypes: true });
		} catch {
			return candidatos;
		}
		for (const entrada of entradas) {
			if (!entrada.isDirectory() || excluidas.has(entrada.name)) continue;
			const arquivo = new URL(`${entrada.name}/SKILL.md`, SKILLS_BASE);
			const pasta = fileURLToPath(new URL(`${entrada.name}/`, SKILLS_BASE));
			let bruto;
			try {
				bruto = await readFile(arquivo, "utf8");
			} catch {
				continue; // diretório sem SKILL.md não é uma skill
			}
			const { dados } = separarFrontmatter(bruto);
			candidatos.push({
				name: textoOu(dados.name, entrada.name),
				description: textoOu(dados.description, ""),
				invocation: {
					modelInvocable: dados["disable-model-invocation"] !== true,
					userInvocable: dados["user-invocable"] !== false
				},
				provider: PROVIDER,
				source: "bundled",
				resourceBase: { kind: "directory", path: pasta },
				rank: BUNDLED_SKILL_RANK,
				locator: { arquivo: fileURLToPath(arquivo) }
			});
		}
		candidatos.sort((a, b) => a.name.localeCompare(b.name));
		return candidatos;
	}

	return {
		name: PROVIDER,
		list: () => descobrir(),
		async get(candidato) {
			const bruto = await readFile(candidato.locator?.arquivo ?? "", "utf8");
			return {
				name: candidato.name,
				description: candidato.description,
				invocation: candidato.invocation,
				provider: PROVIDER,
				source: "bundled",
				resourceBase: candidato.resourceBase,
				content: separarFrontmatter(bruto).corpo
			};
		}
	};
}

/**
 * Separa o frontmatter YAML do corpo markdown.
 *
 * Um arquivo sem frontmatter devolve corpo integral e metadados vazios, e não é erro: é o
 * formato que o `dsh-skill-badge` usa no próprio asset.
 */
function separarFrontmatter(texto) {
	const casamento = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(texto);
	if (casamento === null) return { dados: {}, corpo: texto };
	let dados;
	try {
		dados = parseYaml(casamento[1]);
	} catch {
		dados = {};
	}
	return {
		dados: dados !== null && typeof dados === "object" ? dados : {},
		corpo: texto.slice(casamento[0].length)
	};
}

/** Devolve `valor` se for string não vazia; senão o padrão. */
function textoOu(valor, padrao) {
	return typeof valor === "string" && valor.length > 0 ? valor : padrao;
}

export { Config, apply, inject, name };
