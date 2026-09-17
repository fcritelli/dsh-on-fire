# dsh-on-fire

Melhorias opinativas e configuráveis para o [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), empacotadas como um **bundle de perfil** — a forma nativa de plugin do DSH.

Um comando instala regras de prompt, cinco skills de fluxo de trabalho e dois servidores MCP. Cada
parte liga e desliga por configuração.

O catálogo completo, com a evidência de cada item e como desligar, está em
[`docs/MELHORIAS.md`](./docs/MELHORIAS.md). As ferramentas que foram avaliadas e **rejeitadas** —
com o motivo — estão em [`docs/AVALIACOES.md`](./docs/AVALIACOES.md).

## O que vem dentro

**Quatro regras de comportamento**, como seções de prompt que valem em toda sessão e todo workspace:

| Regra | O que faz |
|---|---|
| `idioma` | toda saída ao usuário em português do Brasil, sem precisar de pedido |
| `espera` | esperar subagente/job por notificação ou por uma chamada com `wait`, nunca em laço |
| `graphify` | consultar o grafo antes, sincronizar depois, e nunca ler o `graph.json` cru |
| `adhd` | estilo de saída para leitor com ADHD |

**Sete skills:**

| Skill | O que faz |
|---|---|
| `constituicao-do-projeto` | cria, revisa ou aplica `docs/CONSTITUICAO.md` |
| `planos-de-implementacao` | planeja mudança de múltiplos passos antes de tocar no código |
| `qualidade-do-plano` | revisa se o TEXTO do plano basta, antes de executá-lo |
| `execucao-de-planos` | executa um plano aprovado tarefa por tarefa, com ledger e review |
| `qualidade-dos-testes` | audita se a suíte mede capacidade ou só formato |
| `browser-harness` | toda interação web: automação, scraping, teste |
| `i-have-adhd` | a versão invocável da regra `adhd`, carregada por `/i-have-adhd` |

**Dois servidores MCP:** `graphify` (grafo de conhecimento do código) e `lgpd` (apoio à conformidade).

## Instalação

Precisa do `pnpm` no PATH — `dsh plugin` repassa os argumentos para ele no diretório do perfil.

```bash
# 1. instalar o bundle no perfil — direto do GitHub
dsh plugin --profile web add git+https://github.com/fcritelli/dsh-on-fire.git

# 2 e 3. (opcionais) os scripts de instalação vivem no REPOSITÓRIO, não no seu diretório,
# porque o passo 1 só copia o pacote para dentro do perfil.
git clone https://github.com/fcritelli/dsh-on-fire && cd dsh-on-fire
./install/ajustar-caminhos.sh    # adapta os caminhos dos MCP a esta máquina
./install/instalar-graphify.sh   # instala o graphify e o wrapper da chave

# 4. reiniciar o DSH
```

O passo 1 é idempotente e **reconcilia sozinho** a lista `dsh.profile.bundles` do perfil: o `dsh`
detecta que o pacote declara `dsh.bundle.patch` e o acrescenta à pilha de camadas. Não é preciso
editar `package.json` à mão.

Os passos 2 e 3 são opcionais e independentes: sem eles, o bundle funciona, mas os MCP caem nos
`command` portáveis do bundle (`graphify-mcp`, `npx`) e o graphify não terá a chave do Gemini.

O `pnpm` avisa `missing peer @deepseek-ai/cordis` e `missing peer @deepseek-ai/dsh-skill`. O aviso é
esperado e inofensivo: o `dsh-base` já traz esses dois pacotes na árvore do perfil, e é de lá que o
`dsh-on-fire` os resolve em tempo de execução. Verificado instalando do GitHub num perfil limpo e
bootando: as quatro regras e as quatro skills invocáveis carregam.

### Verificar

```bash
# as rows do bundle entraram na configuração composta?
dsh --profile web --dump-config | grep -A3 'dsh-on-fire'

# o plugin registra o que deveria? (roda sem DSH, com um contexto falso — precisa do clone)
node test/verificar.mjs
```

Depois de reiniciar, pergunte em inglês e veja se a resposta vem em português — é o teste mais
rápido de que a seção `idioma` está ativa.

## Configuração

Todas as opções se escrevem na sua camada de patch, mirando a row `on-fire` por id:

```yaml
# ~/.dsh/cordis.patch.yml
- id: on-fire
  config:
    idioma: true
    espera: true
    graphify: true
    adhd: false              # desligou o estilo ADHD
    skills: true
    skillsDesativadas: [browser-harness]
```

**Um patch por id substitui a `config` inteira da row — não faz merge.** Para trocar uma opção,
repita as outras que quiser manter. É o mesmo cuidado que a documentação do DSH pede, e a razão de
o bloco acima ser completo.

## Como o bundle convive com o que você já tem

As skills entram com `BUNDLED_SKILL_RANK` (600), a precedência **mais baixa do DSH**:

```
100  <projeto>/.dsh/skills
200  <projeto>/.agents/skills
300  (custom)
400  <dshHome>/skills
500  ~/.agents/skills
600  bundled (este bundle)
```

Isso é uma propriedade, não um detalhe: **uma cópia local de mesmo nome sempre ganha do bundle**.
Instalar é não-destrutivo. Se você já tem `~/.agents/skills/constituicao-do-projeto/`, a sua versão
continua sendo a usada; para passar a usar a do bundle, remova a cópia local.

As regras de prompt não têm esse mecanismo de precedência — elas se somam. Se as mesmas regras
estiverem no seu `~/.dsh/AGENTS.md`, elas entram duas vezes no prompt e custam o dobro. Ao adotar o
bundle, tire-as de lá.

## As partes que não são bundle, e por quê

Duas coisas ficam em `install/` porque não podem ser empacotadas:

**A chave do Gemini** (`install/instalar-graphify.sh`) — pacote não carrega segredo. A chave fica em
`~/.config/graphify/gemini.key` (modo 600) e o wrapper a lê em tempo de execução, o que também
mantém a chave fora do repositório.

**Os caminhos absolutos dos MCP** (`install/ajustar-caminhos.sh`) — o PATH do host do DSH costuma ser
mínimo e não contém `~/.local/bin` nem os shims do mise. O bundle traz comandos portáveis; este
script detecta os caminhos reais desta máquina e grava um override na sua camada. Ele é idempotente e
prefere caminhos **estáveis** (o symlink do uv e o shim do mise) a caminhos versionados, que quebram
no próximo upgrade do node.

## Estrutura

```
dsh-on-fire/
├── package.json          # declara dsh.bundle.patch → cordis.patch.yml
├── cordis.patch.yml      # insere: row on-fire + mcp-graphify + mcp-lgpd
├── lib/index.js          # o plugin: seções de prompt + provedor de skills
├── assets/
│   ├── regras/*.md       # o texto das 4 regras
│   └── skills/*/SKILL.md # as 5 skills, com frontmatter YAML
├── install/
│   ├── instalar-graphify.sh    # uv tool + chave + wrapper
│   └── ajustar-caminhos.sh     # override dos caminhos dos MCP
├── test/verificar.mjs    # verificação do apply() com contexto falso
└── docs/
    ├── MELHORIAS.md      # catálogo: o que é, por quê, evidência, toggle
    └── AVALIACOES.md     # veredictos das ferramentas avaliadas
```

## Desinstalar

```bash
dsh plugin --profile web remove dsh-on-fire
```

O `dsh` retira o bundle da pilha de camadas ao reconciliar. Regras e skills somem juntos; nada fica
para trás. O que **não** some é o bloco gerenciado em `~/.dsh/cordis.patch.yml` — remova-o à mão, ou
apague tudo entre os marcadores `# >>> dsh-on-fire: caminhos desta máquina` e `# <<< dsh-on-fire: fim`.

## Licença

MIT. As skills `i-have-adhd` e `browser-harness` são adaptações de projetos MIT, com a atribuição
mantida nos próprios arquivos.
