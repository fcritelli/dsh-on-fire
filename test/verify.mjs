/**
 * Verification of the `apply()` of dsh-on-fire, with a fake cordis context.
 *
 * It runs without DSH and without restarting anything: it builds a minimal `ctx` with the two
 * services the plugin injects (`systemPrompt` and `skills`), calls `apply` and checks what was
 * registered.
 *
 * Usage: `node test/verify.mjs`
 */
import assert from "node:assert/strict";
import { apply, Config } from "../lib/index.js";

/** A fake `ctx` that records what the plugin registers, in the format of the real cordis. */
function fakeContext() {
	const sections = [];
	const providers = [];
	const effects = [];
	return {
		sections,
		providers,
		effects,
		ctx: {
			logger: { warn: (message) => console.error(`  [warn] ${message}`) },
			systemPrompt: {
				getSectionOrder: (name) => {
					assert.equal(name, "PLAN_POLICY", "only the PLAN_POLICY position is used");
					return 500;
				},
				section: (section) => {
					sections.push(section);
					return () => {};
				}
			},
			skills: {
				registerProvider: (create) => {
					providers.push(create({ invalidate: () => {} }));
					return () => {};
				}
			},
			effect: (fn, label) => {
				effects.push(label);
				return fn();
			}
		}
	};
}

/** The config as schemastery delivers it after applying the defaults. */
function defaultConfig(overrides = {}) {
	return { ...Config({}), ...overrides };
}

const caseList = [];
/** Enqueues a case. They run in order at the end of the file, with `await`. */
function registerCase(name, fn) {
	caseList.push([name, fn]);
}

// ── defaults ────────────────────────────────────────────────────────────────
registerCase("the defaults turn everything on", () => {
	const c = defaultConfig();
	assert.deepEqual(
		{
			language: c.language,
			waiting: c.waiting,
			graphify: c.graphify,
			adhd: c.adhd,
			skills: c.skills
		},
		{ language: true, waiting: true, graphify: true, adhd: true, skills: true }
	);
	assert.deepEqual(c.disabledSkills, []);
});

// ── prompt sections ─────────────────────────────────────────────────────────
registerCase("registers the 4 rules as sections, in order, with non-empty text", () => {
	const { ctx, sections } = fakeContext();
	apply(ctx, defaultConfig());
	assert.equal(sections.length, 4);
	assert.deepEqual(
		sections.map((s) => s.name),
		["on-fire:language", "on-fire:waiting", "on-fire:graphify", "on-fire:adhd"]
	);
	assert.deepEqual(
		sections.map((s) => s.order),
		[500, 501, 502, 503]
	);
	for (const section of sections) {
		assert.ok(section.text.trim().length > 100, `${section.name} has text that is too short`);
		assert.ok(section.text.startsWith("## "), `${section.name} must start with a markdown heading`);
	}
});

registerCase("turning one rule off removes only that section", () => {
	const { ctx, sections } = fakeContext();
	apply(ctx, defaultConfig({ adhd: false, graphify: false }));
	assert.deepEqual(
		sections.map((s) => s.name),
		["on-fire:language", "on-fire:waiting"]
	);
});

registerCase("turning everything off registers no section at all", () => {
	const { ctx, sections } = fakeContext();
	apply(ctx, defaultConfig({ language: false, waiting: false, graphify: false, adhd: false }));
	assert.equal(sections.length, 0);
});

// ── skills ──────────────────────────────────────────────────────────────────
registerCase("registers the provider and lists the 7 skills with rank 600 (bundled)", async () => {
	const { ctx, providers } = fakeContext();
	apply(ctx, defaultConfig());
	assert.equal(providers.length, 1);
	const candidates = await providers[0].list();
	assert.equal(candidates.length, 7, `expected 7 skills, got ${candidates.length}`);
	for (const candidate of candidates) {
		assert.equal(candidate.rank, 600, `${candidate.name} should have rank 600`);
		assert.equal(candidate.provider, "on-fire");
		assert.equal(candidate.source, "bundled");
		assert.ok(candidate.description.length > 20, `${candidate.name} has no useful description`);
		assert.equal(candidate.resourceBase.kind, "directory");
		assert.ok(candidate.resourceBase.path.endsWith("/"));
	}
	assert.deepEqual(
		candidates.map((c) => c.name).sort(),
		[
			"browser-harness",
			"i-have-adhd",
			"implementation-plans",
			"plan-execution",
			"plan-quality",
			"project-constitution",
			"test-quality"
		]
	);
});

registerCase("does not cache the catalog — list() rereads the disk", async () => {
	const { ctx, providers } = fakeContext();
	apply(ctx, defaultConfig());
	const first = await providers[0].list();
	const second = await providers[0].list();
	// The same reference would deliver a stale catalog after touching the package — that is how
	// a freshly added skill stayed invisible in an ongoing session.
	assert.notEqual(first, second, "the same reference indicates a cached catalog");
	assert.deepEqual(
		first.map((c) => c.name),
		second.map((c) => c.name)
	);
});

registerCase("get() returns the body without the frontmatter", async () => {
	const { ctx, providers } = fakeContext();
	apply(ctx, defaultConfig());
	const candidates = await providers[0].list();
	const target = candidates.find((c) => c.name === "i-have-adhd");
	const definition = await providers[0].get(target);
	assert.ok(!definition.content.startsWith("---"), "the frontmatter should not be in the body");
	assert.ok(definition.content.trim().length > 500);
	assert.equal(definition.name, "i-have-adhd");
});

registerCase("respects the invocation frontmatter of i-have-adhd", async () => {
	const { ctx, providers } = fakeContext();
	apply(ctx, defaultConfig());
	const candidates = await providers[0].list();
	const adhd = candidates.find((c) => c.name === "i-have-adhd");
	assert.equal(adhd.invocation.modelInvocable, false, "disable-model-invocation: true");
	assert.equal(adhd.invocation.userInvocable, true);
});

registerCase("skills: false does not register a provider", () => {
	const { ctx, providers } = fakeContext();
	apply(ctx, defaultConfig({ skills: false }));
	assert.equal(providers.length, 0);
});

registerCase("disabledSkills removes the skill from the catalog", async () => {
	const { ctx, providers } = fakeContext();
	apply(ctx, defaultConfig({ disabledSkills: ["browser-harness"] }));
	const candidates = await providers[0].list();
	assert.equal(candidates.length, 6);
	assert.ok(!candidates.some((c) => c.name === "browser-harness"));
});

// ── report ──────────────────────────────────────────────────────────────────
const results = [];
let failures = 0;
for (const [name, fn] of caseList) {
	try {
		await fn();
		results.push(`  ok    ${name}`);
	} catch (error) {
		failures += 1;
		results.push(`  FAIL ${name}\n        ${error.message.split("\n")[0]}`);
	}
}

console.log("\ndsh-on-fire verification\n");
console.log(results.join("\n"));
console.log(
	failures > 0 ? `\n${failures} of ${caseList.length} cases failed\n` : `\n${caseList.length} cases passed\n`
);
process.exitCode = failures > 0 ? 1 : 0;
