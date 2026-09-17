---
name: qualidade-do-plano
description: "Use ao revisar a qualidade do TEXTO de um plano ou especificação antes de executá-lo — se ele está completo, quantificado, consistente consigo mesmo e cobre os casos de borda — e não para testar se a implementação funciona. Também use quando um plano for executado por outra sessão ou subagente e você precisar saber se ele basta."
---

# Qualidade do plano

Esta checklist não testa o código. Ela testa o **texto do requisito**.

Se a especificação é código escrito em português, esta é a suíte de testes dela. O critério é
sempre o mesmo: **um implementador sem contexto consegue executar o plano sem adivinhar?** Onde
ele teria que decidir algo por conta própria, o plano está incompleto — e a decisão vai sair
diferente em cada sessão que o executar.

A confusão mais comum, e a que esta skill existe para desfazer: **critérios de aceitação não são
esta checklist.** Aqueles testam a implementação ("o código faz X?"), são escritos pelo autor do
plano e verificados por comando ou teste. Esta testa o próprio texto ("o plano diz X com precisão
suficiente?"), e quem julga não é quem escreveu. As duas convivem, e a ordem é esta primeiro:
não adianta verificar código contra um requisito ambíguo.

## A regra de posse

**Quem gera a checklist não marca os itens.** O agente escreve `- [ ]`; o humano revisor marca
`- [x]`. Um item marcado pelo próprio autor da revisão não é revisão — é o agente corrigindo a
própria prova.

Quando o revisor pedir explicitamente que você avalie os itens, avalie e explique o raciocínio,
mas deixe a marcação com ele. Se você não tem certeza se um critério foi satisfeito, o item
continua `[ ]` — incerteza é exatamente o sinal que a checklist existe para produzir.

Marque `[x]` só quando o **critério de qualidade do requisito** estiver satisfeito. Isso não diz
nada sobre a implementação ter sido feita.

## Onde a revisão vive

`docs/superpowers/revisoes/<AAAA-MM-DD>-<nome-da-feature>.md`

Uma revisão por plano. Se o plano mudar depois da revisão, os itens que o plano invalidou voltam
para `[ ]` — a revisão é do plano como ele está agora, não do plano de ontem.

## As cinco categorias

Cada item da checklist pertence a uma delas, e o identificador é `QR-NNN` (qualidade de
requisito), para o revisor poder citar um item em review.

### Completeza — falta requisito?

O que o plano **não menciona** é o que ninguém vai construir. Procure o que foi omitido, não o
que foi mal escrito.

- `[ ] QR-001` A exportação define os dois formatos, não só diz que "é exportável"?
- `[ ] QR-002` Todo campo tem tipo, obrigatoriedade e valor padrão declarados?

### Clareza — o vago está quantificado?

Todo adjetivo sem número é uma decisão deixada para o implementador. "Rápido", "grande",
"amigável", "robusto" e "trata os casos" são sintomas.

- `[ ] QR-010` "Deve ser rápida" virou um número com condição? (ex.: "abaixo de 300 ms para 95%
  das chamadas com 100 mil registros")
- `[ ] QR-011` "Prominente" está quantificado em tamanho ou posição, em vez de adjetivado?

### Consistência — dois lugares discordam?

É o defeito que só aparece na leitura **cruzada**. Nenhum trecho está errado sozinho; eles se
contradizem.

- `[ ] QR-020` O campo declarado opcional na tarefa 2 é o mesmo obrigatório no contrato da tarefa 5?
- `[ ] QR-021` O nome da função, da rota ou da tabela é idêntico em todas as menções?
- `[ ] QR-022` O que a seção de contexto pressupõe bate com o que a seção de contrato fixa?

### Cobertura — todo caminho tem requisito?

Para cada operação, os caminhos que não são o sucesso.

- `[ ] QR-030` O plano diz o que acontece sem permissão?
- `[ ] QR-031` Diz o que acontece quando o registro já não existe?
- `[ ] QR-032` Diz o que acontece quando a dependência externa está fora ou responde com erro?

### Caso de borda — o que nenhuma frase previu?

A lista de sempre, aplicada ao domínio do plano: **vazio, um, muitos, duplicado, simultâneo,
parcial, fora de ordem, repetido, gigante, vazio de novo.**

- `[ ] QR-040` Coleção vazia e coleção com um elemento foram consideradas?
- `[ ] QR-041` Volume grande muda o desenho? (paginou? indexou? streamou?)
- `[ ] QR-042` Duas execuções simultâneas produzem efeito duplicado?

## Como rodar

1. **Leia o plano inteiro antes de escrever qualquer item.** Item escrito no meio da leitura
   costuma ser item sobre o trecho, não sobre o plano.
2. **Leia a constituição**, quando existir (`docs/CONSTITUICAO.md`), e acrescente um item de
   consistência por princípio aplicável. Um plano que contradiz a constituição falha aqui, não
   na execução.
3. **Releia procurando contradição entre seções distantes** — é a categoria que exige ir e
   voltar, e é a que mais rende.
4. **Escreva os itens como pergunta fechada**, respondível com "sim" ou "não". "O plano define o
   comportamento na colisão de nomes?" é um item; "avaliar tratamento de nomes" não é.
5. **Não invente requisito.** O item aponta a lacuna no texto; quem decide se ela deve ser
   preenchida é quem conhece o produto.
6. **Não marque nada.** Entregue a checklist e diga quantos itens ficaram abertos.

## Template

```markdown
# Revisão: <feature>
Plano: <caminho do plano>
Data: <AAAA-MM-DD>
Revisor: <quem revisa>

## Completeza
- [ ] QR-001 <pergunta fechada>

## Clareza
- [ ] QR-010 <pergunta fechada>

## Consistência
- [ ] QR-020 <pergunta fechada>

## Cobertura
- [ ] QR-030 <pergunta fechada>

## Caso de borda
- [ ] QR-040 <pergunta fechada>

## Notas
<lacunas que não viraram item, e o que você não conseguiu julgar>
```

## O que esta revisão não é

Não é teste da implementação — isso é `execucao-de-planos`, com review independente por tarefa.
Não é revisão de arquitetura nem de mérito da feature: se o plano está bem escrito e descreve a
coisa errada, esta checklist passa e a discussão é outra. E não é um gate de aprovação: ela
mostra onde o plano deixa o implementador adivinhando, e o revisor decide o que fazer com isso.
