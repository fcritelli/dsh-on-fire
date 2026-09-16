# Constituição — <projeto>

**Versão:** 0.1.0 | **Ratificada:** <AAAA-MM-DD> | **Última emenda:** —

> **Como este arquivo nasceu:** ele foi semeado do modelo base da skill
> `constituicao-do-projeto`. As seções marcadas **[universal]** não dependem do projeto e já
> vêm prontas; as marcadas **[do projeto]** precisam ser preenchidas a partir do código, dos
> ADRs, dos gates existentes e das skills do repositório — nunca inventadas.

## Como usar

Leia antes de planejar. Todo plano traz uma seção **Conformidade** citando cada princípio
aplicável e como aquele plano o respeita. Conflito entre plano e constituição se resolve
**contra o plano** — ou esta constituição é emendada, com justificativa registrada aqui.

**Toda verificação nomeia o comando que produz o veredito.** Dimensão com número e sem
comando é aspiração, não restrição. E afrouxar o teto é barulhento, apertar é silencioso:
baixar limiar, pular teste, adicionar supressão ou tirar checagem do estágio rápido são
mudanças que se anunciam na revisão, não que passam.

---

## Princípios **[do projeto]**

> Preencha a partir do repositório. Cinco a oito princípios é o tamanho útil. Regra sem
> verificação concreta é removida — se você não consegue dizer como checar, é preferência,
> não inviolável. Aponte para a skill que detalha; não copie o corpo dela.

### I. <nome do princípio>

**Regra:** <o inviolável, no imperativo, em uma ou duas frases.>

**Verificação:** `<comando>` ou inspeção de `<arquivo>`.

**Detalhe:** skill `<nome>`.

### II. <nome do princípio>

**Regra:** …

**Verificação:** …

**Detalhe:** skill `<nome>`.

---

## Subagente não é fronteira de credencial **[universal]**

**Regra:** Um agente despachado roda no mesmo processo, no mesmo diretório e com o mesmo
ambiente do pai. Ele alcança o `.env` e todos os dados que o pai alcança. Separar papéis —
implementador, revisor — **não** cria isolamento de credencial; `toolFilter` restringe
ferramentas, não segredos. Não delegue a um subagente nada que exija um limite de acesso que
ele não tem.

**Verificação:** ao desenhar um workflow com subagentes, registre por escrito qual dado
sensível cada um alcança e por que isso é aceitável. Se o projeto trata dado pessoal,
workflow que revele PII a um subagente passa pelo mesmo critério que uma rota passaria.

---

## Piso (sempre aplicado, sem configuração) **[universal]**

Independente de qualquer número escolhido:

- Nenhuma supressão nova: `@ts-ignore`, `eslint-disable`, `# noqa`, `# type: ignore`
- Nenhum stub não implementado: `throw new Error("Not implemented")`, `catch {}` vazio
- Nenhum teste pulado ou apagado sem justificativa no commit
- Nenhum segredo no código
- **Esta constituição não é enfraquecida para fazer uma mudança passar**

---

## Exceções **[universal]**

Exceção a qualquer princípio é registrada aqui — não no código, não na mensagem de commit:

| ID | Princípio | Caminho | Motivo | Dono | Expira |
|----|-----------|---------|--------|------|--------|

Exceção sem dono e sem validade não é exceção: é um teto rebaixado. Validade padrão: 90 dias.

---

## Notas para quem semeia este arquivo

**O que vem do projeto, não do modelo:**

- Restrições estruturais (paridade entre bancos, isolamento por tenant, imutabilidade de
  migration) — **só se o projeto já as tem**.
- Gates obrigatórios, cada um com o comando que o produz.
- Regras de dados e conformidade, com a referência legal quando houver.
- Proibições explícitas (dependência nova, `any`, escrita fora do escopo).

**O que NÃO entra:** preferência de estilo, formatação, escolha de biblioteca já resolvida, ou
procedimento detalhado — isso é papel das skills do projeto.

**Se o projeto é novo e vazio:** a constituição começa praticamente só com o **[universal]**.
Isso é correto, não incompleto. Princípio de projeto entra quando a primeira decisão
estrutural for tomada — e o critério é o de sempre: *"promova o que se repete"*, regra que
apareceu em três revisões seguidas vira princípio.
