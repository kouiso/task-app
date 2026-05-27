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

/** dueDate がローカル日付で今日より過去なら true (今日は含めない) */
export function isOverdue(dueDate: Date | string | null | undefined): boolean {
  if (!dueDate) {
    return false;
  }
  // Date は toISOString が UTC を返すため、JST など UTC と差がある環境では日付がずれる。
  // ローカル日付で比較するため Date の場合は localDateOnly を用いる。
  // 文字列 (YYYY-MM-DDTHH:mm:ss...) は先頭 10 文字をそのまま日付として扱う。
  const dueKey = typeof dueDate === 'string' ? dueDate.slice(0, 10) : localDateOnly(dueDate);
  const todayKey = localDateOnly(new Date());
  return dueKey < todayKey;
}
