import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(scriptDir, "..");
const draftsPath = path.join(siteDir, "research", "drafts.json");
const approvedPath = path.join(siteDir, "research", "approved.json");

const args = process.argv.slice(2);
const ids = args.filter((arg) => !arg.startsWith("--"));
const approveAll = args.includes("--all");

if (!approveAll && ids.length === 0) {
  console.log("Use: node scripts/approve-drafts.mjs --all");
  console.log("ou:  node scripts/approve-drafts.mjs draft-id-1 draft-id-2");
  process.exit(0);
}

const drafts = JSON.parse((await readFile(draftsPath, "utf8")).replace(/^\uFEFF/, ""));
const approved = JSON.parse((await readFile(approvedPath, "utf8")).replace(/^\uFEFF/, ""));
const approvedIds = new Set((approved.items || []).map((item) => item.id));

const selected = (drafts.items || [])
  .filter((item) => item.status === "draft")
  .filter((item) => approveAll || ids.includes(item.id))
  .filter((item) => !approvedIds.has(item.id))
  .map((item) => ({ ...item, status: "approved", approvedAt: new Date().toISOString() }));

if (!selected.length) {
  console.log("Nenhum rascunho novo aprovado.");
  process.exit(0);
}

const selectedIds = new Set(selected.map((item) => item.id));
const nextDrafts = {
  ...drafts,
  status: "reviewed",
  items: (drafts.items || []).map((item) => selectedIds.has(item.id) ? { ...item, status: "approved" } : item)
};
const nextApproved = {
  approvedAt: new Date().toISOString(),
  items: [...selected, ...(approved.items || [])]
};

await writeFile(draftsPath, `${JSON.stringify(nextDrafts, null, 2)}\n`, "utf8");
await writeFile(approvedPath, `${JSON.stringify(nextApproved, null, 2)}\n`, "utf8");
console.log(`Aprovados: ${selected.length}`);
