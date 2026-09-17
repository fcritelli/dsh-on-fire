## Graphify: consult first, update after (when available)

Available = the project has `graphify-out/graph.json` or `graphify` exists on PATH. If it does not
exist, carry on with the task without blocking.

**A dirty graph is not a reason to skip the query.** Modified files under `graphify-out/` are
expected after hooks or an incremental update. Only skip the query if the task is about the graph
being stale or wrong, or if the user says not to use it.

### Querying — always with a budget, from the cheapest route to the most expensive

1. **MCP `mcp__graphify__*`** — the graph stays warm in memory. Available tools: `query_graph`
   (a question), `get_node` (one node), `get_neighbors`, `get_community`, `shortest_path`,
   `god_nodes`, `graph_stats`.
   **Always pass `project_path`** = the absolute root of the workspace; the server is multi-project
   and fails on purpose without it, instead of reading the wrong graph.
   **Use an explicit `token_budget`** (default 2000). For "who calls X" or "what does X use", prefer
   `get_node`/`get_neighbors` over a broad `query_graph`. `depth` defaults to 3 (1–6).
   **The budget is not a hard ceiling:** it limits by truncating *nodes*, and graphify never drops
   edges once every node fits. Asking for 400 can return ~550 tokens, with the warning *"complete
   answer over budget"*. A genuinely small answer comes from `get_node` on a specific symbol, not
   from a smaller budget.
2. **CLI** — `graphify query "<question>" --budget 1500` (BFS; `--dfs` to trace a path),
   `graphify path "A" "B"`, `graphify explain "X"`, `graphify god-nodes --top 10`.
3. **`graphify-out/wiki/index.md`** when it exists — community browsing, cheap.
4. **`graphify-out/GRAPH_REPORT.md` only for a broad architecture review.** It costs ~19k tokens in
   `kikin` and ~6.5k in `kikin-admin`.

**Never read `graphify-out/graph.json` or `graph.html`.** They are ~1.5M tokens in `kikin`, ~437k in
`kikin-admin` and ~194k in `kikin-cliente`. No question justifies that cost.

**The graph guides, the source decides.** It does not model everything: middleware passed as an
argument (`router.get(p, guard(...), h)`) does **not** become a call edge, and absence from the graph
is not absence from the code. Use the query to find the cheap route and **confirm in the file** before
claiming coverage, absence, or "this is not used anywhere". On 2026-09-14 the graph showed 1 file
calling a guard that the code uses in 8.

### Updating

After creating, modifying or deleting files (with tests/build verified) — the MCP only reads, so sync
from the terminal: `graphify update .` (or `graphify .` for a full rebuild). Confirm that `graph.json`,
`GRAPH_REPORT.md` and `graph.html` were rewritten. Run `graphify label .` when the set of communities
changes, so the labels do not stay stuck to names derived from the hub.

### Broken tool — quick diagnosis

| Symptom | Cause | Fix |
|---|---|---|
| `No module named 'mcp'` / MCP tools missing | the `mcp` extra is missing | `uv tool install "graphifyy[mcp,gemini,sql]==0.9.55" --force` and **restart DSH** |
| `No LLM provider configured` / `'openai' package is required` | the `gemini` extra is missing, or the wrapper was overwritten | run `install/install-graphify.sh` from the `dsh-on-fire` clone — it reinstalls `[mcp,gemini,sql]` and rewrites the wrapper at `~/.local/bin/graphify` |
| Labels turned into "Community N" | `label` ran without a key | check `~/.config/graphify/gemini.key` and run `graphify label .` |

**Installing with one extra DELETES the others** — the correct set is `[mcp,gemini,sql]`. Any
`uv tool install|upgrade` also **overwrites the wrapper** at `~/.local/bin/graphify`.
