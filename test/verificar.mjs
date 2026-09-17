/**
 * Verificação do `apply()` do dsh-on-fire, com um contexto cordis falso.
 *
 * Roda sem DSH e sem reiniciar nada: monta um `ctx` mínimo com os dois serviços que o
 * plugin injeta (`systemPrompt` e `skills`), chama `apply` e confere o que foi registrado.
 *
 * Uso: `node test/verificar.mjs`
 */
import assert from "node:assert/strict";
import { apply, Config } from "../lib/index.js";

/** Um `ctx` falso que grava o que o plugin registra, no formato do cordis de verdade. */
function contextoFalso() {
	const secoes = [];
	const provedores = [];
	const efeitos = [];
	return {
		secoes,
		provedores,
		efeitos,
		ctx: {
			logger: { warn: (mensagem) => console.error(`  [warn] ${mensagem}`) },
			systemPrompt: {
				getSectionOrder: (nome) => {
					assert.equal(nome, "PLAN_POLICY", "só a posição PLAN_POLICY é usada");
					return 500;
				},
				section: (secao) => {
					secoes.push(secao);
					return () => {};
				}
			},
			skills: {
				registerProvider: (criar) => {
					provedores.push(criar({ invalidate: () => {} }));
					return () => {};
				}
			},
			effect: (fn, rotulo) => {
				efeitos.push(rotulo);
				return fn();
			}
		}
	};
}

/** A config como o schemastery a entrega depois de aplicar os defaults. */
function configPadrao(sobrescritas = {}) {
	return { ...Config({}), ...sobrescritas };
}

const casos = [];
/** Enfileira um caso. Eles rodam em ordem no fim do arquivo, com `await`. */
function caso(nome, fn) {
	casos.push([nome, fn]);
}

// ── defaults ────────────────────────────────────────────────────────────────
caso("os defaults ligam tudo", () => {
	const c = configPadrao();
	assert.deepEqual(
		{
			idioma: c.idioma,
			espera: c.espera,
			graphify: c.graphify,
			adhd: c.adhd,
			skills: c.skills
		},
		{ idioma: true, espera: true, graphify: true, adhd: true, skills: true }
	);
	assert.deepEqual(c.skillsDesativadas, []);
});

// ── seções de prompt ────────────────────────────────────────────────────────
caso("registra as 4 regras como seções, em ordem, com texto não vazio", () => {
	const { ctx, secoes } = contextoFalso();
	apply(ctx, configPadrao());
	assert.equal(secoes.length, 4);
	assert.deepEqual(
		secoes.map((s) => s.name),
		["on-fire:idioma", "on-fire:espera", "on-fire:graphify", "on-fire:adhd"]
	);
	assert.deepEqual(
		secoes.map((s) => s.order),
		[500, 501, 502, 503]
	);
	for (const secao of secoes) {
		assert.ok(secao.text.trim().length > 100, `${secao.name} tem texto curto demais`);
		assert.ok(secao.text.startsWith("## "), `${secao.name} deve começar com um título markdown`);
	}
});

caso("desligar uma regra remove só aquela seção", () => {
	const { ctx, secoes } = contextoFalso();
	apply(ctx, configPadrao({ adhd: false, graphify: false }));
	assert.deepEqual(
		secoes.map((s) => s.name),
		["on-fire:idioma", "on-fire:espera"]
	);
});

caso("desligar tudo não registra seção nenhuma", () => {
	const { ctx, secoes } = contextoFalso();
	apply(ctx, configPadrao({ idioma: false, espera: false, graphify: false, adhd: false }));
	assert.equal(secoes.length, 0);
});

// ── skills ──────────────────────────────────────────────────────────────────
caso("registra o provedor e lista as 6 skills com rank 600 (bundled)", async () => {
	const { ctx, provedores } = contextoFalso();
	apply(ctx, configPadrao());
	assert.equal(provedores.length, 1);
	const candidatos = await provedores[0].list();
	assert.equal(candidatos.length, 6, `esperava 6 skills, veio ${candidatos.length}`);
	for (const candidato of candidatos) {
		assert.equal(candidato.rank, 600, `${candidato.name} deveria ter rank 600`);
		assert.equal(candidato.provider, "on-fire");
		assert.equal(candidato.source, "bundled");
		assert.ok(candidato.description.length > 20, `${candidato.name} sem descrição útil`);
		assert.equal(candidato.resourceBase.kind, "directory");
		assert.ok(candidato.resourceBase.path.endsWith("/"));
	}
	assert.deepEqual(
		candidatos.map((c) => c.name).sort(),
		[
			"browser-harness",
			"constituicao-do-projeto",
			"execucao-de-planos",
			"i-have-adhd",
			"planos-de-implementacao",
			"qualidade-do-plano"
		]
	);
});

caso("não guarda o catálogo em cache — list() relê o disco", async () => {
	const { ctx, provedores } = contextoFalso();
	apply(ctx, configPadrao());
	const primeira = await provedores[0].list();
	const segunda = await provedores[0].list();
	// A mesma referência entregaria um catálogo velho depois de mexer no pacote — foi assim que
	// uma skill recém-acrescentada ficou invisível numa sessão em andamento.
	assert.notEqual(primeira, segunda, "a mesma referência indica catálogo em cache");
	assert.deepEqual(
		primeira.map((c) => c.name),
		segunda.map((c) => c.name)
	);
});

caso("get() devolve o corpo sem o frontmatter", async () => {
	const { ctx, provedores } = contextoFalso();
	apply(ctx, configPadrao());
	const candidatos = await provedores[0].list();
	const alvo = candidatos.find((c) => c.name === "i-have-adhd");
	const definicao = await provedores[0].get(alvo);
	assert.ok(!definicao.content.startsWith("---"), "o frontmatter não deveria ir no corpo");
	assert.ok(definicao.content.trim().length > 500);
	assert.equal(definicao.name, "i-have-adhd");
});

caso("respeita o frontmatter de invocação do i-have-adhd", async () => {
	const { ctx, provedores } = contextoFalso();
	apply(ctx, configPadrao());
	const candidatos = await provedores[0].list();
	const adhd = candidatos.find((c) => c.name === "i-have-adhd");
	assert.equal(adhd.invocation.modelInvocable, false, "disable-model-invocation: true");
	assert.equal(adhd.invocation.userInvocable, true);
});

caso("skills: false não registra provedor", () => {
	const { ctx, provedores } = contextoFalso();
	apply(ctx, configPadrao({ skills: false }));
	assert.equal(provedores.length, 0);
});

caso("skillsDesativadas remove a skill do catálogo", async () => {
	const { ctx, provedores } = contextoFalso();
	apply(ctx, configPadrao({ skillsDesativadas: ["browser-harness"] }));
	const candidatos = await provedores[0].list();
	assert.equal(candidatos.length, 5);
	assert.ok(!candidatos.some((c) => c.name === "browser-harness"));
});

// ── relatório ───────────────────────────────────────────────────────────────
const resultados = [];
let falhas = 0;
for (const [nome, fn] of casos) {
	try {
		await fn();
		resultados.push(`  ok    ${nome}`);
	} catch (erro) {
		falhas += 1;
		resultados.push(`  FALHA ${nome}\n        ${erro.message.split("\n")[0]}`);
	}
}

console.log("\nverificação do dsh-on-fire\n");
console.log(resultados.join("\n"));
console.log(
	falhas > 0 ? `\n${falhas} de ${casos.length} casos falharam\n` : `\n${casos.length} casos passaram\n`
);
process.exitCode = falhas > 0 ? 1 : 0;
