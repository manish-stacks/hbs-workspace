import clsx from "clsx";
type P = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "dark" | "outline" };
export function Button({ variant = "primary", className, ...p }: P) {
  return <button {...p} className={clsx("rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50",
    variant === "primary" && "bg-brand-red text-white hover:bg-red-700", variant === "dark" && "bg-brand-black text-white hover:bg-black",
    variant === "outline" && "border border-brand-border bg-white hover:bg-brand-bg", className)} />;
}
