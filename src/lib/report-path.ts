const VALID_REPORT_WEEKS = new Set(['4', '8', '12']);

export function normalizeReportWeeksParam(value: string | null | undefined): '4' | '8' | '12' {
  if (!value) {
    return '4';
  }

  return VALID_REPORT_WEEKS.has(value) ? (value as '4' | '8' | '12') : '4';
}

export function buildWeeklyReportExportPath(weeks: string): string {
  const normalizedWeeks = normalizeReportWeeksParam(weeks);
  return `/report/weekly/export?weeks=${normalizedWeeks}`;
}
