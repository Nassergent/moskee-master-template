/**
 * countdown-ticker.ts — Shared client-side countdown logic
 *
 * Compartiment: Logic (pure, client-safe)
 * Eliminates duplicate countdown code across PrayerManager, LivePrayerCard, PrayerGrid.
 */

/** Format seconds as HH:MM:SS string */
export function formatCountdownHMS(secs: number): string {
  if (secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format seconds as compact "Xu Ym" string */
export function formatCountdownCompact(secs: number): string {
  if (secs <= 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `In ${h}u ${m}m`;
  return `In ${m}m`;
}

interface TickerOptions {
  /** Element ID that holds data-seconds attribute */
  elementId: string;
  /** Element ID where countdown text is displayed (defaults to elementId) */
  displayId?: string;
  /** 'hms' for HH:MM:SS, 'compact' for Xu Ym */
  format: 'hms' | 'compact';
  /** Tick interval in ms (default: 1000 for hms, 60000 for compact) */
  intervalMs?: number;
  /** Text to show when countdown reaches 0 (default: '00:00:00' for hms, 'Nu' for compact) */
  zeroText?: string;
  /** Reload page after countdown reaches 0? (default: false) */
  reloadOnZero?: boolean;
  /** Delay before reload in ms (default: 5000) */
  reloadDelay?: number;
  /** Callback fired when countdown reaches zero (before reload) */
  onZero?: () => void;
}

/**
 * Start a live countdown ticker on a DOM element.
 * Returns a cleanup function to stop the interval.
 */
export function startCountdownTicker(options: TickerOptions): () => void {
  const el = document.getElementById(options.elementId);
  const display = options.displayId
    ? document.getElementById(options.displayId)
    : el;

  if (!el || !display) return () => {};

  let remaining = parseInt(el.dataset.seconds || '0', 10);
  const intervalMs = options.intervalMs ?? (options.format === 'hms' ? 1000 : 60000);
  const zeroText = options.zeroText ?? (options.format === 'hms' ? '00:00:00' : 'Nu');
  const formatter = options.format === 'hms' ? formatCountdownHMS : formatCountdownCompact;

  // Initial render
  display.textContent = formatter(remaining);

  const interval = setInterval(() => {
    remaining -= Math.round(intervalMs / 1000);
    if (remaining <= 0) {
      display.textContent = zeroText;
      clearInterval(interval);
      if (options.onZero) options.onZero();
      if (options.reloadOnZero) {
        setTimeout(() => window.location.reload(), options.reloadDelay ?? 5000);
      }
      return;
    }
    display.textContent = formatter(remaining);
  }, intervalMs);

  return () => clearInterval(interval);
}
