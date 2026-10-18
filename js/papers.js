// Renders data/papers.json on /papers/ ("Papers I read"): search box, topic chips, and one page per paper at #/p/<slug>.
// Entry fields: slug, title, authors, year, tags[], added (YYYY-MM-DD, date read), summary; optional venue, arxiv, doi,
// pdf, code, takeaways[] (bullet list) and bodyUrl ("notes/<slug>.md", Markdown notes shown on the paper's own page).
// To add a paper: prepend an entry to data/papers.json and, for long notes, copy papers/notes/_template.md.
(function () {
  "use strict";

  const NOTES_PATH = /^notes\/[\w-]+\.md$/;

  function matchesPaper(paper, tag, query) {
    const tags = paper.tags || [];
    const q = (query || "").trim().toLowerCase();
    const text = [paper.title, paper.authors, paper.venue, paper.year, paper.summary, tags.join(" ")].join(" ").toLowerCase();
    return (!tag || tags.includes(tag)) && (!q || text.includes(q));
  }

  const filterPapers = (papers, tag, query) => papers.filter(p => matchesPaper(p, tag, query));
  const collectTags = papers => [...new Set(papers.flatMap(p => p.tags || []))].sort();
  // Most recently read first; same-day entries keep their newest-first list order.
  const sortByAdded = papers => papers.slice().sort((a, b) =>
    String(b.added || "").localeCompare(String(a.added || "")));
  const notesUrl = p => (p.bodyUrl && NOTES_PATH.test(p.bodyUrl) ? p.bodyUrl : "");

  function paperLinks(p) {
    return [
      p.arxiv && ["arXiv", "https://arxiv.org/abs/" + p.arxiv],
      (p.pdf || p.arxiv) && ["PDF", p.pdf || "https://arxiv.org/pdf/" + p.arxiv],
      p.doi && ["DOI", "https://doi.org/" + p.doi],
      p.code && ["Code", p.code]
    ].filter(link => link && /^https?:\/\//.test(link[1]));
  }

  if (typeof module !== "undefined") {
    module.exports = { filterPapers, collectTags, sortByAdded, paperLinks, notesUrl };
    return;
  }

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let papers = [], activeTag = "", query = "", loadError = "";

  const authorsHtml = p => (p.authors ? '<p class="paper-authors">' + esc(p.authors) + "</p>" : "");
  const tagsHtml = p => (p.tags || []).map(t => '<span class="paper-tag">' + esc(t) + "</span>").join("") +
    (p.added ? '<span class="paper-added">Read ' + esc(p.added) + "</span>" : "");

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

  async function drawNotes(p) {
    const url = notesUrl(p);
    const box = $("#paper-notes");
    if (!url || !box) return;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const md = await r.text();
      // Notes are this repo's own files; without the Markdown library, fall back to plain paragraphs.
      box.innerHTML = window.marked ? window.marked.parse(md) : md.split(/\n\s*\n/).map(b => "<p>" + esc(b) + "</p>").join("");
    } catch (e) {
      box.innerHTML = '<p class="paper-empty">Could not load papers/' + esc(url) + " (" + esc(e.message) + ").</p>";
    }
  }

  function showPaper(slug) {
    const p = papers.find(x => x.slug === slug);
    const view = $("#paper-detail");
    if (!p) {
      view.innerHTML = '<a class="paper-back" href="#/">Back to all papers</a><p class="paper-empty">Paper not found.</p>';
      return;
    }
    document.title = p.title + " | Papers I read | Joyanta J. Mondal";
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
      ${(p.takeaways || []).length ? `<div class="paper-takeaways"><h2>Key takeaways</h2><ul>${p.takeaways.map(t => "<li>" + esc(t) + "</li>").join("")}</ul></div>` : ""}
      <div class="paper-notes" id="paper-notes"></div>`;
    drawNotes(p);
  }

  function route() {
    const m = location.hash.match(/^#\/p\/(.+)$/);
    $("#paper-list-view").hidden = Boolean(m);
    $("#paper-detail").hidden = !m;
    if (m) showPaper(decodeURIComponent(m[1]));
    else document.title = "Papers I read | Joyanta J. Mondal";
    window.scrollTo(0, 0);
  }

  async function load() {
    try {
      const r = await fetch("../data/papers.json", { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      papers = sortByAdded(await r.json());
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
