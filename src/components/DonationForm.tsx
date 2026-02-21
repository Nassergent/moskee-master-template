import { useState } from 'react';

const presetAmounts = [5, 10, 25, 50, 100];

interface Props {
  projectName?: string;
}

export default function DonationForm({ projectName }: Props) {
  const [frequency, setFrequency] = useState<'eenmalig' | 'maandelijks'>('maandelijks');
  const [amount, setAmount] = useState<number | 'custom'>(25);
  const [customAmount, setCustomAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const finalAmount = amount === 'custom' ? parseFloat(customAmount) : amount;
    if (!finalAmount || finalAmount < 1) {
      setError('Vul een geldig bedrag in (minimaal €1).');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          frequency,
          project: projectName || null,
        }),
      });

      const data = await res.json();

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setError(data.error || 'Er is een fout opgetreden.');
        setIsSubmitting(false);
      }
    } catch {
      setError('Kan geen verbinding maken. Probeer het later opnieuw.');
      setIsSubmitting(false);
    }
  };

  const displayAmount = amount === 'custom' ? customAmount || '0' : amount;
  const frequencyLabel = frequency === 'maandelijks' ? ' per maand' : '';

  return (
    <div className="bg-white p-8 border border-neutral-200">

      {/* Frequentie Toggle — Flat tabs */}
      <div className="flex border border-neutral-200 mb-8">
        <button
          type="button"
          onClick={() => setFrequency('eenmalig')}
          className={`flex-1 py-3 text-sm font-bold transition-all ${
            frequency === 'eenmalig'
              ? 'bg-white text-neutral-900 border-b-2 border-[var(--color-accent)]'
              : 'bg-neutral-50 text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Eenmalig
        </button>
        <button
          type="button"
          onClick={() => setFrequency('maandelijks')}
          className={`flex-1 py-3 text-sm font-bold transition-all ${
            frequency === 'maandelijks'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-neutral-50 text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Maandelijks
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Bedrag Grid — Flat borders */}
        <div className="grid grid-cols-3 gap-3">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => { setAmount(preset); setCustomAmount(''); }}
              className={`py-4 font-bold text-lg border-2 transition-all ${
                amount === preset
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-neutral-900'
                  : 'border-neutral-200 text-neutral-600 hover:border-[var(--color-accent)]'
              }`}
            >
              €{preset}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAmount('custom')}
            className={`py-4 font-bold text-lg border-2 transition-all ${
              amount === 'custom'
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-neutral-900'
                : 'border-neutral-200 text-neutral-600 hover:border-[var(--color-accent)]'
            }`}
          >
            Ander
          </button>
        </div>

        {/* Custom Input */}
        {amount === 'custom' && (
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">€</span>
            <input
              type="number"
              min="1"
              max="10000"
              required
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Vrij bedrag"
              className="w-full pl-8 pr-4 py-4 border-2 border-[var(--color-accent)] focus:outline-none bg-white text-neutral-900 font-bold text-lg"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 text-center">{error}</p>
        )}

        {/* CTA Knop — Flat */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white py-4 font-bold text-lg transition-all disabled:opacity-70"
        >
          {isSubmitting
            ? 'Even geduld...'
            : `Doneer €${displayAmount}${frequencyLabel}`}
        </button>

        {/* Trust Badge */}
        <p className="text-center text-xs text-neutral-500 flex items-center justify-center gap-1">
          <svg className="w-4 h-4 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
          </svg>
          Beveiligde betaling via Mollie (Bancontact, iDEAL, creditcard)
        </p>
      </form>
    </div>
  );
}
