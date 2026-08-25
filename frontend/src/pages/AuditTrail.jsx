import { PageHeader } from '../components/layout/PageHeader';
import { AuditTab } from '../components/case/AuditTab';

export function AuditTrail() {
  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Compliance"
        title="Audit trail"
        description="Append-only record of every sensitive action across the platform."
      />
      <AuditTab />
    </div>
  );
}
