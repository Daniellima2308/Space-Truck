import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FreightTab } from "@/components/trip/FreightTab";
import { Trip, Vehicle } from "@/types";

const toastMock = vi.fn();

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/components/CityAutocomplete", () => ({
  CityAutocomplete: ({
    placeholder,
    value,
    onChange,
    className,
  }: {
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    className?: string;
  }) => (
    <input
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const tripBase: Trip = {
  id: "trip-1",
  vehicleId: "vehicle-1",
  status: "open",
  freights: [],
  fuelings: [],
  expenses: [],
  personalExpenses: [],
  createdAt: new Date().toISOString(),
  estimatedDistance: 0,
};

const driverOwnerVehicle: Vehicle = {
  id: "vehicle-1",
  brand: "Volvo",
  model: "FH",
  year: 2022,
  plate: "ABC1234",
  operationProfile: "driver_owner",
  currentKm: 1000,
};

function getDefaultProps() {
  return {
    updateFreight: vi.fn().mockResolvedValue({ status: "updated" }),
    deleteFreight: vi.fn().mockResolvedValue(undefined),
    startFreight: vi.fn().mockResolvedValue({ status: "started" }),
    completeFreight: vi.fn().mockResolvedValue({ promotedFreightId: null }),
  };
}

function makeFreight(
  id: string,
  status: "planned" | "in_progress" | "completed",
  createdAt: string,
) {
  return {
    id,
    tripId: tripBase.id,
    origin: `Origem ${id}`,
    destination: `Destino ${id}`,
    kmInitial: 100,
    grossValue: 1000,
    commissionPercent: 10,
    commissionValue: 100,
    status,
    estimatedDistance: 450,
    receivableMode: "complete" as const,
    amountReceived: 0,
    advanceAmount: 0,
    payerName: "Embarcador XPTO",
    balanceReleaseMode: "none" as const,
    createdAt,
  };
}

describe("FreightTab", () => {
  beforeEach(() => {
    toastMock.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  async function fillAndSubmitForm({
    trip = tripBase,
    addFreightResult,
    updateFreight,
  }: {
    trip?: Trip;
    addFreightResult?: { freightId: string } | undefined;
    updateFreight: ReturnType<typeof vi.fn>;
  }) {
    render(
      <FreightTab
        trip={trip}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(addFreightResult)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Origem"), { target: { value: "SP" } });
    fireEvent.change(screen.getByPlaceholderText("Destino"), { target: { value: "RJ" } });
    fireEvent.change(screen.getByPlaceholderText("KM Inicial"), { target: { value: "100" } });
    fireEvent.change(screen.getByPlaceholderText("Valor Bruto (R$)"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar frete" }));

    await screen.findByText("Quer controlar o recebimento deste frete?");
  }

  it("fecha formulário apenas quando addFreight tiver sucesso", async () => {
    const addFreight = vi.fn().mockResolvedValue(undefined);
    const setShowForm = vi.fn();

    render(
      <FreightTab
        trip={tripBase}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm
        setShowForm={setShowForm}
        addFreight={addFreight}
        {...getDefaultProps()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Origem"), {
      target: { value: "SP" },
    });
    fireEvent.change(screen.getByPlaceholderText("Destino"), {
      target: { value: "RJ" },
    });
    fireEvent.change(screen.getByPlaceholderText("KM Inicial"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByPlaceholderText("Valor Bruto (R$)"), {
      target: { value: "1000" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar frete" }));

    await waitFor(() => {
      expect(addFreight).toHaveBeenCalledTimes(1);
      expect(setShowForm).toHaveBeenCalledWith(false);
    });
  });

  it("mantém formulário aberto e campos preenchidos quando save falha", async () => {
    const addFreight = vi.fn().mockRejectedValue(new Error("Falha de rede"));
    const setShowForm = vi.fn();

    render(
      <FreightTab
        trip={tripBase}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm
        setShowForm={setShowForm}
        addFreight={addFreight}
        {...getDefaultProps()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Origem"), {
      target: { value: "SP" },
    });
    fireEvent.change(screen.getByPlaceholderText("Destino"), {
      target: { value: "RJ" },
    });
    fireEvent.change(screen.getByPlaceholderText("KM Inicial"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByPlaceholderText("Valor Bruto (R$)"), {
      target: { value: "1000" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar frete" }));

    await waitFor(() => {
      expect(addFreight).toHaveBeenCalledTimes(1);
      expect(setShowForm).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalled();
    });

    expect(screen.getByPlaceholderText("Origem")).toHaveValue("SP");
    expect(screen.getByPlaceholderText("Destino")).toHaveValue("RJ");
  });

  it("abre escolha de modo após salvar frete", async () => {
    const addFreight = vi.fn().mockResolvedValue(undefined);
    const setShowForm = vi.fn();

    render(
      <FreightTab
        trip={tripBase}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm
        setShowForm={setShowForm}
        addFreight={addFreight}
        {...getDefaultProps()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Origem"), {
      target: { value: "SP" },
    });
    fireEvent.change(screen.getByPlaceholderText("Destino"), {
      target: { value: "RJ" },
    });
    fireEvent.change(screen.getByPlaceholderText("KM Inicial"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByPlaceholderText("Valor Bruto (R$)"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar frete" }));

    await waitFor(() => {
      expect(addFreight).toHaveBeenCalledTimes(1);
      expect(setShowForm).toHaveBeenCalledWith(false);
      expect(screen.getByText("Quer controlar o recebimento deste frete?")).toBeInTheDocument();
      expect(screen.getByText("Deixa o frete limpo, sem controle de recebimento.")).toBeInTheDocument();
      expect(screen.getByText("Ativa recebimento sem burocracia. Você define a forma de recebimento depois.")).toBeInTheDocument();
      expect(screen.getByText("Ativa recebimento completo. Forma de recebimento e pós-entrega ficam configuráveis depois.")).toBeInTheDocument();
    });
  });

  it("campo de valor bruto no novo frete usa máscara monetária tipo calculadora", async () => {
    const addFreight = vi.fn().mockResolvedValue(undefined);

    render(
      <FreightTab
        trip={tripBase}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm
        setShowForm={vi.fn()}
        addFreight={addFreight}
        {...getDefaultProps()}
      />,
    );

    const grossInput = screen.getByPlaceholderText("Valor Bruto (R$)");
    const getNormalizedGross = () =>
      (grossInput as HTMLInputElement).value.replace(/\u00a0/g, " ");

    expect(getNormalizedGross()).toBe("");

    fireEvent.focus(grossInput);
    expect(getNormalizedGross()).toBe("R$ 0,00");

    fireEvent.change(grossInput, { target: { value: "2" } });
    expect(getNormalizedGross()).toBe("R$ 0,02");

    fireEvent.change(grossInput, { target: { value: "20" } });
    expect(getNormalizedGross()).toBe("R$ 0,20");

    fireEvent.change(grossInput, { target: { value: "200" } });
    expect(getNormalizedGross()).toBe("R$ 2,00");
  });

  it.each([
    { buttonLabel: "Não usar", expectedMode: null },
    { buttonLabel: "Básico", expectedMode: "basic" as const },
    { buttonLabel: "Completo", expectedMode: "complete" as const },
  ])("escolher $buttonLabel mantém comportamento esperado de receivableMode", async ({ buttonLabel, expectedMode }) => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });
    const hasPersistedMode = expectedMode !== null;
    const existing = { ...makeFreight("new-freight-id", "planned", new Date().toISOString()) };

    await fillAndSubmitForm({
      trip: hasPersistedMode ? { ...tripBase, freights: [existing] } : tripBase,
      addFreightResult: hasPersistedMode ? { freightId: "new-freight-id" } : undefined,
      updateFreight,
    });

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${buttonLabel}\\b`, "i") }));

    await waitFor(() => {
      if (expectedMode === null) {
        expect(updateFreight).not.toHaveBeenCalled();
        expect(screen.queryByText("Quer controlar o recebimento deste frete?")).not.toBeInTheDocument();
        return;
      }

      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "new-freight-id",
        expect.objectContaining({ receivableMode: expectedMode }),
      );
    });
  });

  it("mostra erro ao tentar salvar recebimento inválido", async () => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivablePlanType: "advance_value",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Adiantamento e saldo" }));
    fireEvent.change(screen.getByPlaceholderText("Ex.: 3.600,00"), { target: { value: "-5" } });
    expect(screen.getByText("Informe um adiantamento válido, maior ou igual a zero.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Adiantamento inválido" }),
      );
    });
  });

  it("mantém diálogo de recebimento aberto quando update retorna blocked", async () => {
    const updateFreight = vi.fn().mockResolvedValue({
      status: "blocked",
      userMessage: "Dados inválidos",
    });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [makeFreight("f-1", "in_progress", new Date().toISOString())],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "Salvar recebimento" })).toBeInTheDocument();
    });
  });

  it("mostra aviso inline quando adiantamento em valor ultrapassa o bruto", async () => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              grossValue: 1000,
              receivablePlanType: "advance_value",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Adiantamento e saldo" }));
    fireEvent.change(screen.getByPlaceholderText("Ex.: 3.600,00"), {
      target: { value: "R$ 1.500,00" },
    });

    expect(screen.getByText("O adiantamento não pode ser maior que o valor bruto do frete.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Adiantamento inválido",
          description: "O adiantamento não pode ser maior que o valor bruto do frete.",
        }),
      );
    });
  });

  it("preserva deliveryProofStatus avançado ao salvar recebimento sem mudar canhoto", async () => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivablePlanType: "advance_value",
              balanceReleaseMode: "proof_photo",
              deliveryProofStatus: "confirmed",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({ deliveryProofStatus: "confirmed" }),
      );
    });
  });

  it("força nova tentativa de previsão ao revisar rota sem alterar campos", async () => {
    const updateFreight = vi
      .fn()
      .mockResolvedValue({ status: "route_refreshed" });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "in_progress", new Date().toISOString()), estimatedDistance: 0 }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Revisar origem e destino" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar e tentar liberar previsão" }),
    );

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({
          origin: "Origem f-1",
          destination: "Destino f-1",
        }),
        { forceRouteRefresh: true, suppressSuccessToast: true },
      );
    });
  });

  it("mostra feedback único quando a rota continua sem previsão após revisão", async () => {
    const updateFreight = vi.fn().mockResolvedValue({
      status: "saved_without_route",
      userMessage:
        "Origem e destino foram confirmados, mas a previsão da rota ainda não foi liberada.",
    });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "in_progress", new Date().toISOString()), estimatedDistance: 0 }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Revisar origem e destino" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar e tentar liberar previsão" }),
    );

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Previsão ainda em ajuste",
        }),
      );
    });
  });

  it("mostra Retirada no card para perfil driver_owner", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [makeFreight("f-1", "in_progress", new Date().toISOString())],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.getByText("Retirada")).toBeInTheDocument();
    expect(screen.queryByText("Comissão")).not.toBeInTheDocument();
  });

  it("badge financeiro evita rótulo genérico pendente", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [makeFreight("f-1", "in_progress", new Date().toISOString())],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.queryByText("Pendente")).not.toBeInTheDocument();
    expect(screen.getByText(/Não definido|Aguardando saldo|Após descarga/)).toBeInTheDocument();
  });

  it("modo não usar remove ação e resumo de recebimento do card", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivableMode: "off",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.queryByText("Recebimento")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /painel de recebimento/i })).not.toBeInTheDocument();
  });

  it("fallback ausente de receivableMode mantém card sem recebimento (off)", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "in_progress", new Date().toISOString()), receivableMode: undefined }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.queryByText("Recebimento")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Abrir painel de recebimento/i })).not.toBeInTheDocument();
  });

  it("modo básico permite editar recebimento no card expandido", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "in_progress", new Date().toISOString()), receivableMode: "basic" }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    expect(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento/i })).toBeInTheDocument();
  });

  it("não assume saldo automático quando forma de recebimento ainda não foi definida", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivableMode: "basic",
              receivablePlanType: "undefined",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.getByText("Sem configuração de recebimento")).toBeInTheDocument();
  });

  it("resume corretamente frete que recebe só na entrega", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivableMode: "complete",
              receivablePlanType: "paid_on_delivery",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.getByText("Pagamento após descarga")).toBeInTheDocument();
    expect(screen.getByText("Após descarga")).toBeInTheDocument();
  });

  it("resume adiantamento e saldo em duas linhas no card", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivablePlanType: "advance_value",
              grossValue: 4500,
              advanceAmount: 3600,
              amountReceived: 3600,
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.getByText(/Adiantamento R\$\s*3\.600,00/)).toBeInTheDocument();
    expect(screen.getByText(/Saldo R\$\s*900,00/)).toBeInTheDocument();
    expect(screen.queryByText(/Adiantamento .*•.*Saldo/)).not.toBeInTheDocument();
  });

  it("mostra ajustes ao lado do saldo no card fechado com sinal e valor real", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivablePlanType: "advance_value",
              grossValue: 4500,
              advanceAmount: 3600,
              balanceAdjustments: [
                { type: "increase", amount: 100 },
                { type: "discount", amount: 50 },
              ],
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.getByText(/Saldo R\$\s*900,00 \+ R\$\s*100,00 - R\$\s*50,00/)).toBeInTheDocument();
  });

  it("mantém saldo histórico visível mesmo quando saldo já foi quitado", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              receivablePlanType: "advance_value",
              grossValue: 4500,
              advanceAmount: 3600,
              amountReceived: 4400,
              balanceAdjustments: [{ type: "discount", amount: 100, note: "Avaria" }],
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    expect(screen.getByText(/Saldo reajustado:/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*800,00/)).toBeInTheDocument();
    expect(screen.queryByText(/Saldo R\$\s*0,00/)).not.toBeInTheDocument();
  });

  it("sem ajustes salvos não mostra bloco de reajuste no expandido", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              receivablePlanType: "advance_value",
              grossValue: 4500,
              advanceAmount: 3600,
              amountReceived: 3600,
              balanceAdjustments: [],
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    expect(screen.queryByText(/^Ajustes:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Histórico de ajustes")).not.toBeInTheDocument();
    expect(screen.queryByText(/Saldo reajustado:/)).not.toBeInTheDocument();
  });

  it("mostra história do saldo com ajuste aplicado no card de recebimento", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              receivablePlanType: "advance_value",
              grossValue: 4500,
              advanceAmount: 3600,
              amountReceived: 3600,
              balanceAdjustments: [{ type: "discount", amount: 100 }],
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.getByText(/Saldo R\$\s*900,00/)).toBeInTheDocument();
    expect(screen.queryByText(/Desconto de R\$\s*100,00/)).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    expect(screen.getByText(/^Ajustes:/)).toBeInTheDocument();
    expect(screen.getByText("Histórico de ajustes")).toBeInTheDocument();
    expect(screen.getByText(/Desconto de R\$\s*100,00/)).toBeInTheDocument();
    expect(screen.getByText(/Saldo reajustado:/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*800,00/)).toBeInTheDocument();
  });

  it("com ajustes que se anulam mantém bloco completo de reajuste visível", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              receivablePlanType: "advance_value",
              grossValue: 4500,
              advanceAmount: 3600,
              amountReceived: 3600,
              balanceAdjustments: [
                { type: "discount", amount: 100 },
                { type: "increase", amount: 100 },
              ],
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    expect(screen.getByText(/^Ajustes:/)).toBeInTheDocument();
    expect(screen.getByText("Histórico de ajustes")).toBeInTheDocument();
    expect(screen.getByText(/Saldo reajustado:/)).toBeInTheDocument();
    expect(screen.getByText(/Saldo:/)).toBeInTheDocument();
  });

  it("permite excluir ajuste já lançado no painel e salva sem o item removido", async () => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              receivablePlanType: "advance_value",
              grossValue: 4500,
              advanceAmount: 3600,
              amountReceived: 3600,
              balanceAdjustments: [{ type: "discount", amount: 100, note: "Avaria" }],
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({
          balanceAdjustments: [],
        }),
      );
    });
  });

  it("mostra lembrete de correio ativo no recebimento quando salvo localmente", () => {
    window.localStorage.setItem(
      "space-truck:freight-mail-reminders:v1",
      JSON.stringify({
        "f-1": { choice: "tomorrow" },
      }),
    );

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              receivablePlanType: "paid_on_delivery",
              paymentDueDate: "2026-05-01",
              balanceReleaseMode: "physical_proof",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    expect(screen.getByText(/Lembrete de correio:/)).toBeInTheDocument();
    expect(screen.getByText("amanhã")).toBeInTheDocument();
  });

  it("não mostra aviso de canhoto quando modo é entrega direta", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              receivableMode: "complete",
              receivablePlanType: "paid_on_delivery",
              paymentDueDate: "2026-06-01",
              balanceReleaseMode: "direct_delivery",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.queryByText("Necessário enviar foto do canhoto")).not.toBeInTheDocument();
    expect(screen.queryByText("Necessário enviar canhoto físico")).not.toBeInTheDocument();
  });

  it("não mostra aviso de canhoto quando comprovante já está confirmado", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              receivableMode: "complete",
              receivablePlanType: "paid_on_delivery",
              paymentDueDate: "2026-06-01",
              balanceReleaseMode: "physical_proof",
              deliveryProofStatus: "confirmed",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.queryByText("Necessário enviar foto do canhoto")).not.toBeInTheDocument();
    expect(screen.queryByText("Necessário enviar canhoto físico")).not.toBeInTheDocument();
  });

  it("mostra aviso específico quando saldo depende de foto do canhoto", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              receivableMode: "complete",
              receivablePlanType: "paid_on_delivery",
              paymentDueDate: "2026-06-01",
              balanceReleaseMode: "proof_photo",
              deliveryProofStatus: "pending_send",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    expect(screen.getByText("Necessário enviar foto do canhoto")).toBeInTheDocument();
  });

  it("permite marcar saldo como pago após conclusão e fecha o recebimento", async () => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              receivablePlanType: "advance_value",
              grossValue: 4500,
              advanceAmount: 3600,
              amountReceived: 3600,
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Marcar saldo como pago" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({
          amountReceived: 4500,
        }),
      );
    });
  });

  it("não envia createdAt nos payloads de UI ao criar frete", async () => {
    const addFreight = vi.fn().mockResolvedValue(undefined);

    render(
      <FreightTab
        trip={tripBase}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm
        setShowForm={vi.fn()}
        addFreight={addFreight}
        {...getDefaultProps()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Origem"), {
      target: { value: "SP" },
    });
    fireEvent.change(screen.getByPlaceholderText("Destino"), {
      target: { value: "RJ" },
    });
    fireEvent.change(screen.getByPlaceholderText("KM Inicial"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByPlaceholderText("Valor Bruto (R$)"), {
      target: { value: "1000" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar frete" }));

    await waitFor(() => {
      expect(addFreight).toHaveBeenCalledTimes(1);
    });

    const payload = addFreight.mock.calls[0][1];
    expect(payload).not.toHaveProperty("createdAt");
  });

  it("painel completo mantém seção de ajuste acessível", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "completed", new Date().toISOString()), receivablePlanType: "advance_value" }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));

    expect(screen.getByRole("button", { name: "Adicionar desconto ou acréscimo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desconto" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar desconto ou acréscimo" }));
    expect(screen.getByRole("button", { name: "Desconto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Valor do ajuste")).toBeInTheDocument();
    expect(screen.getByLabelText("Observação do ajuste")).toBeInTheDocument();
  });

  it("campo de ajuste usa máscara monetária com entrada da direita para esquerda", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "completed", new Date().toISOString()), receivablePlanType: "advance_value" }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar desconto ou acréscimo" }));

    const adjustmentInput = screen.getByLabelText("Valor do ajuste");
    const getNormalizedInputValue = () =>
      (adjustmentInput as HTMLInputElement).value.replace(/\u00a0/g, " ");
    expect(getNormalizedInputValue()).toBe("R$ 0,00");

    fireEvent.change(adjustmentInput, { target: { value: "2" } });
    expect(getNormalizedInputValue()).toBe("R$ 0,02");

    fireEvent.change(adjustmentInput, { target: { value: "20" } });
    expect(getNormalizedInputValue()).toBe("R$ 0,20");

    fireEvent.change(adjustmentInput, { target: { value: "200" } });
    expect(getNormalizedInputValue()).toBe("R$ 2,00");
  });

  it("oculta previsão de pagamento para frete em andamento e mostra após conclusão", () => {
    const { unmount } = render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [makeFreight("f-1", "in_progress", new Date().toISOString())],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    expect(screen.queryByText("Previsão do saldo")).not.toBeInTheDocument();
    unmount();

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "completed", new Date().toISOString()), receivablePlanType: "advance_value" }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    expect(screen.getByText("Previsão do saldo")).toBeInTheDocument();
  });

  it("usa nova linguagem simplificada de canhoto no pós-conclusão", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "completed", new Date().toISOString()), receivablePlanType: "advance_value" }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));

    expect(screen.getByText("Canhoto: não precisa")).toBeInTheDocument();
    expect(screen.getByText("Canhoto: enviar foto")).toBeInTheDocument();
    expect(screen.getByText("Canhoto: enviar físico")).toBeInTheDocument();
    expect(screen.queryByText("Status do canhoto")).not.toBeInTheDocument();
  });

  it("permite adiantamento por percentual e persiste valor convertido", async () => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "completed", new Date().toISOString()), grossValue: 4500 }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Adiantamento e saldo" }));
    fireEvent.click(screen.getByRole("button", { name: "%" }));
    fireEvent.change(screen.getByLabelText("Porcentagem do adiantamento"), {
      target: { value: "80/20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({ advanceAmount: 3600, amountReceived: 3600, receivablePlanType: "advance_percent" }),
      );
    });
  });

  it("sincroniza amountReceived com adiantamento em valor", async () => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "completed", new Date().toISOString()), grossValue: 5000 }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Adiantamento e saldo" }));
    fireEvent.change(screen.getByPlaceholderText("Ex.: 3.600,00"), {
      target: { value: "R$ 2.500,00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({
          advanceAmount: 2500,
          amountReceived: 2500,
          receivablePlanType: "advance_value",
        }),
      );
    });
  });

  it("pago integralmente persiste amountReceived como meta real do frete", async () => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              grossValue: 1000,
              balanceAdjustments: [{ type: "increase", amount: 100 }],
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Pago integralmente" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({
          receivablePlanType: "paid_in_full",
          amountReceived: 1100,
        }),
      );
    });
  });

  it.each(["abc", "-5", "120"])(
    "bloqueia salvamento com percentual inválido (%s) sem enviar payload",
    async (invalidPercent) => {
      const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });
      render(
        <FreightTab
          trip={{
            ...tripBase,
            freights: [{ ...makeFreight("f-1", "completed", new Date().toISOString()), grossValue: 4500 }],
          }}
          vehicle={driverOwnerVehicle}
          isOpen
          showForm={false}
          setShowForm={vi.fn()}
          addFreight={vi.fn().mockResolvedValue(undefined)}
          updateFreight={updateFreight}
          deleteFreight={vi.fn().mockResolvedValue(undefined)}
          startFreight={vi.fn().mockResolvedValue({ status: "started" })}
          completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
        />,
      );

      fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
        fireEvent.click(screen.getByRole("button", { name: "Adiantamento e saldo" }));
      fireEvent.click(screen.getByRole("button", { name: "%" }));
      fireEvent.change(screen.getByLabelText("Porcentagem do adiantamento"), {
        target: { value: invalidPercent },
      });
      fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

      await waitFor(() => {
        expect(updateFreight).not.toHaveBeenCalled();
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Percentual de adiantamento inválido" }),
        );
      });
    },
  );

  it.each([
    { percent: "0", expectedAdvance: 0 },
    { percent: "100", expectedAdvance: 4500 },
  ])("aceita percentual de borda $percent%", async ({ percent, expectedAdvance }) => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "completed", new Date().toISOString()), grossValue: 4500 }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Adiantamento e saldo" }));
    fireEvent.click(screen.getByRole("button", { name: "%" }));
    fireEvent.change(screen.getByLabelText("Porcentagem do adiantamento"), {
      target: { value: percent },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({
          advanceAmount: expectedAdvance,
          amountReceived: expectedAdvance,
          receivablePlanType: "advance_percent",
        }),
      );
    });
  });

  it("mantém precisão do percentual reconstruído ao reabrir e salvar", async () => {
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "completed", new Date().toISOString()),
              grossValue: 1000,
              advanceAmount: 333,
              receivablePlanType: "advance_percent",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={vi.fn().mockResolvedValue({ promotedFreightId: null })}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Adiantamento e saldo" }));
    fireEvent.click(screen.getByRole("button", { name: "%" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({
          advanceAmount: 333,
          receivablePlanType: "advance_percent",
        }),
      );
    });
  });

  it("não renderiza preview com percentual inválido", async () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [{ ...makeFreight("f-1", "completed", new Date().toISOString()), grossValue: 4500 }],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Recebimento/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Registrar recebimento|Editar recebimento|Ajustar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Adiantamento e saldo" }));
    fireEvent.click(screen.getByRole("button", { name: "%" }));
    fireEvent.change(screen.getByLabelText("Porcentagem do adiantamento"), {
      target: { value: "abc" },
    });

    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("abre modal ao tocar em Concluir e permite só concluir", async () => {
    const completeFreight = vi
      .fn()
      .mockResolvedValue({ promotedFreightId: null });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [makeFreight("f-1", "in_progress", new Date().toISOString())],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
        completeFreight={completeFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Concluir/i }));
    expect(screen.getByText("Concluir este frete?")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Concluir e decidir depois" }),
    );

    await waitFor(() => {
      expect(completeFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        "complete_only",
      );
    });
  });

  it("ao concluir com saldo em aberto pergunta previsão de pagamento", async () => {
    const completeFreight = vi.fn().mockResolvedValue({ promotedFreightId: null });
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              amountReceived: 100,
              grossValue: 1000,
              receivableMode: "basic",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
        completeFreight={completeFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Concluir/i }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e decidir depois" }));

    await waitFor(() => {
      expect(screen.getByText("Pós-entrega do recebimento")).toBeInTheDocument();
    });
  });

  it("abre pós-entrega mesmo quando frete já está quitado com ajustes", async () => {
    const completeFreight = vi.fn().mockResolvedValue({ promotedFreightId: null });
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              amountReceived: 950,
              grossValue: 1000,
              balanceAdjustments: [{ type: "discount", amount: 50 }],
              receivableMode: "basic",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
        completeFreight={completeFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Concluir/i }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e decidir depois" }));

    await waitFor(() => {
      expect(completeFreight).toHaveBeenCalled();
    });
    expect(screen.getByText("Pós-entrega do recebimento")).toBeInTheDocument();
  });

  it("mostra erro e mantém diálogo aberto quando falha ao salvar previsão na conclusão", async () => {
    const completeFreight = vi.fn().mockResolvedValue({ promotedFreightId: null });
    const updateFreight = vi.fn().mockRejectedValue(new Error("falha previsão"));
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              amountReceived: 100,
              grossValue: 1000,
              receivableMode: "basic",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={completeFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Concluir/i }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e decidir depois" }));
    await screen.findByText("Pós-entrega do recebimento");

    fireEvent.change(screen.getByLabelText("Data prevista para recebimento do saldo"), {
      target: { value: "2026-05-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar etapa pós-entrega" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Não foi possível salvar agora" }),
      );
    });
    expect(screen.getByText("Pós-entrega do recebimento")).toBeInTheDocument();
  });

  it("preserva deliveryProofStatus avançado ao salvar pós-entrega", async () => {
    const completeFreight = vi.fn().mockResolvedValue({ promotedFreightId: null });
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivableMode: "complete",
              receivablePlanType: "paid_on_delivery",
              balanceReleaseMode: "proof_photo",
              deliveryProofStatus: "sent",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={completeFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Concluir/i }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e decidir depois" }));
    await screen.findByText("Pós-entrega do recebimento");

    fireEvent.click(screen.getByRole("button", { name: "Salvar etapa pós-entrega" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({ deliveryProofStatus: "sent" }),
      );
    });
  });

  it("salva lembrete de correio local para revisão posterior", async () => {
    const completeFreight = vi.fn().mockResolvedValue({ promotedFreightId: null });
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivableMode: "complete",
              receivablePlanType: "paid_on_delivery",
              balanceReleaseMode: "physical_proof",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={completeFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Concluir/i }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e decidir depois" }));
    await screen.findByText("Pós-entrega do recebimento");

    fireEvent.click(screen.getByRole("button", { name: "Canhoto: enviar físico" }));
    fireEvent.click(screen.getByRole("button", { name: "Amanhã" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar etapa pós-entrega" }));

    await waitFor(() => {
      const stored = window.localStorage.getItem("space-truck:freight-mail-reminders:v1");
      expect(stored).toContain("\"f-1\"");
      expect(stored).toContain("\"choice\":\"tomorrow\"");
    });
  });

  it("salva ajuste válido no pós-entrega em balanceAdjustments", async () => {
    const completeFreight = vi.fn().mockResolvedValue({ promotedFreightId: null });
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivableMode: "complete",
              receivablePlanType: "paid_on_delivery",
              balanceAdjustments: [{ type: "discount", amount: 10 }],
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={completeFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Concluir/i }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e decidir depois" }));
    await screen.findByText("Pós-entrega do recebimento");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar desconto ou acréscimo" }));
    fireEvent.change(screen.getByLabelText("Valor do ajuste"), { target: { value: "R$ 25,00" } });
    fireEvent.change(screen.getByLabelText("Observação do ajuste"), { target: { value: "Taxa extra" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar etapa pós-entrega" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({
          balanceAdjustments: [
            { type: "discount", amount: 10 },
            expect.objectContaining({ type: "discount", amount: 25, note: "Taxa extra" }),
          ],
        }),
      );
    });
  });

  it("bloqueia ajuste inválido no pós-entrega sem salvar", async () => {
    const completeFreight = vi.fn().mockResolvedValue({ promotedFreightId: null });
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivableMode: "complete",
              receivablePlanType: "paid_on_delivery",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={completeFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Concluir/i }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e decidir depois" }));
    await screen.findByText("Pós-entrega do recebimento");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar desconto ou acréscimo" }));
    fireEvent.change(screen.getByLabelText("Valor do ajuste"), { target: { value: "-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar etapa pós-entrega" }));

    await waitFor(() => {
      expect(updateFreight).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Ajuste no saldo inválido" }),
      );
    });
  });

  it("não mostra toast de lembrete quando cenário não exige lembrete de correio", async () => {
    const completeFreight = vi.fn().mockResolvedValue({ promotedFreightId: null });
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            {
              ...makeFreight("f-1", "in_progress", new Date().toISOString()),
              receivableMode: "complete",
              receivablePlanType: "paid_on_delivery",
              balanceReleaseMode: "proof_photo",
            },
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        updateFreight={updateFreight}
        deleteFreight={vi.fn().mockResolvedValue(undefined)}
        startFreight={vi.fn().mockResolvedValue({ status: "started" })}
        completeFreight={completeFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Concluir/i }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e decidir depois" }));
    await screen.findByText("Pós-entrega do recebimento");
    fireEvent.click(screen.getByRole("button", { name: "Salvar etapa pós-entrega" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalled();
    });
    expect(toastMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "Lembrete visual desta sessão" }),
    );
  });

  it("abre modal de hand-off quando já existe frete em andamento", async () => {
    const startFreight = vi
      .fn()
      .mockResolvedValueOnce({ status: "blocked_active_freight", activeFreightId: "f-1" });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            makeFreight("f-1", "in_progress", "2026-03-20T10:00:00.000Z"),
            makeFreight("f-2", "planned", "2026-03-20T11:00:00.000Z"),
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
        startFreight={startFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar trecho" }));

    expect(
      await screen.findByText("Já existe um frete em andamento"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Concluir atual e iniciar este" }),
    ).toBeInTheDocument();
  });

  it("confirma o hand-off concluindo o atual e iniciando o planejado", async () => {
    const startFreight = vi
      .fn()
      .mockResolvedValueOnce({ status: "blocked_active_freight", activeFreightId: "f-1" })
      .mockResolvedValueOnce({ status: "started" });
    const completeFreight = vi.fn().mockResolvedValue({ promotedFreightId: null });

    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            makeFreight("f-1", "in_progress", "2026-03-20T10:00:00.000Z"),
            makeFreight("f-2", "planned", "2026-03-20T11:00:00.000Z"),
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
        startFreight={startFreight}
        completeFreight={completeFreight}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar trecho" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Concluir atual e iniciar este" }),
    );

    await waitFor(() => {
      expect(completeFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        "complete_only",
      );
      expect(startFreight).toHaveBeenCalledWith("trip-1", "f-2");
    });
  });

  it("mantém frete em andamento no topo, depois planned e completed", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [
            makeFreight("completed", "completed", "2026-03-20T12:00:00.000Z"),
            makeFreight("planned", "planned", "2026-03-20T11:00:00.000Z"),
            makeFreight("active", "in_progress", "2026-03-20T13:00:00.000Z"),
          ],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    const routeLabels = screen.getAllByText(/Origem .* → Destino .*/).map((node) =>
      node.textContent?.trim(),
    );

    expect(routeLabels).toEqual([
      "Origem active → Destino active",
      "Origem planned → Destino planned",
      "Origem completed → Destino completed",
    ]);
  });

  it("não mostra edição de KM para frete concluído", () => {
    render(
      <FreightTab
        trip={{
          ...tripBase,
          freights: [makeFreight("done", "completed", "2026-03-20T10:00:00.000Z")],
        }}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm={false}
        setShowForm={vi.fn()}
        addFreight={vi.fn().mockResolvedValue(undefined)}
        {...getDefaultProps()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Editar KM inicial" })).not.toBeInTheDocument();
    expect(screen.getByText("Histórico travado")).toBeInTheDocument();
  });
});
