document.addEventListener("DOMContentLoaded", () => {
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
        setTimeout(() => button.innerText = "Copy", 1500);
      } catch (err) {
        button.innerText = "Error";
      }
    });

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    wrapper.appendChild(button);
  });
});