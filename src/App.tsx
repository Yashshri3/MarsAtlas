
import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import {
  Activity, Bot, ChevronRight, Compass, Crosshair,
  Layers, MapPin, Menu, Minus, Mountain, Navigation,
  Plus, Radio, Search, Satellite, ShieldAlert
} from "lucide-react";

import "cesium/Build/Cesium/Widgets/widgets.css";
import "./index.css";
import "./MarsGlobe.css";

const MARS_ASSET_ID = 3644333;

const locations = [
  {
    name: "Jezero Crater",
    region: "Northeast Syrtis",
    lat: 18.38,
    lon: 77.58,
    type: "Landing Site",
    detail: "Ancient lake basin and delta system. Perseverance rover exploration region."
  },
  {
    name: "Gale Crater",
    region: "Aeolis Palus",
    lat: -5.22,
    lon: 137.37,
    type: "Rover Site",
    detail: "Home of the Curiosity rover and Mount Sharp."
  },
  {
    name: "Olympus Mons",
    region: "Tharsis Montes",
    lat: 18.65,
    lon: -133.8,
    type: "Volcano",
    detail: "The largest known volcano in the Solar System."
  },
  {
    name: "Valles Marineris",
    region: "Equatorial Mars",
    lat: -13.9,
    lon: -59.2,
    type: "Canyon System",
    detail: "Vast canyon system stretching across the Martian surface."
  },
  {
    name: "Utopia Planitia",
    region: "Northern Lowlands",
    lat: 46.7,
    lon: 117.5,
    type: "Exploration Region",
    detail: "Large impact basin and historic landing region."
  }
];

type Location = typeof locations[number];

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;
}

function App() {
  const globeRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  const [selected, setSelected] = useState<Location>(locations[0]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Explore");
  const [showPanel, setShowPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coordinates, setCoordinates] = useState("");

  const filtered = locations.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  function flyToLocation(location: Location) {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        location.lon,
        location.lat,
        850000,
        Cesium.Ellipsoid.MARS
      ),
      orientation: {
        heading: 0,
        pitch: -Cesium.Math.PI_OVER_TWO,
        roll: 0
      },
      duration: 2.5
    });
  }

  function selectLocation(location: Location) {
    setSelected(location);
    flyToLocation(location);
  }

  useEffect(() => {
    if (!globeRef.current) return;

    const token = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim();

    if (!token) {
      setError(
        "Cesium token missing. Add VITE_CESIUM_ION_TOKEN to the root .env.local file."
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    let viewer: Cesium.Viewer | undefined;

    async function initializeMars() {
      try {
        // Set the token BEFORE creating the viewer or requesting the asset.
        Cesium.Ion.defaultAccessToken = token;
        Cesium.Ellipsoid.default = Cesium.Ellipsoid.MARS;

        viewer = new Cesium.Viewer(globeRef.current!, {
          globe: false,
          baseLayer: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          shadows: false,
          shouldAnimate: true
        });

        viewerRef.current = viewer;

        viewer.scene.backgroundColor =
          Cesium.Color.fromCssColorString("#08090b");

        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 10000;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000000;

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            0, 0, 28000000, Cesium.Ellipsoid.MARS
          ),
          orientation: {
            heading: 0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0
          }
        });

        // Load the official Cesium Mars global 3D Tiles dataset.
        const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(
          MARS_ASSET_ID
        );

        if (cancelled || !viewer || viewer.isDestroyed()) {
          tileset.destroy();
          return;
        }

        viewer.scene.primitives.add(tileset);

        // Add exploration locations.
        locations.forEach((location) => {
          viewer!.entities.add({
            name: location.name,
            position: Cesium.Cartesian3.fromDegrees(
              location.lon,
              location.lat,
              12000,
              Cesium.Ellipsoid.MARS
            ),
            point: {
              pixelSize: 11,
              color: Cesium.Color.fromCssColorString("#ff7849"),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            label: {
              text: location.name.toUpperCase(),
              font: "12px monospace",
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -22),
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            properties: {
              locationName: location.name
            }
          });
        });

        // Handle clicks on locations and Mars coordinates.
        viewer.screenSpaceEventHandler.setInputAction(
          (movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            const picked = viewer!.scene.pick(movement.position);

            if (Cesium.defined(picked) && picked.id?.properties?.locationName) {
              const name = picked.id.properties.locationName.getValue();
              const location = locations.find((item) => item.name === name);

              if (location) {
                setSelected(location);
                flyToLocation(location);
                return;
              }
            }

            const worldPosition = viewer!.camera.pickEllipsoid(
              movement.position,
              Cesium.Ellipsoid.MARS
            );

            if (Cesium.defined(worldPosition)) {
              const cartographic = Cesium.Cartographic.fromCartesian(
                worldPosition,
                Cesium.Ellipsoid.MARS
              );

              const lat = Cesium.Math.toDegrees(cartographic.latitude);
              const lon = Cesium.Math.toDegrees(cartographic.longitude);

              setCoordinates(
                `${coordinate(lat, "N", "S")} / ${coordinate(lon, "E", "W")}`
              );
            }
          },
          Cesium.ScreenSpaceEventType.LEFT_CLICK
        );

        setLoading(false);
        setError("");

        // Start with the whole planet visible.
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            0, 0, 28000000, Cesium.Ellipsoid.MARS
          ),
          duration: 2
        });

      } catch (err) {
        console.error("Mars globe loading failed:", err);

        const message =
          err instanceof Error ? err.message : String(err);

        setError(
          `Could not load Cesium Mars asset ${MARS_ASSET_ID}. ` +
          `Check token permissions and asset access. Details: ${message}`
        );

        setLoading(false);
      }
    }

    initializeMars();

    return () => {
      cancelled = true;

      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }

      viewerRef.current = null;
    };
  }, []);

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
          <span className="live-dot" />
          SYSTEM ONLINE
          <span className="top-divider" />
          <Satellite size={15} />
          ORBITAL DATA INTERFACE
        </div>

        <div className="mission-tag">
          <span>MISSION</span> MARS-01
        </div>
      </header>

      <section className="workspace">
        <aside className="left-panel">
          <div className="panel-heading">
            <span className="eyebrow">MISSION CONTROL</span>
            <Menu size={17} />
          </div>

          <div className="mission-card">
            <div className="mission-label">
              <span className="live-dot" /> ACTIVE MISSION
            </div>
            <h2>RED PLANET<br />EXPLORATION</h2>
            <p>Interplanetary Survival Guide</p>
            <div className="mission-progress"><span /></div>
            <div className="progress-caption">
              <span>PROTOTYPE STATUS</span>
              <b>IN DEVELOPMENT</b>
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search locations..."
            />
          </div>

          <div className="location-list">
            {filtered.map((item, index) => (
              <button
                key={item.name}
                onClick={() => selectLocation(item)}
                className={`location-item ${
                  selected.name === item.name ? "chosen" : ""
                }`}
              >
                <span className="location-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="location-name">{item.name}</span>
                <MapPin size={14} />
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="empty-search">No locations found.</p>
            )}
          </div>

          <div className="sidebar-footer">
            <Radio size={15} />
            <div>
              <b>DATA LINK</b>
              <small>CESIUM MARS 3D DATASET</small>
            </div>
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
              <b>
                {coordinate(selected.lat, "N", "S")} /{" "}
                {coordinate(selected.lon, "E", "W")}
              </b>
            </div>
          </div>

          <div className="map-viewport mars-globe-viewport">
            <div ref={globeRef} className="cesium-mars-container" />

            {loading && (
              <div className="globe-message">
                <div className="loader-orbit" />
                <b>INITIALIZING MARS DATASET</b>
                <span>CONNECTING TO CESIUM ION...</span>
              </div>
            )}

            {error && (
              <div className="globe-error">
                <b>MARS DATA LINK ERROR</b>
                <p>{error}</p>
              </div>
            )}

            <div className="map-overlay-top">
              <div className="map-chip">
                <span className="live-dot" /> 3D PLANETARY VIEW
              </div>
              <div className="map-chip">NASA / ESA DATA</div>
            </div>

            <div className="map-controls">
              <button
                title="Zoom in"
                onClick={() => viewerRef.current?.camera.zoomIn(300000)}
              >
                <Plus size={18} />
              </button>
              <button
                title="Zoom out"
                onClick={() => viewerRef.current?.camera.zoomOut(300000)}
              >
                <Minus size={18} />
              </button>
              <div className="control-divider" />
              <button
                title="Return to Mars"
                onClick={() => {
                  viewerRef.current?.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(
                      0, 0, 28000000, Cesium.Ellipsoid.MARS
                    ),
                    duration: 2
                  });
                }}
              >
                <Crosshair size={17} />
              </button>
            </div>

            {coordinates && (
              <div className="coordinate-readout">
                CLICKED COORDINATES: {coordinates}
              </div>
            )}

            <div className="map-legend">
              <span><i className="legend-orange" /> EXPLORATION TARGETS</span>
              <span>DRAG TO ROTATE · SCROLL TO ZOOM</span>
            </div>
          </div>

          <div className="map-bottom">
            <div className="layer-control">
              <Layers size={16} />
              <span>DATASET</span>
              <b>VIKING + MOLA / HRSC</b>
            </div>
            <div className="map-note">GLOBAL MARS 3D TILES · CESIUM ION</div>
            <button
              className="expand-button"
              onClick={() => setShowPanel(!showPanel)}
            >
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
              <div className="target-orbit">
                <div className="target-planet" />
              </div>
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
              <div className="data-cell">
                <span>LATITUDE</span>
                <b>{coordinate(selected.lat, "N", "S")}</b>
              </div>
              <div className="data-cell">
                <span>LONGITUDE</span>
                <b>{coordinate(selected.lon, "E", "W")}</b>
              </div>
              <div className="data-cell">
                <span>DATASET</span>
                <b>3D MARS</b>
              </div>
              <div className="data-cell">
                <span>MAP LAYER</span>
                <b>VIKING / MOLA</b>
              </div>
            </div>

            <div className="intel-box">
              <div className="intel-title">
                <Activity size={15} /> MISSION INTELLIGENCE
              </div>
              <p>
                {selected.name === "Jezero Crater"
                  ? "A high-priority exploration region due to evidence of an ancient delta and past water activity."
                  : "Location selected for planetary exploration research and future mission planning."}
              </p>
            </div>

            <div className="assistant-card">
              <div className="assistant-icon"><Bot size={19} /></div>
              <div>
                <b>AI MISSION ASSISTANT</b>
                <small>PLANNED INTEGRATION</small>
              </div>
              <span className="soon">SOON</span>
            </div>
          </aside>
        )}
      </section>

      <footer className="statusbar">
        <div><span className="live-dot" /> SYSTEM READY</div>
        <div>PLANET: <b>MARS</b></div>
        <div>INTERFACE: <b>3D PROTOTYPE</b></div>
        <div className="footer-right">
          MARS ATLAS <span>·</span> NASA SPACE APPS CHALLENGE 2026
        </div>
      </footer>
    </main>
  );
}

export default App;
