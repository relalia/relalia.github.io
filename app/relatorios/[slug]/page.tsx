import { notFound } from 'next/navigation';
import { getReport, reports } from '@/lib/reports';
import ReportView from '@/components/ReportView';

export function generateStaticParams() {
  return reports.map(report => ({ slug: report.id }));
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getReport(slug);
  if (!report) notFound();
  return <ReportView report={report} />;
}
