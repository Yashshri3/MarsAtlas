
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
import "./MarsLocationPanel.css";

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

type LayerName = "3d" | "optical" | "elevation";

const MARS_LAYERS: Record<
  Exclude<LayerName, "3d">,
  { title: string; id: string }
> = {
  optical: {
    title: "Viking Global Optical Mosaic",
    id: "Mars_Viking_MDIM21_ClrMosaic_global_232m"
  },
  elevation: {
    title: "MOLA Global Color Hillshade",
    id: "Mars_MGS_MOLA_ClrShade_merge_global_463m"
  }
};

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;
}

function App() {
  const globeRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const tilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const imageryLayerRef = useRef<Cesium.ImageryLayer | null>(null);

  const [selected, setSelected] = useState<Location>(locations[0]);
  const [marsLocations, setMarsLocations] = useState<Location[]>(locations);
  const [apiStatus, setApiStatus] = useState("CONNECTING TO BACKEND");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Explore");
  const [showPanel, setShowPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [activeLayer, setActiveLayer] = useState<LayerName>("3d");
  const [layerLoading, setLayerLoading] = useState(false);
  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [layerNotice, setLayerNotice] = useState("");
  const [, setRouteStart] = useState(...);
  const [, setRouteEnd] = useState(...);  const [routeCalculated, setRouteCalculated] = useState(false);
  const [routePickMode, setRoutePickMode] = useState<"start" | "end" | null>(null);
  const routePickModeRef = useRef<"start" | "end" | null>(null);
  const routeStartPointRef = useRef<{ lat: number; lon: number } | null>(null);
  const [routeStartPoint, setRouteStartPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [routeEndPoint, setRouteEndPoint] = useState<{ lat: number; lon: number } | null>(null);
  const routeLineRef = useRef<Cesium.Entity | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [hazardData, setHazardData] = useState<any>(null);
  const [hazardLoading, setHazardLoading] = useState(false);
  const [hazardError, setHazardError] = useState("");

  const filtered = marsLocations.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  function getDistanceKm(a: Location, b: Location) {
    const rad = (value: number) => (value * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) *
      Math.sin(dLon / 2) ** 2;
    return 3390 * 2 * Math.asin(Math.sqrt(h));
  }

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
    setLocationPanelOpen(true);
    setLayerNotice("");
    flyToLocation(location);
  }

  async function changeMarsLayer(layerName: LayerName) {
    const viewer = viewerRef.current;
    const tileset = tilesetRef.current;
    if (!viewer || viewer.isDestroyed() || !tileset) return;

    setLayerLoading(true);
    setError("");
    setLayerNotice("");

    try {
      if (imageryLayerRef.current) {
        tileset.imageryLayers.remove(imageryLayerRef.current, true);
        imageryLayerRef.current = null;
      }

      if (layerName === "3d") {
        setActiveLayer("3d");
        viewer.scene.requestRender();
        return;
      }

      const dataset = MARS_LAYERS[layerName].id;
      const providerUrl =
        layerName === "optical"
          ? "https://api.nasa.gov/mars-wmts/catalog/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg"
          : `https://trek.nasa.gov/tiles/Mars/EQ/${dataset}/1.0.0/default/default028mm/{z}/{y}/{x}.jpg`;

      const provider = new Cesium.UrlTemplateImageryProvider({
        url: providerUrl,
        tilingScheme: new Cesium.GeographicTilingScheme({
          ellipsoid: Cesium.Ellipsoid.MARS,
          numberOfLevelZeroTilesX: 2,
          numberOfLevelZeroTilesY: 1
        }),
        tileWidth: 256,
        tileHeight: 256,
        minimumLevel: 0,
        maximumLevel: layerName === "optical" ? 9 : 8
      });

      const overlay = tileset.imageryLayers.addImageryProvider(provider);
      overlay.alpha = 1;
      imageryLayerRef.current = overlay;

      provider.errorEvent.addEventListener((tileError) => {
        console.error(`NASA Mars tile error for ${dataset}:`, tileError);
        setLayerNotice(
          `Some ${MARS_LAYERS[layerName].title} tiles could not be loaded. The 3D base surface remains available.`
        );
      });

      setActiveLayer(layerName);
      viewer.scene.requestRender();
    } catch (err) {
      console.error("Mars layer loading failed:", err);
      setError("Could not initialize this Mars overlay. See the browser console.");
      if (imageryLayerRef.current) {
        tileset.imageryLayers.remove(imageryLayerRef.current, true);
        imageryLayerRef.current = null;
      }
      setActiveLayer("3d");
    } finally {
      setLayerLoading(false);
    }
  }

  // Load exploration targets from FastAPI. The curated local list remains
  // available as a fallback if the backend is offline.
  useEffect(() => {
    const controller = new AbortController();

    async function loadMarsLocations() {
      try {
        const response = await fetch("https://marsatlas.onrender.com/api/mars/locations", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Mars API returned HTTP ${response.status}`);
        }

        const payload = await response.json();
        const apiItems = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.locations)
            ? payload.locations
            : [];

        if (apiItems.length === 0) {
          throw new Error("The Mars API returned no locations.");
        }

        const normalizedLocations: Location[] = apiItems.map((item: any) => {
          const fallback = locations.find(
            (location) =>
              location.name.toLowerCase() === String(item.name ?? "").toLowerCase()
          );
          const lat = Number(item.latitude ?? item.lat);
          const lon = Number(item.longitude ?? item.lon);

          if (!item.name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
            throw new Error(`Invalid location data received for ${item.name ?? "unknown location"}.`);
          }

          return {
            name: String(item.name),
            region: String(item.region ?? fallback?.region ?? "Mars"),
            lat,
            lon,
            type: String(item.type ?? fallback?.type ?? "Exploration Region"),
            detail: String(item.detail ?? item.description ?? fallback?.detail ?? ""),
          };
        });

        setMarsLocations(normalizedLocations);
        setSelected((current) =>
          normalizedLocations.find((item) => item.name === current.name) ?? normalizedLocations[0]
        );
        setRouteStart(normalizedLocations[0].name);
        setRouteEnd(normalizedLocations[1]?.name ?? normalizedLocations[0].name);
        setApiStatus("BACKEND CONNECTED");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Could not load Mars locations from FastAPI:", error);
        setApiStatus("LOCAL FALLBACK ACTIVE");
      }
    }

    loadMarsLocations();
    return () => controller.abort();
  }, []);

  // Load preliminary hazard findings from the FastAPI backend.
  useEffect(() => {
    if (activeTab !== "Hazards") return;

    const controller = new AbortController();
    const locationIds: Record<string, string> = {
      "Jezero Crater": "jezero",
      "Gale Crater": "gale",
      "Olympus Mons": "olympus-mons",
      "Valles Marineris": "valles-marineris",
      "Utopia Planitia": "utopia-planitia",
    };

    async function loadHazards() {
      setHazardLoading(true);
      setHazardError("");
      setHazardData(null);

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/hazards/analyze",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location_id: locationIds[selected.name] }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Hazards API returned HTTP ${response.status}`);
        }

        const data = await response.json();
        setHazardData(data);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Hazards API request failed:", error);
        setHazardError(
          "Could not connect to the Hazards API. Check that the FastAPI backend is running."
        );
      } finally {
        if (!controller.signal.aborted) setHazardLoading(false);
      }
    }

    loadHazards();
    return () => controller.abort();
  }, [activeTab, selected.name]);

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
          globe: new Cesium.Globe(Cesium.Ellipsoid.MARS),
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
        viewer.scene.globe.show = false;

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

        tilesetRef.current = tileset;
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
            if (routePickModeRef.current) {
              let pickedPosition: Cesium.Cartesian3 | undefined;

              // First try the visible Mars 3D tiles surface.
              if (viewer!.scene.pickPositionSupported) {
                const surfacePosition = viewer!.scene.pickPosition(movement.position);
                if (Cesium.defined(surfacePosition)) {
                  pickedPosition = surfacePosition;
                }
              }

              // Fallback to the Mars reference ellipsoid.
              if (!pickedPosition) {
                const ellipsoidPosition = viewer!.camera.pickEllipsoid(
                  movement.position,
                  Cesium.Ellipsoid.MARS
                );
                if (Cesium.defined(ellipsoidPosition)) {
                  pickedPosition = ellipsoidPosition;
                }
              }

              if (!pickedPosition) {
                setCoordinates("Could not select that point. Click directly on the visible Mars surface.");
                return;
              }

              const cartographic = Cesium.Cartographic.fromCartesian(
                pickedPosition,
                Cesium.Ellipsoid.MARS
              );
              const point = {
                lat: Cesium.Math.toDegrees(cartographic.latitude),
                lon: Cesium.Math.toDegrees(cartographic.longitude)
              };

              if (routePickModeRef.current === "start") {
                routeStartPointRef.current = point;
                setRouteStartPoint(point);
                setRouteEndPoint(null);
                setRouteCalculated(false);
                if (routeLineRef.current) {
                  viewer!.entities.remove(routeLineRef.current);
                  routeLineRef.current = null;
                }
                routePickModeRef.current = "end";
                setRoutePickMode("end");
                setCoordinates(`ROUTE START: ${coordinate(point.lat, "N", "S")} / ${coordinate(point.lon, "E", "W")}`);
              } else {
                const startPoint = routeStartPointRef.current;
                if (!startPoint) return;
                setRouteEndPoint(point);
                // Draw the route above the 3D-tiles surface. Ground clamping is
                // unreliable here because the Mars globe terrain is hidden.
                const routeHeight = 12000; // metres above the Mars reference ellipsoid
                const routePositions = Cesium.Cartesian3.fromDegreesArrayHeights([
                  startPoint.lon, startPoint.lat, routeHeight,
                  point.lon, point.lat, routeHeight
                ], Cesium.Ellipsoid.MARS);

                // Add visible endpoint markers as well as the route line.
                viewer!.entities.add({
                  name: "Route start",
                  position: Cesium.Cartesian3.fromDegrees(
                    startPoint.lon, startPoint.lat, routeHeight, Cesium.Ellipsoid.MARS
                  ),
                  point: {
                    pixelSize: 14,
                    color: Cesium.Color.LIME,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 3,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                  },
                  label: {
                    text: "START",
                    font: "bold 13px sans-serif",
                    fillColor: Cesium.Color.LIME,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 3,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -24),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                  }
                });
                viewer!.entities.add({
                  name: "Route destination",
                  position: Cesium.Cartesian3.fromDegrees(
                    point.lon, point.lat, routeHeight, Cesium.Ellipsoid.MARS
                  ),
                  point: {
                    pixelSize: 14,
                    color: Cesium.Color.CYAN,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 3,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                  },
                  label: {
                    text: "DESTINATION",
                    font: "bold 13px sans-serif",
                    fillColor: Cesium.Color.CYAN,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 3,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -24),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                  }
                });

                routeLineRef.current = viewer!.entities.add({
                  name: "Planned route preview",
                  polyline: {
                    positions: routePositions,
                    width: 9,
                    material: new Cesium.PolylineGlowMaterialProperty({
                      glowPower: 0.25,
                      color: Cesium.Color.fromCssColorString("#ff3b18")
                    }),
                    depthFailMaterial: Cesium.Color.YELLOW,
                    arcType: Cesium.ArcType.GEODESIC,
                    clampToGround: false
                  }
                });
                routePickModeRef.current = null;
                setRoutePickMode(null);
                setRouteCalculated(true);
                setCoordinates(`ROUTE END: ${coordinate(point.lat, "N", "S")} / ${coordinate(point.lon, "E", "W")}`);
                setActiveTab("Route Planner");
              }
              return;
            }

            const picked = viewer!.scene.pick(movement.position);

            if (Cesium.defined(picked) && picked.id?.properties?.locationName) {
              const name = picked.id.properties.locationName.getValue();
              const location = locations.find((item) => item.name === name);

              if (location) {
                setSelected(location);
                setLocationPanelOpen(true);
                setLayerNotice("");
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
      tilesetRef.current = null;
      imageryLayerRef.current = null;
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
              <small>{apiStatus} · CESIUM MARS 3D DATASET</small>
            </div>
          </div>
        </aside>

        <section
          className="map-section"
          style={{ display: activeTab === "Explore" ? "flex" : "none" }}
        >
          {routePickMode && (
            <div style={{
              position: "absolute",
              zIndex: 20,
              top: "72px",
              left: "50%",
              transform: "translateX(-50%)",
              padding: "12px 18px",
              background: "#211712",
              border: "1px solid #ff7849",
              color: "#f5e8df",
              fontSize: "12px"
            }}>
              {routePickMode === "start" ? "CLICK MARS TO SELECT ROUTE START" : "NOW CLICK MARS TO SELECT DESTINATION"}
            </div>
          )}
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

            <button
              className="location-layer-launch"
              onClick={() => setLocationPanelOpen(true)}
            >
              <Layers size={15} /> EXPLORE {selected.name.toUpperCase()} LAYERS
            </button>

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
              <span>ACTIVE LAYER</span>
              <b>{activeLayer === "3d" ? "3D MARS GLOBE" : MARS_LAYERS[activeLayer].title}</b>
            </div>
            <div className="map-note">NASA MARS TREK WMTS · CESIUM ION</div>
            <button
              className="expand-button"
              onClick={() => setShowPanel(!showPanel)}
            >
              {showPanel ? "HIDE DETAILS" : "SHOW DETAILS"}
            </button>
          </div>
        </section>

        {activeTab !== "Explore" && (
          <section className="map-section" style={{ padding: "28px", overflowY: "auto" }}>
            <div className="map-topline" style={{ marginBottom: "24px" }}>
              <div>
                <span className="eyebrow">MISSION MODULE / MARS</span>
                <h1>{activeTab} <span>Workspace</span></h1>
              </div>
              <button className="expand-button" onClick={() => setActiveTab("Explore")}>
                BACK TO EXPLORE
              </button>
            </div>

            {activeTab === "Terrain" && (
              <div style={{ display: "grid", gap: "16px", maxWidth: "850px" }}>
                <div className="intel-box">
                  <div className="intel-title"><Mountain size={16} /> TERRAIN ANALYSIS</div>
                  <label style={{ display: "block", margin: "12px 0" }}>
                    <span className="eyebrow">SELECT LOCATION</span>
                    <select
                      value={selected.name}
                      onChange={(e) => {
                        const location = marsLocations.find((item) => item.name === e.target.value);
                        if (location) setSelected(location);
                      }}
                      style={{ display: "block", width: "100%", marginTop: "8px", background: "#171313", color: "#f4e7df", padding: "10px", border: "1px solid #594033" }}
                    >
                      {marsLocations.map((location) => <option key={location.name} value={location.name}>{location.name}</option>)}
                    </select>
                  </label>
                  <h2>{selected.name}</h2>
                  <p>Selected region: {selected.region}. Use the layer selector to inspect the available surface views.</p>
                </div>
                <div className="data-grid">
                  <div className="data-cell"><span>LATITUDE</span><b>{coordinate(selected.lat, "N", "S")}</b></div>
                  <div className="data-cell"><span>LONGITUDE</span><b>{coordinate(selected.lon, "E", "W")}</b></div>
                  <div className="data-cell"><span>AVAILABLE VIEW</span><b>{activeLayer.toUpperCase()}</b></div>
                  <div className="data-cell"><span>NUMERICAL ELEVATION</span><b>NOT CONNECTED</b></div>
                </div>
                <div className="intel-box">
                  <div className="intel-title"><Layers size={16} /> TERRAIN DATA STATUS</div>
                  <p>MOLA elevation imagery can be selected from Explore → Explore Location Layers. Numerical elevation samples are not yet connected, so slope and roughness values are not calculated here.</p>
                  <button className="expand-button" onClick={() => { setActiveTab("Explore"); setLocationPanelOpen(true); }}>OPEN MAP LAYERS</button>
                </div>
              </div>
            )}

            {activeTab === "Hazards" && (
              <div style={{ display: "grid", gap: "16px", maxWidth: "850px" }}>
                <div className="intel-box">
                  <div className="intel-title"><ShieldAlert size={16} /> SURFACE HAZARD REVIEW</div>
                  <label style={{ display: "block", margin: "12px 0" }}>
                    <span className="eyebrow">SELECT LOCATION</span>
                    <select
                      value={selected.name}
                      onChange={(e) => {
                        const location = marsLocations.find((item) => item.name === e.target.value);
                        if (location) setSelected(location);
                      }}
                      style={{ display: "block", width: "100%", marginTop: "8px", background: "#171313", color: "#f4e7df", padding: "10px", border: "1px solid #594033" }}
                    >
                      {marsLocations.map((location) => <option key={location.name} value={location.name}>{location.name}</option>)}
                    </select>
                  </label>
                  <h2>{selected.name}</h2>
                  {hazardLoading && <p>CONNECTING TO MARS HAZARD ANALYSIS...</p>}
                  {hazardError && <p style={{ color: "#ff7849" }}>{hazardError}</p>}
                  {hazardData && <p>{hazardData.message}</p>}
                </div>

                {hazardData && !hazardLoading && (
                  <>
                    <div className="data-grid">
                      <div className="data-cell">
                        <span>HAZARD FINDINGS</span>
                        <b>{hazardData.findings?.length ?? 0}</b>
                      </div>
                      <div className="data-cell">
                        <span>SAFETY SCORE</span>
                        <b>{hazardData.safety_score ?? "NOT RATED"}</b>
                      </div>
                      <div className="data-cell">
                        <span>SCIENTIFIC VALIDATION</span>
                        <b>{hazardData.scientific_validation ?? "PENDING"}</b>
                      </div>
                      <div className="data-cell">
                        <span>ANALYSIS STATUS</span>
                        <b>{hazardData.status?.toUpperCase() ?? "UNKNOWN"}</b>
                      </div>
                    </div>

                    <div className="intel-box">
                      <div className="intel-title"><ShieldAlert size={16} /> DETECTED / KNOWN CONSIDERATIONS</div>
                      {hazardData.findings?.length ? (
                        hazardData.findings.map((finding: any, index: number) => (
                          <div
                            key={index}
                            style={{ padding: "14px", marginTop: "12px", background: "#171313", border: "1px solid #594033", borderRadius: "6px" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                              <b>{finding.category}</b>
                              <span style={{ color: "#ff7849", fontSize: "12px" }}>{finding.status}</span>
                            </div>
                            <p>{finding.description}</p>
                          </div>
                        ))
                      ) : (
                        <p>No preliminary findings are available for this location.</p>
                      )}
                    </div>

                    <div className="intel-box">
                      <div className="intel-title">SCIENTIFIC DATA LIMITATION</div>
                      <p>{hazardData.message}</p>
                      <p>Numerical slope and surface roughness calculations require georeferenced MOLA elevation and terrain data. This preliminary review is not a verified rover safety assessment.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "Route Planner" && (
              <div style={{ display: "grid", gap: "16px", maxWidth: "850px" }}>
                <div className="intel-box">
                  <div className="intel-title"><Navigation size={16} /> MARS ROUTE PLANNER</div>
                  <p>Choose two exploration locations. This prototype calculates their straight-line surface distance; hazard-aware pathfinding will require terrain grids.</p>
                </div>
                <div className="data-grid">
                  <div className="data-cell">
                    <span>START COORDINATES</span>
                    <b>{routeStartPoint ? `${coordinate(routeStartPoint.lat, "N", "S")} / ${coordinate(routeStartPoint.lon, "E", "W")}` : "NOT SELECTED"}</b>
                  </div>
                  <div className="data-cell">
                    <span>DESTINATION COORDINATES</span>
                    <b>{routeEndPoint ? `${coordinate(routeEndPoint.lat, "N", "S")} / ${coordinate(routeEndPoint.lon, "E", "W")}` : "NOT SELECTED"}</b>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    className="expand-button"
                    onClick={() => {
                      routePickModeRef.current = "start";
                      setRoutePickMode("start");
                      routeStartPointRef.current = null;
                      setRouteStartPoint(null);
                      setRouteEndPoint(null);
                      setRouteCalculated(false);
                      if (routeLineRef.current && viewerRef.current && !viewerRef.current.isDestroyed()) {
                        viewerRef.current.entities.remove(routeLineRef.current);
                        routeLineRef.current = null;
                      }
                      setActiveTab("Explore");
                    }}
                  >
                    SELECT POINTS ON MARS
                  </button>
                  <button
                    className="expand-button"
                    onClick={() => {
                      routePickModeRef.current = null;
                      setRoutePickMode(null);
                      routeStartPointRef.current = null;
                      setRouteStartPoint(null);
                      setRouteEndPoint(null);
                      setRouteCalculated(false);
                      if (routeLineRef.current && viewerRef.current && !viewerRef.current.isDestroyed()) {
                        viewerRef.current.entities.remove(routeLineRef.current);
                        routeLineRef.current = null;
                      }
                    }}
                  >
                    CLEAR ROUTE
                  </button>
                </div>
                {routePickMode && (
                  <div className="intel-box">
                    <div className="intel-title">MAP SELECTION ACTIVE</div>
                    <p>{routePickMode === "start" ? "Click anywhere on Mars to set your START point." : "Start saved. Now click another point on Mars to set your DESTINATION."}</p>
                  </div>
                )}
                {routeCalculated && routeStartPoint && routeEndPoint && (
                  <div className="intel-box">
                    <div className="intel-title">ROUTE PREVIEW</div>
                    <h2>{getDistanceKm(
                      { ...locations[0], ...routeStartPoint },
                      { ...locations[0], ...routeEndPoint }
                    ).toFixed(1)} km</h2>
                    <p>
                      Start: {coordinate(routeStartPoint.lat, "N", "S")} / {coordinate(routeStartPoint.lon, "E", "W")}
                      <br />
                      Destination: {coordinate(routeEndPoint.lat, "N", "S")} / {coordinate(routeEndPoint.lon, "E", "W")}
                    </p>
                    <p>The orange line is a straight-line preview, not yet a slope-avoiding rover route. Numerical MOLA elevation and roughness grids are required before safety-aware pathfinding can be enabled.</p>
                    <button
                      className="expand-button"
                      onClick={() => {
                        setActiveTab("Explore");
                        window.setTimeout(() => {
                          const currentViewer = viewerRef.current;
                          if (currentViewer && !currentViewer.isDestroyed()) {
                            currentViewer.camera.flyTo({
                              destination: Cesium.Cartesian3.fromDegrees(
                                (routeStartPoint.lon + routeEndPoint.lon) / 2,
                                (routeStartPoint.lat + routeEndPoint.lat) / 2,
                                1800000,
                                Cesium.Ellipsoid.MARS
                              ),
                              duration: 1.5
                            });
                          }
                        }, 100);
                      }}
                    >
                      VIEW ROUTE ON MAP
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "AI Assistant" && (
              <div style={{ display: "grid", gap: "16px", maxWidth: "850px" }}>
                <div className="intel-box">
                  <div className="intel-title"><Bot size={16} /> MARS MISSION ASSISTANT</div>
                  <p>Choose any exploration location or mention its name in your question. This prototype uses the location information built into the app; it is not connected to a live AI service.</p>
                  <label style={{ display: "block", marginTop: "12px" }}>
                    <span className="eyebrow">CURRENT LOCATION</span>
                    <select
                      value={selected.name}
                      onChange={(e) => {
                        const location = marsLocations.find((item) => item.name === e.target.value);
                        if (location) setSelected(location);
                      }}
                      style={{ display: "block", width: "100%", marginTop: "8px", background: "#171313", color: "#f4e7df", padding: "10px", border: "1px solid #594033" }}
                    >
                      {marsLocations.map((location) => <option key={location.name} value={location.name}>{location.name}</option>)}
                    </select>
                  </label>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input value={assistantQuestion} onChange={(e) => setAssistantQuestion(e.target.value)} placeholder="Ask about this Mars location..." style={{ flex: "1 1 260px", minWidth: 0, background: "#171313", color: "#f4e7df", padding: "12px", border: "1px solid #594033" }} />
                  <button
                    className="expand-button"
                    onClick={async () => {
                      const message = assistantQuestion.trim();
                      if (!message) {
                        setAssistantAnswer("Please enter a question first.");
                        return;
                      }

                      const locationIds: Record<string, string> = {
                        "Jezero Crater": "jezero",
                        "Gale Crater": "gale",
                        "Olympus Mons": "olympus-mons",
                        "Valles Marineris": "valles-marineris",
                        "Utopia Planitia": "utopia-planitia"
                      };

                      try {
                        setAssistantAnswer("Connecting to Mars mission assistant...");

                        const response = await fetch(
                          "http://127.0.0.1:8000/api/assistant/chat",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                              message,
                              location_id: locationIds[selected.name] ?? null
                            })
                          }
                        );

                        if (!response.ok) {
                          throw new Error(`Assistant API returned HTTP ${response.status}`);
                        }

                        const data = await response.json();
                        setAssistantAnswer(
                          typeof data.answer === "string"
                            ? data.answer
                            : "The assistant returned an unexpected response."
                        );
                      } catch (error) {
                        console.error("Mars assistant request failed:", error);
                        setAssistantAnswer(
                          "Could not connect to the Mars backend. Check that FastAPI is running and CORS allows this frontend address."
                        );
                      }
                    }}
                  >
                    ASK
                  </button>
                </div>
                {assistantAnswer && <div className="intel-box"><p>{assistantAnswer}</p></div>}
              </div>
            )}
          </section>
        )}

        {activeTab === "Explore" && showPanel && (
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
                <b>{activeLayer.toUpperCase()}</b>
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

        {locationPanelOpen && (
          <aside className="location-layer-drawer">
            <div className="location-layer-drawer-head">
              <div>
                <span className="eyebrow orange">LOCATION DATA</span>
                <h2>{selected.name}</h2>
                <p>{selected.region} · {coordinate(selected.lat, "N", "S")} / {coordinate(selected.lon, "E", "W")}</p>
              </div>
              <button className="drawer-close" onClick={() => setLocationPanelOpen(false)}>×</button>
            </div>
            <div className="drawer-section-title">SCIENTIFIC LAYERS FOR THIS LOCATION</div>
            <button
              className={activeLayer === "3d" ? "drawer-layer active" : "drawer-layer"}
              onClick={() => changeMarsLayer("3d")}
              disabled={layerLoading}
            >
              <span className="drawer-layer-index">01</span>
              <span><b>3D Mars Base Map</b><small>Cesium Mars global 3D Tiles</small></span>
              <span className="drawer-check">{activeLayer === "3d" ? "●" : "○"}</span>
            </button>
            <button
              className={activeLayer === "optical" ? "drawer-layer active" : "drawer-layer"}
              onClick={() => changeMarsLayer("optical")}
              disabled={layerLoading}
            >
              <span className="drawer-layer-index">02</span>
              <span><b>Optical Imagery</b><small>Viking global colour mosaic</small></span>
              <span className="drawer-check">{activeLayer === "optical" ? "●" : "○"}</span>
            </button>
            <button
              className={activeLayer === "elevation" ? "drawer-layer active" : "drawer-layer"}
              onClick={() => changeMarsLayer("elevation")}
              disabled={layerLoading}
            >
              <span className="drawer-layer-index">03</span>
              <span><b>Elevation / Relief</b><small>MOLA global colour hillshade</small></span>
              <span className="drawer-check">{activeLayer === "elevation" ? "●" : "○"}</span>
            </button>
            {layerLoading && <div className="drawer-status">LOADING DATASET…</div>}
            {layerNotice && <div className="drawer-notice">{layerNotice}</div>}
            <div className="drawer-footnote">Choose one view at a time: Cesium 3D base surface, Viking optical imagery, or MOLA elevation / relief.</div>
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
