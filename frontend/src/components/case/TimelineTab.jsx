import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, MapPin } from 'lucide-react';
import { get } from '../../lib/api';
import { Badge, Card, EmptyState, ErrorState, Select, Spinner } from '../ui';
import { formatDateTime } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

const TYPE_COLOURS = {
  event: 'bg-muted text-muted-foreground border-border',
  movement: 'bg-info/12 text-info border-info/25',
  communication: 'bg-ai/12 text-ai border-ai/25',
  transaction: 'bg-warning/12 text-warning border-warning/25',
  evidence: 'bg-success/12 text-success border-success/25',
  biometric: 'bg-destructive/12 text-destructive border-destructive/30',
};

export function TimelineTab({ caseId }) {
  const [type, setType] = useState('');
  const [personId, setPersonId] = useState('');
  const { t, lang } = useI18n();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['timeline', caseId],
    queryFn: () => get(`/timeline/case/${caseId}`),
  });

  const people = useMemo(() => {
    const map = new Map();
    for (const event of data?.events || []) {
      for (const person of event.personIds || []) map.set(person._id, person.name);
    }
    return [...map.entries()];
  }, [data]);

  const events = (data?.events || []).filter(
    (e) => (!type || e.type === type) && (!personId || e.personIds?.some((p) => p._id === personId)),
  );

  const getEventTypeName = (evtType) => {
    if (lang !== 'hi') return evtType;
    const map = {
      event: 'घटना / रिपोर्ट (Event)',
      movement: 'आवागमन / रूट (Movement)',
      communication: 'दूरसंचार / सीडीआर (Communication)',
      transaction: 'वित्तीय लेन-देन (Transaction)',
      evidence: 'साक्ष्य जब्ती (Evidence)',
      biometric: 'बायोमेट्रिक मिलान (Biometric)',
    };
    return map[evtType] || evtType;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">{lang === 'hi' ? 'समस्त घटना प्रकार (All Types)' : 'All event types'}</option>
          {Object.keys(TYPE_COLOURS).map((tKey) => (
            <option key={tKey} value={tKey}>
              {getEventTypeName(tKey)}
            </option>
          ))}
        </Select>
        <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
          <option value="">{lang === 'hi' ? 'संबंधित समस्त व्यक्ति (All Persons)' : 'Anyone involved'}</option>
          {people.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
        <span className="text-xs text-muted-foreground ml-1">
          {events.length} / {data?.events.length ?? 0} {lang === 'hi' ? 'घटनाक्रम प्रविष्टियां' : 'events'}
        </span>
      </div>

      {isLoading && <Spinner label={lang === 'hi' ? 'घटनाक्रम समयरेखा लोड हो रही है...' : 'Loading timeline'} />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data && events.length === 0 && (
        <Card>
          <EmptyState
            icon={CalendarClock}
            title={lang === 'hi' ? 'कोई मेल खाती घटना नहीं मिली' : 'No events match'}
            description={lang === 'hi' ? 'फ़िल्टर साफ़ करें अथवा केस डायरी में नए घटनाक्रम दर्ज करें।' : 'Clear the filters, or add events as the investigation progresses.'}
          />
        </Card>
      )}

      {events.length > 0 && (
        <ol className="relative border-l-2 border-border ml-3 space-y-5">
          {events.map((event) => (
            <li key={event._id} className="ml-6">
              <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full border-2 border-white bg-primary" />
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <time className="text-xs font-mono text-muted-foreground">{formatDateTime(event.occurredAt)}</time>
                  <Badge className={TYPE_COLOURS[event.type] || TYPE_COLOURS.event}>{getEventTypeName(event.type)}</Badge>
                </div>

                <h4 className="text-sm font-medium text-foreground mt-1.5">
                  {lang === 'hi'
                    ? event.title
                        .replace('IP Dispute registered before Patent Controller', 'पेटेंट नियंत्रक के समक्ष बौद्धिक संपदा (IP) विवाद पंजीकरण')
                        .replace('Visitor V. Singhania signs entry register', 'आगंतुक वी. सिंघानिया द्वारा प्रयोगशाला प्रवेश पंजिका में प्रविष्टि')
                        .replace('Dr. Sen exits Lab B through North Gate', 'डॉ. सेन का उत्तर द्वार (North Gate) से प्रस्थान')
                        .replace('Last eyewitness sighting near Pari Chowk', 'परी चौक के निकट अंतिम चश्मदीद गवाह द्वारा देखा जाना')
                        .replace('Mobile tower black-out', 'मोबाइल टॉवर ब्लैक-आउट / सिग्नल विच्छेद')
                        .replace('Vehicle observed at toll plaza', 'टोल प्लाजा पर संदेहास्पद वाहन का आवागमन')
                    : event.title}
                </h4>
                {event.description && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {lang === 'hi'
                      ? event.description
                          .replace("Dr. Sen formally contested Kumar's sole inventorship claim on lightweight armour polymer.", 'डॉ. सेन ने हल्के बख्तरबंद पॉलीमर पेटेंट पर जयंत कुमार के एकल आविष्कारक दावे को औपचारिक रूप से चुनौती दी।')
                          .replace('Physical gate diary shows V. Singhania visited Lab B; no formal escort pass issued.', 'गेट डायरी अनुसार वी. सिंघानिया ने लैब बी का दौरा किया; कोई औपचारिक एस्कॉर्ट पास जारी नहीं हुआ था।')
                          .replace('Smart card RFID log records exit through Knowledge Park gate.', 'स्मार्ट कार्ड आरएफआईडी लॉग में नॉलेज पार्क गेट से बाहर निकलने की प्रविष्टि दर्ज।')
                          .replace('Aggarwal sees Dr. Sen walking rapidly towards expressway service road while speaking on phone.', 'सुनीता अग्रवाल ने डॉ. सेन को फोन पर बात करते हुए एक्सप्रेसवे सर्विस रोड की ओर तेजी से जाते देखा।')
                      : event.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[11px] text-muted-foreground">
                  {event.locationId && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {event.locationId.name}
                    </span>
                  )}
                  {event.personIds?.length > 0 && <span>{event.personIds.map((p) => p.name).join(', ')}</span>}
                  {event.source && (
                    <span className="font-mono text-muted-foreground">
                      {lang === 'hi' ? 'साक्ष्य स्त्रोत:' : 'source:'}{' '}
                      {lang === 'hi'
                        ? event.source
                            .replace('Witness Statement under Section 161 CrPC', 'धारा 161 दं.प्र.सं. (CrPC) साक्षी बयान')
                            .replace('Security Guard Log Register Page', 'सुरक्षा गार्ड लॉग पंजिका पृष्ठ')
                            .replace('Indian Patent Office Dispute', 'भारतीय पेटेंट कार्यालय वाद')
                            .replace('Institute Access Control Server', 'संस्थान एक्सेस कंट्रोल सर्वर')
                        : event.source}
                    </span>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

