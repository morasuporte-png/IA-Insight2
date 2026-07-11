import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(scriptDir, "..");
const approvedPath = path.join(siteDir, "research", "approved.json");
const contentPath = path.join(siteDir, "content.json");
const updateScript = path.join(scriptDir, "update-content.mjs");

const maxItems = Number(process.argv.find((arg) => arg.startsWith("--max="))?.split("=")[1] || 6);
const approved = JSON.parse((await readFile(approvedPath, "utf8")).replace(/^\uFEFF/, ""));
const content = JSON.parse((await readFile(contentPath, "utf8")).replace(/^\uFEFF/, ""));
const existingUrls = new Set((content.articles || []).map((item) => item.sourceUrl));

const publishable = (approved.items || [])
  .filter((item) => item.status === "approved")
  .filter((item) => !existingUrls.has(item.sourceUrl))
  .slice(0, maxItems)
  .map((item, index) => ({
    title: item.title,
    category: item.category,
    type: item.type,
    readingTime: item.readingTime,
    featured: index < 3,
    editorPick: index >= 3,
    mediaClass: item.mediaClass,
    excerpt: item.excerpt,
    body: item.body,
    sourceLabel: item.sourceLabel,
    sourceUrl: item.sourceUrl
  }));

if (!publishable.length) {
  console.log("Nada novo para publicar.");
  process.exit(0);
}

content.site.updatedLabel = `Atualizado em ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()).replace(".", "")}`;
content.articles = [...publishable, ...(content.articles || [])].slice(0, Math.max(6, maxItems));

await writeFile(contentPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [updateScript], { cwd: siteDir, stdio: "inherit" });
  child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`update-content exited with ${code}`)));
});

console.log(`Publicados no site: ${publishable.length}`);
