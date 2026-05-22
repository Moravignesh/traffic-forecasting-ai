import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, RefreshCw } from "lucide-react";
import { generateData } from "../../services/api";

const PAGE_TITLES = {
  "/":             "Dashboard",
  "/forecast":     "Traffic Forecasting",
  "/anomalies":    "Anomaly Detection",
  "/simulation":   "Scenario Simulation",
  "/optimization": "Mobility Optimization",
  "/analytics":    "Advanced Analytics",
};

export default function Header() {
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleGenerate = async () => {
    setLoading(true); setMsg("");
    try {
      const res = await generateData(90);
      setMsg(`✓ ${res.data.records_created} records generated & models trained`);
    } catch {
      setMsg("✗ Error generating data");
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-base font-semibold text-white">
          {PAGE_TITLES[pathname] || "Traffic AI"}
        </h1>
        <p className="text-xs text-slate-500">Real-time traffic intelligence platform</p>
      </div>
      <div className="flex items-center gap-3">
        {msg && (
          <span className={`text-xs px-3 py-1 rounded-full ${msg.startsWith("✓") ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
            {msg}
          </span>
        )}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Generating…" : "Generate Data"}
        </button>
        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
          <Bell size={17} />
        </button>
      </div>
    </header>
  );
}
