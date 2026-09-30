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
});