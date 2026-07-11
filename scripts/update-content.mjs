import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(scriptDir, "..");
const contentPath = path.join(siteDir, "content.json");
const htmlPath = path.join(siteDir, "index.html");

const content = JSON.parse((await readFile(contentPath, "utf8")).replace(/^\uFEFF/, ""));
let html = await readFile(htmlPath, "utf8");

const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const attr = esc;

function replaceBetween(source, start, end, replacement) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Missing content markers: ${start} / ${end}`);
  }
  return source.slice(0, startIndex + start.length) + "\n" + replacement + "\n" + source.slice(endIndex);
}

function articleCard(article) {
  return `<article class="card" role="button" tabindex="0" aria-label="${attr(article.title)}" data-category="${attr(article.category)}" data-title="${attr(article.title)}" data-body="${attr(article.body)}" data-source-label="${attr(article.sourceLabel || "")}" data-source-url="${attr(article.sourceUrl || "")}"><div class="media ${attr(article.mediaClass)}"><span class="badge">${esc(article.category)}</span></div><div class="body"><div class="meta"><span>${esc(article.type)}</span><span>${esc(article.readingTime)}</span></div><h3>${esc(article.title)}</h3><p>${esc(article.excerpt)}</p></div></article>`;
}

function topicButton(topic, index) {
  const filter = topic === "Todos" ? "todos" : topic;
  return `<button class="chip${index === 0 ? " active" : ""}" data-filter="${attr(filter)}">${esc(topic)}</button>`;
}

function trendingToolRow(tool) {
  return `<a class="tool-row" href="#tools"><span class="tool-icon">${esc(tool.initials)}</span><span><strong>${esc(tool.name)}</strong><small>${esc(tool.category)}</small></span><span>↗</span></a>`;
}

function toolCard(tool) {
  return `<article class="tool-card" data-category="${attr(tool.category)}"><span class="tool-icon">${esc(tool.initials)}</span><h3>${esc(tool.name)}</h3><p>${esc(tool.description)}</p></article>`;
}

const featured = content.articles.filter((article) => article.featured).map(articleCard).join("\n            ");
const editorPicks = content.articles.filter((article) => article.editorPick).map(articleCard).join("\n            ");
const topics = content.topics.map(topicButton).join("");
const trendingTools = content.tools.filter((tool) => tool.trending).map(trendingToolRow).join("");
const toolCards = content.tools.map(toolCard).join("");

html = html.replace(/<title>.*?<\/title>/, `<title>${esc(content.site.name)} | Hub premium de inteligência artificial</title>`);
html = html.replace(/<div class="address">.*?<\/div>/, `<div class="address">${esc(content.site.domain)}</div>`);
html = html.replace(/<span class="float-chip float-one">.*?<\/span>/, `<span class="float-chip float-one">${esc(content.site.updatedLabel)}</span>`);
html = html.replace(/<span class="eyebrow">O ESSENCIAL SOBRE IA<\/span>/, `<span class="eyebrow">${esc(content.site.heroEyebrow)}</span>`);
html = html.replace(/<h1>Entenda a IA\.<span>Construa o futuro\.<\/span><\/h1>/, `<h1>${esc(content.site.heroTitle)}<span>${esc(content.site.heroAccent)}</span></h1>`);
html = html.replace(/<p>Insights especialistas, guias práticos e tendências de inteligência artificial para criadores, empresas, operadores e fundadores que querem sair do hype e criar vantagem real\.<\/p>/, `<p>${esc(content.site.heroText)}</p>`);
html = html.replace(/<h2>Fique por dentro<\/h2><p>Receba um resumo semanal com tendências, ferramentas e oportunidades reais em IA\.<\/p>/, `<h2>${esc(content.site.newsletterTitle)}</h2><p>${esc(content.site.newsletterText)}</p>`);

html = replaceBetween(html, "<!-- CONTENT:TOPICS:START -->", "<!-- CONTENT:TOPICS:END -->", topics);
html = replaceBetween(html, "<!-- CONTENT:FEATURED:START -->", "<!-- CONTENT:FEATURED:END -->", featured);
html = replaceBetween(html, "<!-- CONTENT:EDITOR:START -->", "<!-- CONTENT:EDITOR:END -->", editorPicks);
html = replaceBetween(html, "<!-- CONTENT:TRENDING_TOOLS:START -->", "<!-- CONTENT:TRENDING_TOOLS:END -->", trendingTools);
html = replaceBetween(html, "<!-- CONTENT:TOOLS:START -->", "<!-- CONTENT:TOOLS:END -->", toolCards);

await writeFile(htmlPath, html, "utf8");
console.log(`AI Insights atualizado com ${content.articles.length} artigos e ${content.tools.length} ferramentas.`);



