import { useEffect, useRef, useState } from "react";
import type { TollRouteDiagnostic } from "@/lib/tollApi";

const TOMTOM_SDK_VERSION = "6.25.0";
const TOMTOM_SCRIPT_ID = "tomtom-maps-sdk";
const TOMTOM_CSS_ID = "tomtom-maps-sdk-css";

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

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char] || char));
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
            id: "space-truck-route-line",
            type: "line",
            source: "space-truck-route",
            paint: {
              "line-color": "#22c55e",
              "line-width": 5,
              "line-opacity": 0.9,
            },
          });

          const bounds = new tt.LngLatBounds();
          diagnostic.routePath.forEach((point) => bounds.extend([point.lon, point.lat]));

          diagnostic.items.forEach((item) => {
            bounds.extend([item.lon, item.lat]);
            const markerElement = document.createElement("div");
            markerElement.className = "flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-warning text-[11px] font-black text-background shadow-lg";
            markerElement.textContent = String(item.order);

            const popup = new tt.Popup({ offset: 24 }).setHTML(
              `<strong>${escapeHtml(item.name)}</strong><br/>${escapeHtml(item.road || "Rodovia não informada")}${item.km ? ` • KM ${escapeHtml(item.km)}` : ""}<br/>R$ ${item.value.toFixed(2).replace(".", ",")} • ${item.distanceFromRouteKm} km da rota`,
            );

            const marker = new tt.Marker({ element: markerElement })
              .setLngLat([item.lon, item.lat])
              .setPopup(popup)
              .addTo(map);
            markersRef.current.push(marker);
          });

          map.fitBounds(bounds, { padding: 42, maxZoom: 13 });
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
    <div className="mb-4 overflow-hidden rounded-3xl border border-border bg-muted/20">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Mapa TomTom</p>
          <p className="text-xs text-muted-foreground">Rota real e pins dos pedágios encontrados</p>
        </div>
        <p className="text-[11px] text-muted-foreground">{diagnostic.items.length} pontos</p>
      </div>
      {status && <div className="mx-4 mb-3 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">{status}</div>}
      <div ref={mapContainerRef} className="h-72 w-full bg-background" />
    </div>
  );
}
