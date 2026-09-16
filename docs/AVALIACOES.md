# Avaliações

Registro das ferramentas externas avaliadas para este setup. O veredicto negativo vale tanto quanto
o positivo, e por um motivo prático: três destas foram rejeitadas por algo que **não** aparece na
primeira página do projeto — licença restritiva, evento de hook que o DSH não tem, benchmark
sintetizado. Sem este registro, a próxima pessoa gasta o mesmo tempo para chegar à mesma conclusão.

Cada veredicto separa **o que foi rejeitado** de **o que sobrou**: quase nunca a resposta é um
sim/não, e quase sempre a ideia sobrevive mesmo quando o pacote não.

## Resumo

| Projeto | Veredicto | Motivo decisivo |
|---|---|---|
| `ayghri/i-have-adhd` | **adotado** (adaptado) | resolve um problema real, MIT, 120 linhas |
| `browser-use/browser-harness` | **adotado** (adaptado) | CDP já instalado e funcionando |
| `obra/superpowers` | rejeitado como pacote | ~4.900 tokens sempre no contexto com o hook |
| `github/spec-kit` | rejeitado como fluxo | A/B deu 49/49 nos dois braços |
| `ruvnet/ruflo` | rejeitado | 353 tools MCP ≈ 65.663 tokens por requisição |
| `alexgreensh/token-optimizer` | rejeitado | licença PolyForm Noncommercial |
| `addyosmani/agent-skills` | rejeitado como catálogo | ~2.421 tokens de catálogo para pouco uso |
| `DietrichGebert/ponytail` | rejeitado | A/B próprio: o prompt de 7 palavras bate a skill |

---

## Adotados

### `ayghri/i-have-adhd` — adotado

Shaping de saída para leitor com ADHD. MIT, ~120 linhas, autocontido.

**Por que ficou.** Resolve um problema que eu não tinha nomeado: começar é o passo difícil, e
estimativa vaga não registra. Foi instalado como skill (`i-have-adhd`, invocável por `/i-have-adhd`)
**e** como regra de prompt sempre ativa, podada de 1.541 para ~798 tokens (−49%). A skill é a versão
completa sob demanda; a regra é o resumo que vale sempre.

**Ressalva honesta.** Ele foi adaptado, não adotado inteiro: a versão do autor assume que a saída
pode ser reformatada livremente, e isso conflita com contratos do harness — `exit_plan_mode`
apresenta o plano completo, entregável vai com `present`, tool que falha é reportada com o erro
real. A skill adaptada diz explicitamente que os contratos do harness vencem o bloco.

### `browser-use/browser-harness` — adotado

Automação de browser via CDP.

**Por que ficou.** O daemon já estava instalado e funcionando (Chrome em CDP na porta 9222, v0.1.10,
instalação via pypi), então o custo marginal era escrever a skill, não montar infraestrutura.

**Ressalva honesta.** Dez dos dezoito documentos de interação do projeto original são esboços
vazios — arquivos com título e nada dentro. A skill adaptada traz só o que foi verificado, e é por
isso que ela tem 228 linhas mais nove arquivos em `references/`, em vez de espelhar o original.
Detalhe operacional que confunde: `BH_AGENT_WORKSPACE` está **unset**, e o caminho real é
`~/.config/browser-harness/agent-workspace/`; e o Chrome local é **um** browser compartilhado, não
um por sessão.

---

## Rejeitados

### `obra/superpowers` — rejeitado como pacote, aproveitado como ideia

Framework de skills. MIT, e o layout era compatível com o DSH — a rejeição não foi técnica de
formato.

**Por que caiu.** Com o hook, o custo era de ~4.900 tokens **sempre no contexto**, independente da
tarefa. É o oposto do que uma skill deve ser: skill só custa quando é usada, e um hook que injeta
conteúdo fixo transforma skill em imposto.

**O que sobrou.** O formato de plano — que virou `planos-de-implementacao` e `execucao-de-planos` — e
o laço de desenvolvimento orientado a especificação, adaptado junto.

### `github/spec-kit` — rejeitado como fluxo, aproveitado como ideia

Spec-Driven Development oficial.

**Por que caiu.** A integração com o DSH **existe** e é oficial: o `spec-kit` sabe scaffolder
`.dsh/skills/`. Isso tornava o teste justo, então rodei um A/B controlado — projeto pequeno, dois
diretórios, com e sem — e o resultado foi **49/49 casos de aceitação nos dois braços**. O fluxo não
mudou o desfecho no tamanho de projeto em que ele foi testado.

**Ressalva metodológica.** 49/49 nos dois braços é um resultado **negativo**, não uma prova de
equivalência geral. O experimento foi de um projeto pequeno; o `spec-kit` foi desenhado para
especificação grande e multi-pessoa, e nada aqui diz que ele falha nesse caso. O que o teste
autoriza a afirmar é só isto: no tamanho testado, o custo adicional não se pagou.

**O que sobrou.** Duas ideias, não o fluxo: a **constituição** do projeto (virou
`constituicao-do-projeto` mais um `docs/CONSTITUICAO.md` por repositório) e **critérios de aceitação**
explícitos antes da implementação.

### `ruvnet/ruflo` — rejeitado

O ponto de partida de tudo isto: um MCP para "aumentar a capacidade de implementação".

**Por que caiu — quatro razões, cada uma suficiente sozinha.**

1. **353 tools MCP ≈ 65.663 tokens por requisição.** O catálogo de ferramentas entra em toda chamada.
   É o custo do `superpowers` multiplicado por treze, e permanente.
2. **`mcp toggle` é um stub.** O mecanismo que permitiria desligar o que não se usa não faz nada —
   então não há como pagar menos que o custo cheio.
3. **`agent_spawn` só registra.** Não executa: o agente é criado e não roda, o que faz o benchmark
   medir registro em vez de trabalho.
4. **Benchmark sintetizado.** Os números de ganho não vêm de execução real.

**O que sobrou.** Nada de código. O que ficou foi o método: foi tentando medir o `ruflo` que ficou
claro que dá para medir o harness — e as medições desta sessão (compactação, custo de subagente,
custo de tool) nasceram daí.

### `alexgreensh/token-optimizer` — rejeitado

Otimizador de tokens por hooks.

**Por que caiu — três razões independentes.**

1. **Licença PolyForm Noncommercial.** Não é open source para uso comercial: grátis só abaixo de 5
   pessoas **ou** US$ 20k/mês de receita, e a restrição está no README, não no arquivo LICENSE. Um
   projeto que parece MIT pela primeira página não é.
2. **DSH não suportado.** Faltam 3 dos 7 eventos de hook que ele usa. Não é questão de adaptação:
   sem os eventos, os hooks que economizariam não disparam.
3. **Ganho medido de 11–16%**, e a linha de "re-leituras" está marcada como *Inconclusive* pelo
   próprio projeto.

**O que sobrou.** A ideia de podar resultado de tool — que já vem no
`dsh-compaction-tool-result-pruner`. O contrafactual da poda, medido nos dados reais desta sessão:

| `thresholdChars` | Economia |
|---|---|
| 8192 | 6% |
| 4096 | 21% |
| 2048 | 43% |
| 1024 | 62% |

O preset `standard` fixa 8192/4096/1024 — ou seja, o corte mais conservador da tabela. Baixar o
limite é o ganho disponível, mas **não** vale forkar o preset por um ajuste de config: o preset é
copiado, e uma cópia para de receber atualização. Ficou registrado como oportunidade não executada.

### `addyosmani/agent-skills` — rejeitado como catálogo

Catálogo de 25 skills.

**Por que caiu.** O catálogo custa ~2.421 tokens para navegar, e a maior parte das 25 não se aplica
ao trabalho aqui. O custo é permanente; o benefício é ocasional.

**O que sobrou.** Duas ideias: `doubt-driven-development` (duvidar da própria conclusão antes de
entregá-la) e `constraint-driven-development` (partir das restrições, não das possibilidades).

---

### `DietrichGebert/ponytail` — rejeitado, depois de A/B próprio

MIT, skill autocontida, e o benchmark do autor é o melhor construído desta lista: tem braço de
controle, testa o próprio contra-argumento, e publica uma correção depois de achar um bug de
contaminação nos números dele. Foi por isso que valeu repetir a medição em vez de aceitar a dele.

**O que eu medi.** 6 tarefas com armadilha de over-build e resposta na stdlib, 3 braços (sem nada /
ponytail / o prompt de sete palavras deles), 3 corridas cada, 54 sessões headless. Cada tarefa com
checagem comportamental — o benchmark deles não executa o código no eixo 1 — e checagem de
contaminação por sessão. Relatório completo em `~/Work/ponytail-experimento/RELATORIO.md`.

**O que se sustentou.** O mecanismo é real, e a magnitude deles se reproduz onde a armadilha é grande:
na tarefa análoga ao date picker deles, −52% aqui contra −54% lá. E nenhum braço derrubou a guarda de
segurança (3/3 em todos), o que confirma o achado de 100% deles.

**Por que caiu.** O prompt de sete palavras bateu a skill em todas as 6 tarefas: −55% contra −29%. E o
diferencial **total** do ponytail ficou maior que o do baseline (+37%), porque o ruleset dele manda
deixar uma checagem executável e ele obedeceu em 12 das 18 corridas, somando 13,5 linhas de teste que
nenhum outro braço escreveu. Custo de conversa +37%, contra −8% do controle.

**Ressalva honesta, e ela é grande.** Minhas tarefas são cirúrgicas, de 5 a 30 linhas, e os ganhos
deles vêm justamente de armadilhas grandes. É plausível que eu tenha medido o ponytail **fora da faixa
para a qual ele foi calibrado**, e um negativo ali não é um negativo sobre ele. Somam-se o modelo
diferente (`deepseek-flash` contra o Haiku 4.5 deles, e a nota deles de que o efeito depende do
modelo) e o `n=3`. Este é o teste mais fraco desta lista, não o mais conclusivo.

**O que ficou de valor não foi o veredicto.** Foi descobrir que o modo de falha de "escrever menos" —
cortar o que a especificação exige — é real e **não** fica onde a gente espera: apareceu numa tarefa
comum, não na de segurança, e só depois de eu endurecer o instrumento. A primeira versão da minha
checagem reinterpretava a string produzida com `URLSearchParams`, o que **normalizava o defeito que
ela deveria pegar**; duas corridas passavam com query string sem codificação nenhuma. Uma checagem
que normaliza o defeito é pior que checagem nenhuma, porque dá confiança.

---

## O que estas avaliações mudaram no harness

Duas conclusões que não são sobre nenhuma ferramenta específica e que valem mais que os veredictos:

**Custo de catálogo é custo permanente; skill é custo sob demanda.** Toda rejeição por tamanho
(`superpowers`, `ruflo`, `agent-skills`) é a mesma conta: conteúdo que entra em toda requisição
compete com o trabalho. É por isso que a arquitetura adotada é skill com descrição curta, e não
instrução inline — e é o que a regra do `AGENTS.md` do projeto diz ao pedir "prefira criar uma skill
a acrescentar regra aqui".

**Medir o harness vale mais que medir a ferramenta.** O que sobrou de mais útil não foi nenhum
veredicto, foi o instrumento: os números de compactação (7 compactações, 792k → ~16k tokens, ~98%
descartado), de subagente (93 despachos, 389.753 tokens) e de tool (5.496 resultados, ~1,5M tokens,
65% em `bash`). Eles decidem regra nova melhor que qualquer opinião.
