---
name: test-quality
description: "Use when writing, reviewing or trusting a test suite, and whenever a green result is the basis of a decision. Covers the two ways a test passes without proving anything: the assertion that checks a value the test itself invented, and the fixture that leans on the implementation. Also use when an evaluation number looks too good, or before treating a 100% as approval."
---

# Test quality

A green suite is a **claim**, not a proof. It claims "the system does X" and it is perfectly
possible that it is measuring something else.

This harness already had one instance of this noted in `kikin-testes`: *the teardown swallows
failures, and a teardown that failed is indistinguishable from one that passed*. The two failures
below are that same class, generalized — and they hold as much for a unit test as for an acceptance
suite and for a benchmark.

## 1. The expected value was born in the test

The most reliable symptom is **not** `toBeDefined()` — that is legitimate in plenty of places. It is
the expected value being built inside the test file, in a way that satisfies the assertion even if
the system produces nothing.

Two common shapes:

- a helper that **returns** the asserted field, with the value written by hand (`expiresInSeconds: 900`);
- a mock that echoes the value the test passed in, and the assertion checking the echo.

The second case can be legitimate: if the stub is the **instrument of observation** and the
assertion verifies that the middleware passed the data along, the test is worth it. The first never
is — the system does not take part.

### How to look for it

A mechanical scan finds the coarse cases: **an asserted field that does not exist in any production
file**. Write and run this at the project root:

```python
"""Finds fields the test asserts but the server never produces."""
import re, sys, pathlib

root = pathlib.Path(sys.argv[1])
tests, sources = [], []
# .ts AND .tsx: an `rglob("*.[t]sx")` matches ONLY .tsx and leaves every .ts source invisible,
# which turns each legitimate field into a phantom. That was exactly the mistake in the first version.
for path in list(root.rglob("*.ts")) + list(root.rglob("*.tsx")):
    as_text = str(path)
    if "node_modules" in as_text or "/dist/" in as_text or ".worktrees" in as_text:
        continue
    (tests if (".test." in path.name or ".spec." in path.name) else sources).append(path)

known = set(re.findall(r"[A-Za-z_][A-Za-z0-9_]*",
                       "\n".join(path.read_text(errors="ignore") for path in sources)))

# The key needs a `:` after it (otherwise values like `Maria` get in), and the lookbehind avoids
# matching part of another word — without it the `T09` of `2026-01-01T09:00:00` gets in as a field.
KEY = re.compile(r"(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\s*:")
# `.body` is also the DOM's: without this list, `document.body.innerHTML` becomes a "phantom field".
DOM_API = {"innerHTML", "textContent", "className", "outerHTML", "innerText",
           "style", "dataset", "tagName", "nodeType"}

suspects = {}
for test_file in tests:
    body = test_file.read_text(errors="ignore")
    fields = set(re.findall(r"\.body\.([A-Za-z_][A-Za-z0-9_]*)", body)) - DOM_API
    for block in re.findall(r"(?:toMatchObject|objectContaining)\(\{([^}]*)\}", body, re.S):
        fields |= set(KEY.findall(block))
    for field in fields:
        if field not in known:
            suspects.setdefault(field, []).append(test_file.name)

print(f"sources: {len(sources)} | tests: {len(tests)}\n")
if not suspects:
    print("no phantom field found")
for field, files in sorted(suspects.items(), key=lambda kv: -len(kv[1])):
    print(f"  {field:34} in {len(files)}: {', '.join(sorted(set(files))[:4])}")
```

**This generates candidates, not verdicts.** Five ways it lies, all already observed:

1. A stub the test builds on purpose exists only in the test, and there the field is legitimate.
2. Without the mandatory `:`, the scan captures values instead of keys, and it becomes noise.
3. Without the lookbehind, it bites pieces of timestamps — `T09` came out of `2026-01-01T09:00:00`.
4. Covering only `.ts`, it ignores every `.tsx` test: in one repository that was 41 of 235 files.
5. An `rglob("*.[t]sx")` looks like it covers both and covers only `.tsx` — then the `.ts` **source**
   stays invisible and every field becomes a phantom. Erring on the side of noise is worse than
   erring on the side of silence, because noise looks like a finding.

Every hit needs checking in the source. And the scan only catches the coarse case: a value hardcoded
in a helper passes it whenever the field name also exists in the server. For those, the only check
is to read.

### The example that originated this skill

In `securityAcceptance.test.ts` of `kikin-admin`, the test whose title promised *"success, 900s"*
checked `expiresInSeconds: 900` — and the test's own helper wrote that field before the spread:

```js
return { salonId: res.body.salonId, expiresInSeconds: 900, ...res.body };
```

The service contract returns `expiresAt`, a timestamp; `expiresInSeconds` **did not exist in any
production file**. The assertion passed with the server returning `{}`. Replaced by a window over
`expiresAt`, it became sensitive enough to catch 10 ms of difference — which is exactly the opposite
of the previous behavior.

## 2. The fixture leans on the implementation

Here there is no reliable scan: it requires reading and one question. **Was the expectation derived
from the code, or from the requirement?**

Cases that deserve distrust:

- the expected value is computed by calling the same function under test, or a helper it also uses;
- the golden file was regenerated from the implementation after it changed;
- the test database seed comes from the same migration the feature exercises, so a wrong schema
  passes;
- the evaluation dataset overlaps the training one, or the few-shot one.

**Evidence that this is not theoretical.** `MiniMind` reports having reached **~97% on ceval** on a
contaminated subset, and says in its own README that the number means nothing. On the same page,
their `minimind-3-exam` gains ~2.9 points on seven benchmarks **without injecting any knowledge at
all**, just aligning the input format — that is, the evaluation was measuring format, not
capability. Contamination and format are the two sides of the same problem: the suite measures what
it puts in, not what the system does.

### The negative test

An isolated positive case does not prove a rule. `policyAllows(user, "x") === true` passes with an
implementation that always returns `true`. For every permission, list, filter or validation the test
claims to allow, ask which neighboring assertion asserts the **denied case**. Without it, the rule
is not covered.

## Before trusting a green

1. Run the scan where it applies and check every candidate in the source.
2. For every assertion that claims a value, ask where the expected one came from.
3. For every permission or validation, look for the test of the denied case.
4. Before treating a 100% as approval, ask whether the suite measures capability or format — and
   whether the fixture leans on what is being measured.
