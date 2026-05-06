import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const summaryPath = resolve(process.cwd(), "coverage/coverage-summary.json");

if (!existsSync(summaryPath)) {
  console.error(`Coverage summary not found at ${summaryPath}.`);
  console.error("Run npm run test:coverage before printing the coverage summary.");
  process.exit(1);
}

const coverageSummary = JSON.parse(readFileSync(summaryPath, "utf8"));
const total = coverageSummary.total;

if (!total) {
  console.error("coverage-summary.json does not contain a total coverage block.");
  process.exit(1);
}

const rows = [
  ["Statements", total.statements?.pct],
  ["Branches", total.branches?.pct],
  ["Functions", total.functions?.pct],
  ["Lines", total.lines?.pct],
];

const formatPct = (value) => (typeof value === "number" ? `${value.toFixed(2)}%` : "n/a");

console.log("Coverage summary");
for (const [label, value] of rows) {
  console.log(`${label}: ${formatPct(value)}`);
}

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
