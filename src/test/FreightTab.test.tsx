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
    });
  });

  it("escolher Não usar fecha chooser sem disparar updateFreight", async () => {
    const addFreight = vi.fn().mockResolvedValue(undefined);
    const updateFreight = vi.fn().mockResolvedValue({ status: "updated" });

    render(
      <FreightTab
        trip={tripBase}
        vehicle={driverOwnerVehicle}
        isOpen
        showForm
        setShowForm={vi.fn()}
        addFreight={addFreight}
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
    fireEvent.click(screen.getByRole("button", { name: "Não usar" }));

    await waitFor(() => {
      expect(updateFreight).not.toHaveBeenCalled();
      expect(screen.queryByText("Quer controlar o recebimento deste frete?")).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /Recebimento/i }));
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

    fireEvent.click(screen.getByRole("button", { name: /Recebimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar recebimento" }));

    await waitFor(() => {
      expect(updateFreight).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Painel de recebimento")).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /Recebimento/i }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByLabelText("Tipo do ajuste")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Valor do ajuste")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Observação do ajuste")).toBeInTheDocument();
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
      expect(screen.getByText("Ainda falta receber o saldo")).toBeInTheDocument();
    });
  });

  it("não pergunta previsão quando frete já está quitado com ajustes", async () => {
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
    expect(screen.queryByText("Ainda falta receber o saldo")).not.toBeInTheDocument();
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
    await screen.findByText("Ainda falta receber o saldo");

    fireEvent.change(screen.getByLabelText("Previsão de pagamento"), {
      target: { value: "2026-05-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Informar data agora" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Não foi possível salvar agora" }),
      );
    });
    expect(screen.getByText("Ainda falta receber o saldo")).toBeInTheDocument();
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
