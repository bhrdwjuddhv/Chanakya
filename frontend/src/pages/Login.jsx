import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { Input, RollingButton } from '../components/ui';
import { armReveal } from '../lib/reveal';
import { BrandMark } from '../components/layout/BrandMark';

const DEMO_ACCOUNTS = [
  { role: 'Investigator', roleHi: 'अनुसंधान अधिकारी (Investigator)', email: 'investigator@demo.local', password: 'Investigate123' },
  { role: 'Forensic', roleHi: 'फोरेंसिक विशेषज्ञ (Forensic)', email: 'forensic@demo.local', password: 'Forensic123' },
  { role: 'Supervisor', roleHi: 'पर्यवेक्षक / पुलिस अधीक्षक (SP)', email: 'supervisor@demo.local', password: 'Supervise123' },
  { role: 'Admin', roleHi: 'राष्ट्रीय पोर्टल प्रशासक (Admin)', email: 'admin@demo.local', password: 'Administer123' },
];

export function Login() {
  const login = useAuth((s) => s.login);
  const { t, lang, toggleLang } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.email, form.password);
      armReveal();
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    // The login screen is always dark — it is the product's first impression.
    <div className="dark min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-background text-foreground">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-black p-12">
        <div
          aria-hidden
          className="absolute -left-32 -top-32 size-[28rem] rounded-full blur-[120px] opacity-40"
          style={{ background: 'radial-gradient(circle, var(--primary), transparent 65%)' }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-chip bg-primary/15">
              <BrandMark className="size-[18px] text-primary" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-[#DBDBDB]">Chanakya</span>
              <span className="text-[10px] text-[#7A7A7A] font-mono">चाणक्य · MHA / NCRB</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-white/10 text-[12px] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Globe className="size-3.5 text-primary" />
            <span>{lang === 'en' ? 'हिंदी (HI)' : 'English (EN)'}</span>
          </button>
        </div>

        <div className="relative max-w-lg">
          <p className="label mb-4 !text-primary">
            {lang === 'hi' ? 'एआई-संचालित आपराधिक नेटवर्क विश्लेषण प्रणाली' : 'AI-Powered Criminal Network Analysis System'}
          </p>
          <h1 className="display text-[#DBDBDB]">
            {lang === 'hi' ? (
              <>
                आपराधिक नेटवर्क के
                <br />
                अदृश्य सूत्रधारों की
                <br />
                सटीक पहचान।
              </>
            ) : (
              <>
                Find the people
                <br />
                holding the network
                <br />
                together.
              </>
            )}
          </h1>
          <p className="text-[15px] text-[#8A8A8A] mt-6 leading-relaxed max-w-md">
            {lang === 'hi'
              ? 'केस साक्ष्यों से इकाइयों का निष्कर्षण, सम्बन्ध मानचित्रण एवं गुप्त सरगनाओं/बिचौलियों की सटीक पहचान।'
              : 'Extract entities from evidence, map the relationships between them, and surface the brokers — not just the loudest names.'}
          </p>
          <p className="text-[13px] text-[#5A5A5A] mt-8 leading-relaxed max-w-md border-l border-white/10 pl-4">
            {lang === 'hi'
              ? 'कौटिल्य चाणक्य नीति अनुसार: "नेटवर्क की शक्ति सबसे ऊँची आवाज़ में नहीं, बल्कि उसे अदृश्य रूप से जोड़ने वाले सूत्रों में होती है।"'
              : 'Named for the strategist who argued that a network is understood through the people who connect it, not the people who shout loudest in it.'}
          </p>
        </div>

        <p className="relative text-[11px] text-[#5A5A5A]">
          {lang === 'hi' ? 'प्रोटोटाइप। समस्त केस, व्यक्ति एवं साक्ष्य पत्रावलियां काल्पनिक हैं।' : 'Prototype. All seeded cases, people and documents are fictional.'}
        </p>
      </aside>

      <div className="flex items-center justify-center p-6 relative">
        <div className="absolute top-6 right-6 lg:hidden">
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-border text-[12px] text-muted-foreground hover:bg-muted transition-colors"
          >
            <Globe className="size-3.5 text-primary" />
            <span>{lang === 'en' ? 'हिंदी (HI)' : 'English (EN)'}</span>
          </button>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-[22px] font-semibold tracking-title">{t('signInTitle', 'Sign in')}</h2>
          <p className="text-[13px] text-muted-foreground mt-1.5 mb-7">
            {t('signInSubtitle', 'Use a demo account below, or your own credentials.')}
          </p>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="label block mb-2">{t('email', 'Email')}</label>
              <Input
                type="email"
                required
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label block mb-2">{t('password', 'Password')}</label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && (
              <p className="text-[13px] text-destructive bg-destructive/10 border border-destructive/25 rounded-control px-3 py-2">
                {error}
              </p>
            )}

            <RollingButton type="submit" loading={busy} size="lg" className="w-full">
              {t('signIn', 'Sign in')}
            </RollingButton>
          </form>

          <div className="mt-9">
            <p className="label mb-2.5">{t('demoAccounts', 'Demo accounts')}</p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => setForm({ email: account.email, password: account.password })}
                  className="w-full flex items-center justify-between gap-3 rounded-control border border-border bg-card px-3 py-2 text-left transition-colors duration-150 ease-standard hover:border-primary/50"
                >
                  <span className="text-[13px] font-medium text-foreground">{lang === 'hi' ? account.roleHi : account.role}</span>
                  <span className="font-mono text-[11px] font-normal text-muted-foreground">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

