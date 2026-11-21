import "./globals.css";

export const metadata = {
  title: "HBS Workspace – Enterprise HRM, Face Biometrics & CRM",
  description: "Next-gen enterprise multi-branch workforce management, 3D face biometric attendance, automated payroll, and CRM deal pipelines.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
