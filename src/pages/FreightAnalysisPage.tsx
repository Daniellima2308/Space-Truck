import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { getRouteInfo } from "@/lib/routeApi";
import { calculateToll } from "@/lib/tollApi";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import { toast } from "@/hooks/use-toast";
import { buildCompleteFreightSummary, buildShortFreightSummary, calculateEta, getWhatsAppLink, type FreightQualityLabel } from "@/lib/freightAnalysis";
import { FontAwesomeIcon, iconArrowLeft, iconCopy, iconMapPin, iconDollarSign, iconGauge, iconTruck, iconAlertTriangle, iconTrendingUp, iconCalculator, iconRoute, iconScale, iconShare2, iconMessageCircle } from "@/lib/icons";
import type { IconDefinition } from "@/lib/icons";

const BRL_CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrencyMaskInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number(digits) / 100;
  return BRL_CURRENCY_FORMATTER.format(cents);
}

function parseCurrencyMaskInput(value: string): number {
  if (!value.trim()) return 0;
  const sanitized = value.replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatKmIntegerInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(digits));
}

function parseKmIntegerInput(value: string): number {
  if (!value.trim()) return 0;
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function formatDecimalPtBrInput(value: string, maxDecimals = 2): string {
  const sanitized = value.replace(/[^\d,.]/g, "").replace(/\./g, ",");
  if (!sanitized) return "";
  const [integerPartRaw = "", decimalRaw = ""] = sanitized.split(",");
  const integerDigits = integerPartRaw.replace(/\D/g, "");
  const decimalDigits = decimalRaw.replace(/\D/g, "").slice(0, maxDecimals);
  if (!integerDigits && !decimalDigits) return "";
  if (sanitized.includes(",")) {
    return `${integerDigits || "0"},${decimalDigits}`;
  }
  return integerDigits;
}

function parseDecimalPtBrInput(value: string): number {
  if (!value.trim()) return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercentInput(value: string): string {
  return formatDecimalPtBrInput(value, 1);
}

function parsePercentInput(value: string): number {
  const parsed = parseDecimalPtBrInput(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

// Tabela ANTT - Resolução Nº 6.076/2026
const tabelaANTT2026: Record<string, Record<number, { ccd: number; cc: number }>> = {
  'Carga Geral': {
    2: { ccd: 3.71, cc: 444.84 },
    3: { ccd: 4.18, cc: 500.84 },
    4: { ccd: 4.65, cc: 556.84 },
    5: { ccd: 5.11, cc: 612.84 },
    6: { ccd: 5.58, cc: 668.84 },
    7: { ccd: 6.05, cc: 724.84 },
    9: { ccd: 8.53, cc: 877.83 },
  },
  'Granel Sólido': {
    2: { ccd: 3.92, cc: 460.50 },
    3: { ccd: 4.45, cc: 518.50 },
    4: { ccd: 4.95, cc: 575.00 },
    5: { ccd: 5.48, cc: 633.20 },
    6: { ccd: 5.98, cc: 690.80 },
    7: { ccd: 6.49, cc: 750.10 },
    9: { ccd: 9.15, cc: 905.00 },
  },
  'Frigorificada': {
    2: { ccd: 4.35, cc: 510.00 },
    3: { ccd: 4.98, cc: 575.40 },
    4: { ccd: 5.62, cc: 641.00 },
    5: { ccd: 6.25, cc: 708.50 },
    6: { ccd: 6.89, cc: 775.20 },
    7: { ccd: 7.52, cc: 840.90 },
    9: { ccd: 10.45, cc: 1015.50 },
  },
  'Neogranel': {
    2: { ccd: 3.55, cc: 420.00 },
    3: { ccd: 4.02, cc: 475.20 },
    4: { ccd: 4.48, cc: 530.50 },
    5: { ccd: 4.95, cc: 585.80 },
    6: { ccd: 5.41, cc: 641.10 },
    7: { ccd: 5.88, cc: 696.40 },
    9: { ccd: 8.25, cc: 845.00 },
  },
  'Carga Perigosa': {
    2: { ccd: 4.58, cc: 545.00 },
    3: { ccd: 5.25, cc: 615.50 },
    4: { ccd: 5.92, cc: 686.00 },
    5: { ccd: 6.58, cc: 756.50 },
    6: { ccd: 7.25, cc: 827.00 },
    7: { ccd: 7.91, cc: 897.50 },
    9: { ccd: 11.05, cc: 1085.00 },
  },
};

// Mapeamento dos values do select para as chaves da tabela ANTT
const CARGO_TO_ANTT_KEY: Record<string, string> = {
  geral: 'Carga Geral',
  granel: 'Granel Sólido',
  frigorificada: 'Frigorificada',
  neogranel: 'Neogranel',
  perigosa: 'Carga Perigosa',
};

const CARGO_TYPES = [
  { value: "geral", label: "Carga Geral" },
  { value: "granel", label: "Granel Sólido" },
  { value: "frigorificada", label: "Frigorificada" },
  { value: "perigosa", label: "Carga Perigosa" },
  { value: "neogranel", label: "Neogranel" },
];

const CARGO_LABEL_MAP: Record<string, string> = Object.fromEntries(CARGO_TYPES.map((cargo) => [cargo.value, cargo.label]));

const AXLE_OPTIONS = [2, 3, 4, 5, 6, 7, 9];

// Média estimada de pedágio por km por eixo (R$/km) — dados aproximados rodovias BR
const TOLL_PER_KM_PER_AXLE: Record<number, number> = {
  2: 0.12,
  3: 0.18,
  4: 0.24,
  5: 0.30,
  6: 0.36,
  7: 0.42,
  9: 0.54,
};

function estimateToll(distanceKm: number, axles: number): number {
  const rate = TOLL_PER_KM_PER_AXLE[axles] ?? TOLL_PER_KM_PER_AXLE[3];
  return Math.round(distanceKm * rate * 100) / 100;
}

function calcAnttFloor(distanceKm: number, axles: number, cargoType: string, incluiCargaDescarga: boolean): number {
  const anttKey = CARGO_TO_ANTT_KEY[cargoType] || 'Carga Geral';
  const dados = tabelaANTT2026[anttKey]?.[axles] ?? tabelaANTT2026['Carga Geral'][3];
  return (distanceKm * dados.ccd) + (incluiCargaDescarga ? dados.cc : 0);
}

type FreightQuality = "bad" | "medium" | "great";

function getFreightQuality(offeredValue: number, anttFloor: number, netProfit: number): FreightQuality {
  const margin = offeredValue > 0 ? (netProfit / offeredValue) * 100 : -100;
  if (netProfit < 0 || margin < 18) return "bad";
  if (margin >= 30 || offeredValue >= anttFloor) return "great";
  return "medium";
}

const QUALITY_CONFIG: Record<FreightQuality, { bg: string; border: string; icon: IconDefinition; label: string; desc: string }> = {
  bad: {
    bg: "bg-destructive/15",
    border: "border-destructive/30",
    icon: iconAlertTriangle,
    label: "FRETE RUIM",
    desc: "Margem Baixa ou Prejuízo",
  },
  medium: {
    bg: "bg-warning/15",
    border: "border-warning/30",
    icon: iconScale,
    label: "FRETE MAIS OU MENOS",
    desc: "Cobre Custos / Retorno",
  },
  great: {
    bg: "bg-profit/15",
    border: "border-profit/30",
    icon: iconTrendingUp,
    label: "FRETE QUALIFICADO",
    desc: "Excelente Rentabilidade",
  },
};

const FreightAnalysisPage = () => {
  const navigate = useNavigate();

  // Form state
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [distanceKmInput, setDistanceKmInput] = useState("");
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [offeredValueInput, setOfferedValueInput] = useState("");
  const [commissionPercentInput, setCommissionPercentInput] = useState("");
  const [dieselPriceInput, setDieselPriceInput] = useState("");
  const [avgKmPerLiterInput, setAvgKmPerLiterInput] = useState("");
  const [cargoType, setCargoType] = useState("geral");
  const [axles, setAxles] = useState<number>(3);
  const [tollCostInput, setTollCostInput] = useState("");
  const [tollManuallyEdited, setTollManuallyEdited] = useState(false);
  const [loadingToll, setLoadingToll] = useState(false);
  const [tollSource, setTollSource] = useState<"api" | "estimate" | "manual">("estimate");
  const [incluiCargaDescarga, setIncluiCargaDescarga] = useState(true);
  const [valePedagio, setValePedagio] = useState(false);
  const [avgSpeedInput, setAvgSpeedInput] = useState("");
  const [isAvgSpeedFocused, setIsAvgSpeedFocused] = useState(false);
  const [isCommissionFocused, setIsCommissionFocused] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"short" | "complete">("short");
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coordsRef = useRef<{ originLat: number; originLng: number; destLat: number; destLng: number } | null>(null);
  const distanceKm = useMemo(() => parseKmIntegerInput(distanceKmInput), [distanceKmInput]);
  const offeredValue = useMemo(() => parseCurrencyMaskInput(offeredValueInput), [offeredValueInput]);
  const commissionPercent = useMemo(() => parsePercentInput(commissionPercentInput), [commissionPercentInput]);
  const dieselPrice = useMemo(() => parseCurrencyMaskInput(dieselPriceInput), [dieselPriceInput]);
  const avgKmPerLiter = useMemo(() => parseDecimalPtBrInput(avgKmPerLiterInput), [avgKmPerLiterInput]);
  const tollCost = useMemo(() => parseCurrencyMaskInput(tollCostInput), [tollCostInput]);
  const avgSpeedKmH = useMemo(() => {
    const digits = avgSpeedInput.replace(/\D/g, "");
    if (!digits) return 65;
    return Math.min(130, Math.max(1, Number(digits)));
  }, [avgSpeedInput]);

  // Auto-calculate distance when both cities are selected (contain " - ")
  const calcRoute = useCallback(async (o: string, d: string) => {
    if (!o.includes(" - ") || !d.includes(" - ")) return;
    setLoadingRoute(true);
    const result = await getRouteInfo(o, d);
    if (result) {
      setDistanceKmInput(formatKmIntegerInput(String(result.distanceKm)));
      coordsRef.current = {
        originLat: result.originCoords.lat,
        originLng: result.originCoords.lon,
        destLat: result.destCoords.lat,
        destLng: result.destCoords.lon,
      };
    }
    setLoadingRoute(false);
  }, []);

  useEffect(() => {
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    routeTimerRef.current = setTimeout(() => calcRoute(origin, destination), 1200);
    return () => { if (routeTimerRef.current) clearTimeout(routeTimerRef.current); };
  }, [origin, destination, calcRoute]);

  // Auto-fetch toll via TollGuru when route + axles change (unless manually edited)
  useEffect(() => {
    if (tollManuallyEdited) return;
    if (!coordsRef.current || distanceKm <= 0) return;

    const coords = coordsRef.current;
    let cancelled = false;

    const fetchToll = async () => {
      setLoadingToll(true);
      const apiToll = await calculateToll(
        coords.originLat, coords.originLng,
        coords.destLat, coords.destLng,
        axles
      );
      if (cancelled) return;

      if (apiToll !== null && apiToll > 0) {
        setTollCostInput(BRL_CURRENCY_FORMATTER.format(apiToll));
        setTollSource("api");
      } else {
        // Fallback to estimate
        const estimatedToll = estimateToll(distanceKm, axles);
        setTollCostInput(BRL_CURRENCY_FORMATTER.format(estimatedToll));
        setTollSource("estimate");
      }
      setLoadingToll(false);
    };

    fetchToll();
    return () => { cancelled = true; };
  }, [distanceKm, axles, tollManuallyEdited]);

  // Calculations
  const results = useMemo(() => {
    if (distanceKm <= 0 || offeredValue <= 0) return null;

    const fuelCost = (avgKmPerLiter > 0 && dieselPrice > 0) ? (distanceKm / avgKmPerLiter) * dieselPrice : 0;
    const commissionValue = (offeredValue * commissionPercent) / 100;
    const custoPedagioEfetivo = valePedagio ? 0 : tollCost;
    const totalExpenses = fuelCost + custoPedagioEfetivo + commissionValue;
    const netProfit = offeredValue - totalExpenses;
    const anttFloor = calcAnttFloor(distanceKm, axles, cargoType, incluiCargaDescarga);
    const quality = getFreightQuality(offeredValue, anttFloor, netProfit);
    const profitPerKm = distanceKm > 0 ? netProfit / distanceKm : 0;
    const profitMargin = offeredValue > 0 ? (netProfit / offeredValue) * 100 : 0;

    return { fuelCost, commissionValue, totalExpenses, netProfit, anttFloor, quality, profitPerKm, profitMargin, custoPedagioEfetivo };
  }, [distanceKm, offeredValue, commissionPercent, dieselPrice, avgKmPerLiter, cargoType, axles, tollCost, incluiCargaDescarga, valePedagio]);

  const etaResult = useMemo(() => calculateEta(distanceKm, avgSpeedKmH), [distanceKm, avgSpeedKmH]);
  const shouldShowEtaHint = distanceKm > 0 || (!!origin.trim() && !!destination.trim());
  const isAwaitingDistance = shouldShowEtaHint && distanceKm <= 0;

  const sharePayload = useMemo(() => {
    if (!results) return null;

    const etaDurationLabel = etaResult?.durationLabel ?? "—";
    const etaArrivalLabel = etaResult?.arrivalLabel ?? "—";

    const originText = origin || "Origem não informada";
    const destinationText = destination || "Destino não informado";

    return {
      origin: originText,
      destination: destinationText,
      distanceKm,
      avgSpeedKmH,
      etaDurationLabel,
      etaArrivalLabel,
      offeredValue,
      anttFloor: results.anttFloor,
      fuelCost: results.fuelCost,
      tollCost,
      valePedagio,
      dieselPrice,
      avgKmPerLiter,
      axles,
      cargoTypeLabel: CARGO_LABEL_MAP[cargoType] ?? "Carga Geral",
      commissionPercent,
      commissionValue: results.commissionValue,
      totalExpenses: results.totalExpenses,
      netProfit: results.netProfit,
      profitPerKm: results.profitPerKm,
      profitMargin: results.profitMargin,
      freightQualityLabel: QUALITY_CONFIG[results.quality].label as FreightQualityLabel,
      incluiCargaDescarga,
    };
  }, [results, etaResult, origin, destination, distanceKm, avgSpeedKmH, offeredValue, tollCost, valePedagio, dieselPrice, avgKmPerLiter, axles, cargoType, commissionPercent, incluiCargaDescarga]);

  const shortSummary = useMemo(() => (sharePayload ? buildShortFreightSummary(sharePayload) : ""), [sharePayload]);
  const completeSummary = useMemo(() => (sharePayload ? buildCompleteFreightSummary(sharePayload) : ""), [sharePayload]);
  const selectedSummary = summaryMode === "short" ? shortSummary : completeSummary;

  const handleCopySummary = useCallback(async () => {
    if (!selectedSummary) return;
    try {
      await navigator.clipboard.writeText(selectedSummary);
      toast({ title: "Resumo copiado", description: "A análise foi copiada para a área de transferência." });
    } catch {
      toast({ title: "Não foi possível copiar", description: "Tente novamente em alguns segundos.", variant: "destructive" });
    }
  }, [selectedSummary]);

  const handleOpenWhatsApp = useCallback(() => {
    if (!selectedSummary) return;
    window.open(getWhatsAppLink(selectedSummary), "_blank", "noopener,noreferrer");
  }, [selectedSummary]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors">
            <FontAwesomeIcon icon={iconArrowLeft} className="w-5 h-5 text-secondary-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <FontAwesomeIcon icon={iconCalculator} className="w-5 h-5 text-primary" />
              Análise de Frete
            </h1>
            <p className="text-xs text-muted-foreground">Calculadora ANTT</p>
          </div>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {/* Origem / Destino */}
        <Card className="gradient-card border-border">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <FontAwesomeIcon icon={iconMapPin} className="w-3.5 h-3.5" /> Rota
            </h2>
            <div className="space-y-2">
              <CityAutocomplete value={origin} onChange={setOrigin} placeholder="Origem" className="input-field" />
              <CityAutocomplete value={destination} onChange={setDestination} placeholder="Destino" className="input-field" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Distância (KM) {loadingRoute && <span className="text-primary animate-pulse ml-1">calculando rota...</span>}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={distanceKmInput}
                  onChange={(e) => setDistanceKmInput(formatKmIntegerInput(e.target.value))}
                  placeholder="Automático ou manual"
                  className="input-field"
                />
                <FontAwesomeIcon icon={iconRoute} className={`w-4 h-4 shrink-0 ${loadingRoute ? "text-primary animate-spin" : "text-muted-foreground"}`} />
              </div>

              {shouldShowEtaHint && (
                <div className="mt-2 px-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground/90">⏱ Tempo estimado:</span>{" "}
                      <span className="font-semibold text-foreground">{etaResult?.durationLabel ?? "—"}</span>
                    </p>
                    <p>
                      <span className="font-medium text-foreground/90">🕓 Chegada prevista:</span>{" "}
                      <span className="font-semibold text-foreground">{etaResult?.arrivalLabel ?? "—"}</span>
                    </p>
                  </div>
                  {isAwaitingDistance && (
                    <p className="text-[11px] text-muted-foreground mt-1">Aguardando distância para calcular.</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    O app calcula automático pela rota. Se preferir, você pode informar o KM manualmente.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Valores */}
        <Card className="gradient-card border-border">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <FontAwesomeIcon icon={iconDollarSign} className="w-3.5 h-3.5" /> Valores
            </h2>
              <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Valor do Frete (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={offeredValueInput}
                  onChange={(e) => setOfferedValueInput(formatCurrencyMaskInput(e.target.value))}
                  placeholder="Ex: R$ 4.500,00"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Comissão (%)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={commissionPercentInput}
                    onFocus={() => setIsCommissionFocused(true)}
                    onBlur={() => setIsCommissionFocused(false)}
                    onChange={(e) => setCommissionPercentInput(formatPercentInput(e.target.value))}
                    placeholder="Ex: 15%"
                    className="input-field pr-10"
                  />
                  {(isCommissionFocused || !!commissionPercentInput.trim()) && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-xs font-medium text-muted-foreground">
                      %
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Comissão do motorista ou sua retirada.
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Pedágio (R$)
                  {loadingToll && <span className="text-[10px] text-primary font-medium animate-pulse">consultando...</span>}
                  {!loadingToll && !tollManuallyEdited && distanceKm > 0 && (
                    <span className="text-[10px] text-primary font-medium">
                      ({tollSource === "api" ? "TollGuru" : "estimado"})
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={tollCostInput}
                  onChange={(e) => {
                    setTollManuallyEdited(true);
                    setTollSource("manual");
                    setTollCostInput(formatCurrencyMaskInput(e.target.value));
                  }}
                  placeholder="Ex: R$ 350,00"
                  className="input-field"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  O pedágio pode ser calculado automaticamente com base na origem e destino.
                </p>
                {tollManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      setTollManuallyEdited(false);
                      setTollSource("estimate");
                      // Will re-trigger the useEffect to fetch from API
                    }}
                    className="text-[10px] text-primary underline mt-0.5"
                  >
                    Recalcular automático
                  </button>
                )}
                </div>
                <div className="col-span-2 flex items-center justify-between pt-1">
                  <div>
                    <label className="text-xs text-foreground">Transportadora paga o Pedágio? (Vale Pedágio)</label>
                  </div>
                  <Switch checked={valePedagio} onCheckedChange={setValePedagio} />
                </div>
              </div>
          </CardContent>
        </Card>

        {/* Caminhão */}
        <Card className="gradient-card border-border">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <FontAwesomeIcon icon={iconTruck} className="w-3.5 h-3.5" /> Caminhão
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Diesel (R$/L)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={dieselPriceInput}
                  onChange={(e) => setDieselPriceInput(formatDecimalPtBrInput(e.target.value, 2))}
                  className="input-field" placeholder="Ex: 5,55"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Média (KM/L)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={avgKmPerLiterInput}
                  onChange={(e) => setAvgKmPerLiterInput(formatDecimalPtBrInput(e.target.value, 2))}
                  className="input-field" placeholder="Ex: 3,5"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tipo de Carga</label>
                <select value={cargoType} onChange={(e) => setCargoType(e.target.value)} className="input-field">
                  {CARGO_TYPES.map((ct) => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Nº de Eixos</label>
                <select value={axles} onChange={(e) => setAxles(Number(e.target.value))} className="input-field">
                  {AXLE_OPTIONS.map((a) => (
                    <option key={a} value={a}>{a} eixos</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Velocidade média (km/h)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={avgSpeedInput}
                    onFocus={() => setIsAvgSpeedFocused(true)}
                    onBlur={() => setIsAvgSpeedFocused(false)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      if (!digits) {
                        setAvgSpeedInput("");
                        return;
                      }
                      setAvgSpeedInput(String(Math.min(130, Math.max(1, Number(digits)))));
                    }}
                    className="input-field pr-14"
                    placeholder="65 km/h"
                  />
                  {(isAvgSpeedFocused || !!avgSpeedInput) && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-xs font-medium text-muted-foreground">
                      km/h
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="text-xs text-muted-foreground">Inclui Carga/Descarga?</label>
              <Switch checked={incluiCargaDescarga} onCheckedChange={setIncluiCargaDescarga} />
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {results && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Quality Badge */}
            {(() => {
              const cfg = QUALITY_CONFIG[results.quality];
              return (
                <div className={`rounded-xl p-4 ${cfg.bg} border ${cfg.border} flex items-center gap-3`}>
                  <FontAwesomeIcon icon={cfg.icon} className="w-8 h-8 shrink-0" />
                  <div>
                    <p className="font-black text-lg tracking-tight">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                    <p className="text-xs font-semibold mt-0.5">Margem: {results.profitMargin.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })()}

            {/* Summary */}
            <Card className="gradient-card border-border">
              <CardContent className="p-4 space-y-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Termômetro do Frete
                </h2>

                {/* Main metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricBox label="Distância" value={`${formatNumber(distanceKm)} km`} />
                  <MetricBox label="Piso ANTT" value={formatCurrency(results.anttFloor)} highlight="info" />
                  <MetricBox label="Combustível" value={formatCurrency(results.fuelCost)} />
                  <MetricBox label={valePedagio ? "Pedágio (Isento)" : "Pedágio"} value={valePedagio ? "R$ 0,00" : formatCurrency(tollCost)} highlight={valePedagio ? "profit" : undefined} />
                  <MetricBox label="Comissão" value={formatCurrency(results.commissionValue)} />
                  <MetricBox label="Total Despesas" value={formatCurrency(results.totalExpenses)} highlight="expense" />
                </div>

                {/* Separator */}
                <div className="border-t border-border" />

                {/* Net profit */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Lucro Líquido Projetado</p>
                    <p className={`text-2xl font-black text-mono ${results.netProfit >= 0 ? "text-profit" : "text-expense"}`}>
                      {formatCurrency(results.netProfit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">R$/km</p>
                    <p className={`text-lg font-bold text-mono ${results.profitPerKm >= 0 ? "text-profit" : "text-expense"}`}>
                      {formatCurrency(results.profitPerKm)}
                    </p>
                  </div>
                </div>

                {/* ANTT comparison bar */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Valor Oferecido</span>
                    <span>Piso ANTT</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        results.quality === "bad" ? "bg-destructive" : results.quality === "medium" ? "bg-warning" : "bg-profit"
                      }`}
                      style={{ width: `${Math.min((offeredValue / (results.anttFloor || 1)) * 100, 100)}%` }}
                    />
                    {/* ANTT line marker */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-info" style={{ left: `${Math.min(100, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-foreground font-medium">{formatCurrency(offeredValue)}</span>
                    <span className="text-info font-medium">{formatCurrency(results.anttFloor)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-border">
              <CardContent className="p-4 space-y-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <FontAwesomeIcon icon={iconShare2} className="w-3.5 h-3.5" /> Compartilhar análise
                </h2>
                <p className="text-xs text-muted-foreground">Envie um resumo profissional da viagem no WhatsApp ou copie para compartilhar onde quiser.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button type="button" onClick={() => setShareModalOpen(true)} className="min-h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                    <FontAwesomeIcon icon={iconMessageCircle} className="w-4 h-4" /> Enviar no WhatsApp
                  </button>
                  <button type="button" onClick={handleCopySummary} className="min-h-11 rounded-lg border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
                    <FontAwesomeIcon icon={iconCopy} className="w-4 h-4" /> Copiar resumo
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!results && (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={iconGauge} className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Preencha a distância e o valor do frete para ver a análise</p>
          </div>
        )}
      </div>

      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Prévia do compartilhamento</DialogTitle>
            <DialogDescription>
              Escolha entre resumo curto ou completo antes de abrir o WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSummaryMode("short")}
              className={`min-h-11 rounded-lg border text-sm font-semibold transition-colors ${summaryMode === "short" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
            >
              Resumo curto
            </button>
            <button
              type="button"
              onClick={() => setSummaryMode("complete")}
              className={`min-h-11 rounded-lg border text-sm font-semibold transition-colors ${summaryMode === "complete" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
            >
              Resumo completo
            </button>
          </div>

          <div className="rounded-lg border border-border bg-secondary/35 p-3 max-h-[300px] overflow-auto">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans">{selectedSummary}</pre>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button type="button" onClick={handleCopySummary} className="min-h-11 rounded-lg border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
              <FontAwesomeIcon icon={iconCopy} className="w-4 h-4" /> Copiar resumo
            </button>
            <button type="button" onClick={handleOpenWhatsApp} className="min-h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <FontAwesomeIcon icon={iconMessageCircle} className="w-4 h-4" /> Abrir WhatsApp
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function MetricBox({ label, value, highlight }: { label: string; value: string; highlight?: "profit" | "expense" | "info" }) {
  const colorClass = highlight === "profit" ? "text-profit" : highlight === "expense" ? "text-expense" : highlight === "info" ? "text-info" : "text-foreground";
  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold text-mono ${colorClass}`}>{value}</p>
    </div>
  );
}

export default FreightAnalysisPage;
