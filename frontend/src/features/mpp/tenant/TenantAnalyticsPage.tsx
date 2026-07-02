import QueueAnalytics from "../QueueAnalytics";
import { useTenantScope } from "../TenantLayout";

export default function TenantAnalyticsPage() {
  const { tenant } = useTenantScope();
  return <QueueAnalytics instansi={tenant.id} title={`Analitik — ${tenant.name}`} />;
}
