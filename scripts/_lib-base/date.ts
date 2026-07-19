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
  // dueDate は dateOnlyToUtcStartIso で UTC 深夜 0 時として保存されるため、
  // カレンダー上の期日は UTC の日付そのもの。ローカル getter で読むと UTC より
  // 西のタイムゾーンでは前日にずれて 1 日早く期限切れ扱いになるので UTC で取り出す。
  // 「今日」はユーザーの体感に合わせてローカル日付のまま比較する。
  const dueKey = dateOnlyFromValue(dueDate);
  const todayKey = localDateOnly(new Date());
  return dueKey < todayKey;
}
