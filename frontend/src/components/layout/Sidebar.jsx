import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, AlertTriangle,
  PlayCircle, Lightbulb, BarChart2, Activity,
} from "lucide-react";

const links = [
  { to: "/",             label: "Dashboard",     icon: LayoutDashboard },
  { to: "/forecast",     label: "Forecasting",   icon: TrendingUp      },
  { to: "/anomalies",    label: "Anomalies",     icon: AlertTriangle   },
  { to: "/simulation",   label: "Simulation",    icon: PlayCircle      },
  { to: "/optimization", label: "Optimization",  icon: Lightbulb       },
  { to: "/analytics",    label: "Analytics",     icon: BarChart2       },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-400" size={22} />
          <div>
            <p className="text-sm font-bold text-white leading-tight">TrafficAI</p>
            <p className="text-xs text-slate-400">Mobility Forecasting</p>
          </div>
        </div>
      </div>
      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to} end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-slate-800 text-xs text-slate-500">
        AI Traffic System v1.0
      </div>
    </aside>
  );
}
