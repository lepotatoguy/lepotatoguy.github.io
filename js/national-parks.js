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
  const visited = new Set(["GRSM", "REDW"]);
  const status = document.getElementById("parks-status");
  const memories = document.getElementById("parks-memories");
  let visitedBounds;

  function selectPark(park, layer) {
    const title = park.name === "American Samoa" ? "National Park of American Samoa" : park.name + " National Park";
    status.textContent = title + " · " + park.state + (visited.has(park.code) ? " · Visited" : " · Not yet visited");
    document.getElementById("parks-memory-title").textContent = title + " · Travel memories";
    const entries = document.getElementById("parks-memory-entries");
    entries.replaceChildren();
    if (park.name === "Great Smoky Mountains") {
      const card = document.createElement("article");
      card.className = "travel-memory";
      const photo = document.createElement("img");
      photo.src = "travel-memories/photos/475658275_1358689298474334_191427817361750296_n.jpg";
      photo.alt = "Standing beside a meadow with mountains in the background in Tennessee.";
      photo.loading = "lazy";
      const heading = document.createElement("h4");
      heading.textContent = "Great Smoky Mountains, Tennessee";
      card.append(photo, heading);
      entries.append(card);
    } else {
      const empty = document.createElement("p");
      empty.className = "travel-memory-empty";
      empty.textContent = "No memories added yet.";
      entries.append(empty);
    }
    memories.hidden = false;
    layer.openPopup();
  }

  function loadJson(path) {
    return fetch(path).then(response => {
      if (!response.ok) throw new Error("Map data unavailable");
      return response.json();
    });
  }

  loadJson("data/national-park-boundaries.json")
    .then(boundaries => {
      const count = visited.size;
      const total = boundaries.features.length;
      document.getElementById("parks-count").textContent = count + " of " + total + " parks visited";
      const progress = document.getElementById("parks-progress");
      progress.setAttribute("aria-valuenow", count);
      progress.setAttribute("aria-valuemax", total);
      document.getElementById("parks-progress-fill").style.width = (100 * count / total) + "%";

      const smallPoints = L.layerGroup();
      const largePoints = L.layerGroup();
      const smallPolygons = L.layerGroup();
      const largePolygons = L.layerGroup();
      const visitedPoints = [];
      function attach(layer, park) {
        const title = park.name === "American Samoa" ? "National Park of American Samoa" : park.name + " National Park";
        layer.bindPopup(title + "<br>" + park.state).bindTooltip(title);
        layer.on("click", () => selectPark(park, layer));
        layer.on("add", () => {
          const element = layer.getElement();
          element.setAttribute("tabindex", "0");
          element.setAttribute("role", "button");
          element.setAttribute("aria-label", title + (visited.has(park.code) ? ", visited" : ", not yet visited"));
          L.DomEvent.on(element, "keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectPark(park, layer);
            }
          });
        });
      }
      boundaries.features.forEach(feature => {
        const park = feature.properties;
        const isVisited = visited.has(park.code);
        const dot = L.circleMarker([park.lat, park.lon], {
          radius: isVisited ? 9 : 3,
          color: isVisited ? "#fff" : "#8391a2", weight: isVisited ? 2 : 1,
          fillColor: isVisited ? "#3576dc" : "#8391a2", fillOpacity: isVisited ? 1 : 0.7
        });
        attach(dot, park);
        if (isVisited) visitedPoints.push(dot);
        const boundary = L.geoJSON(feature, {
          style: { color: isVisited ? "#1d4ed8" : "#526b7f", weight: 2.5, fillColor: isVisited ? "#3576dc" : "#9ab0c0", fillOpacity: isVisited ? 0.65 : 0.8 },
          onEachFeature(_feature, polygon) {
            attach(polygon, park);
            if (!isVisited) {
              polygon.on("mouseover", () => polygon.setStyle({ color: "#304e64", weight: 3, fillColor: "#7799ae", fillOpacity: 0.95 }));
              polygon.on("mouseout", () => polygon.setStyle({ color: "#526b7f", weight: 2.5, fillColor: "#9ab0c0", fillOpacity: 0.8 }));
            }
          }
        });
        const bounds = boundary.getBounds();
        const northwest = map.project(bounds.getNorthWest(), 5);
        const southeast = map.project(bounds.getSouthEast(), 5);
        const small = Math.max(Math.abs(southeast.x - northwest.x), Math.abs(southeast.y - northwest.y)) < 16;
        (small ? smallPoints : largePoints).addLayer(dot);
        (small ? smallPolygons : largePolygons).addLayer(boundary);
      });
      function updateZoom() {
        const zoom = map.getZoom();
        const visible = zoom < 5 ? [smallPoints, largePoints] : zoom < 6 ? [smallPoints, largePolygons] : [smallPolygons, largePolygons];
        [smallPoints, largePoints, smallPolygons, largePolygons].forEach(group => {
          if (visible.includes(group)) group.addTo(map);
          else map.removeLayer(group);
        });
        visitedPoints.forEach(point => { if (map.hasLayer(point)) point.bringToFront(); });
      }
      map.on("zoomend", updateZoom);
      visitedBounds = L.latLngBounds(boundaries.features.filter(feature => visited.has(feature.properties.code)).map(feature => [feature.properties.lat, feature.properties.lon]));
      if (visitedBounds.isValid()) map.fitBounds(visitedBounds, { padding: [50, 50], maxZoom: 6 });
      updateZoom();
    }).catch(() => {
      document.getElementById("parks-count").textContent = "Park data could not be loaded.";
    });

  document.getElementById("parks-reset").addEventListener("click", () => {
    if (visitedBounds && visitedBounds.isValid()) map.fitBounds(visitedBounds, { padding: [50, 50], maxZoom: 6 });
    map.closePopup();
    status.textContent = "Select a park to explore.";
    memories.hidden = true;
  });
}());
