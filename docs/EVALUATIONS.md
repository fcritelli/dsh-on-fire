# Evaluations

Record of the external tools evaluated for this setup. The negative verdict counts as much as the
positive one, and for a practical reason: three of these were rejected for something that does
**not** appear on the first page of the project — restrictive license, a hook event that DSH does
not have, a synthesized benchmark. Without this record, the next person spends the same time to
reach the same conclusion.

Each verdict separates **what was rejected** from **what was left**: almost never is the answer a
yes/no, and almost always does the idea survive even when the package does not.

## Summary

| Project | Verdict | Decisive reason |
|---|---|---|
| `ayghri/i-have-adhd` | **adopted** (adapted) | solves a real problem, MIT, 120 lines |
| `browser-use/browser-harness` | **adopted** (adapted) | CDP already installed and working |
| `obra/superpowers` | rejected as a package | ~4,900 tokens always in context with the hook |
| `github/spec-kit` | rejected as a flow, 3 ideas adopted | A/B gave 49/49 in both arms |
| `ruvnet/ruflo` | rejected | 353 MCP tools ≈ 65,663 tokens per request |
| `alexgreensh/token-optimizer` | rejected | PolyForm Noncommercial license |
| `addyosmani/agent-skills` | rejected as a catalog | ~2,421 tokens of catalog for little use |
| `DietrichGebert/ponytail` | rejected | own A/B: the 7-word prompt beats the skill |

---

## Adopted

### `ayghri/i-have-adhd` — adopted

Output shaping for a reader with ADHD. MIT, ~120 lines, self-contained.

**Why it stayed.** It solves a problem I had not named: starting is the hard step, and a vague
estimate does not register. It was installed as a skill (`i-have-adhd`, invocable through
`/i-have-adhd`) **and** as an always-active prompt rule, pruned from 1,541 to ~798 tokens (−49%).
The skill is the full version on demand; the rule is the summary that always holds.

**Honest caveat.** It was adapted, not adopted whole: the author's version assumes the output can be
freely reformatted, and that conflicts with harness contracts — `exit_plan_mode` presents the
complete plan, a deliverable goes out with `present`, a tool that fails is reported with the real
error. The adapted skill says explicitly that the harness contracts win over the block.

### `browser-use/browser-harness` — adopted

Browser automation via CDP.

**Why it stayed.** The daemon was already installed and working (Chrome on CDP at port 9222,
v0.1.10, installed via pypi), so the marginal cost was writing the skill, not setting up
infrastructure.

**Honest caveat.** Ten of the eighteen interaction documents of the original project are empty
drafts — files with a title and nothing inside. The adapted skill brings only what was verified, and
that is why it has 228 lines plus nine files in `references/`, instead of mirroring the original. An
operational detail that confuses: `BH_AGENT_WORKSPACE` is **unset**, and the real path is
`~/.config/browser-harness/agent-workspace/`; and the local Chrome is **one** shared browser, not
one per session.

---

## Rejected

### `obra/superpowers` — rejected as a package, kept as an idea

Skill framework. MIT, and the layout was compatible with DSH — the rejection was not a format
technicality.

**Why it fell.** With the hook, the cost was ~4,900 tokens **always in context**, regardless of the
task. It is the opposite of what a skill should be: a skill only costs when it is used, and a hook
that injects fixed content turns skill into a tax.

**What was left.** The plan format — which became `implementation-plans` and `plan-execution` — and
the specification-driven development loop, adapted along with it.

### `github/spec-kit` — rejected as a flow, kept as an idea

Official Spec-Driven Development. Evaluated twice: the first time the project was a set of
templates; the second time, after it grew to 581 files with an extension system and presets. The
flow verdict did not change between the two, but what can be reused did change.

**Why it fell.** The integration with DSH **exists** and is official, so the test was fair: I ran a
controlled A/B — a small project, two directories, with and without — and the result was **49/49
acceptance cases in both arms**. The flow did not change the outcome at the project size where it
was tested.

**Methodological caveat.** 49/49 in both arms is a **negative** result, not a proof of general
equivalence. The experiment was of a small project; `spec-kit` was designed for large, multi-person
specification, and nothing here says it fails in that case. What the test authorizes stating is only
this: at the size tested, the additional cost did not pay for itself.

**What was left.** Three ideas, not the flow:

1. The project **constitution** — became `project-constitution` plus one `docs/CONSTITUTION.md` per
   repository.
2. Explicit **acceptance criteria** before the implementation.
3. The **requirement quality checklist**, in the second pass. It is the most interesting of the
   three and the only one that did not yet exist here, so it became the skill `plan-quality`. Their
   concept is that the checklist is a *unit test for English*: it validates the quality of the
   **requirement writing** (completeness, clarity, consistency, coverage, edge cases), not whether
   the implementation works. And it comes with an ownership rule that is what makes a real
   difference for us: **the command that generates the checklist cannot mark the items** — the
   reviewer is the one who marks them. That closes a hole of ours: the acceptance criteria of
   `implementation-plans` are written and marked by the same agent, which thus corrects its own
   exam.

**What the second pass confirmed about our architecture.** The DSH integration says, in its own
code, that DSH discovers skills in `.dsh/skills`, that skills are invocable through the `/nome`
trigger, and that **"Project guidance in AGENTS.md at the repo root is loaded automatically by DSH,
so no context-file handling is needed here"**. That is, what we built is what they expect to find,
and they do not need to do anything more in DSH — their context-file handling exists for `CLAUDE.md`
and Copilot. And the `agent-context` extension keeps a managed block between explicit markers to
rewrite idempotently without erasing the user's content — exactly what I hand-rolled in
`install/adjust-paths.sh`, for the same reasons. We converged on our own; there was nothing to
import.

**What was examined and stayed out, with a reason.** `analyze` does cross-consistency between spec,
plan and tasks — we already do plan-against-constitution, which is the axis that matters here.
`converge` compares the code with the plan and adds what was missing as a new task, but our versioned
progress ledger in `plan-execution` already covers that. `clarify` asks targeted questions to close
gaps before specifying, and that is already in the harness rule for real ambiguity. The extension
and hook system (`.specify/extensions.yml`) is a plug-in point we have nowhere to use.

### `ruvnet/ruflo` — rejected

The starting point of all this: an MCP to "increase implementation capability".

**Why it fell — four reasons, each one sufficient on its own.**

1. **353 MCP tools ≈ 65,663 tokens per request.** The tool catalog enters every call. It is the cost
   of `superpowers` multiplied by thirteen, and permanent.
2. **`mcp toggle` is a stub.** The mechanism that would allow turning off what is not used does
   nothing — so there is no way to pay less than the full cost.
3. **`agent_spawn` only registers.** It does not execute: the agent is created and does not run,
   which makes the benchmark measure registration instead of work.
4. **Synthesized benchmark.** The gain numbers do not come from real execution.

**What was left.** No code. What stayed was the method: it was by trying to measure `ruflo` that it
became clear that the harness can be measured — and the measurements of this session (compaction,
subagent cost, tool cost) were born from that.

### `alexgreensh/token-optimizer` — rejected

Token optimizer via hooks.

**Why it fell — three independent reasons.**

1. **PolyForm Noncommercial license.** It is not open source for commercial use: free only below 5
   people **or** US$ 20k/month of revenue, and the restriction is in the README, not in the LICENSE
   file. A project that looks MIT on the first page is not.
2. **DSH not supported.** 3 of the 7 hook events it uses are missing. It is not a matter of
   adaptation: without the events, the hooks that would save do not fire.
3. **Measured gain of 11–16%**, and the "re-reads" line is marked as *Inconclusive* by the project
   itself.

**What was left.** The idea of pruning tool results — which already comes in
`dsh-compaction-tool-result-pruner`. The counterfactual of pruning, measured on the real data of
this session:

| `thresholdChars` | Savings |
|---|---|
| 8192 | 6% |
| 4096 | 21% |
| 2048 | 43% |
| 1024 | 62% |

The `standard` preset fixes 8192/4096/1024 — that is, the most conservative cut in the table.
Lowering the threshold is the available gain, but it is **not** worth forking the preset for a config
tweak: the preset is copied, and a copy stops receiving updates. It was recorded as an opportunity
not executed.

### `addyosmani/agent-skills` — rejected as a catalog

A catalog of 25 skills.

**Why it fell.** The catalog costs ~2,421 tokens to navigate, and most of the 25 do not apply to the
work here. The cost is permanent; the benefit is occasional.

**What was left.** Two ideas: `doubt-driven-development` (doubt your own conclusion before
delivering it) and `constraint-driven-development` (start from the constraints, not from the
possibilities).

---

### `DietrichGebert/ponytail` — rejected, after my own A/B

MIT, self-contained skill, and the author's benchmark is the best built one in this list: it has a
control arm, it tests its own counter-argument, and it publishes a correction after finding a
contamination bug in his numbers. That is why it was worth repeating the measurement instead of
accepting his.

**What I measured.** 6 tasks with an over-build trap and the answer in the stdlib, 3 arms (nothing /
ponytail / their seven-word prompt), 3 runs each, 54 headless sessions. Each task with a behavioral
check — their benchmark does not execute the code on axis 1 — and a contamination check per session.
Full report in `~/Work/ponytail-experimento/RELATORIO.md`.

**What held up.** The mechanism is real, and their magnitude reproduces where the trap is large: in
the task analogous to their date picker, −52% here against −54% there. And no arm brought down the
safety guard (3/3 in all of them), which confirms their 100% finding.

**Why it fell.** The seven-word prompt beat the skill in all 6 tasks: −55% against −29%. And the
ponytail's **total** differential came out larger than the baseline's (+37%), because its ruleset
tells it to leave an executable check and it obeyed in 12 of the 18 runs, adding 13.5 lines of test
that no other arm wrote. Conversation cost +37%, against −8% for the control.

**Honest caveat, and it is a big one.** My tasks are surgical, from 5 to 30 lines, and their gains
come precisely from large traps. It is plausible that I measured ponytail **outside the range for
which it was calibrated**, and a negative there is not a negative about it. Add to that the different
model (`deepseek-flash` against their Haiku 4.5, and their note that the effect depends on the
model) and the `n=3`. This is the weakest test in this list, not the most conclusive.

**What was of value was not the verdict.** It was discovering that the failure mode of "writing less"
— cutting what the specification requires — is real and does **not** stay where one expects: it
appeared in an ordinary task, not the security one, and only after I hardened the instrument. The
first version of my check reinterpreted the produced string with `URLSearchParams`, which
**normalized the defect it was supposed to catch**; two runs passed with a query string with no
encoding at all. A check that normalizes the defect is worse than no check, because it gives
confidence.

---

## What these evaluations changed in the harness

Two conclusions that are not about any specific tool and that are worth more than the verdicts:

**Catalog cost is permanent cost; skill is cost on demand.** Every rejection for size
(`superpowers`, `ruflo`, `agent-skills`) is the same account: content that enters every request
competes with the work. That is why the adopted architecture is a skill with a short description,
and not an inline instruction — and it is what the project's `AGENTS.md` rule says when it asks to
"prefer creating a skill to adding a rule here".

**Measuring the harness is worth more than measuring the tool.** What was left that is most useful
was not any verdict, it was the instrument: the compaction numbers (7 compactions, 792k → ~16k
tokens, ~98% discarded), the subagent numbers (93 dispatches, 389,753 tokens) and the tool numbers
(5,496 results, ~1.5M tokens, 65% in `bash`). They decide a new rule better than any opinion.
