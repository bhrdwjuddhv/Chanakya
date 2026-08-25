import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const formatDate = (value, opts = {}) =>
  value
    ? new Date(value).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...opts,
      })
    : '—';

export const formatDateTime = (value) => formatDate(value, { hour: '2-digit', minute: '2-digit' });

export const formatBytes = (bytes) => {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

/**
 * Reads a theme token as a real colour. Canvas-drawn things (Cytoscape, Leaflet markers)
 * can't use CSS variables, so they ask for the resolved value instead.
 */
export const token = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * Entity types get their own hues from the semantic palette. Red is NOT in here —
 * the accent is reserved for actions, active state, alerts and critical priority.
 */
export const ENTITY_TOKENS = {
  Person: '--info',
  Organization: '--ai',
  Location: '--success',
  Vehicle: '--warning',
  Phone: '--info',
  Email: '--success',
  Document: '--muted-foreground',
  Evidence: '--muted-foreground',
  Event: '--warning',
  Case: '--foreground',
};

// Fixed fallbacks keep the graph legible if a token can't be read (e.g. first paint).
const ENTITY_FALLBACK = {
  Person: '#3B82F6',
  Organization: '#A855F7',
  Location: '#22C55E',
  Vehicle: '#F59E0B',
  Phone: '#0EA5E9',
  Email: '#14B8A6',
  Document: '#8A8A8A',
  Evidence: '#6B7280',
  Event: '#EC4899',
  Case: '#DBDBDB',
};

export const entityColour = (type) =>
  token(ENTITY_TOKENS[type] || '--muted-foreground') || ENTITY_FALLBACK[type] || '#8A8A8A';

/** Kept as a plain map for legends and dots rendered in the DOM. */
export const ENTITY_COLOURS = ENTITY_FALLBACK;

/**
 * Relationship state. Colour AND line style both encode it, so the graph survives
 * greyscale printing and colour-blind viewing.
 */
export const STATUS_STYLES = {
  CONFIRMED: {
    label: 'Confirmed',
    token: '--success',
    fallback: '#22C55E',
    dash: null,
    chip: 'bg-success/12 text-success border-success/25',
  },
  INFERRED: {
    label: 'Inferred',
    token: '--info',
    fallback: '#3B82F6',
    dash: [6, 3],
    chip: 'bg-info/12 text-info border-info/25',
  },
  AI_SUGGESTED: {
    label: 'AI suggested',
    token: '--ai',
    fallback: '#A855F7',
    dash: [2, 4],
    chip: 'bg-ai/12 text-ai border-ai/25',
  },
  UNVERIFIED: {
    label: 'Unverified',
    token: '--muted-foreground',
    fallback: '#8A8A8A',
    dash: [1, 5],
    chip: 'bg-muted text-muted-foreground border-border',
  },
};

export const statusColour = (status) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.UNVERIFIED;
  return token(style.token) || style.fallback;
};

/** Critical is the one place priority earns the accent red. */
export const PRIORITY_STYLES = {
  critical: 'bg-primary/12 text-primary border-primary/30',
  high: 'bg-warning/12 text-warning border-warning/25',
  medium: 'bg-info/12 text-info border-info/25',
  low: 'bg-muted text-muted-foreground border-border',
};

export const PROCESSING_STYLES = {
  queued: { label: 'Queued', chip: 'bg-muted text-muted-foreground border-border', dot: null },
  processing: { label: 'Processing', chip: 'bg-warning/12 text-warning border-warning/25', dot: 'warning' },
  completed: { label: 'Processed', chip: 'bg-success/12 text-success border-success/25', dot: null },
  failed: { label: 'Failed', chip: 'bg-destructive/12 text-destructive border-destructive/30', dot: null },
};

export const REVIEW_STYLES = {
  pending: { label: 'Pending review', chip: 'bg-warning/12 text-warning border-warning/25' },
  confirmed: { label: 'Confirmed', chip: 'bg-success/12 text-success border-success/25' },
  rejected: { label: 'Rejected', chip: 'bg-destructive/12 text-destructive border-destructive/30' },
  uncertain: { label: 'Uncertain', chip: 'bg-ai/12 text-ai border-ai/25' },
};

export const SEVERITY_STYLES = {
  high: 'bg-primary/12 text-primary border-primary/30',
  medium: 'bg-warning/12 text-warning border-warning/25',
  low: 'bg-muted text-muted-foreground border-border',
};
