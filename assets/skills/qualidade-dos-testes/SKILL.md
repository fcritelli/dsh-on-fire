---
name: qualidade-dos-testes
description: "Use ao escrever, revisar ou confiar numa suíte de testes, e sempre que um resultado verde for a base de uma decisão. Cobre as duas formas de um teste passar sem provar nada: a asserção que confere um valor que o próprio teste inventou, e o fixture que encosta na implementação. Também use quando um número de avaliação parecer bom demais, ou antes de tratar um 100% como aprovação."
---

# Qualidade dos testes

Uma suíte verde é uma **afirmação**, não uma prova. Ela afirma "o sistema faz X" e é perfeitamente
possível que ela esteja medindo outra coisa.

Este harness já tinha uma instância disso anotada no `kikin-testes`: *o teardown engole falhas, e um
teardown que falhou é indistinguível de um que passou*. As duas falhas abaixo são essa mesma classe,
generalizada — e valem tanto para teste unitário quanto para suíte de aceitação e para benchmark.

## 1. O valor esperado nasceu no teste

O sintoma mais confiável **não** é `toBeDefined()` — isso é legítimo em muito lugar. É o valor
esperado ser construído dentro do arquivo de teste, de um jeito que satisfaz a asserção mesmo se o
sistema não produzir nada.

Dois formatos comuns:

- um helper que **devolve** o campo assertado, com o valor escrito à mão (`expiresInSeconds: 900`);
- um mock que ecoa o valor que o teste passou, e a asserção conferindo o eco.

O segundo caso pode ser legítimo: se o stub é o **instrumento de observação** e a asserção verifica
que o middleware repassou o dado, o teste vale. O primeiro nunca é — o sistema não participa.

### Como procurar

Um scan mecânico acha os casos grosseiros: **campo assertado que não existe em nenhum arquivo de
produção**. Escreva e rode isto na raiz do projeto:

```python
"""Acha campos que o teste asserta mas o servidor nunca produz."""
import re, sys, pathlib

raiz = pathlib.Path(sys.argv[1])
testes, fonte = [], []
# .ts E .tsx: um `rglob("*.[t]sx")` casa SÓ .tsx e deixa todo o fonte .ts invisível, o que
# transforma cada campo legítimo em fantasma. Foi exatamente esse o erro na primeira versão.
for p in list(raiz.rglob("*.ts")) + list(raiz.rglob("*.tsx")):
    s = str(p)
    if "node_modules" in s or "/dist/" in s or ".worktrees" in s:
        continue
    (testes if (".test." in p.name or ".spec." in p.name) else fonte).append(p)

ident = set(re.findall(r"[A-Za-z_][A-Za-z0-9_]*",
                       "\n".join(p.read_text(errors="ignore") for p in fonte)))

# A chave precisa de `:` depois (senão valores como `Maria` entram), e o lookbehind evita
# casar pedaço de outra palavra — sem ele o `T09` de `2026-01-01T09:00:00` entra como campo.
CHAVE = re.compile(r"(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\s*:")
# `.body` também é o do DOM: sem esta lista, `document.body.innerHTML` vira "campo fantasma".
API_DOM = {"innerHTML", "textContent", "className", "outerHTML", "innerText",
           "style", "dataset", "tagName", "nodeType"}

susp = {}
for t in testes:
    txt = t.read_text(errors="ignore")
    campos = set(re.findall(r"\.body\.([A-Za-z_][A-Za-z0-9_]*)", txt)) - API_DOM
    for bloco in re.findall(r"(?:toMatchObject|objectContaining)\(\{([^}]*)\}", txt, re.S):
        campos |= set(CHAVE.findall(bloco))
    for c in campos:
        if c not in ident:
            susp.setdefault(c, []).append(t.name)

print(f"fontes: {len(fonte)} | testes: {len(testes)}\n")
if not susp:
    print("nenhum campo fantasma encontrado")
for c, arqs in sorted(susp.items(), key=lambda kv: -len(kv[1])):
    print(f"  {c:34} em {len(arqs)}: {', '.join(sorted(set(arqs))[:4])}")
```

**Isto gera candidatos, não veredictos.** Cinco formas de ele mentir, todas já observadas:

1. Um stub que o teste monta de propósito só existe no teste, e ali o campo é legítimo.
2. Sem o `:` obrigatório, o scan captura valores em vez de chaves, e vira ruído.
3. Sem o lookbehind, ele morde pedaços de timestamp — `T09` saiu de `2026-01-01T09:00:00`.
4. Cobrindo só `.ts`, ele ignora todo teste `.tsx`: num repositório isso foi 41 de 235 arquivos.
5. Um `rglob("*.[t]sx")` parece cobrir os dois e cobre só `.tsx` — aí o **fonte** `.ts` fica
   invisível e todo campo vira fantasma. Errar para o lado do ruído é pior que errar para o lado
   do silêncio, porque o ruído parece achado.

Cada hit precisa de conferida no fonte. E o scan só pega o caso grosseiro: um valor hardcoded num
helper passa por ele sempre que o nome do campo também existe no servidor. Para esses, a única
checagem é ler.

### O exemplo que originou esta skill

No `securityAcceptance.test.ts` do `kikin-admin`, o teste cujo título prometia *"sucesso, 900s"*
conferia `expiresInSeconds: 900` — e o helper do próprio teste escrevia esse campo antes do spread:

```js
return { salonId: res.body.salonId, expiresInSeconds: 900, ...res.body };
```

O contrato do serviço devolve `expiresAt`, um timestamp; `expiresInSeconds` **não existia em nenhum
arquivo de produção**. A asserção passava com o servidor devolvendo `{}`. Trocada por uma janela
sobre `expiresAt`, ela passou a ser sensível o bastante para pegar 10 ms de diferença — o que é
exatamente o oposto do comportamento anterior.

## 2. O fixture encosta na implementação

Aqui não há scan confiável: exige leitura e uma pergunta. **A expectativa foi derivada do código, ou
do requisito?**

Casos que valem desconfiança:

- o valor esperado é calculado chamando a mesma função sob teste, ou um helper que ela também usa;
- o golden file foi regerado a partir da implementação depois que ela mudou;
- o seed do banco de teste vem da mesma migração que a feature exercita, então esquema errado passa;
- o dataset de avaliação tem interseção com o de treino, ou com o de few-shot.

**Evidência de que isso não é teórico.** O `MiniMind` relata ter chegado a **~97% no ceval** num
subset contaminado, e diz no próprio README que o número não significa nada. Na mesma página, o
`minimind-3-exam` deles ganha ~2,9 pontos em sete benchmarks **sem injetar conhecimento nenhum**, só
alinhando o formato da entrada — ou seja, a avaliação estava medindo formato, não capacidade.
Contaminação e formato são os dois lados do mesmo problema: a suíte mede o que ela põe, não o que o
sistema faz.

### O teste do negativo

Um caso positivo isolado não prova uma regra. `policyAllows(user, "x") === true` passa com uma
implementação que sempre devolve `true`. Para cada permissão, lista, filtro ou validação que o teste
afirma permitir, pergunte qual asserção vizinha afirma o **caso negado**. Sem ela, a regra não está
coberta.

## Antes de confiar num verde

1. Rode o scan onde ele se aplica e confira cada candidato no fonte.
2. Para cada asserção que afirma um valor, pergunte de onde veio o esperado.
3. Para cada permissão ou validação, procure o teste do caso negado.
4. Antes de tratar um 100% como aprovação, pergunte se a suíte mede capacidade ou formato — e se o
   fixture encosta no que está sendo medido.
