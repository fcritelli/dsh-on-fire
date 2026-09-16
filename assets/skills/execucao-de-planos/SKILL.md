---
name: execucao-de-planos
description: "Use ao executar um plano de implementação já aprovado (docs/superpowers/plans/) tarefa por tarefa, com subagentes, ledger de progresso versionado e review independente a cada tarefa."
---

# Execução de planos

Executa um plano aprovado com **um subagente por tarefa**, review independente depois de
cada uma, e review amplo no fim. O ledger é o rastro — e, ao contrário de scratch local,
ele é **versionado**.

## Pré-requisitos

1. O plano existe em `docs/superpowers/plans/<data>-<nome>.md`.
2. Workspace isolado — worktree, quando o projeto usar `.worktrees/`. **Nunca** comece
   implementação em `main`/`master` sem consentimento explícito.
3. Leia o plano **uma vez**. Se ele citar um spec, leia o spec também: é a autoridade da
   qual o plano argumenta, e conflito dentro do plano se resolve contra o spec.

## O ledger — versionado

`docs/superpowers/ledgers/<nome-do-plano>.md`

**Não** use `.superpowers/sdd/` nem diretório git-ignored: o ledger é o registro de
decisões e evidências do trabalho, e precisa sobreviver a `git clean -fdx`, a troca de
máquina e à revisão de outra pessoa. O ledger é commitado junto com o código.

**Atualize a cada tarefa, não no fim.** Numa execução longa a compactação é a regra, não a
exceção: medimos **7 compactações em 330 turnos**, cada uma descartando ~98% do contexto
(792k → ~16k tokens). Depois de qualquer compactação, **releia o ledger e o `git log` antes
de agir** — a sua lembrança do que já foi feito não sobreviveu, e o modo de falha mais caro
é re-despachar tarefa concluída.

Estrutura — mantenha a primeira linha exatamente assim, para o ledger se identificar:

```markdown
# Ledger — plano: docs/superpowers/plans/<arquivo>.md

## Pre-flight Conflict Scan
| Par de tarefas | Produces / Consumes | Status |
|---|---|---|
| Task 1 & Task 2 | <arquivo/interface de cada> | Clean / CONFLITO |

Base: commit `<sha>` — working tree <limpo/sujo> no início.

## Decisões (com o usuário, <data>)
- **R1:** <o que foi decidido> — <por quê> — <custo se estiver errado>.
- **R2:** ...

## Progress
- [x] **Task N:** <o que foi feito> — evidência: `<RED> → <GREEN>`, contagens
      exatas, reviewer `<id>` e veredito.
- [ ] **Task N+1:** ...

## Gate da rodada
- critérios de aceitação: <N/N cumpridos, com a evidência de cada um>
- suíte: <N arquivos / N testes>
- typecheck: <erros>
- build: <ok/falha>
- `graphify update .`: <artefatos regravados>
```

**Por que o ledger existe:** memória de conversa não sobrevive à compactação. O modo de
falha mais caro já observado é um controlador perder o lugar e **re-despachar tarefas já
concluídas**. Depois de compactar, confie no ledger e no `git log`, não na sua lembrança.
Uma tarefa com `Task N: complete` no ledger está feita — não redespache.

## Sessão longa e compactação

O contexto não é renovável, e numa execução longa três coisas degradam juntas: o recall do que
está no meio da janela, a fidelidade do resumo que a compactação produz, e a sua própria
lembrança do que já foi feito.

- **Escolha o momento da compactação.** O harness compacta quando o contexto enche — o pior
  instante possível, no meio de uma tarefa. Use `/compact` nos pontos de costura, onde você
  escolhe o que fica.
- **Trate cada compactação como fronteira de sessão:** releia o ledger e o `git log`, confirme
  em que tarefa está, e só então siga.
- **Uma sessão por feature**, com o ledger como handoff. Não é mais caro — o estado já mora
  nele.
- **Se está tudo na mesma sessão há muito tempo, o problema não é o tamanho da sessão** — é o
  estado estar na conversa em vez de em artefato. Externalize antes de continuar.

## Pre-flight conflict scan

Antes de despachar a Task 1, varra o plano e **escreva o que você checou**:

- tarefas que se contradizem ou contradizem os Global Constraints
- qualquer par de tarefas que compartilhe arquivo ou interface — uma linha por par, com
  o que uma produz contra o que a outra consome
- cada tarefa contra si mesma: o teste que ela especifica bate com o código que ela
  especifica? os arquivos que cria batem com os que depois toca?

O resultado é **uma tabela, não um veredito**. "A varredura está limpa" sem as linhas não
é uma varredura que você fez. Resolva cada achado **antes** de executar e registre o
ruling no ledger.

## O loop por tarefa

### 1. Despache o implementador

Use o primitivo nativo do harness:

- **`subagent`** — contexto fresco, um filho isolado por tarefa. Ele **não vê esta conversa**:
  você constrói exatamente o contexto que ele precisa. É o padrão.
- **`subagent_fork`** — herda a conversa. Use **só** quando o filho precisa do fio atual
  (revisar o que acabou de ser feito). Custa caro: ele paga o contexto do pai inteiro como
  entrada. Para implementar do zero, `subagent`.

**Entregue artefatos como arquivo, não colado no prompt.** Tudo que você cola num dispatch
permanece residente no seu contexto até o fim da sessão e é relido a cada turno. Escreva
o brief da tarefa num arquivo e mande o filho **ler**. O dispatch carrega: onde a tarefa
se encaixa, o caminho do brief, interfaces decididas por tarefas anteriores que o brief
não pode saber, e sua resolução de qualquer ambiguidade.

**O retorno também é artefato, não prosa.** O filho escreve o relatório em
`<workspace-do-ledger>/reports/task-N.md` e devolve **o caminho e três linhas de resumo**.
Motivo medido: numa sessão de 93 subagentes, os retornos em prosa somaram **~390 mil tokens**
no contexto do pai — e sete compactações resumiram quase tudo embora. Prosa de retorno custa
contexto do pai **e** é volátil; arquivo sobrevive a toda compactação e o revisor consegue
reler o original em vez do resumo.

Registre o `BASE` (`git rev-parse HEAD`) antes de despachar — o diff de review e o loop de
correção precisam dele.

### 2. Enquanto o filho trabalha

**Não faça polling.** O runtime avisa quando o filho assenta. Enquanto isso, faça trabalho
local: atualizar o ledger, preparar o pacote de review da tarefa anterior, ler relatórios.
Vários filhos independentes podem ser despachados **na mesma mensagem**.

### 3. Review independente

Gere o pacote de review como **arquivo** (`git diff <BASE>..HEAD` mais os testes da
tarefa) e despache um **revisor novo** — não o mesmo filho, não um que herde a conversa
do implementador. O revisor julga duas coisas, separadamente:

1. **Conformidade com o spec** — a tarefa faz o que o plano/spec manda?
2. **Qualidade do código** — o diff tem defeito que o rubric trata como tal?

### 4. Loop de correção

Achados voltam ao implementador. **Corrija, não aceite "quase":**

- Rodadas 1–3: continue o mesmo filho com `send_message`.
- Rodadas 4–5: despache um implementador **novo**, com **modelo mais capaz** — se o
  mesmo agente não resolveu em três rodadas, insistir com ele é desperdício.
- Depois de cada correção, **re-review escopado** ao diff da correção, não à tarefa toda.
- No limite de 5 rodadas, adjudique cada achado aberto: ruling no ledger e siga. Só pare
  se **todo caminho adiante for adivinhação**.

Escolha o modelo pelo papel: tarefa mecânica com spec completa → modelo barato; integração
entre arquivos → intermediário; arquitetura e o review final → o mais capaz. **Especifique
o modelo no dispatch** — omitir herda o modelo da sua sessão, geralmente o mais caro.

## Rulings, não paradas

Um plano em execução não espera por humano. Conflito, ambiguidade, defeito do plano —
**decida**, registre no ledger como `Ruling: <decisão> — <por quê> — <custo se errado>`, e
siga. O spec é a autoridade; o plano é o argumento; seu julgamento resolve o que nenhum
dos dois responde.

**Só quatro coisas param a execução:**

1. operação irreversível ou destrutiva;
2. ação sensível de segurança;
3. efeito colateral **fora do worktree** que a norma manda perguntar antes — merge, push
   para branch compartilhada, publish;
4. plano tão quebrado que todo caminho adiante é adivinhação.

## Paralelismo — quando usar

Tarefas **genuinamente independentes** (arquivos disjuntos, sem interface compartilhada)
podem ir juntas para um `workflow`, que roda em paralelo de verdade e devolve resultado
estruturado. Tarefas que compartilham arquivo ou interface **não** devem: o gate de review
entre tarefas é escolha de qualidade, não limitação a contornar.

Trabalho pequeno da mesma forma repetido em vários arquivos: **um** dispatch com a lista
completa, revisado como um diff só. Não um subagente por arquivo.

## Gate da rodada

Antes de dizer que terminou, rode o que o projeto manda e **registre os números exatos no
ledger**. Não presuma: execute.

1. **Critérios de aceitação do plano, um por um.** Percorra a lista e marque cada item com
   a evidência que o prova. Item sem prova não está cumprido. É esta lista que define
   "pronto" — não a sua impressão de que ficou bom.
2. Suíte de testes do projeto.
3. Typecheck e build, quando existirem.
4. `graphify update .` quando o projeto versiona o grafo.

### A evidência tem que ser o artefato real

**"Os testes passam" não é prova de que funciona.** Suíte verde, typecheck limpo, build OK e
relatório de subagente são **proxies**. A prova de um critério é a observação do
comportamento que motivou a mudança: exercite o caminho real — abra a tela, refaça a
requisição, leia o valor gravado no banco, inspecione o `git diff`.

- **Confie em artefatos, não em autorrelatos.** Ao verificar trabalho delegado, inspecione
  a saída real (diff, conteúdo de arquivo, comportamento em execução), nunca o resumo de
  quem executou. Os três primeiros itens desta lista são o que o **implementador** roda; o
  critério de aceitação é o que **você** observa.
- **Quando a verificação falhar, suspeite do método de observação antes de suspeitar do
  sistema.** Saída velha, cache, screenshot antigo e estado derivado enganam.
- **Quando der, transforme o critério num script determinístico** que refaz a mesma
  comparação — assim o revisor re-executa em vez de confiar na sua palavra. Guarde a saída
  no ledger.

Se o plano não tiver critérios de aceitação, **volte ao plano e escreva-os antes de
continuar** — ou registre no ledger que a rodada foi aceita sem eles, o que é uma decisão
explícita, não um esquecimento.

**Se a rodada tocou o banco de dados, rode a limpeza de dados de teste** — e se o projeto
tiver uma skill própria para isso, ela tem precedência sobre esta aqui.

### Guardar o teto — cinco movimentos que rebaixam a régua

Agente que bate em checagem vermelha pega o caminho mais barato até o verde. Ao revisar o diff
da rodada, procure estes cinco — todos visíveis no `git diff`, sem ferramenta extra:

1. **O limiar se moveu.** Baseline subiu, severidade caiu, checagem saiu do estágio rápido.
   Compare o arquivo de baseline contra o estado no ponto de ramificação.
2. **Um teste ficou mais fácil.** `.skip` adicionado, arquivo de teste apagado, asserção
   removida de teste que continuou existindo.
3. **Um verificador foi silenciado.** `@ts-ignore` ou `eslint-disable` novo. Quatro merecem
   atenção especial: `istanbul ignore` tira código da cobertura em vez de testá-lo,
   `Stryker disable` esconde mutante sobrevivente, `nosemgrep` e `gitleaks:allow` fazem o
   mesmo com achado de segurança.
4. **Trabalho ficou inacabado.** Stub que lança, `catch {}` vazio transformando falha em
   silêncio, `TODO` no lugar da implementação.
5. **Uma exceção apareceu.** Linha nova na tabela de exceções que ninguém discutiu.

Achado desses entra no ledger com o arquivo e a linha. **Apertar o teto pode ser silencioso;
afrouxar tem que ser barulhento.**

Nem toda checagem é igualmente circular. Pergunte: *o agente consegue fazer isto passar
escrevendo código que não funciona?* Ferramenta externa (axe, osv-scanner, Lighthouse) não dá
para argumentar; regra de lint do projeto tem dono humano; suíte própria é a única
genuinamente circular. Um teto só da terceira categoria vale menos que um com opinião de fora
— confira que existe pelo menos uma restrição externa.

### Dúvida em voo — antes da decisão se firmar

O review por tarefa é veredito sobre artefato pronto. Isto é outra coisa: uma decisão
**não-trivial** vira afirmação explícita e é submetida a um revisor de contexto fresco
**enviesado a refutar**, enquanto corrigir ainda é barato.

Não-trivial é quando ao menos um vale: introduz ou muda ramificação; cruza fronteira de
módulo; afirma propriedade que o tipo não verifica (thread safety, idempotência, ordenação,
invariante); a correção depende de contexto que o leitor futuro não vê; o raio de dano é
irreversível. Renomear, formatar, mover arquivo e ler código existente **não** são.

1. **CLAIM** — a decisão em duas ou três linhas, e por que importa. Se não sai compacto, é
   vago, não é decisão.
2. **EXTRACT** — o artefato (diff, função, proposta de 3–5 frases) e o contrato que ele tem que
   satisfazer. **Tire o seu raciocínio.**
3. **DOUBT** — despache um `subagent` (contexto fresco — **não** `subagent_fork`, que herda)
   com prompt adversarial, só de problemas. **Passe ARTEFATO e CONTRATO, nunca o CLAIM:**
   entregar a conclusão enviesa o revisor para concordar.
4. **RECONCILE** — o retorno é dado, não veredito; você segue sendo o orquestrador. Classifique
   nesta ordem: contrato mal lido → válido e acionável → trade-off válido → ruído. Releia o
   artefato antes de aceitar; revisor fresco erra por falta de contexto.
5. **STOP** — ciclo limitado, não recursão. Pare quando só vier achado trivial, ou em 3 ciclos
   (escale ao usuário), ou quando ele mandar. Se "3 é insuficiente" porque o artefato é grande,
   o artefato é que é grande demais: volte ao passo 2 e decomponha.

**Sinal de teatro de dúvida:** em dois ou mais ciclos com achado substantivo, **zero**
classificados como acionável — você está validando, não duvidando. Pare e escale.

## Review final

Todas as tarefas concluídas → **um** review amplo do branch inteiro, num agente novo, com
o modelo mais capaz. Achados → **um** dispatch de correção e **um** re-review escopado.
Residuais vão para o ledger com ruling.

## Skills de projeto têm precedência

Esta skill é genérica. Convenções do repositório — imutabilidade de migration, gates de
LGPD, limpeza de dados de teste, revisão de acesso, deploy — vêm das skills do projeto e
**vencem** o que está escrito aqui. Carregue-as antes de executar.
