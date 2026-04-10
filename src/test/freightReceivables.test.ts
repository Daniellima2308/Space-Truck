import {
  getFreightAdjustedBalance,
  getFreightAdvanceReceived,
  getFreightPlannedBalance,
  getFreightReceivableStatus,
  getFreightReceivedPercentage,
  getFreightTotalReceived,
  getFreightRemainingBalance,
  isFreightLockedByProof,
  isFreightSettled,
  isFreightOverdue,
} from "@/lib/freightReceivables";

describe("freightReceivables", () => {
  it("calcula saldo restante sem negativo", () => {
    expect(
      getFreightRemainingBalance({ grossValue: 1000, amountReceived: 250 }),
    ).toBe(750);
    expect(
      getFreightRemainingBalance({ grossValue: 1000, amountReceived: 1200 }),
    ).toBe(0);
  });

  it("calcula percentual recebido limitado a 100", () => {
    expect(
      getFreightReceivedPercentage({ grossValue: 1000, amountReceived: 500 }),
    ).toBe(50);
    expect(
      getFreightReceivedPercentage({ grossValue: 1000, amountReceived: 5000 }),
    ).toBe(100);
    expect(
      getFreightReceivedPercentage({ grossValue: 0, amountReceived: 0 }),
    ).toBe(0);
    expect(
      getFreightReceivedPercentage({ grossValue: 0, amountReceived: 1000 }),
    ).toBe(0);
  });

  it("deriva status conforme regra da PR4", () => {
    const referenceDate = new Date("2026-04-08T12:00:00.000Z");

    expect(
      getFreightReceivableStatus(
        { grossValue: 1000, amountReceived: 1000, paymentDueDate: "2026-04-01" },
        referenceDate,
      ),
    ).toBe("received");

    expect(
      getFreightReceivableStatus(
        { grossValue: 1000, amountReceived: 300, paymentDueDate: "2026-04-01" },
        referenceDate,
      ),
    ).toBe("overdue");

    expect(
      getFreightReceivableStatus(
        { grossValue: 1000, amountReceived: 300, paymentDueDate: "2026-04-30" },
        referenceDate,
      ),
    ).toBe("partial");

    expect(
      getFreightReceivableStatus(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: "2026-04-01" },
        referenceDate,
      ),
    ).toBe("overdue");

    expect(
      getFreightReceivableStatus(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: "2026-04-30" },
        referenceDate,
      ),
    ).toBe("pending");
  });

  it("considera vencido apenas com saldo pendente e data vencida", () => {
    const referenceDate = new Date("2026-04-08T12:00:00.000Z");
    expect(
      isFreightOverdue(
        { grossValue: 500, amountReceived: 100, paymentDueDate: "2026-04-01" },
        referenceDate,
      ),
    ).toBe(true);

    expect(
      isFreightOverdue(
        { grossValue: 500, amountReceived: 500, paymentDueDate: "2026-04-01" },
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
        { grossValue: 1000, amountReceived: 0, paymentDueDate: dueDate },
        almostEndOfDay,
      ),
    ).toBe(false);
    expect(
      isFreightOverdue(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: dueDate },
        nextDay,
      ),
    ).toBe(true);
  });

  it("ignora datas inválidas de vencimento", () => {
    const referenceDate = new Date(2026, 3, 10, 12, 0, 0, 0);

    expect(
      isFreightOverdue(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: "2026-02-30" },
        referenceDate,
      ),
    ).toBe(false);
    expect(
      isFreightOverdue(
        { grossValue: 1000, amountReceived: 0, paymentDueDate: "2026/04/08" },
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
    expect(getFreightTotalReceived(freight)).toBe(950);
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

  it("reconhece frete quitado", () => {
    expect(isFreightSettled({ grossValue: 1500, amountReceived: 1500 })).toBe(true);
    expect(isFreightSettled({ grossValue: 1500, amountReceived: 1499.99 })).toBe(false);
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
});
