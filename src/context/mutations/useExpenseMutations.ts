import { useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppData, Expense, PersonalExpense } from "@/types";
import {
  isOnline,
  addToOfflineQueue,
} from "@/lib/offlineQueue";
import {
  getNumericWarnings,
  validatePositiveNumber,
} from "@/lib/fieldValidation";
import {
  showActionSuccess,
  showActionError,
  showOfflineSaved,
  showWarnings,
} from "./helpers";

interface ExpenseMutationsParams {
  user: User | null;
  data: AppData;
  fetchData: (options?: { throwOnError?: boolean }) => Promise<void>;
}

export function useExpenseMutations({ user, data, fetchData }: ExpenseMutationsParams) {
  const addExpense = useCallback(
    async (tripId: string, e: Omit<Expense, "id" | "tripId">) => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

      const valueValidation = validatePositiveNumber(
        e.value,
        "Valor da despesa",
      );
      if (!valueValidation.isValid) {
        showActionError(
          "Não foi possível salvar agora",
          valueValidation.message,
        );
        return;
      }
      showWarnings(getNumericWarnings({ totalValue: e.value }));

      if (!isOnline()) {
        addToOfflineQueue({
          type: "addExpense",
          payload: {
            trip_id: tripId,
            category: e.category,
            description: e.description,
            value: e.value,
            date: e.date,
            receipt_url: e.receiptUrl || null,
          },
        });
        showOfflineSaved("Despesa salva");
        return;
      }

      await supabase.from("expenses").insert({
        trip_id: tripId,
        user_id: user.id,
        category: e.category,
        description: e.description,
        value: e.value,
        date: e.date,
        receipt_url: e.receiptUrl || null,
      });
      await fetchData();
      showActionSuccess("Despesa salva");
    },
    [user, fetchData],
  );

  const deleteExpense = useCallback(
    async (_tripId: string, expenseId: string) => {
      if (!isOnline()) {
        addToOfflineQueue({
          type: "deleteExpense",
          payload: { id: expenseId },
        });
        showOfflineSaved("Despesa excluída");
        return;
      }
      await supabase.from("expenses").delete().eq("id", expenseId);
      await fetchData();
    },
    [fetchData],
  );

  const updateExpense = useCallback(
    async (
      _tripId: string,
      expenseId: string,
      e: Omit<Expense, "id" | "tripId">,
    ) => {
      const valueValidation = validatePositiveNumber(
        e.value,
        "Valor da despesa",
      );
      if (!valueValidation.isValid) {
        showActionError(
          "Não foi possível salvar agora",
          valueValidation.message,
        );
        return;
      }
      showWarnings(getNumericWarnings({ totalValue: e.value }));

      if (!isOnline()) {
        addToOfflineQueue({
          type: "updateExpense",
          payload: {
            id: expenseId,
            category: e.category,
            description: e.description,
            value: e.value,
            date: e.date,
            receipt_url: e.receiptUrl || null,
          },
        });
        showOfflineSaved("Despesa atualizada");
        return;
      }

      const { error: updateExpenseError } = await supabase
        .from("expenses")
        .update({
          category: e.category,
          description: e.description,
          value: e.value,
          date: e.date,
          receipt_url: e.receiptUrl || null,
        })
        .eq("id", expenseId);
      if (updateExpenseError) {
        showActionError(
          "Não foi possível salvar agora",
          updateExpenseError.message || "Falha ao atualizar a despesa.",
        );
        return;
      }
      await fetchData();
      showActionSuccess("Despesa atualizada");
    },
    [fetchData],
  );

  const addPersonalExpense = useCallback(
    async (tripId: string, e: Omit<PersonalExpense, "id" | "tripId">) => {
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

      const valueValidation = validatePositiveNumber(
        e.value,
        "Valor do gasto pessoal",
      );
      if (!valueValidation.isValid) {
        showActionError(
          "Não foi possível salvar agora",
          valueValidation.message,
        );
        return;
      }
      showWarnings(getNumericWarnings({ totalValue: e.value }));

      if (!isOnline()) {
        addToOfflineQueue({
          type: "addPersonalExpense",
          payload: {
            trip_id: tripId,
            category: e.category,
            description: e.description,
            value: e.value,
            date: e.date,
          },
        });
        showOfflineSaved("Gasto pessoal salvo");
        return;
      }

      await supabase.from("personal_expenses").insert({
        trip_id: tripId,
        user_id: user.id,
        category: e.category,
        description: e.description,
        value: e.value,
        date: e.date,
      });
      await fetchData();
      showActionSuccess("Gasto pessoal salvo");
    },
    [user, fetchData],
  );

  const deletePersonalExpense = useCallback(
    async (_tripId: string, id: string) => {
      if (!isOnline()) {
        addToOfflineQueue({ type: "deletePersonalExpense", payload: { id } });
        showOfflineSaved("Gasto pessoal removido");
        return;
      }
      await supabase.from("personal_expenses").delete().eq("id", id);
      await fetchData();
    },
    [fetchData],
  );

  const updatePersonalExpense = useCallback(
    async (
      _tripId: string,
      id: string,
      e: Omit<PersonalExpense, "id" | "tripId">,
    ) => {
      const valueValidation = validatePositiveNumber(
        e.value,
        "Valor do gasto pessoal",
      );
      if (!valueValidation.isValid) {
        showActionError(
          "Não foi possível salvar agora",
          valueValidation.message,
        );
        return;
      }
      showWarnings(getNumericWarnings({ totalValue: e.value }));

      if (!isOnline()) {
        addToOfflineQueue({
          type: "updatePersonalExpense",
          payload: {
            id: id,
            category: e.category,
            description: e.description,
            value: e.value,
            date: e.date,
          },
        });
        showOfflineSaved("Gasto pessoal atualizado");
        return;
      }

      const { error: updatePersonalExpenseError } = await supabase
        .from("personal_expenses")
        .update({
          category: e.category,
          description: e.description,
          value: e.value,
          date: e.date,
        })
        .eq("id", id);
      if (updatePersonalExpenseError) {
        showActionError(
          "Não foi possível salvar agora",
          updatePersonalExpenseError.message || "Falha ao atualizar o gasto pessoal.",
        );
        return;
      }
      await fetchData();
    },
    [fetchData],
  );

  const clearHistory = useCallback(async () => {
    const finishedTripIds = data.trips
      .filter((t) => t.status === "finished")
      .map((t) => t.id);
    if (finishedTripIds.length === 0) return;
    await supabase.from("trips").delete().in("id", finishedTripIds);
    await fetchData();
  }, [data.trips, fetchData]);

  return {
    addExpense,
    updateExpense,
    deleteExpense,
    addPersonalExpense,
    updatePersonalExpense,
    deletePersonalExpense,
    clearHistory,
  };
}