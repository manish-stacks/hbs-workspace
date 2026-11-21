"use client";
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
    <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} className="text-xl text-brand-muted">×</button></div>{children}</div></div>);
}
export const inp = "w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-red";
export const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) =>
  <label className="block text-xs font-semibold text-brand-muted">{label}<div className="mt-1 font-normal">{children}</div>{error && <span className="text-brand-red">{error}</span>}</label>;
