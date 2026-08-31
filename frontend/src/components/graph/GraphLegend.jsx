import { ENTITY_COLOURS, STATUS_STYLES } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

export function GraphLegend({ activeTypes }) {
  const { t, lang } = useI18n();
  const types = Object.entries(ENTITY_COLOURS).filter(([type]) =>
    activeTypes ? activeTypes.includes(type) : type !== 'Case',
  );

  const getTypeName = (tp) => {
    if (lang !== 'hi') return tp;
    const map = {
      Person: 'संदिग्ध व्यक्ति',
      Phone: 'फ़ोन / सिम',
      Email: 'ईमेल पता',
      Organization: 'कंपनी / सिंडिकेट',
      Vehicle: 'वाहन (Vahan)',
      Location: 'भौगोलिक स्थान',
      Document: 'दस्तावेज़ / FIR',
      Evidence: 'साक्ष्य सामग्री',
      Event: 'अपराध कांड / घटना',
    };
    return map[tp] || tp;
  };

  const getStatusName = (st) => {
    if (lang !== 'hi') return st;
    const map = {
      CONFIRMED: 'अधिकारी द्वारा पुष्टीकृत',
      SUGGESTED: 'एआई द्वारा प्रस्तावित',
      INFERRED: 'अनुमानित संबंध सूत्र',
      DISPUTED: 'विवादित / खंडित',
      UNVERIFIED: 'सत्यापन हेतु लंबित',
    };
    return map[st] || st;
  };

  return (
    <div className="absolute bottom-4 left-4 rounded-card border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-card z-10">
      <div className="flex gap-7">
        <div>
          <p className="label mb-2">{lang === 'hi' ? 'इकाई प्रकार' : 'Entity'}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {types.map(([type, colour]) => (
              <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="size-2 rounded-full shrink-0" style={{ background: colour }} />
                {getTypeName(type)}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="label mb-2">{lang === 'hi' ? 'संबंध सत्यापन स्तर' : 'Relationship'}</p>
          <div className="space-y-1.5">
            {Object.entries(STATUS_STYLES).map(([status, style]) => (
              <span key={status} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <svg width="20" height="6" className="shrink-0">
                  <line
                    x1="0"
                    y1="3"
                    x2="20"
                    y2="3"
                    stroke={style.fallback}
                    strokeWidth="2"
                    strokeDasharray={style.dash ? style.dash.join(' ') : undefined}
                    opacity={status === 'UNVERIFIED' ? 0.5 : 1}
                  />
                </svg>
                {getStatusName(status)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border max-w-72 leading-snug">
        {lang === 'hi' ? (
          <>
            केवल <span className="text-success font-medium">पुष्टीकृत</span> संबंध जांच अधिकारी द्वारा सत्यापित हैं। शेष एआई समीक्षाधीन हैं।
          </>
        ) : (
          <>
            Only <span className="text-success font-medium">confirmed</span> links have been verified by a person. Everything else awaits review.
          </>
        )}
      </p>
    </div>
  );
}

