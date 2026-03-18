import type { Metadata } from "next";
import "./globals.css"; // Ensure your global.css contains the imports for drms.css and theme.css

export const metadata: Metadata = {
  title: "DRMS - Registrar Office",
  description: "Document Request Monitoring System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Adding suppressHydrationWarning helps stop those red error screens from browser extensions */}
      <body className="drms-root" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}