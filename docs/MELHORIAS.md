# Melhorias do `dsh-on-fire`

Catálogo do que este bundle instala, por que existe e como desligar cada parte.

Cada item traz a **evidência** que o justifica. Onde a evidência é uma medição, ela está dita com
o número e o que foi medido — porque a alternativa seria uma regra de gosto, e regra de gosto não
sobrevive a revisão.

## Índice

| # | Melhoria | Onde vive | Como desligar |
|---|---|---|---|
| 1 | Idioma sempre pt-BR | seção de prompt | `idioma: false` |
| 2 | Esperar subagente/job por notificação | seção de prompt | `espera: false` |
| 3 | Grafo antes, grafo depois | seção de prompt | `graphify: false` |
| 4 | Estilo de saída ADHD | seção de prompt | `adhd: false` |
| 5 | Skill `constituicao-do-projeto` | skill (rank 600) | `skillsDesativadas: [constituicao-do-projeto]` |
| 6 | Skill `planos-de-implementacao` | skill (rank 600) | `skillsDesativadas: [planos-de-implementacao]` |
| 7 | Skill `qualidade-do-plano` | skill (rank 600) | `skillsDesativadas: [qualidade-do-plano]` |
| 8 | Skill `execucao-de-planos` | skill (rank 600) | `skillsDesativadas: [execucao-de-planos]` |
| 9 | Skill `browser-harness` | skill (rank 600) | `skillsDesativadas: [browser-harness]` |
| 10 | Skill `i-have-adhd` | skill (rank 600) | `skillsDesativadas: [i-have-adhd]` |
| 11 | Servidor MCP `graphify` | row `mcp-graphify` | remover a row, ou `disabled: true` |
| 12 | Servidor MCP `lgpd` | row `mcp-lgpd` | remover a row, ou `disabled: true` |
| 13 | Wrapper do graphify + chave | `install/` (local à máquina) | não rodar o script |

Todas as opções 1–10 se escrevem na config da row `on-fire`, na sua camada de patch:

```yaml
# ~/.dsh/cordis.patch.yml
- id: on-fire
  config:
    adhd: false
```

Atenção: um patch por id **substitui a config inteira** da row, não faz merge. Para mudar uma
opção, repita as outras que quiser manter.

---

## As três camadas

Vale entender onde cada coisa mora, porque a diferença decide o que é portátil e o que é local.

**Regras** são seções de prompt, registradas em `PLAN_POLICY` (ordem 500) — depois da persona e
antes da documentação das ferramentas. Elas valem em toda sessão de todo workspace. Ficam em
`assets/regras/*.md` e o texto vai para o prompt sem passar por arquivo de projeto.

**Skills** entram pelo registro de skills com `BUNDLED_SKILL_RANK` (600), a precedência **mais
baixa que existe**. O rank é o que torna este bundle seguro de instalar: uma cópia em
`~/.agents/skills/<nome>/SKILL.md` (rank 500) ou em `<projeto>/.agents/skills` (rank 200)
**ganha** do bundle. O bundle é padrão, nunca sobrescreve o que você já tem.

**MCP e chave** vão para `cordis.patch.yml` e para `install/`. Só a chave não é bundle, porque
pacote não carrega segredo.

---

## 1. Idioma sempre pt-BR

Toda saída ao usuário em português do Brasil, sem exceção e sem precisar de pedido: respostas,
relatórios, mensagens de commit, comentários de código, nomes de documento, prompts de subagente.
Termos técnicos consagrados ficam como são no código; a prosa ao redor é pt-BR.

**Evidência.** Não é medição, é uma decisão sua, e por isso está aqui como decisão declarada e não
como achado. O que a torna uma *regra de prompt* e não um pedido repetido é o custo: dita uma vez,
vale em toda sessão.

**Toggle:** `idioma: false`.

## 2. Esperar subagente ou job por notificação

Nada é espera fixa. Existem dois mecanismos e nenhum deles é laço de verificação: um subagente em
background **avisa** quando assenta; um job em background se coleta com **uma** chamada
(`job_output(job_id, wait: true, timeout_ms: …)`) que volta no término.

**Evidência — `timeout_ms` é teto, não duração.** Medido em 2026-09-15: um job de 45 s com teto de
180 s voltou em ~45 s. O teto só protege contra job travado; nunca faz você esperar até o fim. É
por isso que a regra manda usar teto generoso sem medo.

**Evidência — por que polling é caro.** O custo não é o tempo, é o contexto: cada verificação é uma
chamada e um resultado que fica no histórico. Numa sessão de 330 turnos medida, os subagentes
custaram 389.753 tokens em 1.161 eventos de inbox, e as ferramentas 5.496 resultados ≈ 1,5 milhão
de tokens. Verificação repetida entra exatamente nessa conta.

**Toggle:** `espera: false`.

## 3. Grafo antes, grafo depois

Disponível quando existe `graphify-out/graph.json` ou `graphify` no PATH. A ordem de consulta vai
da via mais barata para a mais cara, e o orçamento é sempre explícito.

**Evidência — por que o teto de leitura existe.** Medido nos três repositórios:

| Arquivo | `kikin` | `kikin-admin` | `kikin-cliente` |
|---|---|---|---|
| `graph.json` | ~1,5M tokens | ~437k | ~194k |
| `GRAPH_REPORT.md` | ~19k | ~6,5k | — |

Ler o `graph.json` custa mais do que a sessão inteira. Nenhuma pergunta justifica.

**Evidência — o grafo orienta, o fonte decide.** Ele não modela tudo: middleware passado como
argumento (`router.get(p, guard(...), h)`) **não** vira aresta de chamada. Em 2026-09-14 o grafo
mostrou 1 arquivo chamando um guard que o código usa em 8. Foi esse erro que reescreveu o princípio
VI da constituição do `kikin-admin` — a regra "toda rota tem guard" descrevia mal a realidade.

**Evidência — `token_budget` não é teto rígido.** Ele limita truncando *nós*; o graphify nunca
descarta arestas depois que todos os nós cabem. Pedir 400 pode devolver ~550 tokens com o aviso
*"complete answer over budget"*. Saída pequena de verdade vem de `get_node` num símbolo específico,
não de um orçamento menor.

**Toggle:** `graphify: false`.

## 4. Estilo de saída ADHD

Começa pela resposta ou pela próxima ação; sem preâmbulo, sem recapitulação, sem despedida; trabalho
de vários passos vira lista numerada; o estado é reafirmado a cada turno; erro é causa e correção em
tom factual; estimativa é concreta ("uns 15 minutos se os testes cobrem isso; uma tarde se não").

**Evidência.** O bloco foi podado de 1.541 para ~798 tokens (−49%) sem perder regra acionável. O
que saiu foi justificativa e exemplo; o que ficou é verificável antes de enviar.

**Toggle:** `adhd: false`. Nesta sessão, `stop adhd mode`.

## 5–10. As seis skills

Todas com rank 600, todas sobreponíveis por uma cópia local de mesmo nome.

**`constituicao-do-projeto`** — cria, revisa ou aplica `docs/CONSTITUICAO.md`: os princípios
invioláveis que todo plano precisa respeitar. Traz um template em `templates/base.md`. Existe porque
uma constituição por repositório pega contradição estrutural que a revisão de código não pega — foi
assim que o princípio VI do `kikin-admin` foi corrigido (ver item 3).

**`planos-de-implementacao`** — planeja feature ou mudança de múltiplos passos antes de tocar no
código. **`execucao-de-planos`** — executa um plano aprovado tarefa por tarefa, com subagentes,
ledger de progresso versionado e review independente a cada tarefa. Os dois juntos são a adaptação
do laço de Spec-Driven Development do `spec-kit`; ver `AVALIACOES.md` para o que sobrou da avaliação.

**`qualidade-do-plano`** — revisa o **texto** do plano, não a implementação: se ele está completo,
quantificado, consistente consigo mesmo e cobre os casos de borda. É o "teste unitário do português"
do `spec-kit`, com a regra de posse que faria diferença para nós: **quem gera a checklist não marca
os itens** — o agente escreve `- [ ]`, o revisor marca `- [x]`. Sem isso os critérios de aceitação do
`planos-de-implementacao` são escritos e marcados pelo mesmo agente, que assim corrige a própria
prova. Fica em `docs/superpowers/revisoes/`, e serve para revisar um plano antigo, não só um recém
escrito.

Uma skill só dispara se o modelo julgar que a descrição dela casa com a situação, e esse é o elo
fraco — nada no sistema obriga o passo. Por isso o `planos-de-implementacao` aponta para ela no
self-review antes de entregar, e o `execucao-de-planos` nos pré-requisitos: o ponteiro vem de uma
skill que já está carregada naquele exato momento, o que é mais confiável que esperar que a entrada
do catálogo seja notada no meio de uma dúzia.

**`browser-harness`** — toda interação web: automação, scraping, teste, trabalho em site ou app.
São 228 linhas mais nove arquivos em `references/`, porque a versão longa é carregada sob demanda e
só a descrição entra sempre no contexto. Dez dos dezoito documentos de interação do projeto original
são esboços vazios; a skill traz só o que funciona, verificado.

**`i-have-adhd`** — a versão invocável do item 4, adaptada de
[ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd) (MIT). Tem
`disable-model-invocation: true`, ou seja: o modelo não a carrega sozinho, só você pelo `/i-have-adhd`.
É por isso que ela **não** aparece quando se pergunta ao agente quais skills ele tem — comportamento
correto, verificado no host real.

## 11. Servidor MCP `graphify`

Registra o servidor MCP do grafo de conhecimento local. Os tools aparecem como `mcp__graphify__*` e
funcionam em modo multi-projeto: cada chamada recebe `project_path` com o caminho absoluto da raiz do
workspace. Sem `project_path` a chamada **falha de propósito**, em vez de servir o grafo errado.

O bundle traz `command: graphify-mcp`, portável. O `install/ajustar-caminhos.sh` grava o caminho
absoluto desta máquina na sua camada, porque o PATH do host do DSH costuma ser mínimo.

**Ferramenta quebrada — diagnóstico:**

| Sintoma | Causa | Correção |
|---|---|---|
| `No module named 'mcp'` / tools ausentes | falta o extra `mcp` | `install/instalar-graphify.sh` (instala `[mcp,gemini]`) |
| `No LLM provider configured` | falta o extra `gemini`, ou o wrapper foi sobrescrito | `install/instalar-graphify.sh` |
| Rótulos viraram "Community N" | `label` rodou sem chave | conferir `~/.config/graphify/gemini.key` |

**Instalar com um extra APAGA os outros** — o conjunto correto é `[mcp,gemini]`. Qualquer
`uv tool install|upgrade` também sobrescreve o wrapper de `~/.local/bin/graphify`.

**Toggle:** remova a row `mcp-graphify` da sua camada, ou marque `disabled: true`.

## 12. Servidor MCP `lgpd`

Apoio à conformidade com a LGPD (Lei 13.709/2018). Tools em `mcp__lgpd__*`:
`validar_base_legal`, `verificar_consentimento`, `gerar_modelo_consentimento`,
`avaliar_necessidade_pia`, `checklist_compliance`, `gerar_politica_privacidade`,
`consultar_direitos_titular`, `mapear_dados_sensiveis`, `avaliar_risco_tratamento` — mais os
resources `lgpd://fundamentos|artigos|base-legal|glossario|anpd`.

**Auxiliar: NÃO substitui assessoria jurídica.** Está dito no próprio patch, e vale repetir aqui.

**Toggle:** remova a row `mcp-lgpd` da sua camada, ou marque `disabled: true`.

## 13. Wrapper do graphify e a chave

`~/.local/bin/graphify` é um wrapper que lê a chave do Gemini em
`~/.config/graphify/gemini.key` (modo 600) e a exporta antes de chamar o binário real. Existe porque
o CLI do graphify precisa da chave em ambiente e o `uv` não tem onde guardá-la.

**Evidência — por que isto não é bundle.** Duas razões, e as duas são de projeto, não de gosto. Um
pacote não carrega segredo. E o wrapper é frágil por natureza: qualquer `uv tool install|upgrade`
recria o symlink por cima dele. Por isso o script é idempotente e existe para ser rodado de novo —
é a correção documentada do sintoma, não uma instalação de uma vez só.

**Toggle:** não rode o script. Sem o wrapper, o MCP continua funcionando (ele só lê o grafo e não
usa LLM); o que para é `graphify label` e as consultas do CLI.

---

## O que não está aqui

Avaliações que terminaram em **não adotar** ficam em [`AVALIACOES.md`](./AVALIACOES.md). Elas valem
tanto quanto as positivas: evitam que a próxima pessoa refaça o trabalho — e três delas foram
rejeitadas por motivo que não aparece na primeira página do projeto (licença, evento de hook
faltando, benchmark sintetizado).
