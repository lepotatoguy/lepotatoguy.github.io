// Opens and closes the top-bar menu on small screens.
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var header = document.querySelector(".site-nav");
    var toggle = header && header.querySelector(".nav-toggle");
    if (!toggle) return;

    function setOpen(isOpen) {
      header.classList.toggle("menu-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    }

    toggle.addEventListener("click", function () {
      setOpen(!header.classList.contains("menu-open"));
    });
    header.querySelectorAll(".nav-links a").forEach(function (link) {
      link.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("click", function (event) {
      if (!header.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });
  });
})();
