import { describe, expect, it } from "vitest";
import type { TollRouteDiagnostic } from "@/lib/tollApi";
import {
  createTollIssueReportPayload,
  findTollIssueSelection,
  getTollIssueSelectionKey,
} from "@/lib/tollIssueReport";

const diagnostic: TollRouteDiagnostic = {
  total: 31,
  tollCount: 2,
  source: "space_truck_base",
  routeCorridorKm: 0.05,
  routePath: [
    { lat: -23.5, lon: -46.8 },
    { lat: -23.6, lon: -46.9 },
  ],
  routeSegments: [],
  reason: "internal diagnostic reason",
  nearMissItems: [
    {
      id: "hidden-near-miss",
      name: "Hidden near miss",
      value: 99,
      reason: "direction_mismatch",
      road: "BR-116",
      km: "100",
      city: "Teste",
      uf: "SP",
      concessionaire: "Interna",
      direction: "Crescente",
      lat: -23.7,
      lon: -46.7,
      distanceAlongRouteKm: 10,
      distanceFromRouteKm: 0.2,
      routeCorridorKm: 0.05,
      matchedRouteRoads: ["BR-116"],
      inferredRoadDirection: "decreasing",
    },
  ],
  items: [
    {
      order: 2,
      id: "duplicate-plaza",
      name: "Praça duplicada ida",
      value: 10.5,
      road: "SP-021",
      km: "14,290",
      city: "Barueri",
      uf: "SP",
      concessionaire: "ARTESP",
      direction: "Crescente",
      lat: -23.51,
      lon: -46.81,
      distanceAlongRouteKm: 76.13,
      distanceFromRouteKm: 0.01,
    },
    {
      order: 14,
      id: "duplicate-plaza",
      name: "Praça duplicada volta",
      value: 20.5,
      road: "SP-021",
      km: "14,290",
      city: "Barueri",
      uf: "SP",
      concessionaire: "ARTESP",
      direction: "Decrescente",
      lat: -23.52,
      lon: -46.82,
      distanceAlongRouteKm: 188.2,
      distanceFromRouteKm: 0.01,
    },
  ],
};

describe("toll issue report payload", () => {
  it("uses id and order to identify repeated toll occurrences", () => {
    const secondOccurrenceKey = getTollIssueSelectionKey(diagnostic.items[1]);

    expect(findTollIssueSelection(diagnostic.items, secondOccurrenceKey)).toMatchObject({
      id: "duplicate-plaza",
      order: 14,
      name: "Praça duplicada volta",
    });
  });

  it("builds a safe public report payload without internal diagnostics", () => {
    const payload = createTollIssueReportPayload({
      type: "duplicate_toll",
      selectedTollKey: getTollIssueSelectionKey(diagnostic.items[1]),
      message: "  apareceu duas vezes  ",
      diagnostic,
      createdAt: "2026-05-18T15:00:00.000Z",
    });

    expect(payload).toMatchObject({
      type: "duplicate_toll",
      selectedTollId: "duplicate-plaza",
      selectedTollOrder: 14,
      selectedTollName: "Praça duplicada volta",
      message: "apareceu duas vezes",
      createdAt: "2026-05-18T15:00:00.000Z",
      diagnosticSummary: {
        source: "space_truck_base",
        tollCount: 2,
        total: 31,
        routeCorridorKm: 0.05,
        chargedTolls: [
          {
            id: "duplicate-plaza",
            order: 2,
            name: "Praça duplicada ida",
            value: 10.5,
            road: "SP-021",
            km: "14,290",
            city: "Barueri",
            uf: "SP",
            concessionaire: "ARTESP",
          },
          {
            id: "duplicate-plaza",
            order: 14,
            name: "Praça duplicada volta",
            value: 20.5,
            road: "SP-021",
            km: "14,290",
            city: "Barueri",
            uf: "SP",
            concessionaire: "ARTESP",
          },
        ],
      },
    });

    expect(payload).not.toHaveProperty("diagnosticSnapshot");
    expect(payload.diagnosticSummary).not.toHaveProperty("nearMissItems");
    expect(payload.diagnosticSummary).not.toHaveProperty("routePath");
    expect(payload.diagnosticSummary).not.toHaveProperty("routeSegments");
  });
});
