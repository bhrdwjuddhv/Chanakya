import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  FileStack,
  FileText,
  LayoutList,
  MapPin,
  FileSearch,
  Globe,
  Network,
  ScanFace,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { get } from '../lib/api';
import { Badge, ErrorState, Spinner, Tabs } from '../components/ui';
import { OverviewTab } from '../components/case/OverviewTab';
import { GraphTab } from '../components/case/GraphTab';
import { EvidenceTab } from '../components/case/EvidenceTab';
import { TimelineTab } from '../components/case/TimelineTab';
import { MapTab } from '../components/case/MapTab';
import { PatternsTab } from '../components/case/PatternsTab';
import { ForensicsTab } from '../components/case/ForensicsTab';
import { OsintTab } from '../components/case/OsintTab';
import { ReportsTab } from '../components/case/ReportsTab';
import { AssistantTab } from '../components/ai/AssistantTab';
import { FaceSearchPanel } from '../components/biometrics/FaceSearchPanel';
import { AuditTab } from '../components/case/AuditTab';
import { PRIORITY_STYLES } from '../lib/utils';

export function CaseDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState('overview');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['case', id],
    queryFn: () => get(`/cases/${id}`),
  });

  if (isLoading) return <Spinner label="Loading case" className="flex-1" />;
  if (error) return <ErrorState error={error} onRetry={refetch} className="flex-1" />;

  const caseData = data.case;
  const tabs = [
    { value: 'overview', label: 'Overview', icon: LayoutList },
    { value: 'graph', label: 'Relationship graph', icon: Network, count: caseData.stats.nodeCount },
    { value: 'patterns', label: 'Patterns', icon: TriangleAlert },
    { value: 'evidence', label: 'Evidence', icon: FileStack, count: caseData.stats.evidenceCount },
    { value: 'timeline', label: 'Timeline', icon: CalendarClock, count: caseData.stats.timelineCount },
    { value: 'map', label: 'Map', icon: MapPin, count: caseData.stats.locationCount },
    { value: 'forensics', label: 'Forensics', icon: FileSearch },
    { value: 'osint', label: 'OSINT', icon: Globe },
    { value: 'biometrics', label: 'Biometrics', icon: ScanFace },
    { value: 'reports', label: 'Reports', icon: FileText },
    { value: 'assistant', label: 'Assistant', icon: Sparkles },
    { value: 'audit', label: 'Audit', icon: Activity },
  ];

  // The graph and map own their full height; the rest scroll normally.
  const fullHeight = ['graph', 'map', 'assistant'].includes(tab);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background px-6 pt-4">
        <Link
          to="/cases"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> All cases
        </Link>

        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[12px] font-normal text-muted-foreground">{caseData.caseNumber}</span>
              <Badge className={PRIORITY_STYLES[caseData.priority]}>{caseData.priority}</Badge>
              <Badge className="capitalize">{caseData.status.replace('_', ' ')}</Badge>
              <Badge className="uppercase tracking-micro !text-[10px]">{caseData.classification}</Badge>
            </div>
            <h1 className="text-[26px] mt-1.5">{caseData.title}</h1>
          </div>
        </div>

        <Tabs tabs={tabs} value={tab} onChange={setTab} className="mt-3" />
      </div>

      <div className={fullHeight ? 'flex-1 min-h-0' : 'flex-1 overflow-y-auto'}>
        {tab === 'overview' && <OverviewTab caseData={caseData} onOpenTab={setTab} />}
        {tab === 'graph' && <GraphTab caseId={id} />}
        {tab === 'patterns' && <PatternsTab caseId={id} />}
        {tab === 'evidence' && <EvidenceTab caseId={id} />}
        {tab === 'timeline' && <TimelineTab caseId={id} />}
        {tab === 'map' && <MapTab caseId={id} />}
        {tab === 'forensics' && <ForensicsTab caseId={id} />}
        {tab === 'osint' && <OsintTab caseId={id} />}
        {tab === 'reports' && <ReportsTab caseId={id} />}
        {tab === 'biometrics' && (
          <div className="p-6">
            <FaceSearchPanel caseId={id} />
          </div>
        )}
        {tab === 'assistant' && <AssistantTab caseId={id} />}
        {tab === 'audit' && <AuditTab caseId={id} />}
      </div>
    </div>
  );
}
