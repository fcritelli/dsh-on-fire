---
name: project-constitution
description: "Use when creating, reviewing or applying a project constitution (docs/CONSTITUTION.md — or docs/CONSTITUICAO.md in projects that already use that filename) — the inviolable principles every plan must respect — or when a plan is about to contradict a structural rule of the repository."
---

# Project constitution

A constitution pins the project's **inviolables** into a single versioned file, so that
every plan is checked against them **before** it becomes code — and not discovered in
review, after the rework.

Without it, every session rediscovers the same rules (or violates them for not knowing
them), and the only barrier left is the reviewer.

## Where it lives

`docs/CONSTITUTION.md` at the repository root. One file per project, versioned. Projects
that already exist may already use `docs/CONSTITUICAO.md` — it is the same file and the
same rules apply to it.

## What goes in — and what does NOT

**Goes in:** what is inviolable and verifiable:

- structural constraints (parity between databases, per-tenant isolation, immutability)
- mandatory gates (type ratchet, suite that has to stay green, build)
- data and compliance rules (LGPD, retention, what may never leak)
- explicit prohibitions (new dependency, `any`, writes outside scope)
- conventions that break the system if ignored

**Does not go in:** style preference, formatting, an already-settled library choice, or
detailed procedure — that is the job of the project's skills. The constitution **points**
to the skill; it does not duplicate it. Duplicating guarantees divergence.

## Format

Every principle has a **name**, a **rule** and a **verification**. Verification is what
separates a constitution from a letter of intent: it has to be a command, a checkable file
or a concrete check.

```markdown
# Constitution — <project>

**Version:** 1.0.0 | **Ratified:** YYYY-MM-DD | **Last amendment:** YYYY-MM-DD

## How to use

Read before planning. Every plan carries a "Compliance" section citing each applicable
principle and how that plan respects it. A conflict between plan and constitution is
resolved **against the plan** — or the constitution is amended, with the justification
recorded.

## I. <principle name>

**Rule:** <the inviolable, in one or two sentences, in the imperative.>

**Verification:** <command or concrete check.>

**Detail:** skill `<skill-name>` — <what it covers that this rule does not.>
```

## Maintenance rules

1. **An amendment is versioned and justified.** Bump the version, date it and record the
   reason in the file itself. A silent amendment is the defect the constitution exists to
   prevent.
2. **Reduce, do not inflate.** A principle that changes no project decision does not belong
   here. Five to eight principles is the useful size; twenty is a document nobody reads.
3. **A rule without verification is removed.** If you cannot say how to check it, it is not
   inviolable — it is a preference.
4. **Promote what repeats.** A rule that shows up in three consecutive reviews becomes a
   principle.
5. **Point, do not copy.** The operational detail lives in the project's skill.

## New project (empty folder)

There is no code to extract from, and the constitution is **per repository** — there is no
automatic inheritance from another project. Start from the template:

`templates/base.md`, next to this skill.

It already brings the **[universal]** part ready: the floor (no new suppression, no stub, no
skipped test, no secret, and the constitution is not weakened to make something pass), the
rule that every verification names the command that produces the verdict, the exceptions
table with owner and expiry, and the subagent credential boundary — which is a harness fact
and holds in any project.

The rest starts empty, and that is **correct**, not incomplete. A new project has no
structural constraint at all yet; inventing one now is guessing. The constitution **grows**:
a project principle enters when the first structural decision is made, by the usual
criterion — *"promote what repeats"*.

**What carries over from the Kikin family is not the text, it is the pattern.** Parity
between databases, per-tenant isolation, migration immutability, a dedicated door for PII,
ratchet instead of target — each one becomes a principle in the new project only if that
project **actually** has the corresponding structure. Copying "parity between `kikin` and
`kikin_free`" into a single-database project is noise that teaches people to ignore the whole
constitution.

## How to create one from an existing project

Do not invent principles. Extract them:

1. Read `AGENTS.md`, `CLAUDE.md` and the ADRs (`docs/ADR-*.md`, `docs/design/`).
2. Read the project's skills — they already encode mandatory procedures.
3. Look for the **gates that already exist** (typecheck/test/lint scripts with a ratchet,
   hooks, CI checks). An existing gate is a principle already ratified in practice.
4. Look for what already broke: defensive error messages, "do not remove" comments, tests
   that lock behavior by name.
5. Write **only** what would change a plan decision.

## Before delivering

- Every principle has a rule **and** a verification.
- No principle duplicates the body of a skill — all of them point to it.
- The file fits on one screen.
- The user ratified it (the version and the date are theirs, not yours).
