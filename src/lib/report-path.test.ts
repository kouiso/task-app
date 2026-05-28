import { buildWeeklyReportExportPath, normalizeReportWeeksParam } from './report-path';

describe('report path helpers', () => {
  it('normalizes invalid week values to default', () => {
    expect(normalizeReportWeeksParam('1')).toBe('4');
    expect(normalizeReportWeeksParam('')).toBe('4');
    expect(normalizeReportWeeksParam(undefined)).toBe('4');
  });

  it('keeps valid week values', () => {
    expect(normalizeReportWeeksParam('4')).toBe('4');
    expect(normalizeReportWeeksParam('8')).toBe('8');
    expect(normalizeReportWeeksParam('12')).toBe('12');
  });

  it('builds report export path with normalized weeks', () => {
    expect(buildWeeklyReportExportPath('8')).toBe('/report/weekly/export?weeks=8');
    expect(buildWeeklyReportExportPath('10')).toBe('/report/weekly/export?weeks=4');
  });
});
