// Initialize the map
const map = L.map("map").setView([18.032617, -39.341946], 2); // Centered on Earth
const markerLayer = L.layerGroup().addTo(map);

// Define the OpenStreetMap tile layer (default)
const openStreetMapLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
);

// Define the Satellite layer (Esri World Imagery with labels)
const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> contributors',
  }
);

// Add the default OpenStreetMap layer to the map
openStreetMapLayer.addTo(map);

// Add a layer control to toggle between OpenStreetMap and Satellite with labels
L.control
  .layers({
    "Street Map": openStreetMapLayer,
    Satellite: satelliteLayer,
  })
  .addTo(map);

// Fetch the local CSV file from Glitch
const csvFilePath = "./Ski Resort List.csv"; // Local path to the CSV file in the Glitch project

Papa.parse(csvFilePath, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    const data = results.data; // Parsed CSV data
    console.log(data); // Debugging

    // Reference the table body
    const tableBody = document.querySelector("#resorts-table tbody");

    // Loop through each ski resort and add it to the map and the table
    data.forEach((resort, index) => {
      const { Resort, Location, Country, Latitude, Longitude } = resort;

      // Add to the map if lat/lng are valid numbers
      if (!isNaN(Latitude) && !isNaN(Longitude)) {
        const marker = L.marker([parseFloat(Latitude), parseFloat(Longitude)])
          .bindTooltip(`<strong>${Resort}</strong><br>${Location}, ${Country}`, {
            permanent: false,
            direction: "top",
          });

        marker.resortName = Resort; // Used by the search control
        marker.addTo(markerLayer);
      }

      // Add table row
      const row = document.createElement("tr");
      row.innerHTML = `
    <td>${index + 1}</td>
    <td>${Resort}</td>
    <td>${Location}</td>
    <td>${Country}</td>
  `;
      tableBody.appendChild(row);
    });

    // Add search control to the map
    L.control
      .search({
        layer: markerLayer,
        propertyName: "resortName",
        zoom: 10,
        initial: false,
        hideMarkerOnCollapse: true,
      })
      .addTo(map);

  },
  error: function (error) {
    console.error("Error loading CSV:", error);
  },
});
