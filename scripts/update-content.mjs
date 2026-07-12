import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(scriptDir, "..");
const contentPath = path.join(siteDir, "content.json");
const assetsDir = path.join(siteDir, "assets");
const articlesDir = path.join(siteDir, "artigos");
const domain = "https://aiinsights.com.br";

const content = JSON.parse((await readFile(contentPath, "utf8")).replace(/^\uFEFF/, ""));
await mkdir(assetsDir, { recursive: true });
await mkdir(articlesDir, { recursive: true });

const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const slugify = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 86);

const articles = (content.articles || []).map((article, index) => ({
  ...article,
  slug: article.slug || slugify(article.title),
  date: article.date || "11 de julho de 2026",
  time: article.time || ["14:50", "14:20", "13:40", "12:55", "11:30", "10:10"][index % 6],
  author: article.author || "Redacao AI Insights"
}));

const topics = content.topics || ["Todos", "Agentes", "Modelos", "Custos", "Segurança", "Negócios"];
const tools = content.tools || [];
const lead = articles[0];
const secondary = articles.slice(1, 4);
const latest = articles.slice(0, 6);
const editorials = articles.slice(3, 9);

function siteHeader(active = "capa") {
  const nav = [
    ["capa", "Capa", "index.html"],
    ["ultimas", "Últimas", "index.html#ultimas"],
    ["editorias", "Editorias", "index.html#editorias"],
    ["ferramentas", "Ferramentas", "index.html#ferramentas"],
    ["sobre", "Sobre", "sobre.html"],
    ["contato", "Contato", "contato.html"]
  ].map(([key, label, href]) => `<a ${active === key ? 'class="active"' : ""} href="${href}">${label}</a>`).join("");
  return `<div class="topbar"><strong>AI INSIGHTS</strong><span>11 de julho de 2026 · Inteligência artificial, negócios e automação</span></div>
  <header class="site-header">
    <a class="brand" href="index.html"><span>AI</span> INSIGHTS</a>
    <nav>${nav}</nav>
    <div class="header-actions">
      <button class="icon-button" id="searchButton" aria-label="Pesquisar">⌕</button>
      <button class="icon-button" id="themeButton" aria-label="Alternar contraste">◐</button>
      <a class="subscribe-button" href="index.html#newsletter">Newsletter</a>
    </div>
    <div class="search-panel" id="searchPanel"><input id="searchInput" type="search" placeholder="Buscar por agentes, modelos, custos..." /></div>
  </header>
  <div class="breaking"><span>Ao vivo</span><a href="artigos/${lead.slug}.html">${esc(lead.title)}</a><a href="index.html#ferramentas">Ferramentas disputam fluxos completos</a><a href="index.html#editorias">Custos de IA entram na pauta</a></div>`;
}

function adSlot(label = "Publicidade") {
  return `<div class="ad-slot" aria-label="${label}">${label}</div>`;
}

function articleCard(article, variant = "") {
  return `<a class="story-card ${variant}" href="artigos/${article.slug}.html" data-category="${esc(article.category)}">
    <span class="story-media ${esc(article.mediaClass || "m1")}" aria-hidden="true"></span>
    <span class="kicker">${esc(article.category)}</span>
    <h3>${esc(article.title)}</h3>
    <p>${esc(article.excerpt)}</p>
    <small>${esc(article.time)} · ${esc(article.readingTime)}</small>
  </a>`;
}
function topicButton(topic, index) {
  const filter = topic === "Todos" ? "todos" : topic;
  return `<button class="topic-chip${index === 0 ? " active" : ""}" data-filter="${esc(filter)}">${esc(topic)}</button>`;
}

function toolCard(tool) {
  return `<article class="tool-card" data-category="${esc(tool.category)}"><span class="tool-media">${esc(tool.initials)}</span><h3>${esc(tool.name)}</h3><p>${esc(tool.description)}</p></article>`;
}
function footer() {
  return `<footer class="site-footer">
    <div><a class="brand" href="index.html"><span>AI</span> INSIGHTS</a><p>Portal editorial independente sobre inteligência artificial, automação e negócios.</p></div>
    <div class="footer-links"><a href="sobre.html">Sobre</a><a href="contato.html">Contato</a><a href="politica-de-privacidade.html">Privacidade</a><a href="termos-de-uso.html">Termos</a><a href="politica-editorial.html">Política editorial</a></div>
  </footer>
  <div class="cookie-banner" id="cookieBanner"><p>Usamos cookies para melhorar a experiência, medir audiência e, futuramente, exibir anúncios via Google AdSense. Leia nossa <a href="politica-de-privacidade.html">Política de Privacidade</a>.</p><div><button class="ghost-button" id="cookieReject">Recusar</button><button class="subscribe-button" id="cookieAccept">Aceitar</button></div></div>
  <script src="assets/site.js"></script>`;
}

const css = `:root{--bg:#05070d;--surface:#0b111d;--panel:#101827;--line:rgba(148,163,184,.2);--text:#f8fafc;--soft:#cbd5e1;--muted:#94a3b8;--cyan:#22d3ee;--blue:#3b82f6;--violet:#7c3aed;--danger:#ef4444}*{box-sizing:border-box}html{scroll-behavior:smooth;background:var(--bg)}body{margin:0;color:var(--text);background:linear-gradient(180deg,#05070d 0,#07111d 45%,#05070d 100%);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit;text-decoration:none}button,input{font:inherit}.topbar{display:flex;justify-content:space-between;gap:16px;padding:9px clamp(18px,5vw,72px);border-bottom:1px solid var(--line);background:#02040a;color:var(--muted);font-size:12px;text-transform:uppercase}.topbar strong,.brand span,.kicker,.live-time{color:var(--cyan)}.site-header{position:sticky;top:0;z-index:10;display:grid;grid-template-columns:260px 1fr auto;align-items:center;gap:24px;min-height:88px;padding:0 clamp(18px,5vw,72px);border-bottom:1px solid var(--line);background:rgba(5,7,13,.96);backdrop-filter:blur(18px)}.brand{font-size:30px;font-weight:900;letter-spacing:.01em;white-space:nowrap}nav{display:flex;gap:clamp(14px,2vw,30px);font-weight:800;color:var(--soft)}nav a{display:flex;align-items:center;min-height:88px;border-bottom:3px solid transparent}nav a.active{color:var(--text);border-color:var(--cyan)}.header-actions{display:flex;align-items:center;gap:10px}.icon-button,.ghost-button,.subscribe-button{min-height:42px;border:1px solid var(--line);border-radius:8px;color:var(--text);background:#0f172a;cursor:pointer}.icon-button{width:42px}.subscribe-button{display:inline-flex;align-items:center;justify-content:center;padding:0 22px;border:0;font-weight:900;background:linear-gradient(135deg,var(--cyan),var(--blue) 48%,var(--violet));color:white}.ghost-button{padding:0 18px}.search-panel{display:none;grid-column:1/-1;margin:0 0 18px}.search-panel.open{display:block}.search-panel input{width:min(720px,100%);min-height:46px;border:1px solid rgba(34,211,238,.5);border-radius:8px;padding:0 14px;color:var(--text);background:#020617}.breaking{display:flex;gap:22px;align-items:center;overflow:hidden;padding:12px clamp(18px,5vw,72px);border-bottom:1px solid var(--line);background:#0b1220;color:var(--soft);white-space:nowrap}.breaking span{padding:6px 10px;border-radius:4px;background:var(--cyan);color:#001018;font-size:12px;font-weight:950;text-transform:uppercase}.page{padding:0 clamp(18px,5vw,72px)}.ad-slot{display:grid;place-items:center;min-height:96px;margin:18px 0 34px;border:1px dashed rgba(125,211,252,.35);border-radius:8px;color:var(--muted);background:#07101c;font-size:12px;text-transform:uppercase;letter-spacing:.12em}.front-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(260px,.75fr) minmax(300px,.9fr);gap:26px;margin:0 0 34px}.lead-card{display:flex;flex-direction:column;justify-content:flex-end;min-height:500px;padding:clamp(24px,4vw,48px);border:1px solid var(--line);border-radius:8px;background:linear-gradient(180deg,rgba(2,6,23,.12),rgba(2,6,23,.94)),radial-gradient(circle at 72% 24%,rgba(34,211,238,.28),transparent 28%),radial-gradient(circle at 28% 70%,rgba(124,58,237,.25),transparent 28%),#07101d}.lead-card h1{max-width:840px;margin:16px 0 14px;font-size:clamp(42px,5.8vw,78px);line-height:1.02;letter-spacing:0}.lead-card p{max-width:720px;margin:0 0 20px;color:var(--soft);font-size:19px;line-height:1.55}.lead-meta,.story-card small{color:var(--muted);font-size:13px;font-weight:800;text-transform:uppercase}.side-stack{display:grid;gap:14px}.story-card{display:flex;flex-direction:column;justify-content:space-between;gap:12px;min-height:154px;padding:20px;border:1px solid var(--line);border-radius:8px;background:rgba(16,24,39,.72);transition:transform .18s ease,border-color .18s ease}.story-card:hover,.tool-card:hover{transform:translateY(-3px);border-color:rgba(34,211,238,.55)}.story-card h3{margin:0;font-size:20px;line-height:1.16}.story-card p{margin:0;color:var(--soft);font-size:14px;line-height:1.5}.updates{padding:20px;border:1px solid var(--line);border-radius:8px;background:rgba(11,17,29,.82)}.updates h2,.section-title h2{margin:0;font-size:24px}.update-row{display:grid;grid-template-columns:70px 1fr;gap:12px;padding:15px 0;border-top:1px solid var(--line)}.update-row:first-of-type{margin-top:12px}.update-row p{margin:0;color:var(--soft);line-height:1.42}.topic-row{display:flex;gap:10px;overflow-x:auto;margin:0 0 28px;padding-bottom:4px}.topic-chip{flex:0 0 auto;min-height:38px;border:1px solid var(--line);border-radius:8px;padding:0 16px;color:var(--soft);background:#0f172a;cursor:pointer}.topic-chip.active{border-color:var(--cyan);color:white;box-shadow:0 0 0 3px rgba(34,211,238,.12)}.section-title{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:34px 0 16px}.section-title p{margin:0;color:var(--muted)}.content-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:28px}.news-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.news-grid .story-card{min-height:240px}.rail{display:grid;align-content:start;gap:18px}.newsletter,.tools-panel{padding:22px;border:1px solid var(--line);border-radius:8px;background:#0b111d}.newsletter h2{margin:0 0 8px}.newsletter p,.tools-panel p{color:var(--soft);line-height:1.55}.newsletter form{display:grid;gap:10px}.newsletter input{min-height:44px;border:1px solid var(--line);border-radius:8px;padding:0 12px;color:var(--text);background:#020617}.tools-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.tool-card{min-height:190px;padding:20px;border:1px solid var(--line);border-radius:8px;background:#0b111d;transition:transform .18s ease,border-color .18s ease}.tool-card span{display:grid;place-items:center;width:44px;height:32px;border-radius:7px;background:linear-gradient(135deg,var(--cyan),var(--violet));font-weight:900}.tool-card h3{margin:18px 0 8px}.special-band{display:grid;grid-template-columns:.9fr 1.1fr;gap:28px;align-items:center;margin:42px 0;padding:28px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:rgba(2,6,23,.28)}.special-band img{width:100%;border:1px solid var(--line);border-radius:8px}.site-footer{display:flex;justify-content:space-between;gap:24px;padding:34px clamp(18px,5vw,72px);border-top:1px solid var(--line);color:var(--soft);background:#05070d}.footer-links{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:16px}.cookie-banner{position:fixed;left:50%;bottom:18px;z-index:20;display:none;grid-template-columns:1fr auto;gap:18px;width:min(980px,calc(100% - 32px));padding:18px;border:1px solid rgba(125,211,252,.42);border-radius:8px;background:rgba(5,7,13,.96);box-shadow:0 24px 70px rgba(0,0,0,.45)}.cookie-banner.open{display:grid}.cookie-banner p{margin:0;color:var(--soft);line-height:1.45}.article-shell{max-width:1120px;margin:0 auto;padding:34px clamp(18px,5vw,72px)}.article-layout{display:grid;grid-template-columns:minmax(0,760px) 300px;gap:42px}.article-header{border-bottom:1px solid var(--line);padding-bottom:24px;margin-bottom:24px}.article-header h1{margin:14px 0;font-size:clamp(36px,5vw,64px);line-height:1.04}.article-deck{color:var(--soft);font-size:20px;line-height:1.55}.article-body p{color:#e2e8f0;font-size:19px;line-height:1.85}.source-box{margin:28px 0;padding:18px;border-left:4px solid var(--cyan);background:#0b111d}.source-box a{color:#7dd3fc;font-weight:900}.related-list{display:grid;gap:12px}.related-list a{padding:14px;border:1px solid var(--line);border-radius:8px;background:#0b111d}.hidden{display:none!important}@media(max-width:1180px){.front-grid,.content-grid,.article-layout,.special-band{grid-template-columns:1fr}.news-grid,.tools-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.site-header{grid-template-columns:1fr auto}nav{display:none}}@media(max-width:720px){.topbar{display:block}.site-header{min-height:74px}.brand{font-size:24px}.header-actions .subscribe-button{display:none}.breaking{font-size:14px}.front-grid,.news-grid,.tools-grid{grid-template-columns:1fr}.lead-card{min-height:430px}.lead-card h1{font-size:42px}.cookie-banner{grid-template-columns:1fr}.site-footer{display:block}.footer-links{justify-content:flex-start;margin-top:18px}}`;

const js = `const searchButton=document.querySelector("#searchButton");const searchPanel=document.querySelector("#searchPanel");const searchInput=document.querySelector("#searchInput");const themeButton=document.querySelector("#themeButton");const chips=document.querySelectorAll("[data-filter]");const stories=document.querySelectorAll("[data-category]");const cookieBanner=document.querySelector("#cookieBanner");const cookieAccept=document.querySelector("#cookieAccept");const cookieReject=document.querySelector("#cookieReject");function norm(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"")}function applyFilter(filter=document.querySelector(".topic-chip.active")?.dataset.filter||"todos"){const q=norm(searchInput?.value||"");stories.forEach((item)=>{const category=item.dataset.category||"";const text=norm(item.innerText+" "+category);const okCategory=filter==="todos"||category===filter;const okQuery=!q||text.includes(q);item.classList.toggle("hidden",!(okCategory&&okQuery))})}searchButton?.addEventListener("click",()=>{searchPanel?.classList.toggle("open");searchInput?.focus()});searchInput?.addEventListener("input",()=>applyFilter());chips.forEach((chip)=>chip.addEventListener("click",()=>{chips.forEach((item)=>item.classList.remove("active"));chip.classList.add("active");applyFilter(chip.dataset.filter)}));themeButton?.addEventListener("click",()=>document.body.classList.toggle("high-contrast"));if(!localStorage.getItem("aiInsightsCookieChoice"))cookieBanner?.classList.add("open");cookieAccept?.addEventListener("click",()=>{localStorage.setItem("aiInsightsCookieChoice","accepted");cookieBanner?.classList.remove("open")});cookieReject?.addEventListener("click",()=>{localStorage.setItem("aiInsightsCookieChoice","rejected");cookieBanner?.classList.remove("open")});document.querySelector("#newsletterForm")?.addEventListener("submit",(event)=>{event.preventDefault();const msg=document.querySelector("#formMessage");if(msg)msg.textContent="Pronto. Seu e-mail foi registrado nesta demonstração."});`;


const portalCssFix = `
body{overflow-x:hidden}.page{max-width:1360px;margin:0 auto}.site-header{grid-template-columns:260px minmax(0,1fr) auto}.front-grid{grid-template-columns:minmax(0,1.08fr) minmax(280px,.74fr) minmax(300px,.7fr);gap:24px;align-items:start}.front-grid .updates{grid-column:3;grid-row:1/span 2;height:100%;min-height:556px}.front-grid .side-stack{grid-column:2;grid-row:1/span 2}.front-grid .front-ad{grid-column:1;grid-row:2}.lead-card{min-width:0;min-height:300px;overflow:hidden;padding:30px 32px;background:linear-gradient(180deg,rgba(2,6,23,.18),rgba(2,6,23,.92)),url("ai-operations-news.png");background-size:cover;background-position:center}.lead-card h1{max-width:100%;font-size:clamp(36px,3.65vw,54px);line-height:1.04;overflow-wrap:anywhere;text-wrap:balance}.lead-card p{font-size:18px;line-height:1.48}.side-stack{grid-template-rows:none}.story-card{min-width:0;overflow:hidden}.side-stack .story-card{min-height:154px;height:auto;padding:20px}.story-card h3{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-size:19px;line-height:1.18}.story-card p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.story-card small{margin-top:auto}.updates{min-width:0;overflow:hidden}.updates h2{font-size:23px}.update-row{grid-template-columns:62px minmax(0,1fr);align-items:start}.update-row p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.content-grid{grid-template-columns:minmax(0,1fr) 310px}.news-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.news-grid .story-card{min-height:220px}.front-ad{grid-column:1/2;display:grid;place-items:center;min-height:210px;margin-top:-10px;border:1px dashed rgba(125,211,252,.34);border-radius:8px;color:var(--muted);background:rgba(2,6,23,.42);font-size:12px;letter-spacing:.16em;text-transform:uppercase}.story-media{display:block;aspect-ratio:16/9;margin:-2px -2px 12px;border-radius:7px;background-size:cover;background-position:center}.story-media.m1{background-image:linear-gradient(135deg,rgba(2,6,23,.1),rgba(2,6,23,.35)),url("ai-operations-news.png")}.story-media.m2{background-image:linear-gradient(135deg,rgba(2,6,23,.08),rgba(2,6,23,.34)),url("ai-agents-workflows.png")}.story-media.m3{background-image:radial-gradient(circle at 35% 40%,rgba(124,58,237,.42),transparent 32%),linear-gradient(135deg,#091827,#14213b)}.story-media.m4{background-image:linear-gradient(135deg,rgba(2,6,23,.08),rgba(2,6,23,.34)),url("ai-agents-workflows.png")}.side-stack .story-media{display:none}.tool-media{display:grid;place-items:center;width:44px;height:32px;border-radius:7px;background:linear-gradient(135deg,var(--cyan),var(--violet));font-weight:900}.cookie-banner{left:50%;right:auto;bottom:22px;transform:translateX(-50%);grid-template-columns:minmax(0,1fr) auto;align-items:center;max-height:none;width:min(760px,calc(100% - 32px));padding:14px 16px;overflow:visible}.cookie-banner p{font-size:14px}.cookie-banner div{display:flex;gap:10px;justify-content:flex-end;white-space:nowrap}@media(min-width:1280px){.front-grid{grid-template-columns:minmax(0,1.05fr) 300px 330px}.lead-card h1{font-size:50px}}@media(max-width:1180px){.front-grid{grid-template-columns:1fr}.front-grid .side-stack,.front-grid .updates,.front-grid .front-ad{grid-column:auto;grid-row:auto}.front-ad{grid-column:auto;min-height:120px}.front-grid .updates{min-height:auto}.lead-card{min-height:320px}.side-stack{grid-template-rows:none}.side-stack .story-card{min-height:170px}.content-grid{grid-template-columns:1fr}}@media(max-width:760px){.page{padding:0 16px}.lead-card{min-height:auto;padding:28px 22px}.front-ad{min-height:90px}.cookie-banner{grid-template-columns:1fr;bottom:12px;width:calc(100% - 24px);transform:translateX(-50%)}.cookie-banner div{justify-content:stretch}.cookie-banner .ghost-button,.cookie-banner .subscribe-button{flex:1}.lead-card h1{font-size:38px}.lead-card p{font-size:16px}.news-grid,.tools-grid{grid-template-columns:1fr}.cookie-banner{bottom:10px;width:calc(100% - 20px)}}`;
const index = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Insights | Notícias e análises de inteligência artificial</title>
  <meta name="description" content="Portal brasileiro sobre inteligência artificial, agentes, automação, ferramentas, custos e negócios." />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${domain}/" />
  <link rel="stylesheet" href="assets/site.css" />
</head>
<body>
  ${siteHeader("capa")}
  <main class="page">
    ${adSlot()}
    <section class="front-grid" id="ultimas">
      <a class="lead-card" href="artigos/${lead.slug}.html">
        <span class="kicker">Manchete</span>
        <h1>${esc(lead.title)}</h1>
        <p>${esc(lead.excerpt)}</p>
        <div class="lead-meta">${esc(lead.category)} · ${esc(lead.readingTime)} · ${esc(lead.time)}</div>
      </a>
      <div class="front-ad" aria-label="Publicidade">Publicidade</div>
      <div class="side-stack">${secondary.map((article) => articleCard(article)).join("")}</div>
      <aside class="updates"><h2>Últimas notícias</h2>${latest.map((article) => `<a class="update-row" href="artigos/${article.slug}.html"><time class="live-time">${esc(article.time)}</time><p>${esc(article.title)}</p></a>`).join("")}</aside>
    </section>
    <section class="topic-row" id="editorias">${topics.map(topicButton).join("")}</section>
    <section class="content-grid">
      <div>
        <div class="section-title"><div><h2>Notícias e análises</h2><p>Atualizações com leitura prática para negócios, produto e operação.</p></div><a class="kicker" href="politica-editorial.html">Política editorial</a></div>
        <div class="news-grid">${articles.map((article) => articleCard(article)).join("")}</div>
        ${adSlot("Publicidade")}
        <div class="section-title"><div><h2>Opinião e contexto</h2><p>Leituras para separar movimento real de ruído.</p></div></div>
        <div class="news-grid">${editorials.map((article) => articleCard(article, "context-card")).join("")}</div>
      </div>
      <aside class="rail">
        <section class="newsletter" id="newsletter"><h2>Receba o radar semanal</h2><p>Uma curadoria prática com lançamentos, riscos, oportunidades e ferramentas de IA.</p><form id="newsletterForm"><input type="email" placeholder="Seu e-mail" required><button class="subscribe-button" type="submit">Assinar</button><small id="formMessage"></small></form></section>
        ${adSlot("Publicidade")}
        <section class="tools-panel"><h2>Ferramentas em alta</h2><p>O que está ganhando espaço em agentes, automação e produtividade.</p>${tools.filter((tool) => tool.trending).slice(0,4).map((tool) => `<a class="update-row" href="#ferramentas"><time class="live-time">${esc(tool.initials)}</time><p>${esc(tool.name)} · ${esc(tool.category)}</p></a>`).join("")}</section>
      </aside>
    </section>
    <section id="ferramentas"><div class="section-title"><div><h2>Radar de ferramentas</h2><p>Produtos, conceitos e stacks que merecem acompanhamento.</p></div></div><div class="tools-grid">${tools.map(toolCard).join("")}</div></section>
    <section class="special-band"><div><span class="kicker">Especial</span><h2>Como o AI Insights decide o que merece virar notícia.</h2><p>O portal combina pesquisa em fontes confiáveis, análise editorial rigorosa e curadoria voltada para quem usa IA em negócios, criação, automação e produto.</p></div><img src="assets/ai-insights-concept.png" alt="Mesa editorial visual do AI Insights"></section>
  </main>
  ${footer()}
</body>
</html>`;

function articlePage(article) {
  const related = articles.filter((item) => item.slug !== article.slug).slice(0, 4);
  const paragraphs = [
    article.body,
    `Na prática, o tema importa porque conecta ${article.category.toLowerCase()} a decisões concretas de produto, operação e estratégia. O AI Insights acompanha esse movimento com foco em aplicabilidade, riscos e sinais de mercado.`,
    `Para empresas e profissionais, a recomendação é observar impacto, custo, governança e dependência de fornecedor antes de transformar novidade em processo permanente.`
  ];
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(article.title)} | AI Insights</title>
  <meta name="description" content="${esc(article.excerpt)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${domain}/artigos/${article.slug}.html" />
  <link rel="stylesheet" href="../assets/site.css" />
  <script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"NewsArticle",headline:article.title,description:article.excerpt,datePublished:"2026-07-11",author:{"@type":"Organization",name:"AI Insights"},publisher:{"@type":"Organization",name:"AI Insights"}}, null, 0)}</script>
</head>
<body>
  ${siteHeader("ultimas").replaceAll('href="index.html', 'href="../index.html').replaceAll('href="sobre.html"', 'href="../sobre.html"').replaceAll('href="contato.html"', 'href="../contato.html"').replaceAll(`href="artigos/${lead.slug}.html"`, `href="../artigos/${lead.slug}.html"`)}
  <main class="article-shell">
    ${adSlot()}
    <div class="article-layout">
      <article>
        <header class="article-header"><span class="kicker">${esc(article.category)}</span><h1>${esc(article.title)}</h1><p class="article-deck">${esc(article.excerpt)}</p><div class="lead-meta">Por ${esc(article.author)} · ${esc(article.date)} · ${esc(article.readingTime)}</div></header>
        <div class="article-body">${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
        <div class="source-box"><strong>Fonte acompanhada pela redação</strong><br><a href="${esc(article.sourceUrl || "#")}" target="_blank" rel="noreferrer">${esc(article.sourceLabel || "Fonte original")}</a></div>
        ${adSlot("Publicidade")}
      </article>
      <aside class="rail"><section class="updates"><h2>Mais lidas em IA</h2><div class="related-list">${related.map((item) => `<a href="${item.slug}.html"><span class="kicker">${esc(item.category)}</span><p>${esc(item.title)}</p></a>`).join("")}</div></section>${adSlot("Publicidade")}</aside>
    </div>
  </main>
  ${footer().replaceAll('href="index.html', 'href="../index.html').replaceAll('href="sobre.html"', 'href="../sobre.html"').replaceAll('href="contato.html"', 'href="../contato.html"').replaceAll('href="politica-de-privacidade.html"', 'href="../politica-de-privacidade.html"').replaceAll('href="termos-de-uso.html"', 'href="../termos-de-uso.html"').replaceAll('href="politica-editorial.html"', 'href="../politica-editorial.html"').replace('src="assets/site.js"', 'src="../assets/site.js"')}
</body>
</html>`;
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${domain}/</loc></url>
  <url><loc>${domain}/sobre.html</loc></url>
  <url><loc>${domain}/contato.html</loc></url>
  <url><loc>${domain}/politica-de-privacidade.html</loc></url>
  <url><loc>${domain}/termos-de-uso.html</loc></url>
  <url><loc>${domain}/politica-editorial.html</loc></url>
${articles.map((article) => `  <url><loc>${domain}/artigos/${article.slug}.html</loc></url>`).join("\n")}
</urlset>
`;

await writeFile(path.join(assetsDir, "site.css"), css + portalCssFix, "utf8");
await writeFile(path.join(assetsDir, "site.js"), js, "utf8");
await writeFile(path.join(siteDir, "index.html"), index, "utf8");
await writeFile(path.join(siteDir, "sitemap.xml"), sitemap, "utf8");
await writeFile(path.join(siteDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${domain}/sitemap.xml\n`, "utf8");

for (const article of articles) {
  await writeFile(path.join(articlesDir, `${article.slug}.html`), articlePage(article), "utf8");
}

console.log(`Portal reconstruido: ${articles.length} paginas de artigo geradas.`);






