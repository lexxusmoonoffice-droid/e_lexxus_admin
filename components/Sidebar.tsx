"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  FileText,
  Settings,
  LogOut,
  Layers,
  Image,
  ScrollText,
  Plug,
  Tag,
  Star,
  Bell,
  UserCircle,
  HardDrive,
  ChevronDown,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

type NavItem = {
  icon: any;
  label: string;
  href?: string;
  children?: { icon: any; label: string; href: string }[];
};

const nav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  {
    icon: Package,
    label: "Products",
    children: [
      { icon: Package, label: "Products", href: "/products" },
      { icon: FolderTree, label: "Categories", href: "/categories" },
      { icon: Layers, label: "Bundles", href: "/bundles" },
      { icon: ShoppingCart, label: "Orders", href: "/orders" },
      { icon: Star, label: "Reviews", href: "/reviews" },
    ],
  },
  { icon: Image, label: "Hero Slides", href: "/hero" },
  { icon: Users, label: "Users", href: "/users" },
  { icon: Mail, label: "Inquiries", href: "/inquiries" },
  { icon: Tag, label: "Brands", href: "/brands" },
  { icon: FileText, label: "Blog", href: "/blog" },
  { icon: ScrollText, label: "Audit log", href: "/audit" },
  { icon: HardDrive, label: "Storage", href: "/storage" },
  { icon: Plug, label: "Integrations", href: "/integrations" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: UserCircle, label: "My Profile", href: "/profile" },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const initialOpen: Record<string, boolean> = {};
  for (const n of nav) {
    if (n.children && n.children.some((c) => path?.startsWith(c.href))) {
      initialOpen[n.label] = true;
    }
  }
  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen);

  async function onSignOut() {
    await logout();
    toast.success("Signed out");
    router.push("/login");
  }

  function isActive(href: string) {
    return href === "/" ? path === "/" : path?.startsWith(href);
  }

  return (
    <aside className="w-60 bg-neutral-950 text-white h-full p-4 flex-col hidden lg:flex shrink-0">
      <div className="flex flex-col items-start leading-none mb-8 px-2 pt-2 shrink-0">
        <span className="logo-wordmark text-sm tracking-[0.3em]">LEXXUS</span>
        <span className="text-[10px] text-neutral-500 tracking-widest mt-1">ADMIN PANEL</span>
      </div>

      <nav className="space-y-0.5 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {nav.map((n) => {
          if (n.children) {
            const isOpen = !!open[n.label];
            const hasActiveChild = n.children.some((c) => isActive(c.href));
            return (
              <div key={n.label}>
                <button
                  onClick={() => setOpen((o) => ({ ...o, [n.label]: !o[n.label] }))}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                    hasActiveChild && !isOpen
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  <n.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{n.label}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="mt-0.5 ml-3 pl-3 border-l border-neutral-800 space-y-0.5">
                    {n.children.map((c) => {
                      const active = isActive(c.href);
                      return (
                        <Link
                          key={c.label}
                          href={c.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                            active
                              ? "bg-white text-black font-medium"
                              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                          }`}
                        >
                          <c.icon className="w-4 h-4 shrink-0" />
                          {c.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(n.href!);
          return (
            <Link
              key={n.label}
              href={n.href!}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active ? "bg-white text-black font-medium" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <n.icon className="w-4 h-4 shrink-0" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-800 pt-4 mt-4 space-y-2">
        {user && (
          <div className="px-3 text-xs text-neutral-400 leading-tight">
            <div className="truncate font-medium text-white">{user.name}</div>
            <div className="truncate">{user.email}</div>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
