"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Server,
  ChevronLeft,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/system", label: "System", icon: Server },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Admin Sidebar */}
      <aside className="hidden lg:flex flex-col w-52 border-r bg-background shrink-0">
        <div className="h-16 flex items-center px-5 border-b gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">JobPilot</div>
            <div className="text-xs text-muted-foreground">Admin</div>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-16 border-b flex items-center px-6 gap-4 shrink-0">
          <Link
            href="/dashboard"
            className="lg:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            App
          </Link>
          <span className="font-semibold text-sm text-muted-foreground">Admin Panel</span>
          <nav className="flex gap-1 ml-4 lg:hidden">
            {ADMIN_NAV.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  (exact ? pathname === href : pathname.startsWith(href))
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
