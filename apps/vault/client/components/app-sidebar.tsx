import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "~/utils/cn.ts";
import ListTreeIcon from "~icons/lucide/folder-tree";
import ScrollTextIcon from "~icons/lucide/scroll-text";
import SettingsIcon from "~icons/lucide/settings";

const navItems = [
  { href: "/vault", icon: ListTreeIcon, label: "Vault" },
  { href: "/vault/audit-log", icon: ScrollTextIcon, label: "Audit Log" },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="flex flex-col w-56 border-r bg-muted/30 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10">
          <SettingsIcon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Vault</p>
          <p className="text-[10px] text-muted-foreground">Vault Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/vault"
              ? pathname === "/vault" || pathname === "/vault/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
