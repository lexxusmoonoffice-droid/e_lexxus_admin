import "./globals.css";
import { Toaster } from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import SentryInit from "@/components/SentryInit";
import ConfirmContainer from "@/components/ConfirmDialog";
import { AuthProvider } from "@/lib/auth";
import { QueryProvider } from "@/lib/query-provider";

export const metadata = {
  title: "Lexxus Admin",
  icons: {
    icon: "/lexxus logo.webp",
    shortcut: "/lexxus logo.webp",
    apple: "/lexxus logo.webp",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          <AuthProvider>
            <SentryInit />
            <AuthGuard>
              <AppShell>{children}</AppShell>
            </AuthGuard>
            <Toaster position="top-right" toastOptions={{ style: { fontSize: 13 } }} />
            <ConfirmContainer />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
