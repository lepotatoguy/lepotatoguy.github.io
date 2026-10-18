// Builds a PDF CV from the sections of this page plus data/cv-extras.json,
// laid out after the LaTeX academic CV template, and downloads it.
// Kept ATS-friendly: single column, real text only (no icon fonts or drawn
// bullets), embedded fonts with Unicode maps, and full URLs spelled out.
(function () {
  "use strict";

  const PDFMAKE_SRC = "js/vendor/pdfmake.min.js";
  const EXTRAS_SRC = "data/cv-extras.json";
  const PAGE_WIDTH = 595.28 - 2 * 40;
  const LINK = "#1a0dab";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Files the CV is generated from; the newest commit touching them is the "last updated" date.
  const SOURCES = ["index.html", EXTRAS_SRC];

  const abs = path => new URL(path, document.baseURI).href;
  const clean = text => (text || "").replace(/\s+/g, " ").trim();
  const textOf = (root, selector) => {
    const el = root.querySelector(selector);
    return el ? clean(el.textContent) : "";
  };

  let pdfmakeLoading = null;
  function loadPdfmake() {
    if (window.pdfMake) return Promise.resolve(window.pdfMake);
    if (!pdfmakeLoading) {
      pdfmakeLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = PDFMAKE_SRC;
        script.onload = () => resolve(window.pdfMake);
        script.onerror = () => {
          pdfmakeLoading = null;
          reject(new Error("Could not load " + PDFMAKE_SRC));
        };
        document.head.appendChild(script);
      });
    }
    return pdfmakeLoading;
  }

  // "Aug 2024 – Dec 2025" -> "08/2024 - 12/2025"; text without month names is kept.
  function formatPeriod(text) {
    return clean(text)
      .replace(/\b([A-Z][a-z]{2})\w*\.? ((?:19|20)\d{2})\b/g, (match, mon, year) => {
        const index = MONTHS.indexOf(mon);
        return index < 0 ? match : String(index + 1).padStart(2, "0") + "/" + year;
      })
      .replace(/\s*[–—]\s*/g, " - ");
  }

  // "Md. Farhadul Islam*" -> "M. F. Islam*"
  function abbreviate(name) {
    const star = name.endsWith("*") ? "*" : "";
    const parts = name.replace(/\*$/, "").trim().split(/\s+/);
    const last = parts.pop();
    return parts.map(part => part.charAt(0).toUpperCase() + ".").concat(last).join(" ") + star;
  }

  function readHeader() {
    const emailEl = document.querySelector(".intro-email").cloneNode(true);
    emailEl.querySelectorAll("a").forEach(a => a.remove());
    const email = clean(emailEl.textContent);
    const links = Array.from(document.querySelectorAll(".intro-links a")).map(a => a.href);
    const metas = Array.from(document.querySelectorAll(".intro-meta span")).map(s => clean(s.textContent));
    return {
      location: metas[metas.length - 1] || "",
      email: email
        .replace(/\s*\(dot\)\s*/g, ".")
        .replace(/\s*\[at\]\s*/g, "@")
        .replace(/\s+/g, ""),
      github: links.find(href => href.includes("github.com")) || "",
      scholar: links.find(href => href.includes("scholar.google")) || "",
    };
  }

  function readTimeline(sectionId) {
    return Array.from(document.querySelectorAll("#" + sectionId + " .timeline-item")).map(item => {
      const role = textOf(item, ".timeline-role");
      const detail = item.querySelector(".timeline-detail");
      return {
        period: textOf(item, ".timeline-period"),
        role: role,
        institution: textOf(item, ".timeline-institution"),
        org: textOf(item, ".timeline-org"),
        location: textOf(item, ".timeline-location"),
        details: detail ? detail.innerHTML.split(/<br\s*\/?>/i).map(html => {
          const tmp = document.createElement("div");
          tmp.innerHTML = html;
          return clean(tmp.textContent);
        }).filter(Boolean) : [],
      };
    });
  }

  function readPublications(extras) {
    return Array.from(document.querySelectorAll("#publications .pub-card")).map(card => {
      const venueText = textOf(card, ".pub-venue");
      const yearMatch = venueText.match(/\b(?:19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : "";
      const venue = venueText.split("•")
        .map(part => clean(part.replace(year, "")))
        .filter(Boolean)
        .join(", ");
      const titleEl = card.querySelector(".pub-title").cloneNode(true);
      titleEl.querySelectorAll(".pub-link").forEach(a => a.remove());
      const link = card.querySelector(".pub-link");
      const doiMatch = textOf(card, ".pub-note").match(/DOI:\s*(\S+)/);
      const doi = doiMatch ? doiMatch[1] : "";
      const me = textOf(card, ".pub-authors strong").replace(/\*$/, "");
      const extra = (extras.publications || {})[doi] || {};
      return {
        title: clean(titleEl.textContent),
        authors: textOf(card, ".pub-authors").split(",").map(clean).filter(Boolean),
        me: me,
        venue: extra.venue || venue,
        year: year,
        doi: doi,
        link: link ? link.href : "",
        tag: extra.tag || "",
        type: extra.type || (/journal|transactions|reports|access|applications/i.test(venue) ? "J" : "C"),
      };
    });
  }

  function readHonors() {
    return Array.from(document.querySelectorAll("#honors .honor-card")).map(card => ({
      period: formatPeriod(textOf(card, ".honor-year")),
      title: textOf(card, ".honor-title"),
      org: textOf(card, ".honor-org"),
    }));
  }

  function readSkills() {
    return Array.from(document.querySelectorAll("#skills .skill-group")).map(group => ({
      title: textOf(group, ".skill-group-title"),
      items: Array.from(group.querySelectorAll(".skill-tag")).map(tag => clean(tag.textContent)),
    }));
  }

  // "Reviewer, NeurIPS 2025" + "Reviewer, NeurIPS 2023" -> Reviewer: NeurIPS (2023, 2025)
  function readServices() {
    const roles = new Map();
    document.querySelectorAll("#reviewer .reviewer-item").forEach(item => {
      const text = clean(item.textContent);
      const comma = text.indexOf(",");
      if (comma < 0) return;
      const role = text.slice(0, comma).trim();
      const what = text.slice(comma + 1).trim();
      if (!roles.has(role)) roles.set(role, new Map());
      const venues = roles.get(role);
      const match = what.match(/^(.*?)\s+((?:19|20)\d{2})(?:\s*\(\d+(?:st|nd|rd|th)\))?$/);
      const base = match ? match[1] : what;
      if (!venues.has(base)) venues.set(base, match ? [] : null);
      if (match && venues.get(base)) venues.get(base).push(match[2]);
    });
    return Array.from(roles, ([role, venues]) => ({
      role: role,
      items: Array.from(venues, ([base, years]) => {
        if (!years) return base;
        years.sort();
        return years.length === 1 ? base + " " + years[0] : base + " (" + years.join(", ") + ")";
      }),
    }));
  }

  function heading(title, right) {
    return {
      margin: [0, 7, 0, 3],
      stack: [
        {
          columns: [
            { text: title.toUpperCase(), fontSize: 10.5, bold: true },
            right ? { text: right, width: "auto", fontSize: 8.5, color: LINK, margin: [0, 2.5, 0, 0] } : { text: "", width: 0 },
          ],
        },
        { canvas: [{ type: "line", x1: 0, y1: 1, x2: PAGE_WIDTH, y2: 1, lineWidth: 0.6 }] },
      ],
    };
  }

  function entry(title, right, subtitle, subRight, bullets) {
    const block = {
      margin: [0, 2, 0, 3],
      stack: [
        { columns: [
          { text: [{ text: "•  " }, { text: title, bold: true }] },
          { text: right, italics: true, fontSize: 9, width: "auto", margin: [0, 1, 0, 0] },
        ] },
      ],
    };
    if (subtitle || subRight) {
      block.stack.push({ margin: [9, 0, 0, 0], columns: [
        { text: subtitle, italics: true, fontSize: 9 },
        { text: subRight, fontSize: 9, width: "auto" },
      ] });
    }
    if (bullets && bullets.length) {
      block.stack.push({ margin: [9, 1, 0, 0], stack: bullets.map(b => bulleted("◦", b)) });
    }
    return block;
  }

  // A text bullet (so it survives text extraction) with wrapped lines hanging under the text.
  function bulleted(marker, body) {
    return { margin: [0, 0, 0, 1], columns: [{ text: marker, width: 9 }, { text: body }] };
  }

  function labelled(label, body) {
    return bulleted("•", [{ text: label + ": ", bold: true }, body]);
  }

  // Date of the newest commit touching SOURCES, falling back to the page's
  // Last-Modified header; null when neither is available.
  async function lastUpdated(repo) {
    const commitDate = path => fetch("https://api.github.com/repos/" + repo + "/commits?per_page=1&path=" + encodeURIComponent(path))
      .then(r => (r.ok ? r.json() : []))
      .then(commits => (commits[0] ? new Date(commits[0].commit.committer.date) : null))
      .catch(() => null);
    const dates = repo ? await Promise.all(SOURCES.map(commitDate)) : [];
    let latest = dates.filter(Boolean).sort((a, b) => b - a)[0];
    if (!latest) {
      const header = await fetch(location.href.split("#")[0], { method: "HEAD", cache: "no-cache" })
        .then(r => r.headers.get("Last-Modified"))
        .catch(() => null);
      latest = header ? new Date(header) : null;
    }
    return latest && !isNaN(latest) ? latest : null;
  }

  function buildDoc(extras, updated) {
    const head = readHeader();
    const sep = "  |  ";
    const content = [
      { text: extras.name, fontSize: 15, bold: true, alignment: "center", margin: [0, 0, 0, 4] },
      {
        alignment: "center", fontSize: 9, margin: [0, 0, 0, 2],
        text: [
          head.location, sep,
          { text: head.email, link: "mailto:" + head.email, color: LINK }, sep,
          { text: extras.website, link: extras.website, color: LINK },
        ],
      },
      {
        alignment: "center", fontSize: 9, margin: [0, 0, 0, 2],
        text: [
          "GitHub: ", { text: head.github, link: head.github, color: LINK }, sep,
          "Google Scholar: ", { text: head.scholar, link: head.scholar, color: LINK },
        ],
      },
    ];

    if (extras.summary) {
      content.push(heading("Professional Summary"), { text: extras.summary });
    }

    content.push(heading("Education"));
    readTimeline("education").forEach(item => {
      const override = (extras.education || {})[item.institution] || {};
      content.push(entry(
        item.institution,
        override.period || formatPeriod(item.period),
        item.role,
        item.location,
        item.details,
      ));
    });

    content.push(heading("Experience"));
    readTimeline("experience").forEach(item => {
      const at = item.role.split(" @ ");
      const bullets = (extras.experience || {})[item.role] || item.details;
      content.push(entry(at[1] || item.org, formatPeriod(item.period), [at[0], item.org].filter(Boolean).join(", "), item.location, bullets));
    });

    content.push(heading("Technical Skills"));
    content.push({
      margin: [0, 1, 0, 0],
      stack: readSkills().map(group => labelled(group.title, group.items.join(", "))),
    });

    const pubs = readPublications(extras);
    const ordered = pubs.filter(p => p.type === "J").concat(pubs.filter(p => p.type !== "J"));
    const counts = { J: 0, C: 0 };
    content.push(heading("Selected Research Publications", "C=Conference, J=Journal, *=Equal contribution"));
    content.push({
      text: [
        { text: "For a full and updated list of publications, please refer to " },
        { text: "Google Scholar", link: head.scholar, color: LINK },
        { text: "." },
      ],
      italics: true, fontSize: 9, margin: [0, 0, 0, 3],
    });
    ordered.forEach(pub => {
      const key = pub.type === "J" ? "J" : "C";
      counts[key] += 1;
      const meAt = pub.authors.findIndex(a => a.replace(/\*$/, "") === pub.me);
      // Keep every equal-contribution author so the "*" stays meaningful.
      const lastStar = pub.authors.reduce((last, a, i) => (a.endsWith("*") ? i : last), -1);
      const shown = meAt < 0 ? pub.authors : pub.authors.slice(0, Math.max(meAt, lastStar) + 1);
      const authorRuns = [];
      shown.forEach((author, i) => {
        if (i) authorRuns.push(", ");
        authorRuns.push(i === meAt ? { text: abbreviate(author), bold: true } : abbreviate(author));
      });
      if (shown.length < pub.authors.length) authorRuns.push(" et al.");
      const runs = authorRuns.concat([
        ", ",
        { text: "“" + pub.title + "”", bold: true, italics: true },
        ", in " + pub.venue + (pub.year ? ", " + pub.year : "") + ". ",
      ]);
      if (pub.tag) runs.push({ text: "[" + pub.tag + "] ", bold: true });
      if (pub.doi) runs.push("DOI: ", { text: pub.doi, link: "https://doi.org/" + pub.doi, color: LINK });
      else if (pub.link) runs.push({ text: "[Link]", link: pub.link, color: LINK });
      content.push({
        margin: [0, 0, 0, 4],
        columns: [
          { text: "[" + key + "." + counts[key] + "]", bold: true, width: 34 },
          { text: runs },
        ],
      });
    });

    content.push(heading("Honors and Awards"));
    readHonors().forEach(h => content.push(entry(h.title, h.period, h.org, "", null)));

    if (extras.associations && extras.associations.length) {
      content.push(heading("Professional Association"), { text: extras.associations.join("; ") });
    }

    const services = readServices();
    if (services.length) {
      content.push(heading("Academic Services"));
      services.forEach(s => content.push(labelled(s.role, s.items.join(", "))));
    }

    if (extras.references) {
      content.push(heading("References"), { text: extras.references });
    }

    return {
      pageSize: "A4",
      pageMargins: [40, 34, 40, 40],
      info: { title: "CV - " + extras.name, author: extras.name },
      defaultStyle: { font: "Pagella", fontSize: 10, lineHeight: 1.08 },
      content: content,
      footer: (page, pages) => {
        if (page !== pages) return null;
        const parts = [];
        if (extras.generatedFrom) {
          parts.push("CV generated from ", { text: extras.generatedFrom, link: "https://" + extras.generatedFrom, color: LINK });
        }
        if (updated) {
          if (parts.length) parts.push("  |  ");
          parts.push("Last updated " + updated.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
        }
        return parts.length ? { text: parts, alignment: "center", fontSize: 8, margin: [0, 14, 0, 0] } : null;
      },
    };
  }

  async function downloadCv(button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      const extrasPromise = fetch(EXTRAS_SRC, { cache: "no-cache" }).then(r => {
        if (!r.ok) throw new Error("Could not load " + EXTRAS_SRC);
        return r.json();
      });
      const [pdfMake, extras, updated] = await Promise.all([
        loadPdfmake(),
        extrasPromise,
        extrasPromise.then(x => lastUpdated(x.repo)),
      ]);
      pdfMake.fonts = {
        Pagella: {
          normal: abs("fonts/pagella/texgyrepagella-regular.otf"),
          bold: abs("fonts/pagella/texgyrepagella-bold.otf"),
          italics: abs("fonts/pagella/texgyrepagella-italic.otf"),
          bolditalics: abs("fonts/pagella/texgyrepagella-bolditalic.otf"),
        },
      };
      const name = (extras.fileName || "CV") + ".pdf";
      await new Promise(resolve => pdfMake.createPdf(buildDoc(extras, updated)).download(name, resolve));
    } catch (error) {
      console.error(error);
      alert("Sorry, the CV could not be generated. Please try again.");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("download-cv");
    if (button) button.addEventListener("click", () => downloadCv(button));
  });
})();
