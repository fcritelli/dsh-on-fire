---
name: plan-quality
description: "Use when reviewing the quality of the TEXT of a plan or specification before executing it — whether it is complete, quantified, consistent with itself and covers the edge cases — and not to test whether the implementation works. Also use when a plan will be executed by another session or subagent and you need to know whether it is enough."
---

# Plan quality

This checklist does not test the code. It tests the **text of the requirement**.

If the specification is code written in Portuguese, this is its test suite. The criterion is
always the same: **can an implementer without context execute the plan without guessing?** Where
they would have to decide something on their own, the plan is incomplete — and the decision will
come out different in each session that executes it.

The most common confusion, and the one this skill exists to undo: **acceptance criteria are not
this checklist.** Those test the implementation ("does the code do X?"), are written by the author
of the plan and verified by command or test. This one tests the text itself ("does the plan state X
precisely enough?"), and whoever judges is not whoever wrote it. The two coexist, and the order is
this one first: there is no point verifying code against an ambiguous requirement.

## The ownership rule

**Whoever generates the checklist does not tick the items.** The agent writes `- [ ]`; the human
reviewer ticks `- [x]`. An item ticked by the author of the review is not a review — it is the
agent grading its own exam.

When the reviewer explicitly asks you to evaluate the items, evaluate and explain your reasoning,
but leave the ticking with them. If you are not sure whether a criterion was met, the item stays
`[ ]` — uncertainty is exactly the signal the checklist exists to produce.

Tick `[x]` only when the **quality criterion of the requirement** is met. That says nothing about
the implementation having been done.

## Where the review lives

`docs/engineering/reviews/<YYYY-MM-DD>-<feature-name>.md`

One review per plan. If the plan changes after the review, the items the plan invalidated go back
to `[ ]` — the review is of the plan as it is now, not of yesterday's plan.

## The five categories

Each checklist item belongs to one of them, and the identifier is `QR-NNN` (requirement quality),
so the reviewer can cite an item in review.

### Completeness — is a requirement missing?

What the plan **does not mention** is what nobody will build. Look for what was omitted, not for
what was badly written.

- `[ ] QR-001` Does the export define both formats, instead of only saying it "is exportable"?
- `[ ] QR-002` Does every field have its type, requiredness and default value declared?

### Clarity — is the vague quantified?

Every adjective without a number is a decision left to the implementer. "Fast", "large",
"friendly", "robust" and "handles the cases" are symptoms.

- `[ ] QR-010` Did "must be fast" become a number with a condition? (e.g. "under 300 ms for 95% of
  calls with 100 thousand records")
- `[ ] QR-011` Is "prominent" quantified in size or position, instead of adjectivized?

### Consistency — do two places disagree?

It is the defect that only shows up in **cross**-reading. No excerpt is wrong on its own; they
contradict each other.

- `[ ] QR-020` Is the field declared optional in task 2 the same one required in the contract of
  task 5?
- `[ ] QR-021` Is the name of the function, the route or the table identical in every mention?
- `[ ] QR-022` Does what the context section assumes match what the contract section fixes?

### Coverage — does every path have a requirement?

For each operation, the paths that are not the success one.

- `[ ] QR-030` Does the plan say what happens without permission?
- `[ ] QR-031` Does it say what happens when the record no longer exists?
- `[ ] QR-032` Does it say what happens when the external dependency is down or answers with an
  error?

### Edge case — what did no sentence foresee?

The usual list, applied to the plan's domain: **empty, one, many, duplicated, simultaneous,
partial, out of order, repeated, huge, empty again.**

- `[ ] QR-040` Were an empty collection and a collection with one element considered?
- `[ ] QR-041` Does large volume change the design? (paginated? indexed? streamed?)
- `[ ] QR-042` Do two simultaneous executions produce a duplicated effect?

## How to run it

1. **Read the whole plan before writing any item.** An item written mid-reading tends to be an item
   about the excerpt, not about the plan.
2. **Read the constitution**, when it exists (`docs/CONSTITUTION.md`, or `docs/CONSTITUICAO.md` in a
   project that already uses that filename), and add one consistency item
   per applicable principle. A plan that contradicts the constitution fails here, not in execution.
3. **Re-read looking for contradiction between distant sections** — it is the category that
   requires going back and forth, and the one that pays off most.
4. **Write the items as closed questions**, answerable with "yes" or "no". "Does the plan define the
   behavior on name collision?" is an item; "evaluate name handling" is not.
5. **Do not invent requirements.** The item points at the gap in the text; whoever knows the product
   decides whether it should be filled.
6. **Do not tick anything.** Hand over the checklist and say how many items stayed open.

## Template

```markdown
# Review: <feature>
Plan: <plan path>
Date: <YYYY-MM-DD>
Reviewer: <who reviews>

## Completeness
- [ ] QR-001 <closed question>

## Clarity
- [ ] QR-010 <closed question>

## Consistency
- [ ] QR-020 <closed question>

## Coverage
- [ ] QR-030 <closed question>

## Edge case
- [ ] QR-040 <closed question>

## Notes
<gaps that did not become an item, and what you could not judge>
```

## What this review is not

It is not a test of the implementation — that is `plan-execution`, with independent review per task.
It is not a review of architecture nor of the feature's merit: if the plan is well written and
describes the wrong thing, this checklist passes and the discussion is a different one. And it is
not an approval gate: it shows where the plan leaves the implementer guessing, and the reviewer
decides what to do about it.
