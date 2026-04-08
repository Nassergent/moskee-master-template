/**
 * prayer-alert.ts — Smart Prayer Alert (audio + visueel)
 *
 * Compartiment: Lib (client-side utility)
 * Speelt 3x "tik" via Web Audio API bij gebedstijd.
 * Voegt pulse-animatie toe + update browser tab titel.
 * Gebruiker kan geluid aan/uit zetten (localStorage).
 */

const STORAGE_KEY = 'prayer-sound-enabled';

// ── Pre-warmed AudioContext for mobile ──
// Mobile browsers require AudioContext to be created/resumed during a user gesture.
// We create it on first touch/click, so it's ready when the countdown hits zero.
let _sharedCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext {
  if (!_sharedCtx || _sharedCtx.state === 'closed' || (_sharedCtx as any).state === 'interrupted') {
    _sharedCtx = new AudioContext();
  }
  return _sharedCtx;
}

// Clean up shared context on page unload to prevent memory leaks
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (_sharedCtx) {
      _sharedCtx.close().catch(() => {});
      _sharedCtx = null;
    }
  });
}

/** Call this once on page load to warm up audio on first user interaction */
export function warmUpAudioOnInteraction(): void {
  const handler = () => {
    try {
      const ctx = getOrCreateAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
    } catch { /* ignore */ }
    // Remove after first interaction — we only need one warm-up
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('click', handler);
  };
  document.addEventListener('touchstart', handler, { once: true, passive: true });
  document.addEventListener('click', handler, { once: true });
}

// ── Sound preference ──

export function isPrayerSoundEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

export function togglePrayerSound(): boolean {
  const next = !isPrayerSoundEnabled();
  localStorage.setItem(STORAGE_KEY, String(next));
  return next;
}

// ── Web Audio "tik tik tik" ──

function playTick(ctx: AudioContext, startTime: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = 600;

  gain.gain.setValueAtTime(0.6, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + 0.12);
}

export async function playTickAlert(): Promise<void> {
  if (!isPrayerSoundEnabled()) return;

  try {
    const ctx = getOrCreateAudioContext();

    // Resume indien suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    // 3x tik met 250ms pauze
    playTick(ctx, now);
    playTick(ctx, now + 0.25);
    playTick(ctx, now + 0.50);

    // Don't close shared context — keep it warm for next alert
  } catch {
    // Geen audio support of autoplay geblokkeerd — stille fallback
  }
}

// ── Visuele alert ──

export function triggerVisualAlert(): void {
  // Pulse animatie op actieve gebed-kaart
  const activeCards = document.querySelectorAll('[data-prayer-active="true"]');
  activeCards.forEach((el) => {
    el.classList.add('animate-prayer-pulse');
  });

  // Browser tab titel update
  const nextPrayerEl = document.querySelector('[data-next-prayer]');
  const prayerName = nextPrayerEl?.getAttribute('data-next-prayer') || 'Gebed';
  const originalTitle = document.title;
  document.title = `\u{1F54C} ${prayerName} — ${originalTitle}`;

  // Reset titel na 10 seconden
  setTimeout(() => {
    document.title = originalTitle;
  }, 10000);
}

// ── Combined alert (geluid + visueel) ──

export function firePrayerAlert(): void {
  playTickAlert();
  triggerVisualAlert();
}
