---
name: plan-execution
description: "Use when executing an already-approved implementation plan (docs/superpowers/plans/) task by task, with subagents, a versioned progress ledger and an independent review after each task."
---

# Plan execution

Executes an approved plan with **one subagent per task**, an independent review after each
one, and a broad review at the end. The ledger is the trail — and, unlike local scratch, it
is **versioned**.

## Prerequisites

1. The plan exists at `docs/superpowers/plans/<date>-<name>.md`.
2. An isolated workspace — a worktree, when the project uses `.worktrees/`. **Never** start
   implementation on `main`/`master` without explicit consent.
3. Read the plan **once**. If it cites a spec, read the spec too: it is the authority the
   plan argues from, and a conflict inside the plan is resolved against the spec.
4. The plan went through the `plan-quality` skill. If it did not, run it **before**
   dispatching the first task: an ambiguous requirement is not resolved by the implementer,
   it is guessed by them — and each task guesses in its own way. The checklist is over the
   plan's text, and the reviewer is who marks the items.

## The ledger — versioned

`docs/superpowers/ledgers/<plan-name>.md`

The subagent reports live in a sibling directory with the same base name,
`docs/superpowers/ledgers/<plan-name>/reports/task-N.md` — that directory is what this text
calls `<ledger-workspace>` below. The ledger is a **file**, the reports are a **directory**
next to it, never one inside the other.

**Do not** use `.superpowers/sdd/` or a git-ignored directory: the ledger is the record of
the work's decisions and evidence, and it has to survive `git clean -fdx`, a machine change
and someone else's review. The ledger is committed together with the code.

**Update after every task, not at the end.** In a long execution compaction is the rule, not
the exception: we measured **7 compactions in 330 turns**, each one discarding ~98% of the
context (792k → ~16k tokens). After any compaction, **re-read the ledger and the `git log`
before acting** — your memory of what was already done did not survive, and the most
expensive failure mode is re-dispatching a completed task.

Structure — keep the first line exactly like this, so the ledger identifies itself:

```markdown
# Ledger — plan: docs/superpowers/plans/<file>.md

## Pre-flight Conflict Scan
| Task pair | Produces / Consumes | Status |
|---|---|---|
| Task 1 & Task 2 | <file/interface of each> | Clean / CONFLICT |

Base: commit `<sha>` — working tree <clean/dirty> at the start.

## Decisions (with the user, <date>)
- **R1:** <what was decided> — <why> — <cost if wrong>.
- **R2:** ...

## Progress
- [x] **Task N:** <what was done> — evidence: `<RED> → <GREEN>`, exact
      counts, reviewer `<id>` and verdict.
- [ ] **Task N+1:** ...

## Round gate
- acceptance criteria: <N/N met, with the evidence for each>
- suite: <N files / N tests>
- typecheck: <errors>
- build: <ok/failure>
- `graphify update .`: <artifacts rewritten>
```

**Why the ledger exists:** conversation memory does not survive compaction. The most
expensive failure mode observed so far is a controller losing its place and
**re-dispatching tasks already completed**. After compacting, trust the ledger and the
`git log`, not your memory. A task with `Task N: complete` in the ledger is done — do not
re-dispatch it.

## Long session and compaction

Context is not renewable, and in a long execution three things degrade together: recall of
what is in the middle of the window, the fidelity of the summary compaction produces, and
your own memory of what was already done.

- **Choose the moment of compaction.** The harness compacts when the context fills up — the
  worst possible instant, in the middle of a task. Use `/compact` at the seams, where you
  choose what stays.
- **Treat every compaction as a session boundary:** re-read the ledger and the `git log`,
  confirm which task you are on, and only then continue.
- **One session per feature**, with the ledger as the handoff. It is not more expensive —
  the state already lives in it.
- **If everything has been in the same session for a long time, the problem is not the size
  of the session** — it is the state living in the conversation instead of in an artifact.
  Externalize before continuing.

## Pre-flight conflict scan

Before dispatching Task 1, sweep the plan and **write down what you checked**:

- tasks that contradict each other or contradict the Global Constraints
- any pair of tasks that shares a file or an interface — one line per pair, with what one
  produces against what the other consumes
- each task against itself: does the test it specifies match the code it specifies? do the
  files it creates match the ones it later touches?

The result is **a table, not a verdict**. "The sweep is clean" without the rows is not a
sweep you performed. Resolve every finding **before** executing and record the ruling in the
ledger.

## The per-task loop

### 1. Dispatch the implementer

Use the harness's native primitive:

- **`subagent`** — fresh context, a child isolated per task. It **does not see this
  conversation**: you build exactly the context it needs. This is the default.
- **`subagent_fork`** — inherits the conversation. Use it **only** when the child needs the
  current thread (reviewing what was just done). It is expensive: it pays the parent's whole
  context as input. To implement from scratch, `subagent`.

**Deliver artifacts as a file, not pasted into the prompt.** Everything you paste into a
dispatch stays resident in your context until the end of the session and is re-read on every
turn. Write the task brief into a file and have the child **read** it. The dispatch carries:
where the task fits, the brief's path, interfaces decided by earlier tasks that the brief
cannot know about, and your resolution of any ambiguity.

**The return is also an artifact, not prose.** The child writes the report to
`<ledger-workspace>/reports/task-N.md` and returns **the path and three lines of summary**.
Measured reason: in a session of 93 subagents, the prose returns added up to **~390 thousand
tokens** in the parent's context — and seven compactions summarized almost all of it away.
Return prose costs the parent context **and** is volatile; a file survives every compaction
and the reviewer can re-read the original instead of the summary.

Record the `BASE` (`git rev-parse HEAD`) before dispatching — the review diff and the
correction loop need it.

### 2. While the child works

**Do not poll.** The runtime notifies you when the child settles. Meanwhile, do local work:
update the ledger, prepare the review package for the previous task, read reports. Several
independent children can be dispatched **in the same message**.

### 3. Independent review

Generate the review package as a **file** (`git diff <BASE>..HEAD` plus the task's tests) and
dispatch a **new reviewer** — not the same child, not one that inherits the implementer's
conversation. The reviewer judges two things, separately:

1. **Compliance with the spec** — does the task do what the plan/spec says?
2. **Code quality** — does the diff have a defect the rubric treats as such?

### 4. Correction loop

Findings go back to the implementer. **Fix it, do not accept "almost":**

- Rounds 1–3: continue the same child with `send_message`.
- Rounds 4–5: dispatch a **new** implementer, with a **more capable model** — if the same
  agent did not solve it in three rounds, insisting with it is waste.
- After each correction, **scoped re-review** of the correction's diff, not of the whole
  task.
- At the 5-round limit, adjudicate every open finding: ruling in the ledger and move on.
  Stop only if **every path forward is guessing**.

Choose the model by role: a mechanical task with a complete spec → cheap model; integration
across files → mid-tier; architecture and the final review → the most capable one.
**Specify the model in the dispatch** — omitting it inherits your session's model, usually
the most expensive.

## Rulings, not stops

A plan under execution does not wait for a human. Conflict, ambiguity, plan defect —
**decide**, record it in the ledger as `Ruling: <decision> — <why> — <cost if wrong>`, and
move on. The spec is the authority; the plan is the argument; your judgment resolves what
neither of them answers.

**Only four things stop execution:**

1. an irreversible or destructive operation;
2. a security-sensitive action;
3. a side effect **outside the worktree** that the norm says to ask about first — merge,
   push to a shared branch, publish;
4. a plan so broken that every path forward is guessing.

## Parallelism — when to use it

**Genuinely independent** tasks (disjoint files, no shared interface) can go together into a
`workflow`, which runs in real parallel and returns a structured result. Tasks that share a
file or an interface **must not**: the review gate between tasks is a quality choice, not a
limitation to work around.

Small work of the same shape repeated across several files: **one** dispatch with the
complete list, reviewed as a single diff. Not one subagent per file.

## Round gate

Before saying you are done, run what the project requires and **record the exact numbers in
the ledger**. Do not assume: execute.

1. **The plan's acceptance criteria, one by one.** Walk the list and mark each item with the
   evidence that proves it. An item with no proof is not met. It is this list that defines
   "done" — not your impression that it turned out good.
2. The project's test suite.
3. Typecheck and build, where they exist.
4. `graphify update .` when the project versions the graph.

### The evidence has to be the real artifact

**"The tests pass" is not proof that it works.** A green suite, a clean typecheck, an OK build
and a subagent report are **proxies**. The proof of a criterion is the observation of the
behavior that motivated the change: exercise the real path — open the screen, redo the
request, read the value written to the database, inspect the `git diff`.

- **Trust artifacts, not self-reports.** When verifying delegated work, inspect the real
  output (diff, file content, behavior at runtime), never the summary of whoever executed it.
  The first three items in this list are what the **implementer** runs; the acceptance
  criterion is what **you** observe.
- **When verification fails, suspect the observation method before suspecting the system.**
  Stale output, cache, an old screenshot and derived state mislead.
- **When it works, turn the criterion into a deterministic script** that redoes the same
  comparison — that way the reviewer re-executes instead of trusting your word. Keep the
  output in the ledger.

If the plan has no acceptance criteria, **go back to the plan and write them before
continuing** — or record in the ledger that the round was accepted without them, which is an
explicit decision, not an oversight.

**If the round touched the database, run the test-data cleanup** — and if the project has its
own skill for that, it takes precedence over this one.

### Guarding the ceiling — five moves that lower the bar

An agent that hits a red check takes the cheapest path to green. When reviewing the round's
diff, look for these five — all visible in the `git diff`, with no extra tooling:

1. **The threshold moved.** The baseline went up, severity went down, the check left the fast
   stage. Compare the baseline file against the state at the branch point.
2. **A test got easier.** `.skip` added, test file deleted, assertion removed from a test that
   kept existing.
3. **A verifier was silenced.** A new `@ts-ignore` or `eslint-disable`. Four deserve special
   attention: `istanbul ignore` takes code out of coverage instead of testing it,
   `Stryker disable` hides a surviving mutant, `nosemgrep` and `gitleaks:allow` do the same
   with a security finding.
4. **Work was left unfinished.** A stub that throws, an empty `catch {}` turning failure into
   silence, a `TODO` in place of the implementation.
5. **An exception appeared.** A new row in the exceptions table that nobody discussed.

A finding of this kind goes into the ledger with the file and the line. **Tightening the
ceiling can be silent; loosening it has to be loud.**

Not every check is equally circular. Ask: *can the agent make this pass by writing code that
does not work?* An external tool (axe, osv-scanner, Lighthouse) cannot be argued with; a
project lint rule has a human owner; a home-grown suite is the only genuinely circular one. A
ceiling made only of the third category is worth less than one with an outside opinion —
check that at least one external constraint exists.

### Doubt in flight — before the decision sets

The per-task review is a verdict over a finished artifact. This is something else: a
**non-trivial** decision becomes an explicit claim and is submitted to a fresh-context
reviewer **biased to refute**, while correcting is still cheap.

Non-trivial is when at least one holds: it introduces or changes branching; it crosses a
module boundary; it claims a property the type does not verify (thread safety, idempotency,
ordering, invariant); the correction depends on context the future reader cannot see; the
blast radius is irreversible. Renaming, formatting, moving a file and reading existing code
are **not**.

1. **CLAIM** — the decision in two or three lines, and why it matters. If it does not come
   out compact, it is vague, it is not a decision.
2. **EXTRACT** — the artifact (diff, function, 3–5-sentence proposal) and the contract it has
   to satisfy. **Strip out your reasoning.**
3. **DOUBT** — dispatch a `subagent` (fresh context — **not** `subagent_fork`, which inherits)
   with an adversarial prompt, problems only. **Pass the ARTIFACT and the CONTRACT, never the
   CLAIM:** handing over the conclusion biases the reviewer to agree.
4. **RECONCILE** — the return is data, not a verdict; you remain the orchestrator. Classify in
   this order: contract misread → valid and actionable → valid trade-off → noise. Re-read the
   artifact before accepting; a fresh reviewer errs from lack of context.
5. **STOP** — a bounded cycle, not recursion. Stop when only trivial findings come back, or at
   3 cycles (escalate to the user), or when they say so. If "3 is not enough" because the
   artifact is large, the artifact is what is too large: go back to step 2 and decompose it.

**Sign of doubt theater:** in two or more cycles with a substantive finding, **zero**
classified as actionable — you are validating, not doubting. Stop and escalate.

## Final review

All tasks complete → **one** broad review of the whole branch, in a new agent, with the most
capable model. Findings → **one** correction dispatch and **one** scoped re-review. Residuals
go to the ledger with a ruling.

## Project skills take precedence

This skill is generic. Repository conventions — migration immutability, LGPD gates, test-data
cleanup, access review, deploy — come from the project's skills and **win over** what is
written here. Load them before executing.
