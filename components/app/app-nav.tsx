"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, LayoutDashboard, Store, Activity, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarControls } from "@/components/app/sidebar-controls";

const nav = [
  { href: "/dashboard", label: "Agents", icon: LayoutDashboard, tourId: "nav-agents" },
  { href: "/marketplace", label: "Marketplace", icon: Store, tourId: "nav-marketplace" },
  { href: "/activity", label: "Activity", icon: Activity, tourId: "nav-activity" },
  { href: "/leaderboard", label: "Leaderboard", icon: Award, tourId: "nav-leaderboard" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/agents/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  tourId,
  pathname,
  mobile,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  tourId: string;
  pathname: string;
  mobile?: boolean;
}) {
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      data-tour={tourId}
      className={cn(
        "flex items-center gap-3 rounded-xl font-medium transition-colors",
        mobile
          ? "flex-1 flex-col gap-1 px-2 py-2 text-[11px]"
          : "px-3 py-2.5 text-base",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className={cn(mobile ? "size-5" : "size-5")} />
      <span>{label}</span>
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-border/80 bg-card/20 p-5 md:block">
        <Link
          href="/"
          className="mb-8 flex items-center gap-3 px-2 text-xl font-semibold"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
            <Bot className="size-6 text-primary" />
          </div>
          AgentPay
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} pathname={pathname} />
          ))}
        </nav>
        <div className="mt-8 border-t border-border pt-5" data-tour="wallet-connect">
          <SidebarControls />
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} pathname={pathname} mobile />
          ))}
        </div>
      </nav>
    </>
  );
}
