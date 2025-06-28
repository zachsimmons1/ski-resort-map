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

// Define base layers
const openStreetMapLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
);

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> contributors',
  }
);

// Add default base layer
openStreetMapLayer.addTo(map);

// Add layer switcher control
L.control
  .layers({
    "Street Map": openStreetMapLayer,
    Satellite: satelliteLayer,
  })
  .addTo(map);

// Load ski resorts from CSV and add markers + table rows
const csvFilePath = "./Ski Resort List.csv"; // Adjust path as needed

Papa.parse(csvFilePath, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    const data = results.data;
    const tableBody = document.querySelector("#resorts-table tbody");

    data.forEach((resort, index) => {
      const { Resort, Location, Country, Latitude, Longitude } = resort;

      if (!isNaN(Latitude) && !isNaN(Longitude)) {
        const marker = L.marker([parseFloat(Latitude), parseFloat(Longitude)], {
          title: Resort, // Important for search plugin
        })
          .bindTooltip(`<strong>${Resort}</strong><br>${Location}, ${Country}`, {
            permanent: false,
            direction: "top",
          });
        marker.addTo(markerLayer);
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${Resort}</td>
        <td>${Location}</td>
        <td>${Country}</td>
      `;
      tableBody.appendChild(row);
    });

    // Add the Leaflet Search control for ski resorts
    const skiResortSearchControl = L.control.search({
      layer: markerLayer,
      propertyName: 'title', // Using marker option 'title' for search
      initial: false,
      zoom: 10,
      hideMarkerOnCollapse: true,
      textPlaceholder: 'Search ski resorts...',
      marker: false
    }).addTo(map);

    // Enable dragging and zoom initially
    map.dragging.enable();
    map.scrollWheelZoom.enable();

    skiResortSearchControl.on('search:locationfound', function () {
      console.log('search:locationfound event fired — enabling dragging and scroll zoom');
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    });

    skiResortSearchControl.on('search:collapsed', function () {
      console.log('search:collapsed event fired — enabling dragging and scroll zoom');
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    });

    // Optional: disable dragging while search input expanded if needed
    skiResortSearchControl.on('search:expanded', function () {
      console.log('search:expanded event fired — disabling dragging and scroll zoom');
      map.dragging.disable();
      map.scrollWheelZoom.disable();
    });
  },

  error: function (error) {
    console.error("Error loading CSV:", error);
  },
});

// Wire up search input & button to highlight region on click or Enter key
document.getElementById("region-search-btn").addEventListener("click", highlightRegionFromInput);
document.getElementById("region-search").addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    highlightRegionFromInput();
  }
});