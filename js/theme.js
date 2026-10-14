(function () {
  "use strict";
  const root = document.documentElement;
  let choice = null;
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") choice = saved;
  } catch (error) {}
  const current = () => choice || "light";
  root.setAttribute("data-theme", current());

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    function update() {
      const theme = current();
      root.setAttribute("data-theme", theme);
      const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
      button.setAttribute("aria-label", label);
      button.title = label;
    }
    button.addEventListener("click", () => {
      choice = current() === "dark" ? "light" : "dark";
      try { localStorage.setItem("theme", choice); } catch (error) {}
      update();
    });
    window.addEventListener("storage", event => {
      if (event.key !== "theme" && event.key !== null) return;
      choice = event.newValue === "light" || event.newValue === "dark" ? event.newValue : null;
      update();
    });
    update();
  });
})();
