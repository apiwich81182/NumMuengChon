export function normalizeBoolean(value: unknown, alternateValue?: unknown): boolean {
  return [value, alternateValue].some(
    (item) => item === true || item === "true" || item === "on"
  );
}

export function firstUrl(...values: unknown[]): string | null {
  const url = values.find((value): value is string => typeof value === "string" && value.length > 0);
  return url || null;
}

export function normalizeAmount(value: unknown): number {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}
