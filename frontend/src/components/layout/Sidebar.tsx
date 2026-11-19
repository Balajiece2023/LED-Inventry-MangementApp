import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Layers,
  FileSpreadsheet,
  Factory,
  GitCommit,
  ShieldCheck,
  PackageCheck,
  Truck,
  BarChart3,
  History,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Role } from '../../types';

interface NavItem {
  name: string;
  path: string;
  icon: any;
  allowedRoles: Role[];
  badge?: number | string;
  badgeColor?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const userRole = user?.role || 'ADMIN';

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['ADMIN', 'STORE_KEEPER', 'PRODUCTION_SUPERVISOR', 'QC_ENGINEER', 'DISPATCH_TEAM'],
    },
    {
      name: 'Product Master',
      path: '/products',
      icon: Boxes,
      allowedRoles: ['ADMIN', 'PRODUCTION_SUPERVISOR'],
    },
    {
      name: 'Raw Materials',
      path: '/materials',
      icon: Layers,
      allowedRoles: ['ADMIN', 'STORE_KEEPER'],
    },
    {
      name: 'BOM Management',
      path: '/bom',
      icon: FileSpreadsheet,
      allowedRoles: ['ADMIN', 'PRODUCTION_SUPERVISOR'],
    },
    {
      name: 'Production Orders',
      path: '/production-orders',
      icon: Factory,
      allowedRoles: ['ADMIN', 'PRODUCTION_SUPERVISOR'],
    },
    {
      name: 'Assembly Tracking',
      path: '/assembly-tracking',
      icon: GitCommit,
      allowedRoles: ['ADMIN', 'PRODUCTION_SUPERVISOR'],
    },
    {
      name: 'QC Testing & Certs',
      path: '/qc-testing',
      icon: ShieldCheck,
      allowedRoles: ['ADMIN', 'QC_ENGINEER'],
    },
    {
      name: 'Finished Goods',
      path: '/finished-goods',
      icon: PackageCheck,
      allowedRoles: ['ADMIN', 'STORE_KEEPER', 'DISPATCH_TEAM'],
    },
    {
      name: 'Dispatch Orders',
      path: '/dispatch',
      icon: Truck,
      allowedRoles: ['ADMIN', 'DISPATCH_TEAM'],
    },
    {
      name: 'Reports & Analytics',
      path: '/reports',
      icon: BarChart3,
      allowedRoles: ['ADMIN', 'PRODUCTION_SUPERVISOR', 'STORE_KEEPER'],
    },
    {
      name: 'Audit Trail',
      path: '/audit-logs',
      icon: History,
      allowedRoles: ['ADMIN', 'PRODUCTION_SUPERVISOR'],
    },
  ];

  // Filter items according to active role
  const visibleNav = navItems.filter(
    (item) => userRole === 'ADMIN' || item.allowedRoles.includes(userRole)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 transition-transform duration-200 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 font-bold">
              <Lightbulb className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-wide flex items-center gap-1.5">
                Leo Force <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">MMS</span>
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">LED Assembly ERP</p>
            </div>
          </div>
        </div>

        {/* User Role Banner */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/20">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Active Session</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Authorized User'}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              {userRole.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Operations & Control
          </p>

          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Enterprise v1.0.4</span>
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Postgres Online
          </span>
        </div>
      </aside>
    </>
  );
};
