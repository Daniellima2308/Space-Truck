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
    .space-truck-toll-popup .tt-popup-content,
    .space-truck-toll-popup .mapboxgl-popup-content {
      padding: 0 !important;
      border-radius: 20px !important;
      background: #0b1220 !important;
      color: #f8fafc !important;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.52) !important;
      border: 1px solid rgba(34, 197, 94, 0.48) !important;
      overflow: hidden !important;
    }
    .space-truck-toll-popup .tt-popup-tip,
    .space-truck-toll-popup .mapboxgl-popup-tip {
      border-top-color: #0b1220 !important;
      border-bottom-color: #0b1220 !important;
    }
    .space-truck-toll-popup .tt-popup-close-button,
    .space-truck-toll-popup .mapboxgl-popup-close-button {
      color: #ffffff !important;
      font-size: 18px !important;
      padding: 8px 10px !important;
      opacity: 0.95 !important;
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
  marker.style.width = "46px";
  marker.style.height = "54px";
  marker.style.border = "0";
  marker.style.background = "transparent";
  marker.style.padding = "0";
  marker.style.cursor = "pointer";
  marker.style.filter = "drop-shadow(0 14px 20px rgba(0, 0, 0, 0.48))";

  marker.innerHTML = `
    <span style="position:relative;display:block;width:42px;height:50px;">
      <span style="position:absolute;left:50%;top:0;display:flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:16px;background:linear-gradient(135deg,#22c55e 0%,#16a34a 52%,#facc15 100%);border:3px solid #07111f;color:#ffffff;font-size:13px;font-weight:950;line-height:1;transform:translateX(-50%);box-shadow:0 0 0 4px rgba(34,197,94,.24), inset 0 1px 0 rgba(255,255,255,.28);">
        ${item.order}
      </span>
      <span style="position:absolute;left:50%;bottom:6px;width:16px;height:16px;background:#16a34a;border-right:3px solid #07111f;border-bottom:3px solid #07111f;transform:translateX(-50%) rotate(45deg);border-bottom-right-radius:5px;"></span>
      <span style="position:absolute;left:50%;top:5px;width:8px;height:8px;border-radius:999px;background:rgba(255,255,255,.9);transform:translateX(7px);"></span>
    </span>
  `;

  return marker;
}

function createEndpointMarkerElement(label: string, tone: "start" | "end"): HTMLElement {
  const marker = document.createElement("div");
  const isStart = tone === "start";
  const color = isStart ? "#22c55e" : "#ef4444";
  marker.style.width = "32px";
  marker.style.height = "32px";
  marker.style.borderRadius = "14px";
  marker.style.display = "flex";
  marker.style.alignItems = "center";
  marker.style.justifyContent = "center";
  marker.style.background = `linear-gradient(135deg, ${color}, ${isStart ? "#15803d" : "#b91c1c"})`;
  marker.style.color = "#ffffff";
  marker.style.fontSize = "11px";
  marker.style.fontWeight = "950";
  marker.style.border = "3px solid #07111f";
  marker.style.boxShadow = "0 10px 20px rgba(0,0,0,.42), 0 0 0 4px rgba(255,255,255,.16)";
  marker.textContent = label;
  return marker;
}

function buildPopupHtml(item: TollRouteDiagnosticItem): string {
  const road = item.road || "Rodovia não informada";
  const location = [item.city, item.uf].filter(Boolean).join(" • ");

  return `
    <div style="min-width:245px;max-width:285px;background:#0b1220;color:#f8fafc;border-radius:20px;overflow:hidden;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="padding:13px 15px 11px;background:linear-gradient(135deg,#0f2b1c 0%,#12351f 58%,#3a3f10 100%);border-bottom:1px solid rgba(255,255,255,.1);">
        <div style="font-size:10px;font-weight:950;letter-spacing:.18em;text-transform:uppercase;color:#4ade80;">#${item.order} • ${escapeHtml(item.uf)}</div>
        <div style="margin-top:5px;font-size:17px;font-weight:950;line-height:1.12;color:#ffffff;text-shadow:0 1px 2px rgba(0,0,0,.45);">${escapeHtml(item.name)}</div>
      </div>
      <div style="padding:13px 15px 15px;background:#0b1220;">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div style="color:#cbd5e1;font-size:12px;line-height:1.5;font-weight:650;">
            <div style="color:#f1f5f9;">${escapeHtml(road)}${item.km ? ` • KM ${escapeHtml(item.km)}` : ""}</div>
            <div>${escapeHtml(location || "Local não informado")}</div>
            <div>${escapeHtml(item.concessionaire || "Concessionária não informada")}</div>
          </div>
          <div style="white-space:nowrap;color:#4ade80;font-size:17px;font-weight:950;text-shadow:0 0 18px rgba(74,222,128,.25);">${formatCurrency(item.value)}</div>
        </div>
        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="border-radius:14px;background:rgba(255,255,255,.08);padding:9px;color:#94a3b8;font-size:11px;font-weight:700;">Após<br/><strong style="display:block;margin-top:2px;color:#ffffff;font-size:12px;">${item.distanceAlongRouteKm} km</strong></div>
          <div style="border-radius:14px;background:rgba(34,197,94,.14);padding:9px;color:#86efac;font-size:11px;font-weight:800;">Da rota<br/><strong style="display:block;margin-top:2px;color:#ffffff;font-size:12px;">${Math.round(item.distanceFromRouteKm * 1000)} m</strong></div>
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
