import { useEffect, useRef, useState } from "react";
import type { TollRouteDiagnostic, TollRouteDiagnosticItem } from "@/lib/tollApi";
import type { Coordinates } from "@/lib/routeApi";

const TOMTOM_SDK_VERSION = "6.25.0";
const TOMTOM_SCRIPT_ID = "tomtom-maps-sdk";
const TOMTOM_CSS_ID = "tomtom-maps-sdk-css";
const TOMTOM_POPUP_STYLE_ID = "space-truck-tomtom-popup-style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type TomTomMarker = {
  setLngLat: (lngLat: [number, number]) => TomTomMarker;
  setPopup: (popup: unknown) => TomTomMarker;
  addTo: (map: TomTomMap) => TomTomMarker;
  remove: () => void;
};

type TomTomMap = {
  on: (event: string, callback: () => void) => void;
  addSource: (id: string, source: unknown) => void;
  addLayer: (layer: unknown) => void;
  fitBounds: (bounds: unknown, options?: unknown) => void;
  remove: () => void;
};

type TomTomSdk = {
  map: (options: unknown) => TomTomMap;
  Marker: new (options?: unknown) => TomTomMarker;
  Popup: new (options?: unknown) => { setHTML: (html: string) => unknown };
  LngLatBounds: new () => { extend: (lngLat: [number, number]) => void };
};

declare global {
  interface Window {
    tt?: TomTomSdk;
  }
}

function loadTomTomSdk(): Promise<TomTomSdk> {
  if (typeof window === "undefined") return Promise.reject(new Error("window unavailable"));
  if (window.tt) return Promise.resolve(window.tt);

  return new Promise((resolve, reject) => {
    if (!document.getElementById(TOMTOM_CSS_ID)) {
      const link = document.createElement("link");
      link.id = TOMTOM_CSS_ID;
      link.rel = "stylesheet";
      link.href = `https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/${TOMTOM_SDK_VERSION}/maps/maps.css`;
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(TOMTOM_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => window.tt ? resolve(window.tt) : reject(new Error("TomTom SDK unavailable")), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("TomTom SDK load failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = TOMTOM_SCRIPT_ID;
    script.src = `https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/${TOMTOM_SDK_VERSION}/maps/maps-web.min.js`;
    script.async = true;
    script.onload = () => window.tt ? resolve(window.tt) : reject(new Error("TomTom SDK unavailable"));
    script.onerror = () => reject(new Error("TomTom SDK load failed"));
    document.body.appendChild(script);
  });
}

function ensureTomTomPopupStyles(): void {
  if (typeof document === "undefined" || document.getElementById(TOMTOM_POPUP_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = TOMTOM_POPUP_STYLE_ID;
  style.textContent = `
    .space-truck-toll-popup .tt-popup-content {
      padding: 0;
      border-radius: 18px;
      background: #111827;
      color: #f9fafb;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
      border: 1px solid rgba(34, 197, 94, 0.35);
      overflow: hidden;
    }
    .space-truck-toll-popup .tt-popup-tip {
      border-top-color: #111827 !important;
      border-bottom-color: #111827 !important;
    }
    .space-truck-toll-popup .tt-popup-close-button {
      color: #d1d5db;
      font-size: 18px;
      padding: 8px 10px;
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char] || char));
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function createTollMarkerElement(item: TollRouteDiagnosticItem): HTMLElement {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.title = `${item.order}. ${item.name}`;
  marker.style.width = "38px";
  marker.style.height = "44px";
  marker.style.border = "0";
  marker.style.background = "transparent";
  marker.style.padding = "0";
  marker.style.cursor = "pointer";
  marker.style.filter = "drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35))";

  marker.innerHTML = `
    <span style="position:relative;display:flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(135deg,#facc15,#f97316);border:3px solid #111827;color:#111827;font-size:12px;font-weight:950;line-height:1;box-shadow:0 0 0 3px rgba(250,204,21,.28);">
      ${item.order}
      <span style="position:absolute;left:50%;bottom:-7px;width:14px;height:14px;background:#f97316;border-right:3px solid #111827;border-bottom:3px solid #111827;transform:translateX(-50%) rotate(45deg);border-bottom-right-radius:4px;"></span>
    </span>
  `;

  return marker;
}

function createEndpointMarkerElement(label: string, tone: "start" | "end"): HTMLElement {
  const marker = document.createElement("div");
  const color = tone === "start" ? "#22c55e" : "#ef4444";
  marker.style.width = "26px";
  marker.style.height = "26px";
  marker.style.borderRadius = "999px";
  marker.style.display = "flex";
  marker.style.alignItems = "center";
  marker.style.justifyContent = "center";
  marker.style.background = color;
  marker.style.color = "#ffffff";
  marker.style.fontSize = "10px";
  marker.style.fontWeight = "900";
  marker.style.border = "3px solid #111827";
  marker.style.boxShadow = "0 8px 18px rgba(0,0,0,.35)";
  marker.textContent = label;
  return marker;
}

function buildPopupHtml(item: TollRouteDiagnosticItem): string {
  const road = item.road || "Rodovia não informada";
  const location = [item.city, item.uf].filter(Boolean).join(" • ");

  return `
    <div style="min-width:230px;max-width:280px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="padding:12px 14px 10px;background:linear-gradient(135deg,rgba(34,197,94,.22),rgba(250,204,21,.16));border-bottom:1px solid rgba(255,255,255,.08);">
        <div style="font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#86efac;">#${item.order} • ${escapeHtml(item.uf)}</div>
        <div style="margin-top:4px;font-size:16px;font-weight:950;line-height:1.1;color:#fff;">${escapeHtml(item.name)}</div>
      </div>
      <div style="padding:12px 14px 14px;">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div style="color:#d1d5db;font-size:12px;line-height:1.45;">
            <div>${escapeHtml(road)}${item.km ? ` • KM ${escapeHtml(item.km)}` : ""}</div>
            <div>${escapeHtml(location || "Local não informado")}</div>
            <div>${escapeHtml(item.concessionaire || "Concessionária não informada")}</div>
          </div>
          <div style="white-space:nowrap;color:#4ade80;font-size:16px;font-weight:950;">${formatCurrency(item.value)}</div>
        </div>
        <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="border-radius:12px;background:rgba(255,255,255,.07);padding:8px;color:#e5e7eb;font-size:11px;">Após<br/><strong style="color:#fff;">${item.distanceAlongRouteKm} km</strong></div>
          <div style="border-radius:12px;background:rgba(255,255,255,.07);padding:8px;color:#e5e7eb;font-size:11px;">Da rota<br/><strong style="color:#fff;">${item.distanceFromRouteKm} km</strong></div>
        </div>
      </div>
    </div>
  `;
}

function addEndpointMarkers(tt: TomTomSdk, map: TomTomMap, routePath: Coordinates[], markers: TomTomMarker[]): void {
  const first = routePath[0];
  const last = routePath[routePath.length - 1];
  if (!first || !last) return;

  markers.push(new tt.Marker({ element: createEndpointMarkerElement("I", "start") }).setLngLat([first.lon, first.lat]).addTo(map));
  markers.push(new tt.Marker({ element: createEndpointMarkerElement("F", "end") }).setLngLat([last.lon, last.lat]).addTo(map));
}

export function TomTomTollDiagnosticMap({ diagnostic }: { diagnostic: TollRouteDiagnostic }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<TomTomMap | null>(null);
  const markersRef = useRef<TomTomMarker[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_TOMTOM_API_KEY as string | undefined;
    const container = mapContainerRef.current;

    if (!container || diagnostic.routePath.length < 2) return;

    if (!apiKey) {
      setStatus("Para exibir o mapa real da TomTom, configure VITE_TOMTOM_API_KEY na Vercel.");
      return;
    }

    let disposed = false;

    loadTomTomSdk()
      .then((tt) => {
        if (disposed || !mapContainerRef.current) return;

        ensureTomTomPopupStyles();
        setStatus(null);
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        mapRef.current?.remove();

        const first = diagnostic.routePath[0];
        const map = tt.map({
          key: apiKey,
          container: mapContainerRef.current,
          center: [first.lon, first.lat],
          zoom: 8,
          language: "pt-BR",
        });
        mapRef.current = map;

        map.on("load", () => {
          const coordinates = diagnostic.routePath.map((point) => [point.lon, point.lat]);
          map.addSource("space-truck-route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates,
              },
            },
          });
          map.addLayer({
            id: "space-truck-route-casing",
            type: "line",
            source: "space-truck-route",
            paint: {
              "line-color": "#0f172a",
              "line-width": 9,
              "line-opacity": 0.88,
            },
          });
          map.addLayer({
            id: "space-truck-route-line",
            type: "line",
            source: "space-truck-route",
            paint: {
              "line-color": "#22c55e",
              "line-width": 5,
              "line-opacity": 0.95,
            },
          });

          const bounds = new tt.LngLatBounds();
          diagnostic.routePath.forEach((point) => bounds.extend([point.lon, point.lat]));

          addEndpointMarkers(tt, map, diagnostic.routePath, markersRef.current);

          diagnostic.items.forEach((item) => {
            bounds.extend([item.lon, item.lat]);
            const popup = new tt.Popup({ offset: 28, className: "space-truck-toll-popup", closeButton: true }).setHTML(buildPopupHtml(item));
            const marker = new tt.Marker({ element: createTollMarkerElement(item), anchor: "bottom" })
              .setLngLat([item.lon, item.lat])
              .setPopup(popup)
              .addTo(map);
            markersRef.current.push(marker);
          });

          map.fitBounds(bounds, { padding: 54, maxZoom: 13 });
        });
      })
      .catch(() => {
        if (!disposed) setStatus("Não foi possível carregar o mapa da TomTom agora.");
      });

    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [diagnostic]);

  if (diagnostic.routePath.length < 2) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-[1.75rem] border border-primary/20 bg-gradient-to-b from-card to-muted/20 shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Mapa TomTom</p>
          <p className="text-xs text-muted-foreground">Rota real, início/fim e pins das cobranças</p>
        </div>
        <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
          {diagnostic.items.length} pontos
        </div>
      </div>
      {status && <div className="mx-4 mb-3 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">{status}</div>}
      <div ref={mapContainerRef} className="h-80 w-full bg-background" />
    </div>
  );
}
