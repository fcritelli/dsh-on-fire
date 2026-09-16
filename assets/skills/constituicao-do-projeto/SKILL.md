---
name: constituicao-do-projeto
description: "Use ao criar, revisar ou aplicar a constituição de um projeto (docs/CONSTITUICAO.md) — os princípios invioláveis que todo plano precisa respeitar — ou quando um plano for contradizer uma regra estrutural do repositório."
---

# Constituição do projeto

Uma constituição fixa os **invioláveis** do projeto num único arquivo versionado, para que
cada plano seja checado contra eles **antes** de virar código — e não descobertos na
revisão, depois do retrabalho.

Sem isso, cada sessão redescobre as mesmas regras (ou as viola por não conhecê-las), e a
única barreira vira o revisor.

## Onde vive

`docs/CONSTITUICAO.md` na raiz do repositório. Um arquivo por projeto, versionado.

## O que entra — e o que NÃO entra

**Entra** o que é inviolável e verificável:

- restrições estruturais (paridade entre bancos, isolamento por tenant, imutabilidade)
- gates obrigatórios (ratchet de tipos, suíte que precisa ficar verde, build)
- regras de dados e conformidade (LGPD, retenção, o que nunca pode vazar)
- proibições explícitas (dependência nova, `any`, escrita fora do escopo)
- convenções que quebram o sistema se ignoradas

**Não entra** preferência de estilo, formatação, escolha de biblioteca já resolvida, nem
procedimento detalhado — isso é papel das skills do projeto. A constituição **aponta**
para a skill; não a duplica. Duplicar garante divergência.

## Formato

Cada princípio tem **nome**, **regra** e **verificação**. A verificação é o que separa
constituição de carta de intenções: precisa ser um comando, um arquivo conferível ou uma
checagem concreta.

```markdown
# Constituição — <projeto>

**Versão:** 1.0.0 | **Ratificada:** AAAA-MM-DD | **Última emenda:** AAAA-MM-DD

## Como usar

Leia antes de planejar. Todo plano traz uma seção "Conformidade" citando cada princípio
aplicável e como aquele plano o respeita. Conflito entre plano e constituição se resolve
**contra o plano** — ou a constituição é emendada, com justificativa registrada.

## I. <Nome do princípio>

**Regra:** <o inviolável, em uma ou duas frases, no imperativo.>

**Verificação:** <comando ou checagem concreta.>

**Detalhe:** skill `<nome-da-skill>` — <o que ela cobre que esta regra não cobre.>
```

## Regras de manutenção

1. **Emenda é versionada e justificada.** Subir a versão, datar e registrar o motivo no
   próprio arquivo. Emenda silenciosa é o defeito que a constituição existe para impedir.
2. **Reduza, não infle.** Princípio que não muda nenhuma decisão de projeto não pertence
   aqui. Cinco a oito princípios é o tamanho útil; vinte é um documento que ninguém lê.
3. **Regra sem verificação é removida.** Se você não consegue dizer como checar, não é
   inviolável — é preferência.
4. **Promova o que se repete.** Regra que aparece em três revisões seguidas vira princípio.
5. **Aponte, não copie.** O detalhe operacional mora na skill do projeto.

## Projeto novo (pasta vazia)

Não há código de onde extrair, e a constituição é **por repositório** — não existe herança
automática de outro projeto. Comece pelo modelo:

`templates/base.md`, ao lado desta skill.

Ele já traz o **[universal]** pronto: o piso (sem supressão nova, sem stub, sem teste pulado,
sem segredo, e a constituição não se enfraquece para passar), a regra de que toda verificação
nomeia o comando que produz o veredito, a tabela de exceções com dono e validade, e a
fronteira de credencial de subagente — que é fato do harness e vale em qualquer projeto.

O resto começa vazio, e isso é **correto**, não incompleto. Projeto novo ainda não tem
restrição estrutural nenhuma; inventar uma agora é adivinhar. A constituição **cresce**:
princípio de projeto entra quando a primeira decisão estrutural é tomada, pelo critério de
sempre — *"promova o que se repete"*.

**O que atravessa da família Kikin não é o texto, é o padrão.** Paridade entre bancos,
isolamento por tenant, imutabilidade de migration, porta própria para PII, ratchet em vez de
meta — cada um só vira princípio no projeto novo se aquele projeto **de fato** tiver a
estrutura correspondente. Copiar "paridade entre `kikin` e `kikin_free`" para um projeto de
banco único é ruído que ensina a ignorar a constituição inteira.

## Como criar a partir de um projeto existente

Não invente princípios. Extraia:

1. Leia `AGENTS.md`, `CLAUDE.md` e os ADRs (`docs/ADR-*.md`, `docs/design/`).
2. Leia as skills do projeto — elas já codificam procedimentos obrigatórios.
3. Procure os **gates que já existem** (scripts de typecheck/test/lint com ratchet,
   hooks, checagens de CI). Gate existente é princípio já ratificado na prática.
4. Procure o que já quebrou: mensagens de erro defensivas, comentários de "não remova",
   testes que travam comportamento por nome.
5. Escreva **só** o que mudaria uma decisão de plano.

## Antes de entregar

- Todo princípio tem regra **e** verificação.
- Nenhum princípio duplica o corpo de uma skill — todos apontam para ela.
- O arquivo cabe em uma tela.
- O usuário ratificou (a versão e a data são dele, não suas).
