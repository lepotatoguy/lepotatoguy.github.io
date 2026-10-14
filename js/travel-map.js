(function () {
  "use strict";
  const container = document.getElementById("travel-map");
  if (!container) return;
  const svg = document.getElementById("travel-svg");
  const layer = document.getElementById("travel-regions");
  const labels = document.getElementById("travel-labels");
  const status = document.getElementById("travel-selection");
  const zoomIn = document.getElementById("travel-zoom-in");
  const zoomOut = document.getElementById("travel-zoom-out");
  const canvas = svg.parentElement;
  const tooltip = document.getElementById("travel-tooltip");
  const progress = document.getElementById("travel-progress");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let regionViews = [];
  let currentView = [-20, -20, 1015, 650];
  let animation = null;
  let tooltipRegion = null;
  const NS = "http://www.w3.org/2000/svg";
  let initialView = [-20, -20, 1015, 650];
  const abbreviations = {
    Alabama: "AL", Arkansas: "AR", California: "CA", Connecticut: "CT",
    Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Illinois: "IL",
    Kentucky: "KY", Louisiana: "LA", Maryland: "MD", Massachusetts: "MA",
    Mississippi: "MS", "New Jersey": "NJ", "New York": "NY", Oklahoma: "OK",
    Pennsylvania: "PA", Tennessee: "TN", Texas: "TX", Virginia: "VA", "West Virginia": "WV"
  };
  let country = "us";
  let selected = null;
  let scale = 1;
  let maps, visits, memories;
  let memoryLoadFailed = false;
  const shareRegionButton = document.getElementById("travel-share-region");
  const shareStatus = document.getElementById("travel-share-status");
  const shareUrlInput = document.getElementById("travel-share-url");
  const sharePreview = document.getElementById("travel-share-preview");
  const memoryPanel = document.getElementById("travel-memories");
  const pointers = new Map();
  let gesture = null;
  let suppressClick = false;

  function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function route(region) {
    return "#travel/" + country + (region ? "/" + slug(region.name) : "");
  }

  function writeLocation() {
    const hash = route(selected);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    shareStatus.textContent = "";
    shareUrlInput.hidden = true;
    sharePreview.hidden = true;
  }

  function restoreLocation() {
    const parts = window.location.hash.slice(1).split("/");
    if (parts[0] !== "travel") return;
    const nextCountry = parts[1] === "bd" ? "bd" : "us";
    const region = maps[nextCountry].regions.find(item => slug(item.name) === parts[2]);
    if (country === nextCountry && selected === (region || null)) return;
    country = nextCountry;
    render();
    if (region) selectRegion(region, false);
  }

  async function copyLink(region) {
    const canonical = document.querySelector('link[rel="canonical"]').href;
    const sharePath = "/travel/" + country + (region ? "/" + slug(region.name) : "") + "/";
    const url = new URL(sharePath, canonical);
    const imagePath = "/images/travel-share/" + country + "/" + (region ? slug(region.name) : "map") + ".png";
    const previewImage = document.getElementById("travel-share-preview-image");
    previewImage.src = imagePath;
    previewImage.alt = region ? "Travel map of " + maps[country].name + " with " + region.name + " highlighted." : "Travel map of " + maps[country].name + " with visited regions highlighted.";
    const download = document.getElementById("travel-share-download");
    download.href = imagePath;
    download.download = "travel-" + country + "-" + (region ? slug(region.name) : "map") + ".png";
    sharePreview.hidden = false;
    shareUrlInput.value = url.href;
    try {
      await navigator.clipboard.writeText(url.href);
      shareStatus.textContent = "Link copied.";
      shareUrlInput.hidden = true;
    } catch (error) {
      shareUrlInput.hidden = false;
      shareUrlInput.focus();
      shareUrlInput.select();
      shareStatus.textContent = "Select and copy this link.";
    }
  }

  function showMemories(region) {
    const entries = (memories[country] && memories[country][region.name]) || [];
    const content = document.getElementById("travel-memory-entries");
    content.replaceChildren();
    document.getElementById("travel-memory-title").textContent = region.name + " · Travel memories";
    entries.filter(entry => entry.title || entry.caption || entry.photo || entry.date).forEach(entry => {
      const card = document.createElement("article");
      card.className = "travel-memory";
      if (entry.photo) {
        const image = document.createElement("img");
        image.src = entry.photo;
        image.alt = entry.alt || "";
        image.loading = "lazy";
        card.append(image);
      }
      if (entry.title) {
        const heading = document.createElement("h4");
        heading.textContent = entry.title;
        card.append(heading);
      }
      if (entry.date) {
        const date = document.createElement("p");
        date.className = "travel-memory-date";
        date.textContent = entry.date;
        card.append(date);
      }
      if (entry.caption) {
        const caption = document.createElement("p");
        caption.textContent = entry.caption;
        card.append(caption);
      }
      content.append(card);
    });
    if (!content.children.length) {
      const empty = document.createElement("p");
      empty.className = "travel-memory-empty";
      empty.textContent = memoryLoadFailed ? "Travel memories couldn't load." : "No memories added yet.";
      content.append(empty);
    }
    memoryPanel.hidden = false;
  }

  function showRegion(region, event) {
    tooltipRegion = region;
    const visited = visits[country].includes(region.name);
    status.textContent = region.name + (visited ? " · Visited" : " · " + maps[country].name);
    document.getElementById("travel-tooltip-name").textContent = region.name;
    document.getElementById("travel-tooltip-country").textContent = maps[country].name;
    document.getElementById("travel-tooltip-status").textContent = visited ? "Visited" : "Outside my visited list";
    tooltip.hidden = false;
    positionTooltip(region, event);
  }

  function positionTooltip(region, event) {
    const bounds = canvas.getBoundingClientRect();
    const path = regionViews.find(item => item.region.name === region.name).path;
    const regionBounds = path.getBoundingClientRect();
    const x = event ? event.clientX - bounds.left : regionBounds.left + regionBounds.width / 2 - bounds.left;
    const y = event ? event.clientY - bounds.top : regionBounds.top + regionBounds.height / 2 - bounds.top;
    tooltip.style.left = Math.max(12, Math.min(x + 14, bounds.width - tooltip.offsetWidth - 12)) + "px";
    tooltip.style.top = Math.max(12, Math.min(y + 14, bounds.height - tooltip.offsetHeight - 56)) + "px";
  }

  function selectRegion(region, saveLocation = true) {
    selected = region;
    regionViews.forEach(item => {
      const active = item.region.name === region.name;
      item.path.classList.toggle("is-selected", active);
      item.path.setAttribute("aria-pressed", String(active));
      item.path.setAttribute("tabindex", active ? "0" : "-1");
    });
    const bounds = regionViews.find(item => item.region.name === region.name).bounds;
    scale = Math.min(6, Math.max(1.5, Math.min(initialView[2] / (bounds.width * 1.6), initialView[3] / (bounds.height * 1.6))));
    showRegion(region);
    showMemories(region);
    shareRegionButton.disabled = false;
    shareRegionButton.textContent = "Copy " + region.name + " link";
    if (saveLocation) writeLocation();
    updateView(true, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
  }

  function updateLabels() {
    const rect = svg.getBoundingClientRect();
    const pixels = Math.min(rect.width / currentView[2], rect.height / currentView[3]);
    if (!pixels) return;
    const occupied = [];
    const ordered = regionViews.slice().sort((a, b) =>
      Number(b.region === selected) - Number(a.region === selected) || Number(b.visited) - Number(a.visited)
    );
    ordered.forEach(item => {
      const {region, label, bounds, visited} = item;
      const detailed = scale >= 1.8;
      const text = detailed ? region.name : (visited && country === "us" ? abbreviations[region.name] : "");
      const size = (detailed ? 11 : 12) / pixels;
      const width = (text || "").length * size * 0.6;
      const box = {left: region.x - width / 2, right: region.x + width / 2, top: region.y - size, bottom: region.y + size};
      const inside = box.left >= currentView[0] && box.right <= currentView[0] + currentView[2] && box.top >= currentView[1] && box.bottom <= currentView[1] + currentView[3];
      const fits = bounds.width >= width && bounds.height >= size * 1.5;
      const collision = occupied.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top);
      const visible = text && inside && fits && !collision;
      label.style.display = visible ? "" : "none";
      if (visible) {
        label.textContent = text;
        label.setAttribute("font-size", size);
        label.style.strokeWidth = 1.5 / pixels;
        occupied.push(box);
      }
    });
  }

  function setView(view) {
    currentView = view;
    svg.setAttribute("viewBox", view.join(" "));
    updateLabels();
    if (!gesture && selected && tooltipRegion === selected && !tooltip.hidden) positionTooltip(selected);
  }

  function updateView(animate, center) {
    if (animation !== null) cancelAnimationFrame(animation);
    const width = initialView[2] / scale;
    const height = initialView[3] / scale;
    center = center || { x: currentView[0] + currentView[2] / 2, y: currentView[1] + currentView[3] / 2 };
    const x = Math.max(initialView[0], Math.min(center.x - width / 2, initialView[0] + initialView[2] - width));
    const y = Math.max(initialView[1], Math.min(center.y - height / 2, initialView[1] + initialView[3] - height));
    const target = [x, y, width, height];
    zoomIn.disabled = scale >= 6;
    zoomOut.disabled = scale <= 1;
    if (!animate || reducedMotion.matches) {
      animation = null;
      setView(target);
      return;
    }
    const start = currentView.slice();
    const started = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - started) / 320);
      const eased = 1 - Math.pow(1 - t, 3);
      setView(start.map((value, index) => value + (target[index] - value) * eased));
      animation = t < 1 ? requestAnimationFrame(frame) : null;
    }
    animation = requestAnimationFrame(frame);
  }

  function render() {
    selected = null;
    scale = 1;
    pointers.clear();
    gesture = null;
    suppressClick = false;
    memoryPanel.hidden = true;
    shareRegionButton.disabled = true;
    shareRegionButton.textContent = "Copy region link";
    shareStatus.textContent = "";
    shareUrlInput.hidden = true;
    sharePreview.hidden = true;
    initialView = country === "us" ? [-20, -20, 1015, 650] : [205, -20, 565, 650];
    svg.dataset.country = country;
    layer.replaceChildren();
    labels.replaceChildren();
    regionViews = [];
    tooltip.hidden = true;
    const map = maps[country];
    document.getElementById("travel-map-title").textContent = "Places I've visited in " + map.name;
    const count = visits[country].length;
    const total = map.regions.length;
    const percent = Math.round(count / total * 100);
    document.getElementById("travel-count").textContent = count + " of " + total + " " + map.unit + "s visited · " + percent + "%";
    progress.setAttribute("aria-label", map.name + " " + map.unit + "s visited");
    progress.setAttribute("aria-valuenow", count);
    progress.setAttribute("aria-valuemax", total);
    progress.setAttribute("aria-valuetext", count + " of " + total + " visited");
    document.getElementById("travel-progress-fill").style.width = count / total * 100 + "%";
    container.querySelectorAll("[data-country]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.country === country));
    });
    map.regions.forEach((region, index) => {
      const visited = visits[country].includes(region.name);
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", region.path);
      path.setAttribute("class", "travel-region" + (visited ? " is-visited" : ""));
      path.dataset.name = region.name;
      path.setAttribute("role", "button");
      path.setAttribute("aria-label", region.name + (visited ? ", visited" : ""));
      path.setAttribute("aria-pressed", "false");
      path.setAttribute("aria-describedby", "travel-tooltip");
      path.setAttribute("tabindex", index === 0 ? "0" : "-1");
      const title = document.createElementNS(NS, "title");
      title.textContent = region.name;
      path.append(title);
      path.addEventListener("pointerenter", event => {
        if (animation === null && !gesture) showRegion(region, event);
      });
      path.addEventListener("pointermove", event => {
        if (animation !== null || gesture) return;
        if (tooltipRegion !== region || tooltip.hidden) showRegion(region, event);
        else positionTooltip(region, event);
      });
      path.addEventListener("pointerleave", () => {
        if (animation === null && !gesture) tooltip.hidden = true;
      });
      path.addEventListener("focus", () => showRegion(region));
      path.addEventListener("blur", () => { tooltip.hidden = true; });
      path.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRegion(region);
        } else if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const paths = Array.from(layer.children);
          let next = index + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1);
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = paths.length - 1;
          paths.forEach(p => p.setAttribute("tabindex", "-1"));
          const target = paths[(next + paths.length) % paths.length];
          target.setAttribute("tabindex", "0");
          target.focus();
        }
      });
      layer.append(path);
      const label = document.createElementNS(NS, "text");
      label.setAttribute("x", region.x);
      label.setAttribute("y", region.y);
      label.setAttribute("class", "travel-label" + (visited ? " is-visited" : ""));
      labels.append(label);
      regionViews.push({region, path, label, visited, bounds: path.getBBox()});
    });
    status.textContent = "Hover or tap a region to explore.";
    updateView(false, { x: 487.5, y: 305 });
  }

  container.querySelectorAll("[data-country]").forEach(button => {
    button.addEventListener("click", () => { country = button.dataset.country; render(); writeLocation(); });
  });
  zoomIn.addEventListener("click", () => { scale = Math.min(6, scale * 1.5); updateView(true); });
  zoomOut.addEventListener("click", () => { scale = Math.max(1, scale / 1.5); updateView(true); });
  document.getElementById("travel-reset").addEventListener("click", () => {
    selected = null;
    scale = 1;
    tooltip.hidden = true;
    memoryPanel.hidden = true;
    shareRegionButton.disabled = true;
    shareRegionButton.textContent = "Copy region link";
    writeLocation();
    regionViews.forEach((item, index) => {
      item.path.classList.remove("is-selected");
      item.path.setAttribute("aria-pressed", "false");
      item.path.setAttribute("tabindex", index === 0 ? "0" : "-1");
    });
    status.textContent = "Hover or tap a region to explore.";
    updateView(true, { x: 487.5, y: 305 });
  });
  container.addEventListener("keydown", event => {
    if (event.key === "Escape") tooltip.hidden = true;
  });
  window.addEventListener("resize", () => {
    updateLabels();
    if (tooltipRegion && !tooltip.hidden) positionTooltip(tooltipRegion);
  });
  svg.addEventListener("pointerleave", () => {
    if (selected && !gesture) showRegion(selected);
    else status.textContent = "Hover or tap a region to explore.";
  });

  document.getElementById("travel-share-map").addEventListener("click", () => copyLink(null));
  shareRegionButton.addEventListener("click", () => { if (selected) copyLink(selected); });
  window.addEventListener("popstate", () => { if (maps) restoreLocation(); });
  window.addEventListener("hashchange", () => { if (maps) restoreLocation(); });

  function mapPoint(point, view) {
    const rect = svg.getBoundingClientRect();
    const pixels = Math.min(rect.width / view[2], rect.height / view[3]);
    return {
      x: view[0] + (point.x - rect.left - (rect.width - view[2] * pixels) / 2) / pixels,
      y: view[1] + (point.y - rect.top - (rect.height - view[3] * pixels) / 2) / pixels
    };
  }

  function limitView(view) {
    return [
      Math.max(initialView[0], Math.min(view[0], initialView[0] + initialView[2] - view[2])),
      Math.max(initialView[1], Math.min(view[1], initialView[1] + initialView[3] - view[3])),
      view[2], view[3]
    ];
  }

  function beginGesture() {
    gesture = { view: currentView.slice(), points: Array.from(pointers.values()) };
  }

  svg.addEventListener("pointerdown", event => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if (!pointers.size) suppressClick = false;
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
    scale = initialView[2] / currentView[2];
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    svg.setPointerCapture(event.pointerId);
    beginGesture();
    if (pointers.size > 1) {
      suppressClick = true;
      tooltip.hidden = true;
    }
  });

  svg.addEventListener("pointermove", event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointers.values());
    const starts = gesture.points;
    const view = gesture.view;
    let next;
    if (points.length > 1 && starts.length > 1) {
      const distance = list => Math.hypot(list[1].x - list[0].x, list[1].y - list[0].y);
      const midpoint = list => ({ x: (list[0].x + list[1].x) / 2, y: (list[0].y + list[1].y) / 2 });
      const initialDistance = distance(starts);
      if (!initialDistance) return;
      scale = Math.max(1, Math.min(6, initialView[2] / view[2] * distance(points) / initialDistance));
      const width = initialView[2] / scale;
      const height = initialView[3] / scale;
      const anchor = mapPoint(midpoint(starts), view);
      const offset = mapPoint(midpoint(points), [0, 0, width, height]);
      next = [anchor.x - offset.x, anchor.y - offset.y, width, height];
      suppressClick = true;
    } else {
      const moved = Math.hypot(points[0].x - starts[0].x, points[0].y - starts[0].y);
      if (moved < 4 && !suppressClick) return;
      suppressClick = true;
      const start = mapPoint(starts[0], view);
      const end = mapPoint(points[0], view);
      next = [view[0] + start.x - end.x, view[1] + start.y - end.y, view[2], view[3]];
    }
    tooltip.hidden = true;
    svg.classList.add("is-dragging");
    setView(limitView(next));
    zoomIn.disabled = scale >= 6;
    zoomOut.disabled = scale <= 1;
  });

  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (pointers.size) beginGesture();
    else {
      gesture = null;
      svg.classList.remove("is-dragging");
    }
  }
  svg.addEventListener("pointerup", endPointer);
  svg.addEventListener("pointercancel", event => { suppressClick = true; endPointer(event); });
  svg.addEventListener("lostpointercapture", endPointer);
  svg.addEventListener("click", event => {
    if (suppressClick) { suppressClick = false; return; }
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const path = target && target.closest(".travel-region");
    const region = path && maps[country].regions.find(item => item.name === path.dataset.name);
    if (region) selectRegion(region);
  });
  svg.addEventListener("wheel", event => {
    if (!event.ctrlKey || gesture) return;
    event.preventDefault();
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
    const point = { x: event.clientX, y: event.clientY };
    const anchor = mapPoint(point, currentView);
    scale = Math.max(1, Math.min(6, initialView[2] / currentView[2] * Math.exp(-event.deltaY * 0.01)));
    const width = initialView[2] / scale;
    const height = initialView[3] / scale;
    const offset = mapPoint(point, [0, 0, width, height]);
    tooltip.hidden = true;
    setView(limitView([anchor.x - offset.x, anchor.y - offset.y, width, height]));
    zoomIn.disabled = scale >= 6;
    zoomOut.disabled = scale <= 1;
  }, { passive: false });

  Promise.all(["data/travel-regions.json", "data/travel-visits.json", "travel-memories/memories.json"].map(url =>
    fetch(url).then(response => {
      if (!response.ok) throw new Error("Map data unavailable");
      return response.json();
    }).catch(error => {
      if (url !== "travel-memories/memories.json") throw error;
      memoryLoadFailed = true;
      return {};
    })
  )).then(data => {
    [maps, visits, memories] = data;
    container.hidden = false;
    render();
    restoreLocation();
    if (window.location.hash.startsWith("#travel/")) document.getElementById("travelling").scrollIntoView();
    document.getElementById("travel-fallback").hidden = true;
  }).catch(() => {
    container.hidden = true;
  });
})();
