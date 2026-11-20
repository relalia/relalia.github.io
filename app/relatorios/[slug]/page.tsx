import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReport, reports } from '@/lib/reports';
import ReportView from '@/components/ReportView';

export function generateStaticParams() {
  return reports.map(report => ({ slug: report.id }));
}

type ReportPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const report = getReport((await params).slug);
  return report?.manualLegalTest ? { title: report.title.replaceAll('\n', ' ') } : {};
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { slug } = await params;
  const report = getReport(slug);
  if (!report) notFound();
  return <ReportView report={report} />;
}
