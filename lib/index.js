import { readFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import z from "@deepseek-ai/schemastery";
import { parse as parseYaml } from "yaml";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

/**
 * `dsh-on-fire` — opinionated improvements for the DeepSeek Harness, as a profile bundle.
 *
 * The plugin does two things, and only those:
 *
 * 1. **Behavior rules become prompt sections.** Every rule enabled in
 *    `assets/rules/` enters the system prompt at a named position, instead of becoming a line
 *    of an `AGENTS.md`. Turning a rule off is changing the row config — it is not `sed` surgery.
 * 2. **The skills become a provider of the skill registry.** The same mechanism as
 *    `dsh-skill-badge`: the skills are read from `assets/skills/` at discovery time and
 *    enter with `BUNDLED_SKILL_RANK` (600), the **lowest** precedence that exists.
 *
 * The rank is the property that makes this bundle safe to install: a copy in
 * `~/.agents/skills/<name>/SKILL.md` (rank 500) or in `<project>/.agents/skills` (200)
 * **wins** over the bundle. That is, the bundle is a default and never overwrites what the
 * person already has.
 *
 * @module dsh-on-fire
 */

/** Cordis plugin name. */
const name = "on-fire";

/** Required services: the prompt registry and the skill registry, both on the host plane. */
const inject = ["systemPrompt", "skills"];

/** Skill provider name, for diagnostics in the catalog. */
const PROVIDER = "on-fire";

const RULES_BASE = new URL("../assets/rules/", import.meta.url);
const SKILLS_BASE = new URL("../assets/skills/", import.meta.url);

/**
 * The behavior rules, in the order in which they enter the prompt.
 *
 * `key` is the name of the boolean option in the row config; `file` is the markdown in
 * `assets/rules/`. The order here is the order in the prompt.
 */
const RULES = [
	{ key: "language", file: "language.md" },
	{ key: "waiting", file: "waiting.md" },
	{ key: "graphify", file: "graphify.md" },
	{ key: "adhd", file: "adhd.md" },
	{ key: "asking", file: "asking.md" }
];

/** Configuration schema of the `on-fire` row. Every toggle is independent. */
const Config = z.object({
	/** Every output to the user in Brazilian Portuguese, without exception. */
	language: z.boolean().default(true),
	/** Wait for a subagent/job by notification or by a single call with `wait`, never in a loop. */
	waiting: z.boolean().default(true),
	/** Consult the code graph before and sync it afterwards; never read `graph.json`. */
	graphify: z.boolean().default(true),
	/** Output style for a reader with ADHD. */
	adhd: z.boolean().default(true),
	/** Say when you do not know and ask, instead of inventing numbers, scopes and choices. */
	asking: z.boolean().default(true),
	/** Turn the whole skill provider on/off. */
	skills: z.boolean().default(true),
	/** Bundle skills to omit from the catalog, by directory name under `assets/skills/`. */
	disabledSkills: z.array(z.string()).default([])
});

/**
 * Applies the bundle: registers the enabled prompt sections and the skill provider.
 *
 * @param ctx cordis context with the `systemPrompt` and `skills` services
 * @param config the toggles validated by {@link Config}
 */
function apply(ctx, config) {
	const baseOrder = ctx.systemPrompt.getSectionOrder("PLAN_POLICY");

	RULES.forEach((rule, index) => {
		if (config[rule.key] !== true) return;
		const text = readRule(ctx, rule.file);
		if (text === undefined) return;
		ctx.effect(
			() =>
				ctx.systemPrompt.section({
					name: `${PROVIDER}:${rule.key}`,
					order: baseOrder + index,
					text: text
				}),
			`${PROVIDER}.rule(${rule.key})`
		);
	});

	if (config.skills === true) {
		ctx.skills.registerProvider(() => createProvider(config.disabledSkills ?? []));
	}
}

/**
 * Reads the markdown of a rule. A missing or empty rule is omitted instead of taking down the
 * boot — the bundle is a default, not a hard dependency.
 */
function readRule(ctx, file) {
	try {
		const text = readFileSync(new URL(file, RULES_BASE), "utf8").trim();
		return text.length > 0 ? text : undefined;
	} catch (error) {
		ctx.logger?.warn?.(`${PROVIDER}: rule '${file}' unreadable: ${error.message}`);
		return undefined;
	}
}

/**
 * Builds the skill provider that reads `assets/skills/<dir>/SKILL.md`.
 *
 * `list` returns the candidates (only the frontmatter, without the body) and `get` loads the
 * body of the winning candidate. The body goes without the frontmatter, as in `dsh-skill-badge`.
 *
 * **No cache, on purpose.** The first version kept the result of the discovery, with the
 * argument that the skill set of a versioned package does not change at run time. That is true
 * in production and false in the real workflow: in a session where a skill had just been added
 * to the package, the provider kept serving the old catalog and the new skill stayed invisible.
 * Discovering on every `list()` costs a few reads of small files — and always returns what is on
 * the disk. The DSH filesystem provider solves the same problem by watching the files and
 * calling `control.invalidate()`; here, without a watcher, storing nothing is the simplest fix
 * that does not lie.
 */
function createProvider(disabledSkills) {
	const excluded = new Set(disabledSkills);

	async function discover() {
		const candidates = [];
		let entries;
		try {
			entries = await readdir(SKILLS_BASE, { withFileTypes: true });
		} catch {
			return candidates;
		}
		for (const entry of entries) {
			if (!entry.isDirectory() || excluded.has(entry.name)) continue;
			const file = new URL(`${entry.name}/SKILL.md`, SKILLS_BASE);
			const dir = fileURLToPath(new URL(`${entry.name}/`, SKILLS_BASE));
			let raw;
			try {
				raw = await readFile(file, "utf8");
			} catch {
				continue; // a directory without SKILL.md is not a skill
			}
			const { data } = splitFrontmatter(raw);
			candidates.push({
				name: textOr(data.name, entry.name),
				description: textOr(data.description, ""),
				invocation: {
					modelInvocable: data["disable-model-invocation"] !== true,
					userInvocable: data["user-invocable"] !== false
				},
				provider: PROVIDER,
				source: "bundled",
				resourceBase: { kind: "directory", path: dir },
				rank: BUNDLED_SKILL_RANK,
				locator: { file: fileURLToPath(file) }
			});
		}
		candidates.sort((a, b) => a.name.localeCompare(b.name));
		return candidates;
	}

	return {
		name: PROVIDER,
		list: () => discover(),
		async get(candidate) {
			const raw = await readFile(candidate.locator?.file ?? "", "utf8");
			return {
				name: candidate.name,
				description: candidate.description,
				invocation: candidate.invocation,
				provider: PROVIDER,
				source: "bundled",
				resourceBase: candidate.resourceBase,
				content: splitFrontmatter(raw).body
			};
		}
	};
}

/**
 * Separates the YAML frontmatter from the markdown body.
 *
 * A file without frontmatter returns the whole body and empty metadata, and it is not an error:
 * it is the format that `dsh-skill-badge` uses in its own asset.
 */
function splitFrontmatter(text) {
	const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(text);
	if (match === null) return { data: {}, body: text };
	let data;
	try {
		data = parseYaml(match[1]);
	} catch {
		data = {};
	}
	return {
		data: data !== null && typeof data === "object" ? data : {},
		body: text.slice(match[0].length)
	};
}

/** Returns `value` if it is a non-empty string; otherwise the default. */
function textOr(value, fallbackValue) {
	return typeof value === "string" && value.length > 0 ? value : fallbackValue;
}

export { Config, apply, inject, name };
