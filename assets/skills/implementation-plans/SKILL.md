---
name: implementation-plans
description: "Use when planning a feature or multi-step change before touching the code, when turning a spec into an executable plan, or when the user asks for an implementation plan."
---

# Implementation plans

A plan is an **artifact that another session (or a subagent with no context) can execute
without guessing**. It is not a summary of what you are going to do — it is the
specification of what must exist at the end.

## Where the plan lives

`docs/engineering/plans/<YYYY-MM-DD>-<feature-name>.md`

One plan per feature. If a plan for the same day and subject already exists, **update it**
instead of creating a second one.

## Size

Plans are **lean**: typically 60–150 lines and 1–6 tasks. A 3,000-line plan almost always
means it should have been several plans, or that it is duplicating code the implementer
can write on their own.

A task is the **smallest unit that has its own test cycle** and that is worth a reviewer's
gate. Fold setup, configuration and documentation into the task whose deliverable needs
them; split only where a reviewer could reject one task and approve its neighbor.

## Before writing: read the constitution

If `docs/CONSTITUTION.md` exists, read it **before planning**. Every applicable principle
becomes a line in the *Compliance* section. A conflict between plan and constitution is
resolved **against the plan** — or the constitution is amended, with the justification
recorded.

If it does not exist, and the project has structural rules that repeat (parity between
databases, type gate, immutability, compliance), use the `project-constitution` skill to
create it before continuing.

## Mandatory header

```markdown
# <Feature> — Implementation Plan

**Goal:** one sentence about what this builds.

**Architecture:** 2–3 sentences about the approach and where it touches the system.

**Tech Stack:** relevant technologies.

**Spec:** path of the spec/design this plan implements (when there is one — the plan
argues from the spec, so the two travel together).

## Global Constraints

Requirements that hold for ALL tasks, one line each, with exact values copied from the
spec: minimum versions, dependency limits, naming and copy rules, platform requirements.

## Compliance

One item per **applicable** principle of `docs/CONSTITUTION.md`, cited by name, and how
this plan respects it. A principle that is not applicable to this feature does not enter
the list.

## Contract

The exact public surface this plan fixes **before** implementing: signatures and types,
input and output format, error and exit codes, message format. Whoever implements does not
choose this — it is decided here. Without a contract, two tasks executed by different
agents diverge in name and in format.

## Acceptance criteria

Verifiable checklist, one item per criterion. Each item is checkable by command, test or
concrete inspection — no "works well" and no "handles the cases".

- [ ] <criterion> — proven by: `<command>` or inspection of `<file>`
- [ ] ...
```

## Each task

```markdown
### Task N: <component>

**Files:**
- Create: `exact/path/file.ts`
- Modify: `exact/path/existing.ts:123-145`
- Test: `exact/path/test.test.ts`
- Report: `docs/engineering/ledgers/<plan-name>/reports/task-N.md`

> The **Report** field exists so execution does not return prose into the coordinator's
> context: the subagent writes the report into that file and returns only the path. We
> measured ~390 thousand tokens of prose returned in a session of 93 subagents, almost all
> of it lost to compaction.

- [ ] **Step 1: write the failing test**
- [ ] **Step 2: run it and confirm it fails (with the command and the expected error)**
- [ ] **Step 3: minimal implementation**
- [ ] **Step 4: run it and confirm it passes**
- [ ] **Step 5: commit**
```

**Interfaces — Consumes / Produces.** Include this block **only when** the tasks are
executed by different agents that see only their own brief (subagent-driven execution,
`workflow`, parallel worktrees). It is how an isolated implementer discovers the exact
names and types the neighboring task uses:

```markdown
**Interfaces:**
- Consumes: <exact signatures this task uses from earlier tasks>
- Produces: <names, parameters and types that later tasks depend on>
```

In a small single-session plan it is ceremony — omit it.

## No placeholders

These are **plan defects**, never write them:

- "TBD", "TODO", "implement later", "fill in details"
- "add proper error handling", "add validation", "handle edge cases"
- "write tests for the above" (without the test code)
- "similar to Task N" (repeat the code — whoever executes may read the tasks out of order)
- Steps that say **what** to do without showing **how**, in a step that involves code

## Self-review before delivering

Run it yourself, without dispatching a subagent:

1. **Spec coverage** — walk through every requirement and point out the task that
   implements it. A requirement with no task is a gap; add the task.
2. **Placeholder sweep** — look for the patterns above and fix them.
3. **Name consistency** — a `clearLayers()` in Task 3 and a `clearFullLayers()` in
   Task 7 is a bug. Make them match.

Those three steps are you checking your own work, and whoever checks their own work does
not find what they do not know they got wrong. For the review that separates whoever writes
from whoever judges, use the `plan-quality` skill: it produces a checklist over the plan's
**text** — completeness, clarity, consistency, coverage, edge cases — and the rule is that
**the reviewer is who marks the items**, never you. Tell the user that it exists and hand
over the items unchecked; do not mark any.

## Reconciliation with plan mode

When plan mode is active, there is **a single authority**, and it is not two:

1. In plan mode, **explore first** with reads that mutate nothing and produce the plan.
2. Present the plan through `exit_plan_mode` — that is how it becomes the user's approval.
   Do not use `todo_write` to track planning; it serves execution, after the plan is
   approved.
3. **After approval**, write the same content to
   `docs/engineering/plans/<date>-<name>.md`.

That is: `exit_plan_mode` is the **approval channel**; the file is the **persistent
record**. The content is the same — never keep two diverging versions.

## When NOT to write a plan

A one-file change, a point fix, a text tweak, a configuration commit. For those, the
ceremony costs more than it delivers. Plan when there are **multiple dependent steps** or
when another session/agent will execute.

## Handoff

When you finish, offer execution and use the `plan-execution` skill, which brings the
versioned ledger and the per-task review gate.
