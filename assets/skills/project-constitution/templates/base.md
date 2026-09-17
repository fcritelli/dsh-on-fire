# Constitution — <project>

**Version:** 0.1.0 | **Ratified:** <YYYY-MM-DD> | **Last amendment:** —

> **How this file came to be:** it was seeded from the base template of the skill
> `project-constitution`. The sections marked **[universal]** do not depend on the project and
> come ready; the ones marked **[project]** have to be filled in from the code, the ADRs, the
> existing gates and the repository's skills — never invented.

## How to use

Read before planning. Every plan carries a **Compliance** section citing each applicable
principle and how that plan respects it. A conflict between plan and constitution is resolved
**against the plan** — or this constitution is amended, with the justification recorded here.

**Every verification names the command that produces the verdict.** A dimension with a number
and no command is an aspiration, not a constraint. And loosening the ceiling is loud,
tightening is silent: lowering a threshold, skipping a test, adding a suppression or pulling a
check out of the fast stage are changes that announce themselves in review, not ones that pass.

---

## Principles **[project]**

> Fill in from the repository. Five to eight principles is the useful size. A rule without
> concrete verification is removed — if you cannot say how to check it, it is a preference,
> not an inviolable. Point to the skill that details it; do not copy its body.

### I. <principle name>

**Rule:** <the inviolable, in the imperative, in one or two sentences.>

**Verification:** `<command>` or inspection of `<file>`.

**Detail:** skill `<name>`.

### II. <principle name>

**Rule:** …

**Verification:** …

**Detail:** skill `<name>`.

---

## A subagent is not a credential boundary **[universal]**

**Rule:** A dispatched agent runs in the same process, in the same directory and with the same
environment as the parent. It reaches the `.env` and every datum the parent reaches. Separating
roles — implementer, reviewer — does **not** create credential isolation; `toolFilter`
restricts tools, not secrets. Do not delegate to a subagent anything that requires an access
limit it does not have.

**Verification:** when designing a workflow with subagents, record in writing which sensitive
data each one reaches and why that is acceptable. If the project handles personal data, a
workflow that exposes PII to a subagent goes through the same criterion a route would.

---

## Floor (always applied, without configuration) **[universal]**

Regardless of any number chosen:

- No new suppression: `@ts-ignore`, `eslint-disable`, `# noqa`, `# type: ignore`
- No unimplemented stub: `throw new Error("Not implemented")`, empty `catch {}`
- No test skipped or deleted without justification in the commit
- No secret in the code
- **This constitution is not weakened to make a change pass**

---

## Exceptions **[universal]**

An exception to any principle is recorded here — not in the code, not in the commit message:

| ID | Principle | Path | Reason | Owner | Expires |
|----|-----------|------|--------|------|--------|

An exception with no owner and no expiry is not an exception: it is a lowered ceiling. Default
expiry: 90 days.

---

## Notes for whoever seeds this file

**What comes from the project, not from the template:**

- Structural constraints (parity between databases, per-tenant isolation, migration
  immutability) — **only if the project already has them**.
- Mandatory gates, each with the command that produces it.
- Data and compliance rules, with the legal reference where there is one.
- Explicit prohibitions (new dependency, `any`, writes outside scope).

**What does NOT go in:** style preference, formatting, an already-settled library choice, or
detailed procedure — that is the job of the project's skills.

**If the project is new and empty:** the constitution starts with practically only the
**[universal]** part. That is correct, not incomplete. A project principle enters when the
first structural decision is taken — and the criterion is the usual one: *"promote what
repeats"*, a rule that appeared in three consecutive reviews becomes a principle.
