import ReportView from '@/components/ReportView';
import { reports } from '@/lib/reports';

export default function Home() {
  return <ReportView report={[...reports].sort((a,b)=>b.date.localeCompare(a.date))[0]} />;
}
