import data from '@/content/reports.json';
import type { Evidence, Report, TimelineReport } from './types';

export const reports = data.reports as Report[];
export const evidence = data.evidence as Evidence[];
export const evidenceById = new Map(evidence.map(item => [item.id, item]));
export const timelineReports: TimelineReport[] = reports.map(({ id, date, dateNote, title, module, count }) =>
  ({ id, date, dateNote, title, module, count, dateLabel: formatDate(date) }));

export function getReport(id: string): Report | undefined {
  return reports.find(report => report.id === id);
}

export function formatDate(value: string): string {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
