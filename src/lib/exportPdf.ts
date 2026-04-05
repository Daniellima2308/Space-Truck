import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Trip, Vehicle, EXPENSE_CATEGORY_LABELS, ExpenseCategory } from "@/types";
import {
  getTripGrossRevenue, getTripNetRevenue, getTripTotalExpenses,
  getTripTotalCommissions, getTripAverageConsumption, getTripCostPerKm,
  getTripProfitPerKm, getTripTotalKm, formatCurrency, formatNumber, formatDate,
  getLastDestination,
} from "@/lib/calculations";

// ─── Brand constants — update here for future rebranding ─────────────────────
const PDF_BRAND_NAME = "Space Truck";
const PDF_BRAND_SUBTITLE = "Gestão de Operações e Fretes";
const PDF_FILE_PREFIX = "space-truck";

// ─── Branding asset paths (from public/) ─────────────────────────────────────
const ASSET_SYMBOL   = "/branding/space-truck/simbolo/space-truck-simbolo-isolado-branco.png";
const ASSET_WORDMARK = "/branding/space-truck/wordmark/space-truck-wordmark-horizontal-branco.png";

// Native pixel dimensions — used to preserve aspect ratio in the PDF
const SYMBOL_W_PX   = 765;
const SYMBOL_H_PX   = 579;
const WORDMARK_W_PX = 857;
const WORDMARK_H_PX = 72;

interface PdfAssets {
  symbol:   string; // base64 data URL or empty string
  wordmark: string;
}

async function fetchAsBase64(path: string): Promise<string> {
  try {
    const res = await fetch(path);
    if (!res.ok) return "";
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

async function loadPdfAssets(): Promise<PdfAssets> {
  const [symbol, wordmark] = await Promise.all([
    fetchAsBase64(ASSET_SYMBOL),
    fetchAsBase64(ASSET_WORDMARK),
  ]);
  return { symbol, wordmark };
}

// ─── Design tokens ────────────────────────────────────────────────────────────
// Primary brand green: HSL(142, 71%, 38%) ≈ RGB(28, 165, 79)
const C = {
  brand:      [28,  166,  79] as [number, number, number],
  dark:       [20,   24,  35] as [number, number, number],
  darkText:   [30,   34,  45] as [number, number, number],
  muted:      [100, 105, 115] as [number, number, number],
  light:      [155, 160, 170] as [number, number, number],
  white:      [255, 255, 255] as [number, number, number],
  tblHead:    [35,   39,  52] as [number, number, number],
  tblHeadTxt: [210, 215, 220] as [number, number, number],
  stripe:     [246, 248, 250] as [number, number, number],
  positive:   [22,  140,  65] as [number, number, number],
  negative:   [190,  45,  40] as [number, number, number],
  border:     [210, 215, 220] as [number, number, number],
  accentBg:   [240, 250, 244] as [number, number, number],
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const HEADER_H = 44;        // Height of dark header block (mm)
const CONTENT_Y = 60;       // Y where body content starts after header + separator
const MARGIN = 14;          // Page left/right margin
const PAGE_W = 210;         // A4 width (mm)
const CONTENT_W = PAGE_W - MARGIN * 2; // 182 mm usable width
const PAGE_H = 297;         // A4 height (mm)
const FOOTER_Y = PAGE_H - 10; // Y position of footer text
const NEW_PAGE_THRESHOLD = 230; // Add new page if y exceeds this before a new section

// ─── Internal helpers ─────────────────────────────────────────────────────────
type JsPdfWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

function getTableY(doc: jsPDF, fallback: number): number {
  return (doc as JsPdfWithTable).lastAutoTable?.finalY ?? fallback;
}

function getVehicleLabel(vehicles: Vehicle[], vehicleId: string): string {
  const v = vehicles.find((v) => v.id === vehicleId);
  return v ? `${v.brand} ${v.model} — ${v.plate}` : "Veículo desconhecido";
}

function formatTs(d: Date): string {
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

// ─── Page header ──────────────────────────────────────────────────────────────
function addPageHeader(doc: jsPDF, title: string, contextLine: string, assets?: PdfAssets): void {
  const w = doc.internal.pageSize.getWidth();

  // Dark background block
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, w, HEADER_H, "F");

  // Brand-green accent strip at top
  doc.setFillColor(...C.brand);
  doc.rect(0, 0, w, 3.5, "F");

  const hasImages = !!(assets?.wordmark);

  if (hasImages) {
    // ── Logo-based branding ────────────────────────────────────────────────
    // Symbol: 765×579 px at height 13mm
    const symH = 13;
    const symW = symH * (SYMBOL_W_PX / SYMBOL_H_PX); // ≈ 17.2 mm

    // Wordmark: 857×72 px at height 6mm
    const wmH  = 6;
    const wmW  = wmH * (WORDMARK_W_PX / WORDMARK_H_PX); // ≈ 71.4 mm

    // Vertical start — symbol center aligns with wordmark center
    const symY = 8;                        // symbol top
    const wmY  = symY + (symH - wmH) / 2; // center wordmark within symbol height

    if (assets!.symbol) {
      doc.addImage(assets!.symbol, "PNG", MARGIN, symY, symW, symH);
    }
    doc.addImage(assets!.wordmark, "PNG", MARGIN + symW + 2.5, wmY, wmW, wmH);

    // Subtitle — left-aligned below wordmark
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.light);
    doc.text(PDF_BRAND_SUBTITLE.toUpperCase(), MARGIN + symW + 2.5, symY + symH + 3);
  } else {
    // ── Text-only fallback ─────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...C.white);
    doc.text(PDF_BRAND_NAME, MARGIN, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.light);
    doc.text(PDF_BRAND_SUBTITLE.toUpperCase(), MARGIN, 24.5);
  }

  // Report title (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...C.white);
  doc.text(title, MARGIN, 37);

  // Generation timestamp (right)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.light);
  doc.text(`Gerado em ${formatTs(new Date())}`, w - MARGIN, 37, { align: "right" });

  // Context line below header block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(contextLine, MARGIN, 52);

  // Thin separator
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 56, w - MARGIN, 56);
}

// ─── Section title with brand accent bar ──────────────────────────────────────
function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...C.brand);
  doc.rect(MARGIN, y - 4, 3, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.darkText);
  doc.text(title, MARGIN + 5, y);

  return y + 5; // returns startY for the following table
}

// ─── Footer stamped on all pages ─────────────────────────────────────────────
function addFooters(doc: jsPDF, generatedAt: Date): void {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const ts = `Exportado em ${formatTs(generatedAt)}`;

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, FOOTER_Y - 4, w - MARGIN, FOOTER_Y - 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.light);

    doc.text(PDF_BRAND_NAME, MARGIN, FOOTER_Y);
    doc.text(ts, w / 2, FOOTER_Y, { align: "center" });
    doc.text(`Página ${i} de ${total}`, w - MARGIN, FOOTER_Y, { align: "right" });
  }
}

// ─── Shared autoTable style presets ──────────────────────────────────────────
const tblStyles = { fontSize: 8, cellPadding: 3, textColor: C.darkText as [number, number, number] };
const tblHead   = { fillColor: C.tblHead as [number, number, number], textColor: C.tblHeadTxt as [number, number, number], fontStyle: "bold" as const, fontSize: 8 };
const tblAlt    = { fillColor: C.stripe as [number, number, number] };
const tblMargin = { left: MARGIN, right: MARGIN };

// ─── Trip identification info block ──────────────────────────────────────────
function addTripInfoBlock(doc: jsPDF, trip: Trip, vehicles: Vehicle[], y: number): number {
  const vehicle  = getVehicleLabel(vehicles, trip.vehicleId);
  const status   = trip.status === "open" ? "Em Aberto" : "Finalizada";
  const lastDest = getLastDestination(trip);
  const boxH     = lastDest !== "—" ? 28 : 23;

  // Background
  doc.setFillColor(...C.accentBg);
  doc.rect(MARGIN, y, CONTENT_W, boxH, "F");

  // Border
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, CONTENT_W, boxH, "S");

  // Left accent bar
  doc.setFillColor(...C.brand);
  doc.rect(MARGIN, y, 3, boxH, "F");

  // Vehicle name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.darkText);
  doc.text(vehicle, MARGIN + 7, y + 9);

  // Status & dates
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.muted);
  const datePart = trip.finishedAt
    ? `  •  Criada: ${formatDate(trip.createdAt)}  •  Finalizada: ${formatDate(trip.finishedAt)}`
    : `  •  Criada em: ${formatDate(trip.createdAt)}`;
  doc.text(`Status: ${status}${datePart}`, MARGIN + 7, y + 16);

  // Last destination
  if (lastDest !== "—") {
    doc.text(`Último destino: ${lastDest}`, MARGIN + 7, y + 23);
  }

  return y + boxH + 6;
}

// ─── Financial + operational metrics grid ─────────────────────────────────────
function addMetricsGrid(doc: jsPDF, trip: Trip, y: number): number {
  const gross = getTripGrossRevenue(trip);
  const net   = getTripNetRevenue(trip);
  const exp   = getTripTotalExpenses(trip);
  const com   = getTripTotalCommissions(trip);
  const km    = getTripTotalKm(trip);
  const avg   = getTripAverageConsumption(trip);
  const cKm   = getTripCostPerKm(trip);
  const pKm   = getTripProfitPerKm(trip);

  // Financial metrics — 4 columns with brand-green header
  autoTable(doc, {
    startY: y,
    head: [["Faturamento Bruto", "Valor Líquido", "Despesas Totais", "Comissões"]],
    body: [[formatCurrency(gross), formatCurrency(net), formatCurrency(exp), formatCurrency(com)]],
    theme: "grid",
    styles: { ...tblStyles, halign: "center", fontStyle: "bold", fontSize: 9 },
    headStyles: { fillColor: C.brand as [number, number, number], textColor: C.white as [number, number, number], fontStyle: "bold", fontSize: 8, halign: "center" },
    columnStyles: {
      0: { textColor: C.darkText as [number, number, number] },
      1: { textColor: (net >= 0 ? C.positive : C.negative) as [number, number, number] },
      2: { textColor: C.negative as [number, number, number] },
      3: { textColor: C.darkText as [number, number, number] },
    },
    margin: tblMargin,
  });

  y = getTableY(doc, y) + 3;

  // Operational metrics — 4 columns with dark header
  autoTable(doc, {
    startY: y,
    head: [["KM Rodado", "Média KM/L", "Custo/KM", "Lucro/KM"]],
    body: [[
      `${formatNumber(km)} km`,
      `${formatNumber(avg)} KM/L`,
      `R$ ${formatNumber(cKm)}`,
      `R$ ${formatNumber(pKm)}`,
    ]],
    theme: "grid",
    styles: { ...tblStyles, halign: "center", fontStyle: "bold" },
    headStyles: { ...tblHead, halign: "center" },
    margin: tblMargin,
  });

  return getTableY(doc, y) + 7;
}

// ─── Full trip sections (metrics + detail tables) ─────────────────────────────
function addTripContent(doc: jsPDF, trip: Trip, vehicles: Vehicle[], startY: number): number {
  let y = startY;

  y = addTripInfoBlock(doc, trip, vehicles, y);
  y = addMetricsGrid(doc, trip, y);

  // Freights
  if (trip.freights.length > 0) {
    if (y > NEW_PAGE_THRESHOLD) { doc.addPage(); y = CONTENT_Y; }
    y = addSectionTitle(doc, "Fretes", y);
    autoTable(doc, {
      startY: y,
      head: [["Origem", "Destino", "KM Inicial", "Bruto", "Comissão %", "Comissão R$"]],
      body: trip.freights.map(f => [
        f.origin, f.destination, formatNumber(f.kmInitial),
        formatCurrency(f.grossValue), `${f.commissionPercent}%`, formatCurrency(f.commissionValue),
      ]),
      theme: "striped",
      styles: tblStyles,
      headStyles: tblHead,
      alternateRowStyles: tblAlt,
      margin: tblMargin,
    });
    y = getTableY(doc, y) + 7;
  }

  // Fuelings
  if (trip.fuelings.length > 0) {
    if (y > NEW_PAGE_THRESHOLD) { doc.addPage(); y = CONTENT_Y; }
    y = addSectionTitle(doc, "Abastecimentos", y);
    autoTable(doc, {
      startY: y,
      head: [["Posto", "Data", "Litros", "R$/L", "Total", "KM Atual", "Média KM/L"]],
      body: trip.fuelings.map(f => [
        f.stationName, formatDate(f.date), formatNumber(f.liters),
        `R$ ${formatNumber(f.pricePerLiter)}`, formatCurrency(f.totalValue),
        formatNumber(f.kmCurrent), formatNumber(f.average),
      ]),
      theme: "striped",
      styles: tblStyles,
      headStyles: tblHead,
      alternateRowStyles: tblAlt,
      margin: tblMargin,
    });
    y = getTableY(doc, y) + 7;
  }

  // Expenses
  if (trip.expenses.length > 0) {
    if (y > NEW_PAGE_THRESHOLD) { doc.addPage(); y = CONTENT_Y; }
    y = addSectionTitle(doc, "Despesas", y);
    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Descrição", "Data", "Valor"]],
      body: trip.expenses.map(e => [
        EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] || e.category,
        e.description, formatDate(e.date), formatCurrency(e.value),
      ]),
      theme: "striped",
      styles: tblStyles,
      headStyles: tblHead,
      alternateRowStyles: tblAlt,
      margin: tblMargin,
    });
    y = getTableY(doc, y) + 7;
  }

  return y;
}

// ─── Public exports ───────────────────────────────────────────────────────────

export async function exportSingleTripPdf(trip: Trip, vehicles: Vehicle[]) {
  const doc = new jsPDF();
  const vehicleObj = vehicles.find((v) => v.id === trip.vehicleId);
  const vehicle    = getVehicleLabel(vehicles, trip.vehicleId);
  const status     = trip.status === "open" ? "Em Aberto" : "Finalizada";
  const platePart  = vehicleObj ? `-${vehicleObj.plate.toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
  const generatedAt = new Date();
  const assets = await loadPdfAssets();

  addPageHeader(doc, "Relatório da Viagem", `${vehicle}  •  ${status}  •  ${formatDate(trip.createdAt)}`, assets);
  addTripContent(doc, trip, vehicles, CONTENT_Y);
  addFooters(doc, generatedAt);

  doc.save(`${PDF_FILE_PREFIX}-relatorio-viagem${platePart}-${formatDate(trip.createdAt).replace(/\//g, "-")}.pdf`);
}

export async function exportMultipleTripsPdf(trips: Trip[], vehicles: Vehicle[], periodLabel: string) {
  if (trips.length === 0) return;

  const doc         = new jsPDF();
  const generatedAt = new Date();
  const assets = await loadPdfAssets();

  // ── Page 1: Executive summary ─────────────────────────────────────────────
  addPageHeader(
    doc,
    "Relatório Consolidado de Viagens",
    `Período: ${periodLabel}  •  ${trips.length} viagem(ns) exportada(s)`,
    assets,
  );

  let y = CONTENT_Y;

  // Consolidated financial totals
  const grossTotal = trips.reduce((s, t) => s + getTripGrossRevenue(t), 0);
  const netTotal   = trips.reduce((s, t) => s + getTripNetRevenue(t), 0);
  const expTotal   = trips.reduce((s, t) => s + getTripTotalExpenses(t), 0);
  const comTotal   = trips.reduce((s, t) => s + getTripTotalCommissions(t), 0);
  const kmTotal    = trips.reduce((s, t) => s + getTripTotalKm(t), 0);

  y = addSectionTitle(doc, "Resumo Executivo", y);

  autoTable(doc, {
    startY: y,
    head: [["Faturamento Bruto", "Valor Líquido", "Despesas Totais", "Comissões"]],
    body: [[formatCurrency(grossTotal), formatCurrency(netTotal), formatCurrency(expTotal), formatCurrency(comTotal)]],
    theme: "grid",
    styles: { fontSize: 11, cellPadding: 5, halign: "center", fontStyle: "bold" },
    headStyles: { fillColor: C.brand as [number, number, number], textColor: C.white as [number, number, number], fontStyle: "bold", fontSize: 9, halign: "center" },
    columnStyles: {
      0: { textColor: C.darkText as [number, number, number] },
      1: { textColor: (netTotal >= 0 ? C.positive : C.negative) as [number, number, number] },
      2: { textColor: C.negative as [number, number, number] },
      3: { textColor: C.darkText as [number, number, number] },
    },
    margin: tblMargin,
  });

  y = getTableY(doc, y) + 4;

  autoTable(doc, {
    startY: y,
    head: [["Total de Viagens", "KM Total Rodado", "Período"]],
    body: [[`${trips.length} viagem(ns)`, `${formatNumber(kmTotal)} km`, periodLabel]],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4, halign: "center", fontStyle: "bold" },
    headStyles: { ...tblHead, halign: "center" },
    margin: tblMargin,
  });

  y = getTableY(doc, y) + 10;

  // ── Trip overview table ───────────────────────────────────────────────────
  y = addSectionTitle(doc, "Visão Geral das Viagens", y);

  autoTable(doc, {
    startY: y,
    head: [["Veículo", "Status", "Criada em", "Último Destino", "Bruto", "Líquido", "KM"]],
    body: trips.map(t => [
      getVehicleLabel(vehicles, t.vehicleId),
      t.status === "open" ? "Em Aberto" : "Finalizada",
      formatDate(t.createdAt),
      getLastDestination(t),
      formatCurrency(getTripGrossRevenue(t)),
      formatCurrency(getTripNetRevenue(t)),
      `${formatNumber(getTripTotalKm(t))} km`,
    ]),
    theme: "striped",
    styles: { ...tblStyles, fontSize: 7.5 },
    headStyles: tblHead,
    alternateRowStyles: tblAlt,
    margin: tblMargin,
  });

  // ── Individual trip details (one page per trip) ───────────────────────────
  trips.forEach((trip, i) => {
    doc.addPage();
    const vehicle = getVehicleLabel(vehicles, trip.vehicleId);
    const status  = trip.status === "open" ? "Em Aberto" : "Finalizada";
    addPageHeader(
      doc,
      `Viagem ${i + 1} de ${trips.length}`,
      `${vehicle}  •  ${status}  •  ${formatDate(trip.createdAt)}`,
      assets,
    );
    addTripContent(doc, trip, vehicles, CONTENT_Y);
  });

  addFooters(doc, generatedAt);

  doc.save(
    `${PDF_FILE_PREFIX}-relatorio-consolidado-${periodLabel.toLowerCase().replace(/[\s/]/g, "-")}.pdf`,
  );
}
