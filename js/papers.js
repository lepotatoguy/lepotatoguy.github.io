// Renders data/papers.json on /papers/: search box, topic chips, and one page per paper at #/p/<slug>.
// Entry fields: slug, title, authors, year, venue, tags[], summary; optional arxiv, doi, pdf, code,
// takeaways[] (bullet list) and notes[] (paragraphs) shown on the paper's own page. "todo" is ignored.
(function () {
  "use strict";

  const MY_NAME = "Joyanta Jyoti Mondal";

  function matchesPaper(paper, tag, query) {
    const tags = paper.tags || [];
    const q = (query || "").trim().toLowerCase();
    const text = [paper.title, paper.authors, paper.venue, paper.year, paper.summary, tags.join(" ")].join(" ").toLowerCase();
    return (!tag || tags.includes(tag)) && (!q || text.includes(q));
  }

  const filterPapers = (papers, tag, query) => papers.filter(p => matchesPaper(p, tag, query));
  const collectTags = papers => [...new Set(papers.flatMap(p => p.tags || []))].sort();
  const sortByYear = papers => papers.slice().sort((a, b) => (b.year || 0) - (a.year || 0));

  function paperLinks(p) {
    return [
      p.arxiv && ["arXiv", "https://arxiv.org/abs/" + p.arxiv],
      (p.pdf || p.arxiv) && ["PDF", p.pdf || "https://arxiv.org/pdf/" + p.arxiv],
      p.doi && ["DOI", "https://doi.org/" + p.doi],
      p.code && ["Code", p.code]
    ].filter(link => link && /^https?:\/\//.test(link[1]));
  }

  if (typeof module !== "undefined") {
    module.exports = { filterPapers, collectTags, sortByYear, paperLinks };
    return;
  }

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let papers = [], activeTag = "", query = "", loadError = "";

  function authorsHtml(p) {
    if (!p.authors) return "";
    const names = esc(p.authors).split(MY_NAME).join("<strong>" + MY_NAME + "</strong>");
    const note = p.authors.includes("*") ? ' <span class="paper-note">(* equal contribution)</span>' : "";
    return '<p class="paper-authors">' + names + note + "</p>";
  }

  const tagsHtml = p => (p.tags || []).map(t => '<span class="paper-tag">' + esc(t) + "</span>").join("");

  function drawChips() {
    $("#paper-chips").innerHTML = collectTags(papers).map(t =>
      '<button class="paper-chip" type="button" aria-pressed="' + (t === activeTag) + '" data-tag="' + esc(t) + '">' + esc(t) + "</button>").join("");
  }

  function drawList() {
    const rows = filterPapers(papers, activeTag, query);
    $("#paper-count").textContent = papers.length ? rows.length + " of " + papers.length + " papers" : "";
    $("#paper-list").innerHTML = rows.length ? rows.map(p => `
      <a class="paper-card" href="#/p/${encodeURIComponent(p.slug)}">
        <div class="paper-year">${esc(p.year)}</div>
        <div>
          <p class="work-meta">${esc(p.venue || "Preprint")}</p>
          <h2>${esc(p.title)}</h2>
          ${authorsHtml(p)}
          ${p.summary ? `<p class="paper-summary">${esc(p.summary)}</p>` : ""}
          <div class="paper-tags">${tagsHtml(p)}</div>
        </div>
      </a>`).join("") : '<p class="paper-empty">' + esc(loadError || (papers.length ? "No papers match. Clear the search or pick another topic." : "No papers yet.")) + "</p>";
  }

  function showPaper(slug) {
    const p = papers.find(x => x.slug === slug);
    const view = $("#paper-detail");
    if (!p) {
      view.innerHTML = '<a class="paper-back" href="#/">Back to all papers</a><p class="paper-empty">Paper not found.</p>';
      return;
    }
    document.title = p.title + " | Joyanta J. Mondal";
    const links = paperLinks(p).map(([label, url]) =>
      '<a class="paper-button" href="' + esc(url) + '" target="_blank" rel="noreferrer">' + esc(label) + " ↗</a>").join("");
    view.innerHTML = `
      <a class="paper-back" href="#/">Back to all papers</a>
      <p class="work-meta">${esc(p.venue || "Preprint")} ${esc(p.year)}</p>
      <h1>${esc(p.title)}</h1>
      ${authorsHtml(p)}
      <div class="paper-tags">${tagsHtml(p)}</div>
      ${links ? `<div class="paper-links">${links}</div>` : ""}
      ${p.summary ? `<p class="page-description">${esc(p.summary)}</p>` : ""}
      ${(p.takeaways || []).length ? `<div class="paper-takeaways"><h2>Key points</h2><ul>${p.takeaways.map(t => "<li>" + esc(t) + "</li>").join("")}</ul></div>` : ""}
      ${(p.notes || []).map(n => "<p>" + esc(n) + "</p>").join("")}`;
  }

  function route() {
    const m = location.hash.match(/^#\/p\/(.+)$/);
    $("#paper-list-view").hidden = Boolean(m);
    $("#paper-detail").hidden = !m;
    if (m) showPaper(decodeURIComponent(m[1]));
    else document.title = "Papers | Joyanta J. Mondal";
    window.scrollTo(0, 0);
  }

  async function load() {
    try {
      const r = await fetch("../data/papers.json", { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      papers = sortByYear(await r.json());
    } catch (e) {
      loadError = "Could not load the paper list (" + e.message + ").";
    }
    drawChips();
    drawList();
    route();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#paper-search").addEventListener("input", e => { query = e.target.value; drawList(); });
    $("#paper-chips").addEventListener("click", e => {
      const chip = e.target.closest(".paper-chip");
      if (!chip) return;
      activeTag = activeTag === chip.dataset.tag ? "" : chip.dataset.tag;
      drawChips();
      drawList();
    });
    window.addEventListener("hashchange", route);
    load();
  });
})();
