
import { useMemo, useState } from "react";
import {
  Search, MapPin, Plus, Minus, Layers, Crosshair,
  Compass, Activity, Radio, Satellite, ChevronRight,
  Navigation, Mountain, ShieldAlert, Bot, Menu
} from "lucide-react";
import "./index.css";

const locations = [
  { name: "Jezero Crater", region: "Northeast Syrtis", lat: "18.38° N", lon: "77.58° E", type: "Landing Site", elevation: "-2,575 m", detail: "Ancient lake basin and delta system. Perseverance rover exploration region." },
  { name: "Gale Crater", region: "Aeolis Palus", lat: "5.22° S", lon: "137.37° E", type: "Rover Site", elevation: "-4,450 m", detail: "Home of the Curiosity rover and Mount Sharp." },
  { name: "Olympus Mons", region: "Tharsis Montes", lat: "18.65° N", lon: "226.2° E", type: "Volcano", elevation: "21,900 m", detail: "The largest known volcano in the Solar System." },
  { name: "Valles Marineris", region: "Equatorial Mars", lat: "13.9° S", lon: "59.2° W", type: "Canyon System", elevation: "-4,500 m", detail: "Vast canyon system stretching across the Martian surface." },
  { name: "Utopia Planitia", region: "Northern Lowlands", lat: "46.7° N", lon: "117.5° E", type: "Exploration Region", elevation: "-4,000 m", detail: "Large impact basin and historic landing region." }
];

function App() {
  const [selected, setSelected] = useState(locations[0]);
  const [search, setSearch] = useState("");
  const [layer, setLayer] = useState("Optical");
  const [zoom, setZoom] = useState(1);
  const [showPanel, setShowPanel] = useState(true);
  const [activeTab, setActiveTab] = useState("Explore");

  const filtered = useMemo(
    () => locations.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase())
    ),
    [search]
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">M</div>
          <div>
            <div className="brand-name">MARS<span> // </span>COMMAND</div>
            <div className="brand-sub">INTERPLANETARY EXPLORATION SYSTEM</div>
          </div>
        </div>
        <div className="top-status">
          <span className="live-dot" /> SYSTEM ONLINE
          <span className="top-divider" />
          <Satellite size={15} /> ORBITAL DATA INTERFACE
        </div>
        <div className="mission-tag"><span>MISSION</span> MARS-01</div>
      </header>

      <section className="workspace">
        <aside className="left-panel">
          <div className="panel-heading">
            <span className="eyebrow">MISSION CONTROL</span>
            <Menu size={17} />
          </div>

          <div className="mission-card">
            <div className="mission-label"><span className="live-dot" /> ACTIVE MISSION</div>
            <h2>RED PLANET<br />EXPLORATION</h2>
            <p>Interplanetary Survival Guide</p>
            <div className="mission-progress"><span /></div>
            <div className="progress-caption">
              <span>PROTOTYPE STATUS</span><b>IN DEVELOPMENT</b>
            </div>
          </div>

          <div className="section-label">NAVIGATION MODULES</div>
          {[
            { name: "Explore", icon: Compass },
            { name: "Terrain", icon: Mountain },
            { name: "Hazards", icon: ShieldAlert },
            { name: "Route Planner", icon: Navigation },
            { name: "AI Assistant", icon: Bot }
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${activeTab === name ? "active" : ""}`}
              onClick={() => setActiveTab(name)}
            >
              <Icon size={17} />
              <span>{name}</span>
              {name !== "Explore" && <span className="soon">PLANNED</span>}
              {activeTab === name && <ChevronRight size={15} />}
            </button>
          ))}

          <div className="section-label location-label">EXPLORATION TARGETS</div>

          <div className="search-box">
            <Search size={15} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search locations..."
            />
          </div>

          <div className="location-list">
            {filtered.map((item, i) => (
              <button
                key={item.name}
                onClick={() => setSelected(item)}
                className={`location-item ${selected.name === item.name ? "chosen" : ""}`}
              >
                <span className="location-number">0{i + 1}</span>
                <span className="location-name">{item.name}</span>
                <MapPin size={14} />
              </button>
            ))}
            {filtered.length === 0 && <p className="empty-search">No locations found.</p>}
          </div>

          <div className="sidebar-footer">
            <Radio size={15} />
            <div><b>DATA LINK ESTABLISHED</b><small>LOCAL PROTOTYPE INTERFACE</small></div>
          </div>
        </aside>

        <section className="map-section">
          <div className="map-topline">
            <div>
              <span className="eyebrow">PLANETARY SURFACE / MARS</span>
              <h1>Surface <span>Explorer</span></h1>
            </div>
            <div className="map-coordinates">
              <span>SELECTED TARGET</span>
              <b>{selected.lat} / {selected.lon}</b>
            </div>
          </div>

          <div className="map-viewport">
            <div className="map-art" style={{ transform: `scale(${zoom})` }}>
              <div className="mars-texture" />
              <div className="terrain-lines" />
              <div className="terrain-crater crater-one" />
              <div className="terrain-crater crater-two" />
              <div className="terrain-crater crater-three" />
              <div className="terrain-crater crater-four" />
              <div className="terrain-crater crater-five" />
              <div className="terrain-crater crater-six" />

              <svg className="map-svg" viewBox="0 0 1000 700" preserveAspectRatio="none">
                <path d="M100 500 Q250 350 380 430 T700 270 T950 350" className="contour" />
                <path d="M40 200 Q250 100 420 240 T780 100 T980 160" className="contour" />
                <path d="M50 600 Q300 500 500 580 T900 490" className="contour" />
                <path d="M300 0 Q380 150 300 300 T400 700" className="contour" />
                <path d="M720 0 Q650 150 760 300 T700 700" className="contour" />
                <path d="M100 350 Q300 250 500 380 T900 250" className="route-line" />
              </svg>

              {locations.map((item, i) => (
                <button
                  key={item.name}
                  className={`map-marker marker-${i} ${selected.name === item.name ? "selected-marker" : ""}`}
                  onClick={() => setSelected(item)}
                  title={item.name}
                >
                  <span className="marker-pulse" />
                  <MapPin size={19} />
                  <span className="marker-tooltip">{item.name}</span>
                </button>
              ))}
              <div className="map-center-label">MARS / 01</div>
            </div>

            <div className="map-overlay-top">
              <div className="map-chip"><span className="live-dot" /> SURFACE VIEW</div>
              <div className="map-chip">LAT / LON GRID <span className="orange">ON</span></div>
            </div>

            <div className="map-controls">
              <button onClick={() => setZoom(z => Math.min(z + 0.2, 1.8))}><Plus size={18} /></button>
              <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.8))}><Minus size={18} /></button>
              <div className="control-divider" />
              <button onClick={() => setZoom(1)}><Crosshair size={17} /></button>
            </div>

            <div className="map-legend">
              <span><i className="legend-orange" /> SELECTED TARGET</span>
              <span><i className="legend-white" /> EXPLORATION REGION</span>
            </div>
            <div className="map-scale">0 ━━━━━ 250 ━━━━━ 500 KM</div>
          </div>

          <div className="map-bottom">
            <div className="layer-control">
              <Layers size={16} />
              <span>MAP LAYER</span>
              <select value={layer} onChange={e => setLayer(e.target.value)}>
                <option>Optical</option>
                <option>Elevation (planned)</option>
                <option>Terrain (planned)</option>
              </select>
            </div>
            <div className="map-note">ILLUSTRATIVE TERRAIN VIEW · NASA DATA INTEGRATION PLANNED</div>
            <button className="expand-button" onClick={() => setShowPanel(!showPanel)}>
              {showPanel ? "HIDE DETAILS" : "SHOW DETAILS"}
            </button>
          </div>
        </section>

        {showPanel && (
          <aside className="right-panel">
            <div className="panel-heading">
              <span className="eyebrow">TARGET INTELLIGENCE</span>
              <Activity size={17} />
            </div>

            <div className="target-visual">
              <div className="target-orbit"><div className="target-planet" /></div>
              <span className="target-caption">MARS / TARGET 01</span>
            </div>

            <div className="target-details">
              <span className="eyebrow orange">SELECTED LOCATION</span>
              <h2>{selected.name}</h2>
              <p>{selected.region}</p>
              <div className="type-tag">{selected.type}</div>
              <p className="target-description">{selected.detail}</p>
            </div>

            <div className="data-grid">
              <div className="data-cell"><span>LATITUDE</span><b>{selected.lat}</b></div>
              <div className="data-cell"><span>LONGITUDE</span><b>{selected.lon}</b></div>
              <div className="data-cell"><span>ELEVATION</span><b>{selected.elevation}</b></div>
              <div className="data-cell"><span>MAP LAYER</span><b>{layer}</b></div>
            </div>

            <div className="intel-box">
              <div className="intel-title"><Activity size={15} /> MISSION INTELLIGENCE</div>
              <p>
                {selected.name === "Jezero Crater"
                  ? "A high-priority exploration region due to evidence of an ancient delta and past water activity."
                  : "Location selected for planetary exploration research and future mission planning."}
              </p>
            </div>

            <div className="assistant-card">
              <div className="assistant-icon"><Bot size={19} /></div>
              <div><b>AI MISSION ASSISTANT</b><small>PLANNED INTEGRATION</small></div>
              <span className="soon">SOON</span>
            </div>
          </aside>
        )}
      </section>

      <footer className="statusbar">
        <div><span className="live-dot" /> SYSTEM READY</div>
        <div>PLANET: <b>MARS</b></div>
        <div>INTERFACE: <b>PROTOTYPE</b></div>
        <div className="footer-right">MARS EXPLORER <span>·</span> NASA SPACE APPS CHALLENGE 2026</div>
      </footer>
    </main>
  );
}

export default App;
