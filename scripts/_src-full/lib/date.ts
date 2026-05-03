function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function dateOnlyFromValue(value: Date | string): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

export function formatDateOnly(value: Date | string, separator = '/'): string {
  return dateOnlyFromValue(value).replaceAll('-', separator);
}

export function localDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function dateOnlyToUtcStartIso(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00.000Z`).toISOString();
}

export function dateOnlyToUtcEndIso(dateOnly: string): string {
  return new Date(`${dateOnly}T23:59:59.999Z`).toISOString();
}
