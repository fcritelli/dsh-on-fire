# Improvements in `dsh-on-fire`

Catalog of what this bundle installs, why it exists, and how to turn each part off.

Every item carries the **evidence** that justifies it. Where the evidence is a measurement, it is
stated with the number and what was measured — because the alternative would be a rule of taste,
and a rule of taste does not survive review.

## Index

| # | Improvement | Where it lives | How to turn it off |
|---|---|---|---|
| 1 | Language always pt-BR | prompt section | `language: false` |
| 2 | Wait for subagent/job by notification | prompt section | `waiting: false` |
| 3 | Graph before, graph after | prompt section | `graphify: false` |
| 4 | ADHD output style | prompt section | `adhd: false` |
| 5 | Don't guess — ask | prompt section | `asking: false` |
| 6 | Skill `project-constitution` | skill (rank 600) | `disabledSkills: [project-constitution]` |
| 7 | Skill `implementation-plans` | skill (rank 600) | `disabledSkills: [implementation-plans]` |
| 8 | Skill `plan-quality` | skill (rank 600) | `disabledSkills: [plan-quality]` |
| 9 | Skill `plan-execution` | skill (rank 600) | `disabledSkills: [plan-execution]` |
| 10 | Skill `test-quality` | skill (rank 600) | `disabledSkills: [test-quality]` |
| 11 | Skill `browser-harness` | skill (rank 600) | `disabledSkills: [browser-harness]` |
| 12 | Skill `i-have-adhd` | skill (rank 600) | `disabledSkills: [i-have-adhd]` |
| 13 | MCP server `graphify` | row `mcp-graphify` | remove the row, or `disabled: true` |
| 14 | MCP server `lgpd` | row `mcp-lgpd` | remove the row, or `disabled: true` |
| 15 | graphify wrapper + key | `install/` (machine-local) | don't run the script |

All options 1–12 are written in the config of the `on-fire` row, in your patch layer:

```yaml
# ~/.dsh/cordis.patch.yml
- id: on-fire
  config:
    adhd: false
```

Careful: a patch by id **replaces the entire config** of the row, it does not merge. To change one
option, repeat the others you want to keep.

---

## The three layers

It is worth understanding where each thing lives, because the difference decides what is portable
and what is local.

**Rules** are prompt sections, registered in `PLAN_POLICY` (order 500) — after the persona and
before the tool documentation. They hold in every session of every workspace. They live in
`assets/rules/*.md` and the text goes into the prompt without going through a project file.

**Skills** enter through the skill registry with `BUNDLED_SKILL_RANK` (600), the **lowest precedence
that exists**. The rank is what makes this bundle safe to install: a copy in
`~/.agents/skills/<name>/SKILL.md` (rank 500) or in `<project>/.agents/skills` (rank 200) **wins**
over the bundle. The bundle is a default, it never overwrites what you already have.

**MCP and key** go to `cordis.patch.yml` and to `install/`. Only the key is not bundle, because a
package does not carry a secret.

---

## 1. Language always pt-BR

All output to the user in Brazilian Portuguese, without exception and without needing to be asked:
responses, reports, commit messages, code comments, document names, subagent prompts. Established
technical terms stay as they are in the code; the prose around them is pt-BR.

**Evidence.** It is not a measurement, it is a decision of yours, and that is why it is here as a
declared decision and not as a finding. What makes it a *prompt rule* and not a repeated request is
the cost: stated once, it holds in every session.

**Toggle:** `language: false`.

## 2. Wait for subagent or job by notification

Nothing is a fixed wait. There are two mechanisms and neither of them is a polling loop: a
background subagent **notifies** when it settles; a background job is collected with **one** call
(`job_output(job_id, wait: true, timeout_ms: …)`) that returns when it finishes.

**Evidence — `timeout_ms` is a ceiling, not a duration.** Measured on 2026-09-15: a 45 s job with a
180 s ceiling returned in ~45 s. The ceiling only protects against a stuck job; it never makes you
wait until the end. That is why the rule says to use a generous ceiling without fear.

**Evidence — why polling is expensive.** The cost is not the time, it is the context: every check is
a call and a result that stays in the history. In a measured session of 330 turns, subagents cost
389,753 tokens in 1,161 inbox events, and tools 5,496 results ≈ 1.5 million tokens. Repeated
checking enters exactly that account.

**Toggle:** `waiting: false`.

## 3. Graph before, graph after

Available when `graphify-out/graph.json` exists or `graphify` is on the PATH. The query order goes
from the cheapest route to the most expensive one, and the budget is always explicit.

**Evidence — why the reading ceiling exists.** Measured in the three repositories:

| File | `kikin` | `kikin-admin` | `kikin-cliente` |
|---|---|---|---|
| `graph.json` | ~1.5M tokens | ~437k | ~194k |
| `GRAPH_REPORT.md` | ~19k | ~6.5k | — |

Reading `graph.json` costs more than the entire session. No question justifies it.

**Evidence — the graph orients, the source decides.** It does not model everything: middleware
passed as an argument (`router.get(p, guard(...), h)`) does **not** become a call edge. On
2026-09-14 the graph showed 1 file calling a guard that the code uses in 8. It was that error that
rewrote principle VI of the `kikin-admin` constitution — the rule "every route has a guard"
described reality badly.

**Evidence — `token_budget` is not a rigid ceiling.** It limits by truncating *nodes*; graphify
never discards edges once all the nodes fit. Asking for 400 can return ~550 tokens with the warning
*"complete answer over budget"*. A genuinely small output comes from `get_node` on a specific
symbol, not from a smaller budget.

**Toggle:** `graphify: false`.

## 4. ADHD output style

Start with the answer or the next action; no preamble, no recap, no sign-off; multi-step work
becomes a numbered list; the state is restated every turn; an error is cause and correction in a
factual tone; what is done is made visible in concrete terms.

**Evidence.** The block was pruned from 1,541 to ~798 tokens (−49%) without losing an actionable
rule. What went out was justification and example; what stayed is verifiable before sending.

This rule used to ask for a concrete time estimate. It no longer does, on purpose: a duration that
cannot be computed is a guess, and a guess written as a fact is worse than silence, because the
reader plans around it. What goes in its place is what actually decides — what has to happen first,
what is blocked, what is still unknown.

**Toggle:** `adhd: false`. In this session, `stop adhd mode`.

## 5. Don't guess — ask

Say when you do not know, and ask, instead of inventing. Four shapes of guessing, all of which read
as fact to the reader: **a number you cannot know** (time, cost, size); **a choice that belongs to
the reader** (which design, which scope, which repository, which priority); **a scope you assumed**
(which repos, which environment, whether to also fix the sibling caller); **an intent you inferred**
(a request that could mean two things).

The line that keeps this from becoming an interrogation: **ask when the answer is the reader's to
give, and never ask what inspection answers.** Where a file lives, how a function behaves, what the
tests cover, whether a tool exists — find out, then act. A question you could have answered yourself
spends the reader's attention and returns nothing.

**Evidence.** This one is not a measurement, it is a correction the user asked for, after a session
in which estimates of effort were produced for work whose size was genuinely unknown. The rule
exists so the failure is not repeated by default.

**Toggle:** `asking: false`.

## 6–12. The seven skills

All with rank 600, all overridable by a local copy of the same name.

**`project-constitution`** — creates, reviews or applies `docs/CONSTITUTION.md`: the inviolable
principles that every plan must respect. It brings a template in `templates/base.md`. It exists
because a per-repository constitution catches structural contradiction that code review does not
catch — that is how principle VI of `kikin-admin` was corrected (see item 3).

**`implementation-plans`** — plans a feature or a multi-step change before touching the code.
**`plan-execution`** — executes an approved plan task by task, with subagents, a versioned progress
ledger and an independent review for each task. The two together are the adaptation of `spec-kit`'s
Spec-Driven Development loop; see `EVALUATIONS.md` for what was left of the evaluation.

**`plan-quality`** — reviews the **text** of the plan, not the implementation: whether it is
complete, quantified, consistent with itself and covers the edge cases. It is `spec-kit`'s "unit
test of the Portuguese", with the ownership rule that would make a difference for us: **whoever
generates the checklist does not mark the items** — the agent writes `- [ ]`, the reviewer marks
`- [x]`. Without that, the acceptance criteria of `implementation-plans` are written and marked by
the same agent, which thus corrects its own exam. It lives in `docs/engineering/reviews/`, and it
serves to review an old plan, not only a freshly written one.

A skill only fires if the model judges that its description matches the situation, and that is the
weak link — nothing in the system forces the step. That is why `implementation-plans` points to it
in the self-review before delivering, and `plan-execution` in the prerequisites: the pointer comes
from a skill that is already loaded at that exact moment, which is more reliable than hoping the
catalog entry is noticed in the middle of a dozen.

**`test-quality`** — audits whether a green suite is measuring capability or only format. Two
failures, and both pass an inattentive review: the assertion that checks **a value that the test
itself invented** — in `securityAcceptance.test.ts` of `kikin-admin`, the test whose title promised
"900s" verified an `expiresInSeconds` that the test helper wrote by hand, a field that did not exist
in any production file — and the fixture that **leans on the implementation**, such as the golden
file regenerated from the code or the evaluation dataset that intersects the training one. It brings
a mechanical scan that finds the crude cases of the first failure, with the limit declared: it
generates candidates, not verdicts, and the second failure has no scan — it requires reading.

**`browser-harness`** — all web interaction: automation, scraping, testing, work on a site or app.
It is 228 lines plus nine files in `references/`, because the long version is loaded on demand and
only the description always enters the context. Ten of the eighteen interaction documents of the
original project are empty drafts; the skill brings only what works, verified.

**`i-have-adhd`** — the invocable version of item 4, adapted from
[ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd) (MIT). It has
`disable-model-invocation: true`, that is: the model does not load it on its own, only you through
`/i-have-adhd`. That is why it does **not** show up when you ask the agent which skills it has —
correct behavior, verified on the real host.

## 13. MCP server `graphify`

Registers the MCP server of the local knowledge graph. The tools appear as `mcp__graphify__*` and
work in multi-project mode: each call receives `project_path` with the absolute path of the
workspace root. Without `project_path` the call **fails on purpose**, instead of serving the wrong
graph.

The bundle brings `command: graphify-mcp`, portable. `install/adjust-paths.sh` writes the absolute
path of this machine into your layer, because the PATH of the DSH host is usually minimal.

**Broken tool — diagnosis:**

| Symptom | Cause | Fix |
|---|---|---|
| `No module named 'mcp'` / missing tools | the `mcp` extra is missing | `install/install-graphify.sh` (installs `[mcp,gemini,sql]`) |
| `No LLM provider configured` | the `gemini` extra is missing, or the wrapper was overwritten | `install/install-graphify.sh` |
| Labels became "Community N" | `label` ran without a key | check `~/.config/graphify/gemini.key` |

**Installing with one extra ERASES the others** — the correct set is `[mcp,gemini,sql]`. Any
`uv tool install|upgrade` also overwrites the wrapper in `~/.local/bin/graphify`.

**Toggle:** remove the `mcp-graphify` row from your layer, or set `disabled: true`.

## 14. MCP server `lgpd`

Support for compliance with the LGPD (Lei 13.709/2018). Tools in `mcp__lgpd__*`:
`validar_base_legal`, `verificar_consentimento`, `gerar_modelo_consentimento`,
`avaliar_necessidade_pia`, `checklist_compliance`, `gerar_politica_privacidade`,
`consultar_direitos_titular`, `mapear_dados_sensiveis`, `avaliar_risco_tratamento` — plus the
resources `lgpd://fundamentos|artigos|base-legal|glossario|anpd`.

**Auxiliary: it does NOT replace legal advice.** It is said in the patch itself, and it is worth
repeating here.

**Toggle:** remove the `mcp-lgpd` row from your layer, or set `disabled: true`.

## 15. The graphify wrapper and the key

`~/.local/bin/graphify` is a wrapper that reads the Gemini key from
`~/.config/graphify/gemini.key` (mode 600) and exports it before calling the real binary. It exists
because the graphify CLI needs the key in the environment and `uv` has nowhere to store it.

**Evidence — why this is not bundle.** Two reasons, and both are design reasons, not taste. A
package does not carry a secret. And the wrapper is fragile by nature: any `uv tool install|upgrade`
recreates the symlink on top of it. That is why the script is idempotent and exists to be run again
— it is the documented fix for the symptom, not a one-time installation.

**Toggle:** don't run the script. Without the wrapper, the MCP keeps working (it only reads the
graph and does not use an LLM); what stops is `graphify label` and the CLI queries.

---

## What is not here

Evaluations that ended in **not adopting** live in [`EVALUATIONS.md`](./EVALUATIONS.md). They count
as much as the positive ones: they keep the next person from redoing the work — and three of them
were rejected for a reason that does not appear on the first page of the project (license, missing
hook event, synthesized benchmark).
