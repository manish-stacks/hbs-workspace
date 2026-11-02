export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`rounded-xl border border-brand-border bg-white p-5 shadow-card ${className}`}>{children}</div>;
export const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => <Card><p className="text-xs uppercase tracking-wide text-brand-muted">{label}</p><p className="mt-1 text-2xl font-bold text-brand-black">{value}</p></Card>;
export const Skeleton = () => <div className="h-24 animate-pulse rounded-xl bg-brand-bg" />;
