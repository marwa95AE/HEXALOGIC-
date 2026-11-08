const apiRequest = async (path) => {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Backend request failed (${response.status}): ${path}`);
  }

  return response.json();
};

const setApiStatus = (element, message, state) => {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = `api-status ${state}`;
  element.hidden = false;
  translateDynamicContent();
};

const hideApiStatus = (element) => {
  if (element) {
    element.hidden = true;
  }
};

const translateDynamicContent = () => {
  window.translateHexaLogicPage?.();
};

const teamList = document.querySelector("#team-list");
const teamStatus = document.querySelector("#team-status");

if (teamList) {
  const groupElements = {
    leader: teamList.querySelector(".leader-group .team-group-members"),
    data: teamList.querySelector(".data-group .team-group-members"),
    code: teamList.querySelector(".code-group .team-group-members"),
  };

  const renderTeam = (members) => {
    Object.values(groupElements).forEach((group) => group.replaceChildren());

    for (const member of members) {
      const group = groupElements[member.groupId];
      if (!group) {
        console.error(`Unknown team group: ${member.groupId}`);
        continue;
      }

      const card = document.createElement("div");
      card.className = member.groupId === "leader" ? "member leader" : "member";
      card.id = member.id;

      const photo = document.createElement("div");
      photo.className = "member-photo";
      photo.setAttribute("aria-hidden", "true");
      photo.textContent = member.avatar;

      const name = document.createElement("h4");
      name.className = "member-name";
      name.dir = "rtl";
      name.textContent = member.name;

      const role = document.createElement("p");
      role.className = "member-role";
      const roleText = document.createElement("bdi");
      roleText.textContent = member.role;
      role.append(roleText);
      card.append(photo, name, role);
      group.append(card);
    }

    translateDynamicContent();
  };

  apiRequest("/api/team")
    .then(({ team }) => {
      renderTeam(team);
      hideApiStatus(teamStatus);
    })
    .catch((error) => {
      setApiStatus(teamStatus, "Backend unavailable; showing the saved team list.", "error");
      console.error("Could not load the team list from the backend:", error);
    });
}

const sitesIndex = document.querySelector("#sites-index ol");
const sitesTableBody = document.querySelector("#sites-compare-table tbody");
const sitesStatus = document.querySelector("#sites-status");

if (sitesIndex && sitesTableBody) {
  apiRequest("/api/sites")
    .then(({ sites }) => {
      const indexItems = sites.map((site, index) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${site.id}`;
        link.textContent = `${index + 1}. ${site.name}`;
        item.append(link);
        return item;
      });

      const tableRows = sites.map((site) => {
        const row = document.createElement("tr");
        const siteCell = document.createElement("td");
        const siteLink = document.createElement("a");
        siteLink.href = `#${site.id}`;
        siteLink.textContent = site.shortName;
        siteCell.append(siteLink);

        for (const value of [
          site.region,
          site.counterpart,
          site.coordinates,
          site.summary,
        ]) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }

        row.prepend(siteCell);
        return row;
      });

      sitesIndex.replaceChildren(...indexItems);
      sitesTableBody.replaceChildren(...tableRows);
      hideApiStatus(sitesStatus);
      translateDynamicContent();
    })
    .catch((error) => {
      setApiStatus(sitesStatus, "Backend unavailable; showing the saved site list.", "error");
      console.error("Could not load analog sites from the backend:", error);
    });
}

const characteristicsTable = document.querySelector("#characteristics-table tbody");
const characteristicsStatus = document.querySelector("#characteristics-status");

if (characteristicsTable) {
  apiRequest("/api/characteristics")
    .then(({ characteristics }) => {
      const rows = characteristics.map((item) => {
        const row = document.createElement("tr");
        const name = document.createElement("td");
        const strong = document.createElement("strong");
        strong.textContent = item.name;
        name.append(strong);

        for (const value of [item.earth, item.mars]) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }

        row.prepend(name);
        return row;
      });

      characteristicsTable.replaceChildren(...rows);
      hideApiStatus(characteristicsStatus);
      translateDynamicContent();
    })
    .catch((error) => {
      setApiStatus(
        characteristicsStatus,
        "Backend unavailable; showing the saved characteristics.",
        "error",
      );
      console.error("Could not load characteristics from the backend:", error);
    });
}

const weatherTable = document.querySelector("#weather-table");
const weatherStatus = document.querySelector("#weather-status");

if (weatherTable && weatherStatus) {
  const rows = [...weatherTable.querySelectorAll("tbody tr[data-lat][data-lon]")];
  const setStatus = (message, state) => {
    weatherStatus.textContent = message;
    weatherStatus.className = state;
  };

  const updateWeather = async (row, sitesById) => {
    const siteId = row.id.replace(/^weather-/, "");
    const site = sitesById.get(siteId);
    const name = row.querySelector("td strong")?.textContent.trim() || row.id;

    if (!site) {
      throw new Error(`No backend site record exists for ${siteId}`);
    }

    const { weather } = await apiRequest(`/api/weather?site=${encodeURIComponent(site.id)}`);

    if (
      !weather ||
      !Number.isFinite(weather.temperature) ||
      !Number.isFinite(weather.humidity) ||
      !Number.isFinite(weather.pressure)
    ) {
      throw new Error(`Weather data is incomplete for ${name}`);
    }

    document.getElementById(`${siteId}-temp`).textContent =
      `${weather.temperature.toFixed(1)} °C`;
    document.getElementById(`${siteId}-humidity`).textContent =
      `${weather.humidity}%`;
    document.getElementById(`${siteId}-pressure`).textContent =
      `${weather.pressure.toFixed(1)} hPa`;

    return name;
  };

  const loadWeather = async () => {
    weatherTable.setAttribute("aria-busy", "true");
    setStatus("Loading current Earth weather data…", "loading");

    const { sites } = await apiRequest("/api/sites");
    const sitesById = new Map(sites.map((site) => [site.id, site]));
    const results = await Promise.allSettled(
      rows.map((row) => updateWeather(row, sitesById)),
    );
    const failures = results.filter((result) => result.status === "rejected");
    failures.forEach((result) => console.error(result.reason));

    if (failures.length === 0) {
      setStatus("Weather data updated from Open-Meteo.", "success");
    } else {
      const succeeded = results.length - failures.length;
      const message = succeeded
        ? `Weather loaded for ${succeeded} of ${results.length} locations. Some data is unavailable.`
        : "Weather data is currently unavailable. Please try again later.";
      setStatus(message, "error");
    }

    weatherTable.removeAttribute("aria-busy");
  };

  loadWeather().catch((error) => {
    weatherTable.removeAttribute("aria-busy");
    setStatus("Weather data could not be loaded. Please try again later.", "error");
    console.error("Could not load weather data:", error);
  });
}

const siteTestForm = document.querySelector("#site-test-form");
const siteTestStatus = document.querySelector("#site-test-status");

if (siteTestForm && siteTestStatus) {
  const targetSelect = siteTestForm.querySelector("#analogy-target");
  const selectedSiteList = document.querySelector("#selected-site-list");
  const rankingsTableBody = document.querySelector("#site-rankings-table tbody");
  const scoringWeights = document.querySelector("#scoring-weights");
  const mapStatus = document.querySelector("#map-status");
  const mapSection = document.querySelector("#site-test-map-section");
  const mapLegend = document.querySelector("#site-map-legend");
  const mapFitButton = document.querySelector("#site-map-fit");
  const mapFullscreenButton = document.querySelector("#site-map-fullscreen");
  let siteTestMap;
  let siteMarkerLayer;

  const showSiteTestStatus = (message, state) => {
    siteTestStatus.textContent = message;
    siteTestStatus.className = `api-status ${state}`;
    translateDynamicContent();
  };

  const updateMap = (sites) => {
    if (!window.L) {
      mapStatus.textContent = "Interactive map unavailable. Check your internet connection and reload.";
      mapStatus.classList.add("error");
      return;
    }

    if (!siteTestMap) {
      siteTestMap = window.L.map("site-test-map", {
        scrollWheelZoom: false,
        worldCopyJump: true,
      });
      const streetLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      const satelliteLayer = window.L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution:
            'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
        },
      ).addTo(siteTestMap);
      const terrainLayer = window.L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution:
            'Terrain &copy; <a href="https://www.esri.com/">Esri</a> and the GIS User Community',
        },
      );
      const reliefLayer = window.L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 13,
          opacity: 0.3,
          attribution:
            'Shaded relief &copy; <a href="https://www.esri.com/">Esri</a> and the GIS User Community',
        },
      );
      const placeLabels = window.L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "Place labels &copy; Esri",
        },
      ).addTo(siteTestMap);
      window.L.control.layers(
        {
          "Satellite imagery": satelliteLayer,
          Terrain: terrainLayer,
          "Street map": streetLayer,
        },
        {
          "Place names and boundaries": placeLabels,
          "Terrain shading": reliefLayer,
        },
        { collapsed: true, position: "topright" },
      ).addTo(siteTestMap);
      window.L.control.scale({ imperial: false, position: "bottomleft" }).addTo(siteTestMap);
      siteTestMap.on("click", () => siteTestMap.scrollWheelZoom.enable());
      siteTestMap.on("mouseout", () => siteTestMap.scrollWheelZoom.disable());
      siteMarkerLayer = window.L.featureGroup().addTo(siteTestMap);
    }

    siteMarkerLayer.clearLayers();
    const legendItems = [];
    const markers = sites.map((site, index) => {
      const marker = window.L.marker([site.latitude, site.longitude], {
        title: `${site.rank}. ${site.name} — ${site.similarity}%`,
        alt: `${site.rank}. ${site.name}`,
        icon: window.L.divIcon({
          className: `site-map-marker${index === 0 ? " is-top-ranked" : ""}`,
          html: `<span>${site.rank}</span>`,
          iconSize: [42, 50],
          iconAnchor: [21, 46],
          popupAnchor: [0, -42],
        }),
      });
      const popup = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${site.rank}. ${site.name} — ${site.similarity}%`;
      const location = document.createElement("p");
      location.textContent = site.region;
      const coordinates = document.createElement("p");
      coordinates.textContent = `Coordinates: ${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}`;
      const mapLink = document.createElement("a");
      mapLink.href = `https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`;
      mapLink.target = "_blank";
      mapLink.rel = "noopener noreferrer";
      mapLink.textContent = "Open in Google Maps";
      popup.append(title, location, coordinates, mapLink);
      marker.bindPopup(popup);
      marker.on("click", () => {
        siteTestMap.flyTo(marker.getLatLng(), Math.max(siteTestMap.getZoom(), 10), {
          duration: 1.1,
        });
      });
      marker.on("popupopen", translateDynamicContent);

      const tooltip = document.createElement("span");
      tooltip.textContent = `${site.name} — ${site.similarity}%`;
      marker.bindTooltip(tooltip, {
        className: "site-map-tooltip",
        direction: "top",
        offset: [0, -16],
      });

      const legendButton = document.createElement("button");
      legendButton.type = "button";
      legendButton.className = "site-map-legend-item";
      legendButton.setAttribute("aria-label", `${site.rank}. ${site.name} — ${site.similarity}%`);
      const legendRank = document.createElement("span");
      legendRank.className = `site-map-legend-rank${index === 0 ? " is-top-ranked" : ""}`;
      legendRank.textContent = String(site.rank);
      const legendName = document.createElement("span");
      legendName.className = "site-map-legend-name";
      legendName.textContent = site.name;
      const legendScore = document.createElement("strong");
      legendScore.textContent = `${site.similarity}%`;
      legendButton.append(legendRank, legendName, legendScore);
      legendButton.addEventListener("click", () => {
        siteTestMap.flyTo(marker.getLatLng(), Math.max(siteTestMap.getZoom(), 10), {
          duration: 1.1,
        });
        marker.openPopup();
      });
      legendItems.push(legendButton);
      return marker;
    });

    markers.forEach((marker) => marker.addTo(siteMarkerLayer));
    mapLegend.replaceChildren(...legendItems);
    if (sites.length === 1) {
      siteTestMap.setView([sites[0].latitude, sites[0].longitude], 5);
    } else {
      siteTestMap.fitBounds(siteMarkerLayer.getBounds(), {
        padding: [48, 48],
        maxZoom: 5,
        animate: true,
      });
    }

    mapStatus.textContent = "Select a map marker to view a site and its similarity score.";
    mapStatus.classList.remove("error");
    requestAnimationFrame(() => siteTestMap.invalidateSize());
    translateDynamicContent();
  };

  mapFitButton.addEventListener("click", () => {
    if (siteMarkerLayer?.getLayers().length) {
      siteTestMap.fitBounds(siteMarkerLayer.getBounds(), {
        padding: [48, 48],
        maxZoom: 5,
        animate: true,
      });
    }
  });

  mapFullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement === document.querySelector("#site-test-map")) {
        await document.exitFullscreen();
      } else {
        await document.querySelector("#site-test-map").requestFullscreen();
      }
    } catch (error) {
      console.error("Could not toggle map fullscreen:", error);
      mapStatus.textContent = "Fullscreen is unavailable in this browser.";
      mapStatus.classList.add("error");
      translateDynamicContent();
    }
  });

  document.addEventListener("fullscreenchange", () => {
    const isFullscreen = document.fullscreenElement === document.querySelector("#site-test-map");
    mapFullscreenButton.textContent = isFullscreen ? "Exit map fullscreen" : "View map fullscreen";
    requestAnimationFrame(() => siteTestMap?.invalidateSize());
    translateDynamicContent();
  });

  const renderSiteTest = ({ criteria, selectedSites, rankings }) => {
    mapSection.hidden = false;
    const weightLabels = criteria.map((criterion) => {
      const label = document.createElement("span");
      label.className = "criterion-weight";
      const name = document.createElement("span");
      name.textContent = criterion.name;
      const weight = document.createElement("strong");
      weight.textContent = `${criterion.weight}%`;
      label.append(name, weight);
      return label;
    });
    scoringWeights.replaceChildren(...weightLabels);

    const selectedCards = selectedSites.map((site) => {
      const card = document.createElement("article");
      card.className = "selected-site-card";

      const heading = document.createElement("h4");
      const rank = document.createElement("span");
      rank.textContent = `${site.rank}. `;
      const name = document.createElement("span");
      name.textContent = site.name;
      heading.append(rank, name);

      const score = document.createElement("span");
      score.className = "similarity-score";
      score.textContent = `${site.similarity}%`;
      score.setAttribute("aria-label", `Similarity score ${site.similarity} percent`);

      const region = document.createElement("p");
      region.className = "site-test-region";
      region.textContent = `${site.region} · ${site.coordinates}`;

      const rationale = document.createElement("p");
      rationale.className = "site-test-rationale";
      rationale.textContent = site.rationale;

      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Score details";
      const breakdown = document.createElement("ul");
      breakdown.className = "score-breakdown";

      for (const criterion of site.breakdown) {
        const item = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = `${criterion.name} (${criterion.weight}%)`;
        const rating = document.createElement("strong");
        rating.textContent = `${criterion.score}/5`;
        item.append(label, rating);
        breakdown.append(item);
      }

      details.append(summary, breakdown);
      card.append(heading, score, region, rationale, details);
      return card;
    });
    selectedSiteList.replaceChildren(...selectedCards);

    const rankingRows = rankings.map((site) => {
      const row = document.createElement("tr");
      if (site.selected) {
        row.className = "selected-ranking";
      }

      for (const value of [
        site.rank,
        site.name,
        site.region,
        `${site.similarity}%`,
        site.rationale,
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    });
    rankingsTableBody.replaceChildren(...rankingRows);
    updateMap(selectedSites);
    showSiteTestStatus("Scoring complete. The three highest-ranked sites are selected.", "success");
  };

  const runSiteTest = async (target) => {
    showSiteTestStatus("Calculating manually weighted similarity scores…", "loading");
    try {
      const result = await apiRequest(`/api/site-tests?target=${encodeURIComponent(target)}`);
      if (
        result.selectedSites.length !== 3 ||
        result.rankings.length !== 6 ||
        result.criteria.length !== 5
      ) {
        throw new Error("The site test returned an unexpected number of results");
      }
      renderSiteTest(result);
    } catch (error) {
      showSiteTestStatus(
        "Site test is unavailable. Start the backend and try again.",
        "error",
      );
      mapStatus.textContent = "No map results are available until the site test loads.";
      mapStatus.classList.add("error");
      mapSection.hidden = true;
      console.error("Could not run the site analogy test:", error);
    }
  };

  siteTestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runSiteTest(targetSelect.value);
  });

  runSiteTest(targetSelect.value);
}
