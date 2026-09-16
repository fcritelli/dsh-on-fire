## Graphify: consultar antes, atualizar depois (quando disponível)

Disponível = o projeto tem `graphify-out/graph.json` ou existe `graphify` no PATH.
Se não existir, siga a tarefa sem bloquear.

**Grafo sujo não é motivo para não consultar.** Arquivos modificados em `graphify-out/` são
esperados depois de hooks ou atualização incremental. Só pule a consulta se a tarefa for sobre
o grafo estar desatualizado ou incorreto, ou se o usuário disser para não usar.

### Consultar — sempre com orçamento, da via mais barata para a mais cara

1. **MCP `mcp__graphify__*`** — o grafo fica quente em memória. Tools disponíveis:
   `query_graph` (pergunta), `get_node` (um nó), `get_neighbors`, `get_community`,
   `shortest_path`, `god_nodes`, `graph_stats`.
   **Passe sempre `project_path`** = raiz absoluta do workspace; o servidor é multi-projeto
   e falha de propósito sem isso, em vez de ler o grafo errado.
   **Use `token_budget` explícito** (default 2000). Para "quem chama X" ou "o que X usa",
   prefira `get_node`/`get_neighbors` a uma `query_graph` ampla. `depth` default 3 (1–6).
   **O orçamento não é teto rígido:** ele limita truncando *nós*, e o graphify nunca descarta
   arestas depois que todos os nós cabem. Pedir 400 pode devolver ~550 tokens, com o aviso
   *"complete answer over budget"*. Saída pequena de verdade vem de `get_node` num símbolo
   específico, não de um budget menor.
2. **CLI** — `graphify query "<pergunta>" --budget 1500` (BFS; `--dfs` para traçar caminho),
   `graphify path "A" "B"`, `graphify explain "X"`, `graphify god-nodes --top 10`.
3. **`graphify-out/wiki/index.md`** quando existir — navegação por comunidade, barata.
4. **`graphify-out/GRAPH_REPORT.md` só para revisão ampla de arquitetura.** Custa ~19k
   tokens no `kikin` e ~6,5k no kikin-admin.

**Nunca leia `graphify-out/graph.json` nem `graph.html`.** São ~1,5M tokens no `kikin`,
~437k no kikin-admin e ~194k no kikin-cliente. Nenhuma pergunta justifica esse custo.

**O grafo orienta, o fonte decide.** Ele não modela tudo: middleware passado como argumento
(`router.get(p, guard(...), h)`) **não** vira aresta de chamada, e ausência no grafo não é
ausência no código. Use a consulta para achar o caminho barato e **confirme no arquivo** antes
de afirmar cobertura, ausência ou "isso não é usado em lugar nenhum". Em 2026-09-14 o grafo
mostrou 1 arquivo chamando um guard que o código usa em 8.

### Atualizar

Depois de criar/modificar/excluir arquivos (com testes/build verificados) — o MCP só lê,
então sincronize pelo terminal: `graphify update .` (ou `graphify .` para rebuild completo).
Confirme que `graph.json`, `GRAPH_REPORT.md` e `graph.html` foram regravados.
Rode `graphify label .` quando o conjunto de comunidades mudar, para os rótulos não ficarem
presos a nomes derivados do hub.

### Ferramenta quebrada — diagnóstico rápido

| Sintoma | Causa | Correção |
|---|---|---|
| `No module named 'mcp'` / tools MCP ausentes | falta o extra `mcp` | `uv tool install "graphifyy[mcp,gemini]==0.9.55" --force` e **reinicie o DSH** |
| `No LLM provider configured` / `'openai' package is required` | falta o extra `gemini`, ou o wrapper foi sobrescrito | `~/.local/bin/graphify-restore` |
| Rótulos viraram "Community N" | `label` rodou sem chave | verifique `~/.config/graphify/gemini.key` e rode `graphify label .` |

**Instalar com um extra APAGA os outros** — o conjunto correto é `[mcp,gemini]`.
Qualquer `uv tool install|upgrade` também **sobrescreve o wrapper** de `~/.local/bin/graphify`.
