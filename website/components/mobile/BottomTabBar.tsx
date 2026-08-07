"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, LayoutGrid, Settings } from "lucide-react";

export default function BottomTabBar() {
  const pathname = usePathname();

  const tabs = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Recipes", href: "/dashboard/recipes", icon: BookOpen },
    { name: "Hub", href: "/dashboard/hub", icon: LayoutGrid },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-surface-700 bg-surface-900/80 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname?.startsWith(tab.href);

          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 pt-1 pb-2 transition-colors ${
                isActive ? "text-accent" : "text-surface-500 hover:text-surface-300"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.name}</span>
              {isActive && (
                <span className="absolute bottom-0 w-1 h-1 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
