import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(scriptDir, "..");
const sourcesPath = path.join(siteDir, "research-sources.json");
const draftsPath = path.join(siteDir, "research", "drafts.json");

const sourcesConfig = JSON.parse((await readFile(sourcesPath, "utf8")).replace(/^\uFEFF/, ""));
const existingDrafts = JSON.parse((await readFile(draftsPath, "utf8")).replace(/^\uFEFF/, ""));
const existingUrls = new Set((existingDrafts.items || []).map((item) => item.sourceUrl));

const limitPerSource = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || sourcesConfig.settings.defaultLimitPerSource || 3);

function stripTags(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return stripTags(match[1]);
  }
  return "";
}

function parseFeed(xml, source) {
  const blocks = [...xml.matchAll(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/g)].map((match) => match[0]);
  return blocks.map((block) => {
    const title = firstMatch(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
    const link = firstMatch(block, [/<link[^>]*href=["']([^"']+)["'][^>]*>/i, /<link[^>]*>([\s\S]*?)<\/link>/i, /<guid[^>]*>([\s\S]*?)<\/guid>/i]);
    const published = firstMatch(block, [/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i, /<published[^>]*>([\s\S]*?)<\/published>/i, /<updated[^>]*>([\s\S]*?)<\/updated>/i]);
    const summary = firstMatch(block, [/<description[^>]*>([\s\S]*?)<\/description>/i, /<summary[^>]*>([\s\S]*?)<\/summary>/i, /<content[^>]*>([\s\S]*?)<\/content>/i]);
    return { title, link, published, summary, source };
  }).filter((item) => item.title && item.link);
}

function inferCategory(title, fallback) {
  const text = title.toLowerCase();
  if (/agent|agents|agentic|codex|workflow|a2a/.test(text)) return "Agentes";
  if (/cost|pricing|efficient|token|cheap|roi|econom/.test(text)) return "Custos";
  if (/safety|security|risk|regulat|policy|governance|alignment/.test(text)) return "Segurança";
  if (/gemini|ads|marketing|business|enterprise|workspace|copilot/.test(text)) return "Negócios";
  if (/model|gpt|claude|llama|open model|reasoning/.test(text)) return "Modelos";
  if (/productivity|work|assistant|reflect|memory/.test(text)) return "Produtividade";
  return fallback || "Modelos";
}

function makeDraft(item, index) {
  const category = inferCategory(item.title, item.source.category);
  const cleanSummary = item.summary || `Nova atualização publicada por ${item.source.name}.`;
  const excerpt = cleanSummary.length > 150 ? `${cleanSummary.slice(0, 147).trim()}...` : cleanSummary;
  return {
    id: `${new Date().toISOString().slice(0, 10)}-${item.source.id}-${index + 1}`,
    status: "draft",
    title: item.title,
    category,
    type: item.source.name.includes("arXiv") ? "Pesquisa" : "Radar",
    readingTime: "4 min",
    featured: false,
    editorPick: true,
    mediaClass: ["m1", "m2", "m3", "m4", "m5", "m6"][index % 6],
    excerpt,
    body: `${excerpt} O ponto para acompanhar é como isso muda decisões práticas sobre produtos, times, automação, custo ou segurança em IA. Antes de publicar, revise o contexto completo na fonte original.`,
    sourceLabel: item.source.name,
    sourceUrl: item.link,
    sourcePublished: item.published || null,
    collectedAt: new Date().toISOString(),
    reviewNotes: "Revisar precisão, relevância para público brasileiro e possível impacto prático antes de aprovar."
  };
}

const drafts = [];
const failures = [];

for (const source of sourcesConfig.sources.filter((item) => item.type === "rss")) {
  try {
    const response = await fetch(source.url, { headers: { "user-agent": "AI Insights research bot; local editorial workflow" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const xml = await response.text();
    const items = parseFeed(xml, source)
      .filter((item) => !existingUrls.has(item.link))
      .slice(0, limitPerSource);
    drafts.push(...items.map(makeDraft));
  } catch (error) {
    failures.push({ source: source.name, url: source.url, error: error.message });
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  status: drafts.length ? "needs-review" : "empty",
  summary: {
    newDrafts: drafts.length,
    sourcesChecked: sourcesConfig.sources.length,
    failures
  },
  items: [...drafts, ...(existingDrafts.items || [])]
};

await writeFile(draftsPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Rascunhos coletados: ${drafts.length}`);
if (failures.length) console.log(`Fontes com falha: ${failures.length}`);
