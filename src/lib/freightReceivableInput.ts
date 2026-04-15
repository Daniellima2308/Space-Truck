export interface AdvancePercentParseResult {
  value: number | null;
  normalized: string;
  error?: string;
}

export function parseAdvancePercentInput(raw: string): AdvancePercentParseResult {
  const input = raw.trim().replace(',', '.');
  if (!input) {
    return { value: null, normalized: "", error: "Informe o percentual do adiantamento." };
  }

  const ratioMatch = input.match(/^(\d{1,3})(?:\.\d+)?\s*\/\s*(\d{1,3})(?:\.\d+)?$/);
  if (ratioMatch) {
    const left = Number(ratioMatch[1]);
    const right = Number(ratioMatch[2]);
    if (!Number.isFinite(left) || !Number.isFinite(right) || right <= 0) {
      return { value: null, normalized: input, error: "Use proporções válidas como 80/20." };
    }
    if (left + right !== 100) {
      return {
        value: null,
        normalized: input,
        error: "Use uma divisão que feche em 100, como 80/20 ou 70/30.",
      };
    }
    return { value: left, normalized: `${left}` };
  }

  const percentMatch = input.match(/^(\d{1,3}(?:\.\d+)?)\s*%?$/);
  if (!percentMatch) {
    return {
      value: null,
      normalized: input,
      error: "Não consegui entender. Use 80, 80% ou 80/20.",
    };
  }

  const value = Number(percentMatch[1]);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { value: null, normalized: input, error: "Use um percentual entre 0 e 100." };
  }

  return {
    value,
    normalized: Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, ""),
  };
}
