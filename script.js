// Global variable to hold the highlighted region polygon
let highlightedRegion = null;

// Function to search for and highlight a geographic region using Nominatim
function highlightRegion(regionName) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(regionName)}&format=json&polygon_geojson=1`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (!data || data.length === 0 || !data[0].geojson) {
        alert('Region not found or does not include geometry.');
        return;
      }

      // Remove previous highlighted region if it exists
      if (highlightedRegion) {
        map.removeLayer(highlightedRegion);
      }

      // Draw new region polygon with style
      highlightedRegion = L.geoJSON(data[0].geojson, {
        style: {
          color: 'orange',
          weight: 2,
          fillColor: 'orange',
          fillOpacity: 0.1,
        }
      }).addTo(map);

      // Zoom map to fit the new highlighted region
      map.fitBounds(highlightedRegion.getBounds());
    })
    .catch(error => {
      console.error('Error fetching region:', error);
      alert('There was an error searching for the region.');
    });
}

// Function to trigger highlightRegion from input box
function highlightRegionFromInput() {
  const input = document.getElementById("region-search");
  if (input && input.value.trim() !== "") {
    highlightRegion(input.value.trim());
  }
}

// Initialize the Leaflet map
const map = L.map("map").setView([18.032617, -39.341946], 2); // Center of Earth
const markerLayer = L.layerGroup().addTo(map);

// === Esri World Imagery (Satellite) ===
const esriImagery = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: '&copy; Esri & contributors'
  }
);

// === Esri Labels Overlay (city, country names in English) ===
const esriLabels = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: '',
    pane: 'overlayPane'
  }
);

// === Esri Roads Overlay (highways, streets, etc.) ===
const esriRoads = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: '',
    pane: 'overlayPane'
  }
);

// === Combine satellite + overlays into one group layer (adding roads as separate layer b/c it's ugly) ===
const satelliteWithLabelsAndPOIs = L.layerGroup([esriImagery, esriLabels]);
const satelliteWithLabelsAndPOIsAndRoads = L.layerGroup([esriImagery, esriLabels, esriRoads]);

// === Optional fallback: OpenStreetMap base map ===
const openStreetMapLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: '&copy; OpenStreetMap contributors'
  }
);

satelliteWithLabelsAndPOIs.addTo(map);

// === Add layer control to toggle between base maps ===
L.control
  .layers(
    {
      'Satellite + Labels': satelliteWithLabelsAndPOIs,
      'Street Map (OSM)': openStreetMapLayer,
      'Satellite + Labels + Roads': satelliteWithLabelsAndPOIsAndRoads
    }
  )
  .addTo(map);


// Load ski resorts from CSV and add markers + table rows
const csvFilePath = "./Ski Resort List.csv";

Papa.parse(csvFilePath, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    const data = results.data; // Parsed CSV data

    // Reference the table body
    const tableBody = document.querySelector("#resorts-table tbody");

    // Clear any existing markers (if any)
    markerLayer.clearLayers();

    // Add markers
    data.forEach((resort, index) => {
      const { Resort, Location, Country, Latitude, Longitude } = resort;

      if (!isNaN(Latitude) && !isNaN(Longitude)) {
        const marker = L.marker([parseFloat(Latitude), parseFloat(Longitude)], {
          title: Resort
        }).bindTooltip(`<strong>${Resort}</strong><br>${Location}, ${Country}`, {
          permanent: false,
          direction: "top",
        });

        marker.addTo(markerLayer);
      }

      // Add table rows
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${Resort}</td>
        <td>${Location}</td>
        <td>${Country}</td>
      `;
      tableBody.appendChild(row);
    });

    // Remove old search control if exists (optional)
    if (window.skiResortSearchControl) {
      map.removeControl(window.skiResortSearchControl);
    }

    // Create search control *after* markers are fully added
    window.skiResortSearchControl = L.control.search({
      layer: markerLayer,
      propertyName: 'title',
      initial: false,
      zoom: 10,
      hideMarkerOnCollapse: true,
      textPlaceholder: 'Search ski resorts...',
      marker: {
        icon: new L.DivIcon({ className: 'invisible-marker' }),
        animate: false
      },
      moveToLocation: function (latlng, title, map) {
        map.setView(latlng, 10);
      }
    }).addTo(map);

    // Ensure dragging is re-enabled after search
    map.on('search:locationfound', function () {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    });
    map.on('search:collapsed', function () {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    });
  },
  error: function (error) {
    console.error("Error loading CSV:", error);
  },
});


// Autocomplete setup for region search input
const searchInput = document.getElementById("region-search");
const suggestionsList = document.getElementById("region-suggestions");

let debounceTimer;

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);

  const query = searchInput.value.trim();
  if (query.length < 3) {
    suggestionsList.innerHTML = ""; // Clear suggestions if too short
    return;
  }

  debounceTimer = setTimeout(() => {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`)
      .then(response => response.json())
      .then(results => {
        suggestionsList.innerHTML = ""; // Clear old suggestions

        results.forEach(place => {
          const option = document.createElement("option");
          option.value = place.display_name;
          suggestionsList.appendChild(option);
        });
      })
      .catch(err => {
        console.error("Autocomplete error:", err);
      });
  }, 300); // debounce delay
});


// Wire up search input & button to highlight region on click or Enter key
document.getElementById("region-search-btn").addEventListener("click", highlightRegionFromInput);
document.getElementById("region-search").addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    highlightRegionFromInput();
  }
});