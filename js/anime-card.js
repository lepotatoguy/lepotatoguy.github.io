(function () {
  "use strict";
  const card = document.getElementById("anime-card");
  if (!card) return;
  const themes = {
    "one-piece": {
      image: "straw-hat.svg", title: "WANTED", caption: "FOR ANOTHER EPISODE",
      heading: "A stop on the Grand Line."
    },
    "naruto": {
      image: "hidden-leaf.svg", title: "SHINOBI", caption: "HIDDEN LEAF VILLAGE",
      heading: "A detour through the Hidden Leaf."
    },
    "one-punch-man": {
      image: "hero-glove.svg", title: "HERO", caption: "ONE PUNCH IS PLENTY",
      heading: "One punch. Plenty of chaos."
    },
    "jujutsu-kaisen": {
      image: "cursed-energy.svg", title: "CURSED", caption: "JUJUTSU SORCERY",
      heading: "A little cursed energy."
    },
    "demon-slayer": {
      image: "slayer-blade.svg", title: "SLAYER", caption: "KEEP THE BLADE SHARP",
      heading: "On the trail of demons."
    },
    "dragon-ball-z": {
      image: "dragon-ball.svg", title: "SAIYAN", caption: "THE NEXT POWER-UP",
      heading: "One more power-up."
    },
    "attack-on-titan": {
      image: "scout-wings.svg", title: "SCOUT", caption: "BEYOND THE WALLS",
      heading: "Beyond the walls."
    },
    "death-note": {
      image: "death-notebook.svg", title: "KIRA", caption: "EVERY NAME COUNTS",
      heading: "A name in the notebook."
    },
    "solo-leveling": {
      image: "shadow-daggers.svg", title: "HUNTER", caption: "LEVEL UP",
      heading: "Into the shadows."
    },
    "jojos-bizarre-adventure": {
      image: "bizarre-arrow.svg", title: "BIZARRE", caption: "STRIKE A POSE",
      heading: "A bizarre adventure."
    }
  };
  const image = document.getElementById("anime-emblem");
  const buttons = Array.from(card.querySelectorAll("[data-anime]"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let transition;
  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const name = button.dataset.anime;
      if (name === card.dataset.theme) return;
      const theme = themes[name];
      card.dataset.theme = name;
      image.src = "images/anime/" + theme.image;
      document.getElementById("anime-poster-title").textContent = theme.title;
      document.getElementById("anime-poster-caption").textContent = theme.caption;
      document.getElementById("anime-card-heading").textContent = theme.heading;
      buttons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
      if (!reducedMotion.matches) {
        if (transition) transition.cancel();
        transition = image.animate([{ opacity: 0.3, transform: "scale(0.96)" }, { opacity: 1, transform: "scale(1)" }], { duration: 220, easing: "ease-out" });
      }
    });
  });
})();
