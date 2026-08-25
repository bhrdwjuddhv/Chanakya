import { useState } from 'react';
import { Fingerprint, ScanFace } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Tabs } from '../components/ui';
import { FaceSearchPanel } from '../components/biometrics/FaceSearchPanel';
import { FingerprintSearchPanel } from '../components/biometrics/FingerprintSearchPanel';

/**
 * Face and fingerprint search run against the real InsightFace and AFIS engines.
 * Scores and candidates shown here are exactly what the matcher returned.
 */
export function Biometrics() {
  const [tab, setTab] = useState('face');

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Forensics"
        title="Biometrics"
        description="1:N face search and fingerprint matching. Every score comes from the matcher itself; every identification is a human decision."
      >
        <Tabs
          className="mt-3"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'face', label: 'Face recognition', icon: ScanFace },
            { value: 'fingerprint', label: 'Fingerprint', icon: Fingerprint },
          ]}
        />
      </PageHeader>

      <div className="mx-auto max-w-[1200px] p-6">
        {tab === 'face' && <FaceSearchPanel />}
        {tab === 'fingerprint' && <FingerprintSearchPanel />}
      </div>
    </div>
  );
}
