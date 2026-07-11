import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(scriptDir, "..");
const draftsPath = path.join(siteDir, "research", "drafts.json");
const approvedPath = path.join(siteDir, "research", "approved.json");
const contentPath = path.join(siteDir, "content.json");
const policyPath = path.join(siteDir, "editorial-policy.json");
const reportPath = path.join(siteDir, "research", "editor-chief-report.json");
const publishScript = path.join(scriptDir, "publish-approved.mjs");

const args = new Set(process.argv.slice(2));
const shouldPublish = args.has("--publish");
const dryRun = args.has("--dry-run");

const readJson = async (file) => JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, ""));
const drafts = await readJson(draftsPath);
const approved = await readJson(approvedPath);
const content = await readJson(contentPath);
const policy = await readJson(policyPath);

const existingSourceUrls = new Set((content.articles || []).map((item) => item.sourceUrl).filter(Boolean));
const existingTitles = (content.articles || []).map((item) => normalize(item.title));
const alreadyApproved = new Set((approved.items || []).map((item) => item.id));

function normalize(value = "") {
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function includesAny(text, patterns = []) {
  const normalized = normalize(text);
  return patterns.find((pattern) => normalized.includes(normalize(pattern))) || null;
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function trustedScore(url) {
  const domain = domainOf(url);
  if (!domain) return { score: 0, domain, tier: "invalid" };
  const direct = policy.trustedDomains[domain];
  if (direct) return { score: direct, domain, tier: "trusted" };
  const parent = Object.entries(policy.trustedDomains).find(([trusted]) => domain.endsWith(`.${trusted}`));
  if (parent) return { score: parent[1] - 1, domain, tier: "trusted-subdomain" };
  return { score: 10, domain, tier: "unknown" };
}

function titleSimilarity(a, b) {
  const left = new Set(normalize(a).split(" ").filter((word) => word.length > 3));
  const right = new Set(normalize(b).split(" ").filter((word) => word.length > 3));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((word) => right.has(word)).length;
  return intersection / Math.max(left.size, right.size);
}

function freshnessScore(item) {
  const raw = item.sourcePublished || item.collectedAt;
  if (!raw) return { score: 8, reason: "sem data clara" };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { score: 8, reason: "data nao interpretavel" };
  const days = (Date.now() - date.getTime()) / 86400000;
  if (days <= 14) return { score: 15, reason: "recente" };
  if (days <= 45) return { score: 12, reason: "ainda atual" };
  if (days <= 120) return { score: 8, reason: "pode ser evergreen" };
  return { score: 4, reason: "antigo" };
}

function publicationTitle(item) {
  const source = item.sourceLabel || "fonte monitorada";
  const category = item.category || "IA";
  const raw = item.title || "nova atualização";
  if (/agent|agents|agentic|mcp/i.test(raw)) return `Radar de agentes: ${raw}`;
  if (/cost|pricing|token|efficien|roi/i.test(raw)) return `Radar de custos de IA: ${raw}`;
  if (/safety|security|risk|regulat|policy/i.test(raw)) return `Radar de segurança em IA: ${raw}`;
  if (/enterprise|business|copilot|workspace|telecom/i.test(raw)) return `Radar de IA nos negócios: ${raw}`;
  return `Radar ${category}: ${raw}`;
}

function publicationExcerpt(item) {
  return `A ${item.sourceLabel || "fonte monitorada"} publicou uma atualização relevante sobre ${String(item.category || "IA").toLowerCase()}. O tema merece atenção por seu possível impacto em estratégia, produto, operação ou adoção de inteligência artificial.`;
}

function publicationBody(item) {
  const source = item.sourceLabel || "fonte monitorada";
  const title = item.title || "atualização de IA";
  const category = item.category || "IA";
  return `A ${source} publicou "${title}". O gestor editorial classificou o material como ${category} por combinar fonte confiável, relevância para IA e sinal prático suficiente para acompanhamento. A leitura executiva: acompanhe como essa atualização pode afetar decisões de produto, automação, custos, governança ou adoção de IA nos próximos ciclos. A fonte original deve ser preservada para auditoria e aprofundamento.`;
}
function scoreDraft(item) {
  const reasons = [];
  const blockers = [];
  const text = `${item.title || ""} ${item.excerpt || ""} ${item.body || ""}`;

  if (!item.title || !item.sourceUrl) blockers.push("missing_source_or_title");
  if (item.sourceUrl && existingSourceUrls.has(item.sourceUrl)) blockers.push("duplicate_source");
  if (includesAny(text, policy.blockedPatterns)) blockers.push("unsafe_or_high_risk");
  if (!includesAny(text, policy.aiKeywords)) blockers.push("low_ai_relevance");
  const portugueseSignal = /[ãõáéíóúàâêôç]|\b(para|como|que|uma|um|com|sem|antes|depois|negócios|segurança|ferramenta|trabalho|custo|fonte|publicar)\b/i.test(text);
  if (!portugueseSignal) blockers.push("not_publication_ready_ptbr");
  if (existingTitles.some((title) => titleSimilarity(item.title, title) > 0.72)) blockers.push("duplicate_topic");

  const source = trustedScore(item.sourceUrl);
  const sourceScore = Math.max(0, Math.min(25, source.score));
  reasons.push(`source:${source.domain || "invalid"}:${source.tier}:${sourceScore}`);

  const aiScore = includesAny(text, policy.aiKeywords) ? 20 : 0;
  reasons.push(`ai_relevance:${aiScore}`);

  const practicalHits = policy.practicalKeywords.filter((keyword) => normalize(text).includes(normalize(keyword))).length;
  const practicalScore = Math.min(20, 4 + practicalHits * 3);
  reasons.push(`practical_value:${practicalScore}`);

  const fresh = freshnessScore(item);
  reasons.push(`freshness:${fresh.score}:${fresh.reason}`);

  const length = `${item.excerpt || ""} ${item.body || ""}`.trim().length;
  const clarityScore = length >= 260 && length <= 900 ? 10 : length >= 180 ? 7 : 3;
  reasons.push(`clarity:${clarityScore}`);

  const hype = includesAny(text, policy.hypePatterns);
  const safetyScore = hype ? 5 : 10;
  if (hype) reasons.push(`hype_flag:${hype}`);
  reasons.push(`editorial_caution:${safetyScore}`);

  if (source.tier === "unknown" && sourceScore < 15) reasons.push("unknown_source_requires_stronger_context");
  if (practicalScore < 14) blockers.push("low_practical_value");
  if (practicalScore < 14) reasons.push("low_practical_signal");

  const score = sourceScore + aiScore + practicalScore + fresh.score + clarityScore + safetyScore;
  const threshold = policy.thresholds.autoApprove;
  const decision = blockers.length ? "reject" : score >= threshold ? "approve" : score >= policy.thresholds.hold ? "hold" : "reject";

  return {
    id: item.id,
    title: item.title,
    score,
    decision,
    blockers,
    reasons,
    sourceDomain: source.domain,
    reviewedAt: new Date().toISOString()
  };
}

const draftItems = (drafts.items || []).filter((item) => item.status === "draft" && !alreadyApproved.has(item.id));
const reviews = draftItems.map(scoreDraft);
const approvedReviews = reviews.filter((review) => review.decision === "approve");
const approvedIds = new Set(approvedReviews.map((review) => review.id));

const newlyApproved = draftItems
  .filter((item) => approvedIds.has(item.id))
  .map((item) => ({
    ...item,
    title: publicationTitle(item),
    originalTitle: item.title,
    excerpt: publicationExcerpt(item),
    body: publicationBody(item),
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy: "ai-content-editor-chief",
    editorialScore: reviews.find((review) => review.id === item.id)?.score,
    editorialReasons: reviews.find((review) => review.id === item.id)?.reasons || []
  }));

const reviewedDrafts = {
  ...drafts,
  status: "editor-chief-reviewed",
  items: (drafts.items || []).map((item) => {
    const review = reviews.find((entry) => entry.id === item.id);
    if (!review) return item;
    return {
      ...item,
      status: review.decision === "approve" ? "approved" : review.decision,
      editorialScore: review.score,
      editorialDecision: review.decision,
      editorialReasons: review.reasons,
      editorialBlockers: review.blockers
    };
  })
};

const nextApproved = {
  approvedAt: new Date().toISOString(),
  items: [...newlyApproved, ...(approved.items || [])]
};

const report = {
  generatedAt: new Date().toISOString(),
  mode: shouldPublish ? "approve-and-publish" : dryRun ? "dry-run" : "approve-only",
  summary: {
    reviewed: reviews.length,
    approved: reviews.filter((item) => item.decision === "approve").length,
    held: reviews.filter((item) => item.decision === "hold").length,
    rejected: reviews.filter((item) => item.decision === "reject").length,
    threshold: policy.thresholds.autoApprove
  },
  reviews
};

if (!dryRun) {
  await writeFile(draftsPath, `${JSON.stringify(reviewedDrafts, null, 2)}\n`, "utf8");
  await writeFile(approvedPath, `${JSON.stringify(nextApproved, null, 2)}\n`, "utf8");
}
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Editor-chefe revisou ${reviews.length}: ${report.summary.approved} aprovados, ${report.summary.held} em espera, ${report.summary.rejected} rejeitados.`);

if (shouldPublish && !dryRun && report.summary.approved > 0) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [publishScript, "--max=6"], { cwd: siteDir, stdio: "inherit" });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`publish-approved exited with ${code}`)));
  });
}



