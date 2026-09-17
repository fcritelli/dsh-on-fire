/**
 * Checks that every path this repository mentions actually exists in it.
 *
 * This is the check that catches the class of defect humans miss: a file gets
 * renamed and one of its mentions is left behind. It already happened here twice
 * — `pnpm test` pointed at `test/verificar.mjs` after the file became
 * `test/verify.mjs`, and a prompt rule told the agent to run a helper the
 * repository does not ship.
 *
 * It reads the working tree, not `git ls-files`: a file that was just written but
 * not staged yet is still a file, and a checker that calls it missing produces a
 * false positive — which is worse than a miss, because it looks like a finding.
 *
 * Usage: `node test/check-references.mjs`
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Paths this file mentions but does not own — they live in the target project, not here. */
const TARGET_PROJECT_PATHS = new Set(["docs/CONSTITUTION.md", "docs/CONSTITUICAO.md"]);

/** Directories that are never part of the published repository. */
const SKIP = new Set(["node_modules", ".git"]);

/**
 * This file is not scanned. Its own prose names the broken paths as examples of what
 * it catches, and the scan cannot tell a mention from a dependency. The cost is that a
 * broken reference added *here* goes unnoticed — acceptable, since nothing references
 * this file.
 */
const SELF = "test/check-references.mjs";

/** Every file in the working tree, as repository-relative paths. */
function walk(dir, found = []) {
	for (const entry of readdirSync(dir)) {
		if (SKIP.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, found);
		else found.push(relative(".", full).split("\\").join("/"));
	}
	return found;
}

const files = walk(".");
const present = new Set(files);

// Only paths that are unambiguously this repository's own: the four source trees, plus
// the two uppercase-named documents at the root of docs/. Target-project conventions
// like docs/engineering/plans/ are lowercase and therefore never match.
const CANDIDATE = /(?<![\w/.@-])((?:test|install|assets|lib)\/[A-Za-z0-9_./-]+\.(?:mjs|js|sh|md|yml|json)|docs\/[A-Z][A-Z_]*\.md)/g;

const offences = [];
for (const file of files) {
	if (file === SELF) continue;
	if (!/\.(md|json|mjs|js|sh|ya?ml)$/.test(file)) continue;
	for (const match of readFileSync(file, "utf8").matchAll(CANDIDATE)) {
		const referenced = match[1];
		if (referenced.includes("<") || referenced.includes(">")) continue; // placeholder
		if (TARGET_PROJECT_PATHS.has(referenced)) continue;
		if (present.has(referenced)) continue;
		offences.push(`  ${file} refers to ${referenced}, which does not exist`);
	}
}

// Every entry of package.json's `files` must exist, and every path a script runs must too.
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
for (const entry of manifest.files ?? []) {
	if (!present.has(entry) && !files.some((f) => f.startsWith(`${entry}/`))) {
		offences.push(`  package.json files[] lists ${entry}, which does not exist`);
	}
}
for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
	for (const match of command.matchAll(/(?<![\w/.@-])((?:test|install|assets|lib)\/[A-Za-z0-9_./-]+\.(?:mjs|js|sh))/g)) {
		if (!present.has(match[1])) {
			offences.push(`  script "${name}" runs ${match[1]}, which does not exist`);
		}
	}
}

if (offences.length > 0) {
	console.error(`broken references: ${offences.length}`);
	for (const offence of offences) console.error(offence);
	process.exit(1);
}
console.log(`references ok — ${files.length} files, every mentioned path exists`);
