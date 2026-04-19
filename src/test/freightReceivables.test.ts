import {
  getFreightAdjustedBalance,
  getFreightAdvanceReceived,
  getFreightAmountReceivedForSettlement,
  getFreightPlannedBalance,
  getFreightReceivableTarget,
  getFreightReceivableStatus,
  getFreightReceivableBadgeState,
  getFreightReceivedPercentage,
  getFreightTotalReceived,
  getFreightRemainingBalance,
  getFreightPaymentForecastState,
  isFreightLockedByProof,
  isFreightSettled,
  isFreightOverdue,
} from "@/lib/freightReceivables";

describe("freightReceivables", () => {
  it("calcula saldo restante sem negativo", () => {
    expect(
      getFreightRemainingBalance({ grossValue: 1000, amountReceived: 250, receivablePlanType: "paid_on_delivery", advanceAmount: 0 }),
    ).toBe(750);
    expect(
      getFreightRemainingBalance({ grossValue: 1000, amountReceived: 1200, receivablePlanType: "paid_on_delivery", advanceAmount: 0 }),
    ).toBe(0);
  });

  it("retorna saldo restante zero quando plano está undefined", () => {
    expect(
      getFreightRemainingBalance({
        grossValue: 1000,
        amountReceived: 0,
        receivablePlanType: "undefined",
      }),
    ).toBe(0);
  });

  it("calcula percentual recebido limitado a 100", () => {
    expect(
      getFreightReceivedPercentage({ grossValue: 1000, amountReceived: 500, receivablePlanType: "paid_on_delivery" }),
    ).toBe(50);
    expect(
      getFreightReceivedPercentage({ grossValue: 1000, amountReceived: 5000, receivablePlanType: "paid_on_delivery" }),
    ).toBe(100);
    expect(
      getFreightReceivedPercentage({ grossValue: 0, amountReceived: 0, receivablePlanType: "paid_on_delivery" }),
    ).toBe(0);
    expect(
      getFreightReceivedPercentage({ grossValue: 0, amountReceived: 1000, receivablePlanType: "paid_on_delivery" }),
    ).toBe(0);
  });

  it("calcula percentual recebido com base no target ajustado", () => {
    expect(
      getFreightReceivedPercentage({
        grossValue: 1000,
        amountReceived: 500,
        receivablePlanType: "paid_on_delivery",
        balanceAdjustments: [{ type: "discount", amount: 200 }],
      }),
    ).toBe(62.5);

    expect(
      getFreightReceivedPercentage({
        grossValue: 1000,
        amountReceived: 500,
        receivablePlanType: "paid_on_delivery",
        balanceAdjustments: [{ type: "increase", amount: 250 }],
      }),
    ).toBe(40);
  });

  it("deriva status conforme regra da PR4", () => {
    const referenceDate = new Date("2026-04-08T12:00:00.000Z");

    expect(
      getFreightReceivableStatus(
        { grossValue: 1000, amountReceived: 1000, paymentDueDate: "2026-04-01", receivablePlanType: "paid_on_delivery" },
        referenceDate,
      ),
    ).toBe("received");

    expect(
      getFreightReceivableStatus(
        { grossValue: 1000, amountReceived: 300, paymentDueDate: "2026-04-01", receivablePlanType: "paid_on_delivery" },
        referenceDate,
      ),
    ).toBe("overdue");

    expect(
      getFreightReceivableStatus(
        { grossValue: 1000, amountReceived: 300, paymentDueDate: "2026-04-30", receivablePlanType: "paid_on_delivery" },
        referenceDate,
      ),
    ).toBe("partial");

    expect(
      getFreightReceivableStatus(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: "2026-04-01", receivablePlanType: "paid_on_delivery" },
        referenceDate,
      ),
    ).toBe("overdue");

    expect(
      getFreightReceivableStatus(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: "2026-04-30", receivablePlanType: "paid_on_delivery" },
        referenceDate,
      ),
    ).toBe("pending");
  });

  it("considera vencido apenas com saldo pendente e data vencida", () => {
    const referenceDate = new Date("2026-04-08T12:00:00.000Z");
    expect(
      isFreightOverdue(
        { grossValue: 500, amountReceived: 100, paymentDueDate: "2026-04-01", receivablePlanType: "paid_on_delivery" },
        referenceDate,
      ),
    ).toBe(true);

    expect(
      isFreightOverdue(
        { grossValue: 500, amountReceived: 500, paymentDueDate: "2026-04-01", receivablePlanType: "paid_on_delivery" },
        referenceDate,
      ),
    ).toBe(false);
  });

  it("usa o fim do dia local para vencimento (não UTC)", () => {
    const dueDate = "2026-04-08";
    const almostEndOfDay = new Date(2026, 3, 8, 23, 0, 0, 0);
    const nextDay = new Date(2026, 3, 9, 0, 0, 0, 0);

    expect(
      isFreightOverdue(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: dueDate, receivablePlanType: "paid_on_delivery" },
        almostEndOfDay,
      ),
    ).toBe(false);
    expect(
      isFreightOverdue(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: dueDate, receivablePlanType: "paid_on_delivery" },
        nextDay,
      ),
    ).toBe(true);
  });

  it("ignora datas inválidas de vencimento", () => {
    const referenceDate = new Date(2026, 3, 10, 12, 0, 0, 0);

    expect(
      isFreightOverdue(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: "2026-02-30", receivablePlanType: "paid_on_delivery" },
        referenceDate,
      ),
    ).toBe(false);
    expect(
      isFreightOverdue(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: "2026/04/08", receivablePlanType: "paid_on_delivery" },
        referenceDate,
      ),
    ).toBe(false);
  });

  it("separa adiantamento, saldo previsto, saldo ajustado e total recebido", () => {
    const freight = {
      grossValue: 2000,
      amountReceived: 950,
      advanceAmount: 700,
      balanceAdjustments: [
        { type: "discount" as const, amount: 100 },
        { type: "increase" as const, amount: 50 },
      ],
    };

    expect(getFreightAdvanceReceived(freight)).toBe(700);
    expect(getFreightPlannedBalance(freight)).toBe(1300);
    expect(getFreightAdjustedBalance(freight)).toBe(1250);
    expect(getFreightTotalReceived({ ...freight, receivablePlanType: "advance_value" })).toBe(950);
  });

  it("trata adiantamento como recebido no plano de adiantamento", () => {
    const freight = {
      grossValue: 2000,
      amountReceived: 0,
      advanceAmount: 700,
      receivablePlanType: "advance_value" as const,
      balanceAdjustments: [],
    };

    expect(getFreightTotalReceived(freight)).toBe(700);
    expect(getFreightRemainingBalance(freight)).toBe(1300);
  });

  it("não marca como quitado quando adiantamento ainda deixa saldo aberto", () => {
    const freight = {
      grossValue: 4500,
      amountReceived: 3600,
      advanceAmount: 3600,
      receivablePlanType: "advance_value" as const,
      balanceAdjustments: [],
    };

    expect(getFreightRemainingBalance(freight)).toBe(900);
    expect(isFreightSettled(freight)).toBe(false);
    expect(getFreightReceivableBadgeState({ ...freight, status: "completed" })).toBe("awaiting_balance");
  });

  it("pago integralmente considera target quitado, incluindo ajustes", () => {
    const freight = {
      grossValue: 1000,
      amountReceived: 0,
      advanceAmount: 0,
      receivablePlanType: "paid_in_full" as const,
      balanceAdjustments: [{ type: "increase" as const, amount: 100 }],
    };

    expect(getFreightReceivableTarget(freight)).toBe(1100);
    expect(getFreightTotalReceived(freight)).toBe(1100);
    expect(getFreightRemainingBalance(freight)).toBe(0);
  });

  it("calcula amountReceived de quitação sem perder base já recebida", () => {
    expect(
      getFreightAmountReceivedForSettlement({
        grossValue: 4500,
        amountReceived: 3150,
        advanceAmount: 3150,
        receivablePlanType: "advance_value",
        balanceAdjustments: [],
      }),
    ).toBe(4500);

    expect(
      getFreightAmountReceivedForSettlement({
        grossValue: 4500,
        amountReceived: 3150,
        advanceAmount: 3150,
        receivablePlanType: "advance_value",
        balanceAdjustments: [{ type: "discount", amount: 100 }],
      }),
    ).toBe(4400);

    expect(
      getFreightAmountReceivedForSettlement({
        grossValue: 4500,
        amountReceived: 3150,
        advanceAmount: 3150,
        receivablePlanType: "advance_value",
        balanceAdjustments: [{ type: "increase", amount: 200 }],
      }),
    ).toBe(4700);
  });

  it("mantém regras de planned/adjusted balance para paid_in_full e paid_on_delivery", () => {
    expect(
      getFreightPlannedBalance({
        grossValue: 1000,
        advanceAmount: 250,
        receivablePlanType: "paid_in_full",
      }),
    ).toBe(0);

    expect(
      getFreightPlannedBalance({
        grossValue: 1000,
        advanceAmount: 250,
        receivablePlanType: "paid_on_delivery",
      }),
    ).toBe(1000);

    expect(
      getFreightAdjustedBalance({
        grossValue: 1000,
        advanceAmount: 250,
        receivablePlanType: "paid_on_delivery",
        balanceAdjustments: [{ type: "discount", amount: 50 }],
      }),
    ).toBe(950);
  });

  it("retorna target zero e status coerente para receivablePlanType undefined", () => {
    const referenceDate = new Date("2026-04-08T12:00:00.000Z");
    const freight = {
      grossValue: 1200,
      amountReceived: 100,
      paymentDueDate: "2026-04-01",
      receivablePlanType: "undefined" as const,
      balanceAdjustments: [{ type: "increase" as const, amount: 30 }],
    };

    expect(getFreightReceivableTarget(freight)).toBe(0);
    expect(getFreightReceivableStatus(freight, referenceDate)).toBe("pending");
    expect(getFreightReceivableBadgeState({ ...freight, status: "in_progress" })).toBe("undefined");
  });

  it("identifica bloqueio por canhoto conforme modo de liberação", () => {
    expect(
      isFreightLockedByProof({
        deliveryProofStatus: "pending_send",
        balanceReleaseMode: "proof_photo",
      }),
    ).toBe(true);

    expect(
      isFreightLockedByProof({
        deliveryProofStatus: "confirmed",
        balanceReleaseMode: "proof_photo",
      }),
    ).toBe(false);
  });

  it("mantém fail-closed quando depende de canhoto e status documental está ausente", () => {
    expect(
      isFreightLockedByProof({
        deliveryProofStatus: undefined,
        balanceReleaseMode: "proof_photo",
      }),
    ).toBe(true);
  });

  it("reconhece frete quitado", () => {
    expect(isFreightSettled({ grossValue: 1500, amountReceived: 1500, receivablePlanType: "paid_on_delivery" })).toBe(true);
    expect(isFreightSettled({ grossValue: 1500, amountReceived: 1499.99, receivablePlanType: "paid_on_delivery" })).toBe(false);
  });

  it("considera balanceAdjustments na meta real de quitação e status", () => {
    const freight = {
      grossValue: 1000,
      amountReceived: 930,
      receivablePlanType: "paid_on_delivery" as const,
      balanceAdjustments: [
        { type: "increase" as const, amount: 80 },
        { type: "discount" as const, amount: 50 },
      ],
      paymentDueDate: "2026-04-30",
    };

    expect(isFreightSettled(freight)).toBe(false);
    expect(getFreightReceivableStatus(freight, new Date("2026-04-20T12:00:00.000Z"))).toBe("partial");

    const settledFreight = { ...freight, amountReceived: 1030 };
    expect(isFreightSettled(settledFreight)).toBe(true);
    expect(getFreightReceivableStatus(settledFreight, new Date("2026-04-20T12:00:00.000Z"))).toBe("received");
  });

  it("status principal permanece pendente quando saldo está travado por canhoto", () => {
    const referenceDate = new Date("2026-04-20T12:00:00.000Z");
    expect(
      getFreightReceivableStatus(
        {
          grossValue: 1000,
          amountReceived: 300,
          paymentDueDate: "2026-04-01",
          deliveryProofStatus: "pending_send",
          balanceReleaseMode: "proof_photo",
        },
        referenceDate,
      ),
    ).toBe("pending");
  });

  it("resume badge de recebimento em estados enxutos", () => {
    expect(
      getFreightReceivableBadgeState({
        grossValue: 1000,
        amountReceived: 0,
        advanceAmount: 0,
        paymentDueDate: undefined,
        receivablePlanType: "paid_on_delivery",
        status: "in_progress",
      }),
    ).toBe("after_delivery");

    expect(
      getFreightReceivableBadgeState(
        {
          grossValue: 1000,
          amountReceived: 200,
          advanceAmount: 0,
          paymentDueDate: "2026-04-11",
          receivablePlanType: "paid_on_delivery",
          status: "completed",
        },
        new Date("2026-04-11T08:00:00.000Z"),
      ),
    ).toBe("due_today");

    expect(
      getFreightReceivableBadgeState(
        {
          grossValue: 1000,
          amountReceived: 200,
          advanceAmount: 0,
          paymentDueDate: "2026-04-10",
          receivablePlanType: "paid_on_delivery",
          status: "completed",
        },
        new Date("2026-04-11T08:00:00.000Z"),
      ),
    ).toBe("overdue");
  });

  it("deriva estados visuais da previsão de pagamento", () => {
    const base = {
      grossValue: 1000,
      amountReceived: 200,
      receivablePlanType: "paid_on_delivery" as const,
      balanceAdjustments: [],
    };

    expect(
      getFreightPaymentForecastState(
        { ...base, paymentDueDate: undefined },
        new Date("2026-04-11T09:00:00.000Z"),
      ),
    ).toBe("no_forecast");
    expect(
      getFreightPaymentForecastState(
        { ...base, paymentDueDate: "2026-04-15" },
        new Date("2026-04-11T09:00:00.000Z"),
      ),
    ).toBe("on_track");
    expect(
      getFreightPaymentForecastState(
        { ...base, paymentDueDate: "2026-04-12" },
        new Date("2026-04-11T09:00:00.000Z"),
      ),
    ).toBe("approaching");
    expect(
      getFreightPaymentForecastState(
        { ...base, paymentDueDate: "2026-04-11" },
        new Date("2026-04-11T09:00:00.000Z"),
      ),
    ).toBe("due_today");
    expect(
      getFreightPaymentForecastState(
        { ...base, paymentDueDate: "2026-04-10" },
        new Date("2026-04-11T09:00:00.000Z"),
      ),
    ).toBe("overdue");
    expect(
      getFreightPaymentForecastState(
        { ...base, amountReceived: 1000, paymentDueDate: "2026-04-10" },
        new Date("2026-04-11T09:00:00.000Z"),
      ),
    ).toBe("settled");
  });
});
