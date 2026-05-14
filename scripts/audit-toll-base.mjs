import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const DEFAULT_TOLL_BASE_PATH = path.join(repoRoot, "data/tolls/app_ready_toll_points_active.json");

const args = new Set(process.argv.slice(2));
const strictMode = args.has("--strict");
const jsonMode = args.has("--json");
const tollBasePathArg = process.argv.find((arg) => arg.startsWith("--file="));
const tollBasePath = tollBasePathArg
  ? path.resolve(repoRoot, tollBasePathArg.replace("--file=", ""))
  : DEFAULT_TOLL_BASE_PATH;

const DIRECTION_ALIASES = [
  { value: "both", patterns: [/crescent.*decrescent/i, /decrescent.*crescent/i, /ambos/i, /duplo/i, /bidirecional/i] },
  { value: "increasing", patterns: [/crescente/i, /norte/i, /leste/i, /capital/i, /interior/i] },
  { value: "decreasing", patterns: [/decrescente/i, /sul/i, /oeste/i, /retorno/i] },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRoad(value) {
  const text = normalizeText(value).toUpperCase();
  const match = text.match(/\b([A-Z]{2})[-\s]?(\d{2,3})\b/);
  return match ? `${match[1]}-${match[2]}` : text || null;
}

function parseKm(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDirection(value) {
  const text = normalizeText(value);
  if (!text) return "missing";

  for (const alias of DIRECTION_ALIASES) {
    if (alias.patterns.some((pattern) => pattern.test(text))) return alias.value;
  }

  return "unknown";
}

function coordinateKey(point, decimals = 5) {
  const lat = parseNumber(point.latitude);
  const lon = parseNumber(point.longitude);
  if (lat === null || lon === null) return "missing";
  return `${lat.toFixed(decimals)},${lon.toFixed(decimals)}`;
}

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
    return groups;
  }, new Map());
}

function getId(point) {
  return point.toll_point_id || point.nome || "sem_id";
}

function getPhysicalKey(point) {
  return [
    normalizeText(point.concessionaria),
    normalizeRoad(point.rodovia) || "sem_rodovia",
    parseKm(point.km) ?? "sem_km",
    normalizeText(point.municipio) || "sem_municipio",
    normalizeText(point.nome) || "sem_nome",
  ].join("|");
}

function getRoadKmKey(point) {
  return [
    normalizeRoad(point.rodovia) || "sem_rodovia",
    parseKm(point.km) ?? "sem_km",
  ].join("|");
}

function buildFinding(severity, code, message, points) {
  return {
    severity,
    code,
    message,
    count: points.length,
    sample: points.slice(0, 12).map((point) => ({
      id: getId(point),
      name: point.nome ?? "",
      road: point.rodovia ?? "",
      km: point.km ?? "",
      city: point.municipio ?? "",
      direction: point.sentido ?? "",
      lat: point.latitude ?? null,
      lon: point.longitude ?? null,
      geoConfidence: point.confianca_geo ?? "",
      valueConfidence: point.confianca_valor ?? "",
    })),
  };
}

function audit(points) {
  const activeCalculationPoints = points.filter((point) => point.calcular_pedagio === true && point.status_operacional === "ativo");
  const findings = [];

  const invalidCoordinates = activeCalculationPoints.filter((point) => {
    const lat = parseNumber(point.latitude);
    const lon = parseNumber(point.longitude);
    return lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180;
  });
  if (invalidCoordinates.length) {
    findings.push(buildFinding("critical", "invalid_coordinates", "Pontos ativos para cálculo com coordenadas inválidas ou ausentes.", invalidCoordinates));
  }

  const missingRoad = activeCalculationPoints.filter((point) => !normalizeRoad(point.rodovia));
  if (missingRoad.length) {
    findings.push(buildFinding("critical", "missing_road", "Pontos ativos para cálculo sem rodovia normalizável.", missingRoad));
  }

  const missingKm = activeCalculationPoints.filter((point) => parseKm(point.km) === null);
  if (missingKm.length) {
    findings.push(buildFinding("warning", "missing_km", "Pontos ativos para cálculo sem KM numérico.", missingKm));
  }

  const missingDirection = activeCalculationPoints.filter((point) => normalizeDirection(point.sentido) === "missing");
  if (missingDirection.length) {
    findings.push(buildFinding("critical", "missing_direction", "Pontos ativos para cálculo sem sentido informado.", missingDirection));
  }

  const unknownDirection = activeCalculationPoints.filter((point) => normalizeDirection(point.sentido) === "unknown");
  if (unknownDirection.length) {
    findings.push(buildFinding("warning", "unknown_direction", "Pontos ativos para cálculo com sentido não normalizado automaticamente.", unknownDirection));
  }

  const oneWayPoints = activeCalculationPoints.filter((point) => ["increasing", "decreasing"].includes(normalizeDirection(point.sentido)));
  if (oneWayPoints.length) {
    findings.push(buildFinding("info", "one_way_points", "Pontos com cobrança em apenas um sentido. Precisam de validação contra o sentido real da rota antes de somar automaticamente.", oneWayPoints));
  }

  const lowGeoConfidence = activeCalculationPoints.filter((point) => normalizeText(point.confianca_geo) && normalizeText(point.confianca_geo) !== "alta");
  if (lowGeoConfidence.length) {
    findings.push(buildFinding("warning", "non_high_geo_confidence", "Pontos ativos para cálculo com confiança geográfica diferente de alta.", lowGeoConfidence));
  }

  const byCoordinate = groupBy(activeCalculationPoints, (point) => coordinateKey(point));
  const duplicateCoordinates = [...byCoordinate.entries()]
    .filter(([key, group]) => key !== "missing" && group.length > 1)
    .flatMap(([, group]) => group);
  if (duplicateCoordinates.length) {
    findings.push(buildFinding("info", "duplicate_coordinates", "Mais de um registro ativo compartilha a mesma coordenada aproximada. Pode ser praça bidirecional correta ou duplicidade que precisa de grupo físico.", duplicateCoordinates));
  }

  const byPhysicalKey = groupBy(activeCalculationPoints, getPhysicalKey);
  const samePhysicalDifferentCoords = [...byPhysicalKey.values()]
    .filter((group) => new Set(group.map((point) => coordinateKey(point))).size > 1)
    .flatMap((group) => group);
  if (samePhysicalDifferentCoords.length) {
    findings.push(buildFinding("warning", "same_physical_key_different_coordinates", "Registros com mesma identidade física aparente, mas coordenadas diferentes. Precisam de physical_group_id e coordinate_role.", samePhysicalDifferentCoords));
  }

  const byRoadKm = groupBy(activeCalculationPoints, getRoadKmKey);
  const sameRoadKmDifferentNames = [...byRoadKm.values()]
    .filter((group) => group.length > 1 && new Set(group.map((point) => normalizeText(point.nome))).size > 1)
    .flatMap((group) => group);
  if (sameRoadKmDifferentNames.length) {
    findings.push(buildFinding("warning", "same_road_km_different_names", "Mesmo par rodovia/KM aparece com nomes diferentes. Pode indicar duplicidade, sentido separado ou fonte divergente.", sameRoadKmDifferentNames));
  }

  const directionSummary = activeCalculationPoints.reduce((summary, point) => {
    const direction = normalizeDirection(point.sentido);
    summary[direction] = (summary[direction] ?? 0) + 1;
    return summary;
  }, {});

  return {
    file: path.relative(repoRoot, tollBasePath),
    generatedAt: new Date().toISOString(),
    strictMode,
    summary: {
      totalRecords: points.length,
      activeCalculationPoints: activeCalculationPoints.length,
      directionSummary,
      criticalFindings: findings.filter((finding) => finding.severity === "critical").length,
      warningFindings: findings.filter((finding) => finding.severity === "warning").length,
      infoFindings: findings.filter((finding) => finding.severity === "info").length,
    },
    findings,
  };
}

function printHumanReport(report) {
  console.log("\n🚛 Space Truck - Auditoria da base de pedágios");
  console.log(`Arquivo: ${report.file}`);
  console.log(`Registros totais: ${report.summary.totalRecords}`);
  console.log(`Ativos para cálculo: ${report.summary.activeCalculationPoints}`);
  console.log(`Sentidos: ${JSON.stringify(report.summary.directionSummary)}`);
  console.log(`Achados: ${report.summary.criticalFindings} críticos, ${report.summary.warningFindings} avisos, ${report.summary.infoFindings} infos\n`);

  for (const finding of report.findings) {
    const icon = finding.severity === "critical" ? "🚨" : finding.severity === "warning" ? "⚠️" : "ℹ️";
    console.log(`${icon} ${finding.code} (${finding.count})`);
    console.log(`   ${finding.message}`);
    for (const sample of finding.sample.slice(0, 5)) {
      console.log(`   - ${sample.id} | ${sample.road} km ${sample.km} | ${sample.direction} | ${sample.lat}, ${sample.lon}`);
    }
    if (finding.count > 5) console.log(`   ... mais ${finding.count - 5} registros`);
    console.log("");
  }
}

const points = readJson(tollBasePath);
const report = audit(points);

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHumanReport(report);
}

if (strictMode && report.summary.criticalFindings > 0) {
  process.exitCode = 1;
}
