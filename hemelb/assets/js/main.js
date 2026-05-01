document.addEventListener("DOMContentLoaded", () => {
  // Copy buttons for code blocks
  document.querySelectorAll("pre").forEach(pre => {
    const wrapper = document.createElement("div");
    wrapper.className = "code-block";

    const button = document.createElement("button");
    button.className = "copy-btn";
    button.innerText = "Copy";

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
});