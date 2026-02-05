const map = L.map('map', { zoomControl: false }).setView([-42.6, -73.7], 9);
L.control.zoom({ position: 'bottomright' }).addTo(map);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
const satelital = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');

osm.addTo(map);

const markers = L.markerClusterGroup();
let heatLayer = null;
let geojsonData = null;

const overlays = { "Puntos": markers };

const layerControl = L.control.layers(
  { "Mapa": osm, "Satelital": satelital },
  overlays,
  { collapsed: false }
).addTo(map);

fetch("./puntos.geojson")
  .then(res => res.json())
  .then(data => {
    geojsonData = data;
    initFilters(data);
    renderData(data.features);
  });

function initFilters(data) {
  const fieldSelect = document.getElementById('fieldSelect');
  const keys = Object.keys(data.features[0].properties);

  keys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    fieldSelect.appendChild(opt);
  });

  fieldSelect.addEventListener('change', updateValueSelect);
}

function updateValueSelect() {
  const field = document.getElementById('fieldSelect').value;
  const valueSelect = document.getElementById('valueSelect');
  valueSelect.innerHTML = '<option value="">(todos)</option>';

  if (!field) return;

  const values = new Set();

  geojsonData.features.forEach(f => {
    if (f.properties[field] !== null && f.properties[field] !== undefined) {
      values.add(String(f.properties[field]));
    }
  });

  [...values].sort().forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    valueSelect.appendChild(opt);
  });
}

function buildHeatmap(features) {
  const heatPoints = features.map(f => {
    const lat = f.geometry.coordinates[1];
    const lng = f.geometry.coordinates[0];

    let intensidad = parseFloat(
      String(f.properties["Superficie total afectada (%)"]).replace(",", ".")
    );

    if (isNaN(intensidad)) intensidad = 0;

    return [lat, lng, intensidad / 100];
  });

  if (heatLayer) {
    map.removeLayer(heatLayer);
    layerControl.removeLayer(heatLayer);
  }

  heatLayer = L.heatLayer(heatPoints, {
    radius: 30,
    blur: 20,
    maxZoom: 13,
    minOpacity: 0.35
  });

  layerControl.addOverlay(heatLayer, "Mapa de calor (%)");
}

function renderData(features) {
  markers.clearLayers();

  features.forEach(feature => {
    const layer = L.geoJSON(feature, {
      onEachFeature: function(feature, layer) {
        let popup = "<div style='max-height:300px; overflow-y:auto; font-size:13px'>";
        popup += "<b>Información del predio</b><br><br>";

        for (const key in feature.properties) {
          popup += `<b>${key}:</b> ${feature.properties[key]}<br>`;
        }

        popup += "</div>";
        layer.bindPopup(popup, { autoPan: false });
      }
    });

    markers.addLayer(layer);
  });

  map.addLayer(markers);
  document.getElementById('counter').innerHTML = `Mostrando <b>${features.length}</b> puntos`;

  buildHeatmap(features);
}

function applyFilters() {
  const text = document.getElementById('searchBox').value.toLowerCase();
  const field = document.getElementById('fieldSelect').value;
  const value = document.getElementById('valueSelect').value;

  const filtered = geojsonData.features.filter(f => {
    let ok = true;

    if (text) {
      ok = Object.values(f.properties).some(v =>
        String(v).toLowerCase().includes(text)
      );
    }

    if (ok && field && value) {
      ok = String(f.properties[field]) === value;
    }

    return ok;
  });

  renderData(filtered);
}

function resetFilters() {
  document.getElementById('searchBox').value = "";
  document.getElementById('fieldSelect').value = "";
  document.getElementById('valueSelect').innerHTML = '<option value="">(todos)</option>';
  renderData(geojsonData.features);
}

function togglePanel() {
  document.getElementById("filterPanel").classList.toggle("collapsed");
}
