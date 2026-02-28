// Tijdslots: elk half uur van 06:00 tot 23:00
// Gedeeld tussen lessonProgram en ramadanOverride schemas
export const timeSlots = Array.from({ length: 35 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? '00' : '30';
  const val = `${String(h).padStart(2, '0')}:${m}`;
  return { title: val, value: val };
});
