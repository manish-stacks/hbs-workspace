import "./globals.css";
export const metadata = { title: "HBS Workspace – A HBS Brand", description: "HRMS, CRM, attendance and payroll in one workspace." };
export default function Root({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
