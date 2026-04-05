import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Trip, Vehicle, EXPENSE_CATEGORY_LABELS, ExpenseCategory } from "@/types";
import {
  getTripGrossRevenue, getTripNetRevenue, getTripTotalExpenses,
  getTripTotalCommissions, getTripAverageConsumption, getTripCostPerKm,
  getTripProfitPerKm, getTripTotalKm, formatCurrency, formatNumber, formatDate,
  getLastDestination,
} from "@/lib/calculations";

// Branding constants — update here for future rebranding
const PDF_BRAND_NAME = "Space Truck";
const PDF_BRAND_SUBTITLE = "Gestão de Operações e Fretes";
const PDF_FILE_PREFIX = "space-truck";

type JsPdfWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

function getLastAutoTableY(doc: jsPDF, fallbackY: number): number {
  return (doc as JsPdfWithTable).lastAutoTable?.finalY ?? fallbackY;
}

function getVehicleLabel(vehicles: Vehicle[], vehicleId: string): string {
  const v = vehicles.find((v) => v.id === vehicleId);
  return v ? `${v.brand} ${v.model} - ${v.plate}` : "Veículo desconhecido";
}

function addHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(PDF_BRAND_NAME, 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(PDF_BRAND_SUBTITLE, 14, 26);
  doc.setTextColor(0);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 38);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(subtitle, 14, 44);
  doc.setTextColor(0);

  doc.setDrawColor(200);
  doc.line(14, 47, 196, 47);
}

function addTripSummary(doc: jsPDF, trip: Trip, vehicles: Vehicle[], startY: number): number {
  let y = startY;
  const vehicle = getVehicleLabel(vehicles, trip.vehicleId);
  const status = trip.status === "open" ? "Em Aberto" : "Finalizada";

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${vehicle}`, 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 5;
  doc.text(`Status: ${status} • Criada: ${formatDate(trip.createdAt)}${trip.finishedAt ? ` • Finalizada: ${formatDate(trip.finishedAt)}` : ""}`, 14, y);
  y += 4;
  doc.text(`Último destino: ${getLastDestination(trip)}`, 14, y);
  y += 7;

  // Metrics row
  const metrics = [
    ["Bruto", formatCurrency(getTripGrossRevenue(trip))],
    ["Líquido", formatCurrency(getTripNetRevenue(trip))],
    ["Despesas", formatCurrency(getTripTotalExpenses(trip))],
    ["Comissões", formatCurrency(getTripTotalCommissions(trip))],
    ["KM Total", formatNumber(getTripTotalKm(trip))],
    ["Média km/l", formatNumber(getTripAverageConsumption(trip))],
    ["Custo/KM", `R$ ${formatNumber(getTripCostPerKm(trip))}`],
    ["Lucro/KM", `R$ ${formatNumber(getTripProfitPerKm(trip))}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [metrics.map(m => m[0])],
    body: [metrics.map(m => m[1])],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, halign: "center" },
    headStyles: { fillColor: [34, 34, 34], textColor: [200, 200, 200], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
  });
  y = getLastAutoTableY(doc, y) + 5;

  // Freights
  if (trip.freights.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Fretes", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Origem", "Destino", "KM Inicial", "Bruto", "Comissão %", "Comissão R$"]],
      body: trip.freights.map(f => [
        f.origin, f.destination, formatNumber(f.kmInitial),
        formatCurrency(f.grossValue), `${f.commissionPercent}%`, formatCurrency(f.commissionValue),
      ]),
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [34, 34, 34], textColor: [200, 200, 200] },
      margin: { left: 14, right: 14 },
    });
    y = getLastAutoTableY(doc, y) + 5;
  }

  // Fuelings
  if (trip.fuelings.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Abastecimentos", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Posto", "Data", "Litros", "R$/L", "Total", "KM", "Média km/l"]],
      body: trip.fuelings.map(f => [
        f.stationName, formatDate(f.date), formatNumber(f.liters),
        `R$ ${formatNumber(f.pricePerLiter)}`, formatCurrency(f.totalValue),
        formatNumber(f.kmCurrent), formatNumber(f.average),
      ]),
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [34, 34, 34], textColor: [200, 200, 200] },
      margin: { left: 14, right: 14 },
    });
    y = getLastAutoTableY(doc, y) + 5;
  }

  // Expenses
  if (trip.expenses.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Despesas", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Descrição", "Data", "Valor"]],
      body: trip.expenses.map(e => [
        EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] || e.category,
        e.description, formatDate(e.date), formatCurrency(e.value),
      ]),
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [34, 34, 34], textColor: [200, 200, 200] },
      margin: { left: 14, right: 14 },
    });
    y = getLastAutoTableY(doc, y) + 5;
  }

  return y;
}

export function exportSingleTripPdf(trip: Trip, vehicles: Vehicle[]) {
  const doc = new jsPDF();
  const vehicleObj = vehicles.find((v) => v.id === trip.vehicleId);
  const vehicle = vehicleObj ? `${vehicleObj.brand} ${vehicleObj.model} - ${vehicleObj.plate}` : "Veículo desconhecido";
  const status = trip.status === "open" ? "Em Aberto" : "Finalizada";
  const platePart = vehicleObj ? `-${vehicleObj.plate.toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
  addHeader(doc, `Relatório da Viagem`, `${vehicle} • ${status} • ${formatDate(trip.createdAt)}`);
  addTripSummary(doc, trip, vehicles, 54);
  doc.save(`${PDF_FILE_PREFIX}-relatorio-viagem${platePart}-${formatDate(trip.createdAt).replace(/\//g, "-")}.pdf`);
}

export function exportMultipleTripsPdf(trips: Trip[], vehicles: Vehicle[], periodLabel: string) {
  if (trips.length === 0) return;
  const doc = new jsPDF();
  addHeader(doc, `Relatório de Viagens`, `Período: ${periodLabel} • ${trips.length} viagem(ns)`);

  // Global summary
  const grossTotal = trips.reduce((s, t) => s + getTripGrossRevenue(t), 0);
  const netTotal = trips.reduce((s, t) => s + getTripNetRevenue(t), 0);
  const expTotal = trips.reduce((s, t) => s + getTripTotalExpenses(t), 0);
  const comTotal = trips.reduce((s, t) => s + getTripTotalCommissions(t), 0);

  autoTable(doc, {
    startY: 54,
    head: [["Faturamento Bruto", "Líquido", "Despesas", "Comissões"]],
    body: [[formatCurrency(grossTotal), formatCurrency(netTotal), formatCurrency(expTotal), formatCurrency(comTotal)]],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [34, 34, 34], textColor: [200, 200, 200], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
  });

  let y = getLastAutoTableY(doc, 54) + 10;

  trips.forEach((trip, i) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(220);
    if (i > 0) {
      doc.line(14, y - 3, 196, y - 3);
    }
    y = addTripSummary(doc, trip, vehicles, y);
    y += 5;
  });

  doc.save(`${PDF_FILE_PREFIX}-relatorio-viagens-${periodLabel.toLowerCase().replace(/\s/g, "-")}.pdf`);
}
