document.addEventListener("DOMContentLoaded", () => {
  // Copy buttons for code blocks
  document.querySelectorAll("pre").forEach(pre => {
    const wrapper = document.createElement("div");
    wrapper.className = "code-block";
    // Optional label, e.g. <pre data-lang="bash">; no label bar otherwise
    if (pre.dataset.lang) wrapper.dataset.lang = pre.dataset.lang;

    const button = document.createElement("button");
    button.className = "copy-btn";
    button.type = "button";
    button.innerText = "Copy";
    button.setAttribute("aria-label", "Copy code to clipboard");

    const code = pre.innerText;

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code);
        button.innerText = "Copied";
        setTimeout(() => (button.innerText = "Copy"), 1500);
      } catch {
        button.innerText = "Error";
      }
    });

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    wrapper.appendChild(button);
  });

  // Sidebar drawer (mobile)
  const menuBtn = document.getElementById("menu-btn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("open");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
    });
  }

  // Back-to-top button, shown after scrolling down
  const toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "back-to-top";
  toTop.innerText = "Back to top";
  toTop.setAttribute("aria-label", "Back to top of page");
  toTop.addEventListener("click", () => window.scrollTo({ top: 0 }));
  document.body.appendChild(toTop);
  const updateToTop = () =>
    toTop.classList.toggle("visible", window.scrollY > 600);
  window.addEventListener("scroll", updateToTop, { passive: true });
  updateToTop();

  // Right-hand "On this page" outline built from h2 headings (shown on wide screens)
  const content = document.querySelector(".main-content .container");
  const headings = content ? Array.from(content.querySelectorAll("h2[id]")) : [];
  if (headings.length > 1) {
    const rail = document.createElement("aside");
    rail.className = "toc-rail";
    rail.setAttribute("aria-label", "On this page");
    const title = document.createElement("p");
    title.className = "toc-rail-title";
    title.textContent = "On this page";
    const list = document.createElement("ol");
    const links = headings.map(h => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent.trim();
      li.appendChild(a);
      list.appendChild(li);
      return a;
    });
    rail.append(title, list);
    content.parentNode.appendChild(rail);

    const setActive = id =>
      links.forEach(a => a.classList.toggle("active", a.hash === "#" + id));
    const spy = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "0px 0px -70% 0px" }
    );
    headings.forEach(h => spy.observe(h));
  }

  // Light / dark mode toggle (remembers the choice)
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    const root = document.documentElement;
    const current = () => root.getAttribute("data-theme") || "light";
    const label = () => {
      const dark = current() === "dark";
      const text = dark ? "Switch to light mode" : "Switch to dark mode";
      themeBtn.setAttribute("aria-label", text);
      themeBtn.title = text;
    };
    themeBtn.addEventListener("click", () => {
      const next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      label();
    });
    label();
  }
});
