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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Valor recebido (R$)"), {
      target: { value: "-5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Valor recebido inválido" }),
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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Painel de recebimento")).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    fireEvent.change(screen.getByLabelText("Valor recebido (R$)"), { target: { value: "100" } });
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

  it("badge financeiro pending usa rótulo financeiro", () => {
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

    expect(screen.getByText("Saldo pendente")).toBeInTheDocument();
    expect(screen.queryByText("Canhoto pendente")).not.toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: /Registrar recebimento/i })).not.toBeInTheDocument();
  });

  it("modo básico mostra ação única de registrar recebimento", () => {
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

    expect(screen.getByRole("button", { name: /Registrar recebimento/i })).toBeInTheDocument();
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

    expect(screen.getByText("Forma de recebimento não definida")).toBeInTheDocument();
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

    expect(screen.getByText("Recebe na entrega")).toBeInTheDocument();
  });

  it("não mostra 'Canhoto necessário' quando modo é entrega direta", () => {
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

    expect(screen.queryByText("Canhoto necessário")).not.toBeInTheDocument();
  });

  it("não mostra 'Canhoto necessário' quando comprovante já está confirmado", () => {
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

    expect(screen.queryByText("Canhoto necessário")).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByRole("button", { name: "Adicionar desconto ou acréscimo" })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Tipo do ajuste")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Adicionar desconto ou acréscimo" }));
    expect(within(dialog).getByLabelText("Tipo do ajuste")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Valor do ajuste")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Observação do ajuste")).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    let dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("Previsão de pagamento")).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Previsão de pagamento")).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Canhoto para liberar saldo")).toBeInTheDocument();

    expect(within(dialog).getByRole("option", { name: "Não precisa de canhoto" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Precisa enviar foto do canhoto" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Precisa enviar canhoto físico" })).toBeInTheDocument();
    expect(within(dialog).queryByText("Status do canhoto")).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Forma de recebimento"), {
      target: { value: "advance_percent" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "80%" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({ advanceAmount: 3600, receivablePlanType: "advance_percent" }),
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

      fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
      const dialog = screen.getByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("Forma de recebimento"), {
        target: { value: "advance_percent" },
      });
      fireEvent.change(within(dialog).getByLabelText("Porcentagem do adiantamento"), {
        target: { value: invalidPercent },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "Salvar recebimento" }));

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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Forma de recebimento"), {
      target: { value: "advance_percent" },
    });
    fireEvent.change(within(dialog).getByLabelText("Porcentagem do adiantamento"), {
      target: { value: percent },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledWith(
        "trip-1",
        "f-1",
        expect.objectContaining({
          advanceAmount: expectedAdvance,
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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar recebimento" }));

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

    fireEvent.click(screen.getByRole("button", { name: /Abrir painel de recebimento|Registrar recebimento/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Forma de recebimento"), {
      target: { value: "advance_percent" },
    });
    fireEvent.change(within(dialog).getByLabelText("Porcentagem do adiantamento"), {
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

  it("mostra toast de lembrete como temporário na sessão (sem prometer persistência)", async () => {
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

    fireEvent.change(screen.getByDisplayValue("Enviar físico"), {
      target: { value: "physical_proof" },
    });
    fireEvent.change(screen.getByDisplayValue("Não lembrar"), {
      target: { value: "tomorrow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar etapa pós-entrega" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Lembrete visual desta sessão",
          description: expect.stringContaining("somente nesta sessão"),
        }),
      );
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
    fireEvent.change(screen.getByLabelText("Valor do ajuste"), { target: { value: "25" } });
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
