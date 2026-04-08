/**
 * countdown-ticker.ts — Drift-free client-side countdown
 *
 * Compartiment: Logic (pure, client-safe)
 *
 * v2: Refactored for precision:
 * - Reads data-computed-at to correct for CDN cache staleness
 * - Uses Date.now() delta instead of decrementing counter (no drift)
 * - Resyncs on visibilitychange (tab switch)
 */

/** Format seconds as HH:MM:SS string */
export function formatCountdownHMS(secs: number): string {
  if (secs <= 0) return '00:00:00';
  const s = Math.floor(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Format seconds as compact "Xu Ym" string */
export function formatCountdownCompact(secs: number): string {
  if (secs <= 0) return '';
  const s = Math.floor(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `In ${h}u ${m}m`;
  return `In ${m}m`;
}

interface TickerOptions {
  /** Element ID that holds data-seconds (and optionally data-computed-at) */
  elementId: string;
  /** Element ID where countdown text is displayed (defaults to elementId) */
  displayId?: string;
  /** 'hms' for HH:MM:SS, 'compact' for Xu Ym */
  format: 'hms' | 'compact';
  /** Tick interval in ms (default: 1000 for hms, 60000 for compact) */
  intervalMs?: number;
  /** Text to show when countdown reaches 0 */
  zeroText?: string;
  /** Reload page after countdown reaches 0? (default: false) */
  reloadOnZero?: boolean;
  /** Delay before reload in ms (default: 5000) */
  reloadDelay?: number;
  /** Callback fired when countdown reaches zero (before reload) */
  onZero?: () => void;
}

/**
 * Start a drift-free countdown ticker on a DOM element.
 *
 * Reads `data-seconds` for the initial server-computed remaining time.
 * If `data-computed-at` is present (ISO timestamp), corrects for CDN cache age:
 *   correctedRemaining = serverSeconds - (Date.now() - computedAt) / 1000
 *
 * Uses Date.now() delta each tick — never accumulates error from setInterval jitter.
 * Resyncs immediately when tab becomes visible (visibilitychange).
 *
 * Returns a cleanup function to stop the interval and remove listeners.
 */
export function startCountdownTicker(options: TickerOptions): () => void {
  const el = document.getElementById(options.elementId);
  const display = options.displayId
    ? document.getElementById(options.displayId)
    : el;

  if (!el || !display) return () => {};

  const serverSeconds = parseInt(el.dataset.seconds || '0', 10);
  const intervalMs = options.intervalMs ?? (options.format === 'hms' ? 1000 : 60000);
  const zeroText = options.zeroText ?? (options.format === 'hms' ? '00:00:00' : 'Nu');
  const formatter = options.format === 'hms' ? formatCountdownHMS : formatCountdownCompact;

  // Correct for CDN cache age if data-computed-at is available
  let cacheAgeSeconds = 0;
  const computedAt = el.dataset.computedAt;
  if (computedAt) {
    const computedTime = new Date(computedAt).getTime();
    if (!isNaN(computedTime)) {
      cacheAgeSeconds = Math.max(0, (Date.now() - computedTime) / 1000);
    }
  }

  const initialRemaining = Math.max(0, serverSeconds - cacheAgeSeconds);
  const startTime = Date.now();
  let reloadPending = false;
  let hasFired = false;

  /** Calculate current remaining seconds based on real elapsed time */
  function getRemaining(): number {
    const elapsed = (Date.now() - startTime) / 1000;
    return Math.max(0, initialRemaining - elapsed);
  }

  /** Update the display */
  function render(): void {
    const remaining = getRemaining();

    if (remaining <= 0 && !hasFired) {
      hasFired = true;
      display!.textContent = zeroText;
      clearInterval(interval);
      if (options.onZero) options.onZero();
      if (options.reloadOnZero && !reloadPending) {
        reloadPending = true;
        setTimeout(() => window.location.reload(), options.reloadDelay ?? 5000);
      }
      return;
    }

    if (!hasFired) {
      display!.textContent = formatter(remaining);
    }
  }

  // Initial render (corrected for cache age)
  render();

  // Tick interval
  const interval = setInterval(render, intervalMs);

  // Resync when tab becomes visible again
  function onVisibilityChange(): void {
    if (!document.hidden && !hasFired) {
      render();
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Cleanup function
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
