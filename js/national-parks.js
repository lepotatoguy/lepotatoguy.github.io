(function () {
  "use strict";
  const container = document.getElementById("parks-map");
  if (!container) return;
  if (typeof L === "undefined") {
    container.textContent = "The map could not be loaded.";
    return;
  }
  const map = L.map(container, { scrollWheelZoom: false }).setView([39, -98], 3);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);
  const visited = new Set(["Great Smoky Mountains", "Redwood"]);
  const status = document.getElementById("parks-status");
  const memories = document.getElementById("parks-memories");
  const markers = new Map();
  const unvisitedLayer = L.layerGroup();
  const showAll = document.getElementById("parks-show-all");
  let visitedBounds;
  let selectedPark = null;

  function updateLayers() {
    if (showAll.checked) unvisitedLayer.addTo(map);
    else map.removeLayer(unvisitedLayer);
    document.getElementById("parks-unvisited-legend").hidden = !showAll.checked;
    document.getElementById("parks-view-label").textContent = showAll.checked ? "Showing all parks" : "Showing visited parks";
    visited.forEach(name => {
      const park = markers.get(name);
      if (park) park.marker.bringToFront();
    });
  }

  function parkTitle(name) {
    return name === "American Samoa" ? "National Park of American Samoa" : name + " National Park";
  }

  function selectPark(name, state, marker) {
    selectedPark = name;
    status.textContent = parkTitle(name) + " · " + state + (visited.has(name) ? " · Visited" : " · Not yet visited");
    document.getElementById("parks-memory-title").textContent = parkTitle(name) + " · Travel memories";
    const entries = document.getElementById("parks-memory-entries");
    entries.replaceChildren();
    if (name === "Great Smoky Mountains") {
      const card = document.createElement("article");
      card.className = "travel-memory";
      const photo = document.createElement("img");
      photo.src = "travel-memories/photos/475658275_1358689298474334_191427817361750296_n.jpg";
      photo.alt = "Standing beside a meadow with mountains in the background in Tennessee.";
      photo.loading = "lazy";
      const title = document.createElement("h4");
      title.textContent = "Great Smoky Mountains, Tennessee";
      card.append(photo, title);
      entries.append(card);
    } else {
      const empty = document.createElement("p");
      empty.className = "travel-memory-empty";
      empty.textContent = "No memories added yet.";
      entries.append(empty);
    }
    memories.hidden = false;
    marker.openPopup();
  }

  fetch("data/national-parks.json").then(response => {
    if (!response.ok) throw new Error("Park data unavailable");
    return response.json();
  }).then(parks => {
    document.getElementById("parks-count").textContent = visited.size + " of " + parks.length + " parks visited";
    const progress = document.getElementById("parks-progress");
    progress.setAttribute("aria-valuenow", visited.size);
    progress.setAttribute("aria-valuemax", parks.length);
    document.getElementById("parks-progress-fill").style.width = (100 * visited.size / parks.length) + "%";
    parks.forEach(([name, state, lat, lon]) => {
      const marker = L.circleMarker([lat, lon], {
        radius: visited.has(name) ? 9 : 3,
        color: visited.has(name) ? "#fff" : "#8391a2",
        weight: visited.has(name) ? 2 : 1,
        fillColor: visited.has(name) ? "#3576dc" : "#8391a2", fillOpacity: visited.has(name) ? 1 : 0.7
      }).bindPopup(parkTitle(name) + "<br>" + state).bindTooltip(parkTitle(name));
      marker.on("add", () => {
        const element = marker.getElement();
        element.setAttribute("tabindex", "0");
        element.setAttribute("role", "button");
        element.setAttribute("aria-label", parkTitle(name) + (visited.has(name) ? ", visited" : ", not yet visited"));
        L.DomEvent.on(element, "keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectPark(name, state, marker);
          }
        });
      });
      marker.addTo(visited.has(name) ? map : unvisitedLayer);
      marker.on("click", () => selectPark(name, state, marker));
      markers.set(name, { marker, state, lat, lon });
    });
    visitedBounds = L.latLngBounds(parks.filter(park => visited.has(park[0])).map(park => [park[2], park[3]]));
    if (visitedBounds.isValid()) map.fitBounds(visitedBounds, { padding: [40, 40], maxZoom: 6 });
    updateLayers();
  }).catch(() => {
    document.getElementById("parks-count").textContent = "Park data could not be loaded.";
    map.setView([39, -98], 3);
  });

  showAll.addEventListener("change", () => {
    updateLayers();
    if (!showAll.checked && selectedPark && !visited.has(selectedPark)) {
      map.closePopup();
      selectedPark = null;
      status.textContent = "Select a park to explore.";
      memories.hidden = true;
    }
  });
  document.getElementById("parks-reset").addEventListener("click", () => {
    if (visitedBounds && visitedBounds.isValid()) map.fitBounds(visitedBounds, { padding: [40, 40], maxZoom: 6 });
    map.closePopup();
    selectedPark = null;
    status.textContent = "Select a park to explore.";
    memories.hidden = true;
  });
}());
