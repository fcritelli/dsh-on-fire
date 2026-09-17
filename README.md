# dsh-on-fire

Opinionated, configurable improvements for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), packaged as a **profile bundle** — DSH's native plugin form.

One command installs prompt rules, seven workflow skills and two MCP servers. Each
part turns on and off by configuration.

The full catalog, with the evidence for each item and how to turn it off, is in
[`docs/IMPROVEMENTS.md`](./docs/IMPROVEMENTS.md). The tools that were evaluated and **rejected** —
with the reason — are in [`docs/EVALUATIONS.md`](./docs/EVALUATIONS.md).

## What comes inside

**Four behavior rules**, as prompt sections that apply in every session and every workspace:

| Rule | What it does |
|---|---|
| `language` | every output to the user in Brazilian Portuguese, without needing to be asked |
| `waiting` | wait for a subagent/job by notification or by one call with `wait`, never in a loop |
| `graphify` | query the graph first, sync afterwards, and never read the raw `graph.json` |
| `adhd` | output style for a reader with ADHD |

**Seven skills:**

| Skill | What it does |
|---|---|
| `project-constitution` | creates, reviews or applies `docs/CONSTITUTION.md` (or `docs/CONSTITUICAO.md` where a project already uses that name) |
| `implementation-plans` | plans a multi-step change before touching the code |
| `plan-quality` | reviews whether the plan's TEXT is enough, before executing it |
| `plan-execution` | executes an approved plan task by task, with ledger and review |
| `test-quality` | audits whether the suite measures capability or just format |
| `browser-harness` | every web interaction: automation, scraping, testing |
| `i-have-adhd` | the invocable version of the `adhd` rule, loaded by `/i-have-adhd` |

**Two MCP servers:** `graphify` (code knowledge graph) and `lgpd` (compliance support).

## Installation

You need `pnpm` on the PATH — `dsh plugin` forwards the arguments to it in the profile directory.

```bash
# 1. install the bundle into the profile — straight from GitHub
dsh plugin --profile web add git+https://github.com/fcritelli/dsh-on-fire.git

# 2 and 3. (optional) the install scripts live in the REPOSITORY, not in your directory,
# because step 1 only copies the package into the profile.
git clone https://github.com/fcritelli/dsh-on-fire && cd dsh-on-fire
./install/adjust-paths.sh        # adapts the MCP paths to this machine
./install/install-graphify.sh    # installs graphify and the key wrapper

# 4. restart DSH
```

Step 1 is idempotent and **reconciles on its own** the profile's `dsh.profile.bundles` list: `dsh`
detects that the package declares `dsh.bundle.patch` and adds it to the layer stack. There is no need
to edit `package.json` by hand.

Steps 2 and 3 are optional and independent: without them, the bundle works, but the MCP fall back to
the bundle's portable `command`s (`graphify-mcp`, `npx`) and graphify won't have the Gemini key.

`pnpm` warns `missing peer @deepseek-ai/cordis` and `missing peer @deepseek-ai/dsh-skill`. The warning is
expected and harmless: `dsh-base` already brings those two packages into the profile tree, and that is where
`dsh-on-fire` resolves them from at runtime. Verified by installing from GitHub into a clean profile and
booting: the four rules and the seven skills load.

### Verify

```bash
# did the bundle's rows get into the composed configuration?
dsh --profile web --dump-config | grep -A3 'dsh-on-fire'

# does the plugin register what it should? (runs without DSH, with a fake context — needs the clone)
node test/verify.mjs
```

After restarting, ask in English and see whether the answer comes back in Portuguese — it is the fastest
test that the `language` section is active.

## Configuration

All options are written in your patch layer, targeting the `on-fire` row by id:

```yaml
# ~/.dsh/cordis.patch.yml
- id: on-fire
  config:
    language: true
    waiting: true
    graphify: true
    adhd: false              # turned off the ADHD style
    skills: true
    disabledSkills: [browser-harness]
```

**One patch per id replaces the row's whole `config` — it does not merge.** To change one option,
repeat the others you want to keep. It is the same care DSH's documentation asks for, and the reason
the block above is complete.

## How the bundle coexists with what you already have

Skills come in with `BUNDLED_SKILL_RANK` (600), DSH's **lowest precedence**:

```
100  <project>/.dsh/skills
200  <project>/.agents/skills
300  (custom)
400  <dshHome>/skills
500  ~/.agents/skills
600  bundled (this bundle)
```

That is a property, not a detail: **a local copy with the same name always wins over the bundle**.
Installing is non-destructive. If you already have `~/.agents/skills/project-constitution/`, your
version keeps being the one used; to start using the bundle's, remove the local copy.

The prompt rules don't have that precedence mechanism — they add up. If the same rules
are in your `~/.dsh/AGENTS.md`, they enter the prompt twice and cost double. When adopting the
bundle, take them out of there.

## What it creates in your project

Four kinds of artifact, all under one root, so they are identifiable as a set and never collide
with the project's own documentation conventions:

```
docs/engineering/
├── specs/     # the design document — the "what"
├── plans/     # the executable plan — the "how"
├── ledgers/   # the progress record, one per plan
└── reviews/   # the requirement-quality checklist, owned by the reviewer
```

The root is descriptive rather than branded on purpose: the artifacts outlive any particular
version of this bundle, and a folder named after the tool would have to be migrated the day the
tool is renamed.

The bundle credits where its ideas came from — `docs/EVALUATIONS.md` records that the plan format
was adapted from `obra/superpowers`, among others — but it does not inherit anyone else's folder
names. A reference belongs in the prose, not in the structure.

## The parts that aren't a bundle, and why

Two things stay in `install/` because they can't be packaged:

**The Gemini key** (`install/install-graphify.sh`) — a package doesn't carry a secret. The key lives in
`~/.config/graphify/gemini.key` (mode 600) and the wrapper reads it at runtime, which also
keeps the key out of the repository.

**The MCP absolute paths** (`install/adjust-paths.sh`) — the DSH host's PATH is usually
minimal and contains neither `~/.local/bin` nor the mise shims. The bundle ships portable commands; this
script detects this machine's real paths and writes an override in your layer. It is idempotent and
prefers **stable** paths (the uv symlink and the mise shim) over versioned paths, which break
on the next node upgrade.

## Structure

```
dsh-on-fire/
├── package.json          # declares dsh.bundle.patch → cordis.patch.yml
├── cordis.patch.yml      # inserts: row on-fire + mcp-graphify + mcp-lgpd
├── lib/index.js          # the plugin: prompt sections + skills provider
├── assets/
│   ├── rules/*.md         # the text of the 4 rules
│   └── skills/*/SKILL.md # the 7 skills, with YAML frontmatter
├── install/
│   ├── install-graphify.sh     # uv tool + key + wrapper
│   └── adjust-paths.sh         # override of the MCP paths
├── test/verify.mjs       # verification of apply() with a fake context
└── docs/
    ├── IMPROVEMENTS.md   # catalog: what it is, why, evidence, toggle
    └── EVALUATIONS.md    # verdicts on the tools evaluated
```

## Uninstall

```bash
dsh plugin --profile web remove dsh-on-fire
```

`dsh` removes the bundle from the layer stack when it reconciles. Rules and skills disappear together; nothing
is left behind. What does **not** disappear is the managed block in `~/.dsh/cordis.patch.yml` — remove it by hand, or
delete everything between the markers `# >>> dsh-on-fire: machine paths (generated by install/adjust-paths.sh)` and `# <<< dsh-on-fire: end`.

## License

MIT. The `i-have-adhd` and `browser-harness` skills are adaptations of MIT projects, with the attribution
kept in the files themselves.
