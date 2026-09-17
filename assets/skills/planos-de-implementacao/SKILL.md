---
name: planos-de-implementacao
description: "Use ao planejar uma feature ou mudança de múltiplos passos antes de tocar no código, ao transformar um spec em plano executável, ou quando o usuário pedir um plano de implementação."
---

# Planos de implementação

Um plano é um **artefato que outra sessão (ou um subagente sem contexto) consegue
executar sem adivinhar**. Ele não é um resumo do que você vai fazer — é a
especificação do que deve existir no fim.

## Onde o plano vive

`docs/superpowers/plans/<AAAA-MM-DD>-<nome-da-feature>.md`

Um plano por feature. Se já existir plano do mesmo dia e assunto, **atualize-o** em vez
de criar um segundo.

## Tamanho

Planos são **enxutos**: tipicamente 60–150 linhas e 1–6 tarefas. Um plano de 3.000
linhas quase sempre significa que ele devia ser vários planos, ou que está duplicando
código que o implementador consegue escrever sozinho.

Uma tarefa é a **menor unidade que tem o próprio ciclo de teste** e que vale o gate de um
revisor. Dobre setup, configuração e documentação na tarefa cujo entregável precisa
deles; separe só onde um revisor poderia rejeitar uma tarefa e aprovar a vizinha.

## Antes de escrever: leia a constituição

Se existir `docs/CONSTITUICAO.md`, leia **antes de planejar**. Todo princípio aplicável
vira uma linha da seção *Conformidade*. Conflito entre plano e constituição se resolve
**contra o plano** — ou a constituição é emendada, com justificativa registrada.

Se não existir, e o projeto tiver regras estruturais que se repetem (paridade entre
bancos, gate de tipos, imutabilidade, conformidade), use a skill
`constituicao-do-projeto` para criá-la antes de seguir.

## Cabeçalho obrigatório

```markdown
# <Feature> — Implementation Plan

**Goal:** uma frase sobre o que isto constrói.

**Architecture:** 2–3 frases sobre a abordagem e onde ela toca o sistema.

**Tech Stack:** tecnologias relevantes.

**Spec:** caminho do spec/design que este plano implementa (quando existir — o plano
argumenta a partir do spec, então os dois viajam juntos).

## Global Constraints

Requisitos que valem para TODAS as tarefas, uma linha cada, com valores exatos copiados
do spec: versões mínimas, limites de dependência, regras de nomenclatura e copy,
requisitos de plataforma.

## Conformidade

Um item por princípio **aplicável** de `docs/CONSTITUICAO.md`, citado pelo nome, e como
este plano o respeita. Princípio não aplicável a esta feature não entra na lista.

## Contrato

A superfície pública exata que este plano fixa **antes** de implementar: assinaturas e
tipos, formato de entrada e de saída, códigos de erro e de saída, formato das mensagens.
Quem implementar não escolhe isso — está decidido aqui. Sem contrato, duas tarefas
executadas por agentes diferentes divergem no nome e no formato.

## Critérios de aceitação

Checklist verificável, um item por critério. Cada item é checável por comando, teste ou
inspeção concreta — nada de "funciona bem" nem "trata os casos".

- [ ] <critério> — provado por: `<comando>` ou inspeção de `<arquivo>`
- [ ] ...
```

## Cada tarefa

```markdown
### Task N: <componente>

**Files:**
- Create: `caminho/exato/arquivo.ts`
- Modify: `caminho/exato/existente.ts:123-145`
- Test: `caminho/exato/teste.test.ts`
- Report: `docs/superpowers/ledgers/<plano>/reports/task-N.md`

> O campo **Report** existe para a execução não devolver prosa ao contexto do coordenador: o
> subagente escreve o relatório nesse arquivo e devolve só o caminho. Medimos ~390 mil tokens
> de retorno em prosa numa sessão de 93 subagentes, quase tudo perdido em compactação.

- [ ] **Step 1: escrever o teste que falha**
- [ ] **Step 2: rodar e confirmar que falha (com o comando e o erro esperado)**
- [ ] **Step 3: implementação mínima**
- [ ] **Step 4: rodar e confirmar que passa**
- [ ] **Step 5: commit**
```

**Interfaces — Consumes / Produces.** Inclua este bloco **apenas quando** as tarefas
forem executadas por agentes diferentes que enxergam só o próprio brief (execução
subagent-driven, `workflow`, worktrees paralelos). É como um implementador isolado
descobre os nomes e tipos exatos que a tarefa vizinha usa:

```markdown
**Interfaces:**
- Consumes: <assinaturas exatas que esta tarefa usa de tarefas anteriores>
- Produces: <nomes, parâmetros e tipos que tarefas posteriores dependem>
```

Em plano pequeno de sessão única, ele é cerimônia — omita.

## Sem placeholders

Estes são **defeitos de plano**, nunca os escreva:

- "TBD", "TODO", "implementar depois", "preencher detalhes"
- "adicionar tratamento de erro adequado", "adicionar validação", "tratar casos de borda"
- "escrever testes para o acima" (sem o código do teste)
- "similar à Task N" (repita o código — quem executa pode ler as tarefas fora de ordem)
- Passos que dizem **o que** fazer sem mostrar **como**, em passo que envolve código

## Self-review antes de entregar

Rode você mesmo, sem despachar subagente:

1. **Cobertura do spec** — percorra cada requisito e aponte a tarefa que o implementa.
   Requisito sem tarefa é lacuna; adicione a tarefa.
2. **Varredura de placeholders** — procure os padrões acima e corrija.
3. **Consistência de nomes** — um `clearLayers()` na Task 3 e `clearFullLayers()` na
   Task 7 é bug. Iguale.

Esses três passos são você conferindo o seu próprio trabalho, e quem confere o próprio
trabalho não acha o que não sabe que errou. Para a revisão que separa quem escreve de quem
julga, use a skill `qualidade-do-plano`: ela produz uma checklist sobre o **texto** do plano —
completeza, clareza, consistência, cobertura, casos de borda — e a regra é que **quem marca
os itens é o revisor**, nunca você. Diga ao usuário que ela existe e entregue os itens em
aberto; não marque nenhum.

## Reconciliação com o plan mode

Quando o plan mode estiver ativo, há **uma autoridade só**, e não são duas:

1. Em plan mode, **explore primeiro** com leituras que não mutam nada e produza o plano.
2. Apresente o plano pelo `exit_plan_mode` — é assim que ele vira aprovação do usuário.
   Não use `todo_write` para acompanhar o planejamento; ele serve à execução, depois do
   plano aprovado.
3. **Depois da aprovação**, grave o mesmo conteúdo em
   `docs/superpowers/plans/<data>-<nome>.md`.

Ou seja: o `exit_plan_mode` é o **canal de aprovação**; o arquivo é o **registro
persistente**. O conteúdo é o mesmo — nunca mantenha duas versões divergentes.

## Quando NÃO escrever plano

Mudança de um arquivo, correção pontual, ajuste de texto, commit de configuração. Para
esses, a cerimônia custa mais do que entrega. Planeje quando há **múltiplos passos
dependentes** ou quando outra sessão/agente vai executar.

## Handoff

Ao terminar, ofereça a execução e use a skill `execucao-de-planos`, que traz o ledger
versionado e o gate de review por tarefa.
