import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (<main>
    <nav className="flex items-center justify-between border-b border-brand-border px-8 py-3"><Logo h={44} />
      <div className="flex gap-3"><Link href="/login"><Button variant="outline">Login</Button></Link><Link href="/login?register=1"><Button>Start Free Trial</Button></Link></div></nav>
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <h1 className="text-5xl font-extrabold leading-tight text-brand-black">One Workspace. <span className="text-brand-red">Complete Control</span> Over Your Business.</h1>
      <p className="mt-6 text-lg text-brand-muted">Manage employees, attendance, shifts, leaves, payroll and customers from one powerful workspace.</p>
      <div className="mt-8 flex justify-center gap-4"><Link href="/login?register=1"><Button>Start Free Trial</Button></Link><Button variant="dark">Book a Demo</Button></div>
    </section></main>);
}
