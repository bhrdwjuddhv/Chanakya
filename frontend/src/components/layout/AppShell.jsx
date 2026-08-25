import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ChevronsLeft,
  ChevronsRight,
  Fingerprint,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Sun,
  Users,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { get } from '../../lib/api';
import { cn } from '../../lib/utils';
import { StatusPill } from '../ui';
import { BrandMark } from './BrandMark';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/cases', label: 'Cases', icon: FolderOpen },
  { to: '/people', label: 'People', icon: Users },
  { to: '/biometrics', label: 'Biometrics', icon: Fingerprint },
  { to: '/audit', label: 'Audit trail', icon: Activity },
];

const CONTEXT = {
  '/': 'Dashboard',
  '/cases': 'Cases',
  '/people': 'People',
  '/biometrics': 'Biometrics',
  '/audit': 'Audit trail',
};

export function AppShell() {
  const [expanded, setExpanded] = useState(false);
  const watchSystem = useTheme((s) => s.watchSystem);

  useEffect(() => watchSystem(), [watchSystem]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Pure black in both modes — the signature of the design. */
function Sidebar({ expanded, onToggle }) {
  return (
    <aside
      className={cn(
        'shrink-0 bg-sidebar flex flex-col border-r border-white/[0.06]',
        'transition-[width] duration-[250ms] ease-signature',
        expanded ? 'w-56' : 'w-16',
      )}
    >
      <div className={cn('h-16 flex items-center border-b border-white/[0.06]', expanded ? 'px-4 gap-2.5' : 'justify-center')}>
        <span className="grid size-8 shrink-0 place-items-center rounded-chip bg-primary/15">
          <BrandMark className="size-[18px] text-primary" />
        </span>
        {expanded && (
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Chanakya
          </span>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={expanded ? undefined : item.label}
            className={({ isActive }) =>
              cn(
                'group flex items-center rounded-chip text-[13px]',
                'transition-colors duration-150 ease-standard',
                expanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center py-2.5',
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/45 hover:bg-white/[0.06] hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
                {expanded && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <ServiceHealth expanded={expanded} />

      <button
        onClick={onToggle}
        aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        className={cn(
          'flex items-center gap-2 border-t border-white/[0.06] py-3 text-[11px] text-white/40',
          'transition-colors hover:text-white',
          expanded ? 'px-4' : 'justify-center',
        )}
      >
        {expanded ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />}
        {expanded && 'Collapse'}
      </button>
    </aside>
  );
}

/** Real health, polled. A degraded backend should be visible, not a mystery. */
function ServiceHealth({ expanded }) {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => get('/health'),
    refetchInterval: 30_000,
    retry: false,
  });
  if (!data) return null;

  const entries = Object.entries(data.services);
  const down = entries.filter(([, s]) => !s.ok);

  if (!expanded) {
    return (
      <div className="flex justify-center border-t border-white/[0.06] py-3" title={`${entries.length - down.length}/${entries.length} services online`}>
        <span className={cn('size-2 rounded-full', down.length ? 'bg-warning' : 'bg-success pulse-dot')} />
      </div>
    );
  }

  return (
    <div className="border-t border-white/[0.06] px-4 py-3">
      <p className="label !text-white/35 mb-2">Services</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {entries.map(([name, service]) => (
          <span
            key={name}
            title={service.ok ? 'Reachable' : service.error || 'Unavailable'}
            className="inline-flex items-center gap-1.5 text-[11px] text-white/45"
          >
            <span className={cn('size-1.5 rounded-full', service.ok ? 'bg-success' : 'bg-white/20')} />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useQuery({ queryKey: ['health'], queryFn: () => get('/health'), retry: false });

  const services = data ? Object.values(data.services) : [];
  const online = services.filter((s) => s.ok).length;
  const context = CONTEXT[location.pathname] || (location.pathname.startsWith('/cases/') ? 'Case file' : 'Workspace');

  return (
    <header className="h-16 shrink-0 border-b border-border bg-background flex items-center gap-4 px-6">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="label">Chanakya</span>
        <span className="size-1 rounded-full bg-muted-foreground/40" />
        <span className="text-[13px] font-medium text-foreground truncate">{context}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {services.length > 0 && (
          <StatusPill tone={online === services.length ? 'live' : 'warning'} pulse={online === services.length}>
            {online} of {services.length} services online
          </StatusPill>
        )}

        <ThemeToggle />

        <div className="flex items-center gap-2.5 pl-3 border-l border-border">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--glow-red))' }}
          >
            {initials(user?.name)}
          </span>
          <div className="hidden sm:block leading-tight">
            <p className="text-[13px] font-medium text-foreground">{user?.name}</p>
            <p className="label !text-[10px]">{user?.role}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Sign out"
            aria-label="Sign out"
            className="grid size-8 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { theme, cycle } = useTheme();
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme} — click to change`}
      aria-label={`Theme: ${theme}. Click to change.`}
      className="grid size-9 place-items-center rounded-control border border-border text-muted-foreground transition-colors duration-150 ease-standard hover:bg-muted hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
