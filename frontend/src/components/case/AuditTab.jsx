import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { get } from '../../lib/api';
import { Badge, Card, EmptyState, ErrorState, Spinner, Table, Td, Th, Tr } from '../ui';
import { formatDateTime } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

/** Append-only history. Everything sensitive the app does lands here. */
export function AuditTab({ caseId }) {
  const { t, lang } = useI18n();
  const path = caseId ? `/cases/${caseId}/audit` : '/audit?limit=200';
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit', caseId || 'all'],
    queryFn: () => get(path),
  });

  if (isLoading) return <Spinner label={lang === 'hi' ? 'ऑडिट लॉग लोड हो रहा है...' : 'Loading audit trail'} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const entries = data?.entries || [];
  if (!entries.length) {
    return (
      <div className="mx-auto max-w-[1200px] p-6">
        <Card>
          <EmptyState
            icon={Activity}
            title={lang === 'hi' ? 'कोई गतिविधि दर्ज नहीं है' : 'No recorded activity'}
            description={lang === 'hi' ? 'साक्ष्य अपलोड, एआई प्रश्नोत्तर एवं पुष्टि जैसी संवेदनशील कार्रवाइयां यहाँ स्थायी रूप से दर्ज होती हैं।' : 'Actions such as uploads, AI queries and confirmations are logged here as they happen.'}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <Card className="overflow-hidden">
        <Table>
          <thead>
            <tr className="border-b border-border">
              <Th>{lang === 'hi' ? 'समय / दिनांक' : 'When'}</Th>
              <Th>{lang === 'hi' ? 'अधिकारी / यूज़र' : 'Who'}</Th>
              <Th>{lang === 'hi' ? 'कार्रवाई (Action)' : 'Action'}</Th>
              <Th>{lang === 'hi' ? 'संसाधन (Resource)' : 'Resource'}</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <Tr key={entry._id}>
                <Td mono className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(entry.timestamp)}
                </Td>
                <Td>
                  <span className="text-[13px] text-foreground">{entry.userName || (lang === 'hi' ? 'सिस्टम' : 'system')}</span>
                  {entry.role && <span className="label ml-2 !text-[10px]">{entry.role}</span>}
                </Td>
                <Td>
                  <Badge className={actionStyle(entry.action)}>
                    {entry.action.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                </Td>
                <Td className="text-[12px] text-muted-foreground">
                  {entry.resourceType || '—'}
                  {entry.metadata?.filename && (
                    <span className="ml-2 font-mono text-[12px] font-normal text-foreground">
                      {entry.metadata.filename}
                    </span>
                  )}
                  {entry.metadata?.status && (
                    <span className="ml-2 font-mono text-[12px] font-normal text-foreground">
                      → {entry.metadata.status}
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function actionStyle(action) {
  if (action.startsWith('DELETE') || action.startsWith('REJECT')) {
    return 'bg-destructive/12 text-destructive border-destructive/30';
  }
  if (action.startsWith('CONFIRM')) return 'bg-success/12 text-success border-success/25';
  if (action.startsWith('CREATE') || action.startsWith('UPLOAD') || action.startsWith('ENROLL')) {
    return 'bg-info/12 text-info border-info/25';
  }
  if (action.includes('SEARCH') || action.startsWith('ASK') || action.startsWith('RUN')) {
    return 'bg-ai/12 text-ai border-ai/25';
  }
  return 'bg-muted text-muted-foreground border-border';
}
