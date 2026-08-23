import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

// Shared chrome for every unauthenticated page (login, role chooser, all three
// signup wizards). Keeps the top bar minimal — wordmark, theme toggle, one
// contextual action — the way Google's account pages do.
export function AuthShell({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <Link href="/" className="wordmark">
          <i className="fa-solid fa-car-side"></i> L&apos;Auto École
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {action}
        </div>
      </header>
      <main className="auth-body">{children}</main>
    </div>
  );
}
