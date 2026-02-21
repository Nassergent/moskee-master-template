import React, { useState } from 'react';

const presetAmounts = [10, 25, 50, 100];

interface Props {
  projects?: string;
}

export default function DonationForm({ projects: projectsJson = '[]' }: Props) {
  const projectList: Array<{ titel: string; slug: string }> = JSON.parse(projectsJson || '[]');

  const [amount, setAmount] = useState<number | 'custom'>(25);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedProject, setSelectedProject] = useState('algemeen');
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
          frequency: 'eenmalig',
          project: selectedProject === 'algemeen' ? 'Algemene Sadaqa' : selectedProject,
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

  const amountBtnClass = (preset: number) =>
    `py-5 text-2xl transition-all border ${
      amount === preset
        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
        : 'bg-transparent text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white'
    }`;

  const philosopherStyle = { fontFamily: "'Philosopher', serif", fontWeight: 700 as const };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Quick-Pay Bedragen — 4 vierkante knoppen */}
      <div>
        <label className="block text-sm font-medium text-slate-800 mb-3">Kies een bedrag</label>
        <div className="grid grid-cols-2 gap-3">
          <button key={10} type="button" onClick={() => { setAmount(10); setCustomAmount(''); }} className={amountBtnClass(10)} style={philosopherStyle}>€10</button>
          <button key={25} type="button" onClick={() => { setAmount(25); setCustomAmount(''); }} className={amountBtnClass(25)} style={philosopherStyle}>€25</button>
          <button key={50} type="button" onClick={() => { setAmount(50); setCustomAmount(''); }} className={amountBtnClass(50)} style={philosopherStyle}>€50</button>
          <button key={100} type="button" onClick={() => { setAmount(100); setCustomAmount(''); }} className={amountBtnClass(100)} style={philosopherStyle}>€100</button>
        </div>
      </div>

      {/* Eigen Bedrag */}
      <div>
        <label className="block text-sm font-medium text-slate-800 mb-3">Of vul een eigen bedrag in</label>
        <div className={`relative border-2 transition-all ${amount === 'custom' ? 'border-[var(--color-primary)]' : 'border-neutral-200 hover:border-neutral-300'}`}>
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-primary)]" style={{ ...philosopherStyle, fontSize: '1.875rem' }}>€</span>
          <input
            type="number"
            min="1"
            max="10000"
            value={amount === 'custom' ? customAmount : ''}
            onFocus={() => setAmount('custom')}
            onChange={(e) => { setAmount('custom'); setCustomAmount(e.target.value); }}
            placeholder="0"
            className="w-full pl-12 pr-4 py-4 bg-transparent focus:outline-none text-slate-800"
            style={{ ...philosopherStyle, fontSize: '1.875rem' }}
          />
        </div>
      </div>

      {/* Project Kiezer */}
      <div>
        <label className="block text-sm font-medium text-slate-800 mb-3">Bestemming</label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full px-4 py-3 border border-neutral-200 bg-white text-slate-800 focus:border-[var(--color-primary)] focus:outline-none transition-colors"
        >
          <option value="algemeen">Algemene Sadaqa</option>
          {projectList.map((p) => (
            <option key={p.slug} value={p.titel}>{p.titel}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 text-center">{error}</p>
      )}

      {/* Betaalknop — Deep Teal (primary) */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white py-4 font-bold text-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
      >
        {isSubmitting ? 'Even geduld...' : (
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Donatie afronden via iDEAL / Bancontact
          </span>
        )}
      </button>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <p className="text-xs text-neutral-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
          </svg>
          Beveiligd via Mollie
        </p>
        <span className="text-neutral-300">|</span>
        <p className="text-xs text-neutral-400">Bancontact · iDEAL · Visa · Mastercard</p>
      </div>
    </form>
  );
}
