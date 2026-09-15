'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, MessageSquare, Cloud, AlertTriangle,
  Lightbulb, BarChart2, Settings, X, Zap, Shield, User, LogOut,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { useTranslation } from '@/lib/translations';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { language, user, isAuthenticated, isGuest, logout, setAuthModalOpen } = useAppStore();
  const { t } = useTranslation(language);

  const navItems = [
    { href: '/',          icon: LayoutDashboard, label: t.dashboard  },
    { href: '/chat',      icon: MessageSquare,   label: t.chat       },
    { href: '/forecast',  icon: Cloud,           label: t.forecast   },
    { href: '/alerts',    icon: AlertTriangle,   label: t.alerts, live: true },
    { href: '/shelters',  icon: Shield,          label: t.shelters || 'Safe Shelters' },
    { href: '/advisory',  icon: Lightbulb,       label: t.advisory   },
    { href: '/history',   icon: BarChart2,       label: t.history    },
    { href: '/settings',  icon: Settings,        label: t.settings   },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 z-30 flex flex-col
          border-r border-slate-200 dark:border-white/[0.06] bg-slate-900/95 dark:bg-gray-950/80 backdrop-blur-xl
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">WeatherGPT</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label, live }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${active
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
                <span>{label}</span>
                {live && (
                  <span className="ml-auto text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                    {t.live}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Session Status */}
        <div className="p-3 border-t border-slate-800 dark:border-white/[0.06]">
          {isAuthenticated ? (
            <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {isGuest ? 'Guest User' : user?.email || 'Authenticated'}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => await logout()}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <User size={14} />
              <span>Sign In / Register</span>
            </button>
          )}
          <p className="text-[10px] text-slate-500 text-center mt-2.5">{t.footerPowered}</p>
        </div>
      </aside>
    </>
  );
}

