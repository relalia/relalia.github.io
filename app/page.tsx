import ReportView from '@/components/ReportView';
import { getReport } from '@/lib/reports';

export default function Home() {
  return <ReportView report={getReport('today')!} />;
}
