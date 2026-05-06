import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const summaryPath = resolve(process.cwd(), "coverage/coverage-summary.json");
const metricKeys = ["statements", "branches", "functions", "lines"];

if (!existsSync(summaryPath)) {
  console.error(`Coverage summary not found at ${summaryPath}.`);
  console.error("Run npm run test:coverage before printing the coverage summary.");
  process.exit(1);
}

let coverageSummary;

try {
  coverageSummary = JSON.parse(readFileSync(summaryPath, "utf8"));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Invalid coverage summary at ${summaryPath}.`);
  console.error(`Failed to parse coverage-summary.json: ${message}`);
  process.exit(1);
}

const total = coverageSummary?.total;

if (!total || typeof total !== "object") {
  console.error("coverage-summary.json does not contain a valid total coverage block.");
  process.exit(1);
}

function getCoveragePct(key) {
  const value = total[key]?.pct;

  if (!Number.isFinite(value)) {
    console.error(`coverage-summary.json contains an invalid ${key}.pct coverage value.`);
    process.exit(1);
  }

  return value;
}

const rows = metricKeys.map((key) => [
  key[0].toUpperCase() + key.slice(1),
  getCoveragePct(key),
]);

const formatPct = (value) => `${value.toFixed(2)}%`;

console.log("──────────────────────────────");
console.log("Coverage summary");
console.log("──────────────────────────────");
for (const [label, value] of rows) {
  console.log(`${label}: ${formatPct(value)}`);
}
console.log("──────────────────────────────");

const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;

if (stepSummaryPath) {
  const markdown = [
    "## Coverage summary",
    "",
    "| Metric | Coverage |",
    "| --- | ---: |",
    ...rows.map(([label, value]) => `| ${label} | ${formatPct(value)} |`),
    "",
    "Generated from `coverage/coverage-summary.json` after `npm run test:coverage`.",
    "",
  ].join("\n");

  appendFileSync(stepSummaryPath, markdown, "utf8");
}
