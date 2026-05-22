import React, { useState, useEffect } from "react";
import { forecast24h, forecast7d, forecastPeak, getRoutes } from "../services/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { TrendingUp, Clock, AlertCircle } from "lucide-react";

const CONG_COLOR = { Low:"#10B981", Moderate:"#F59E0B", High:"#EF4444", Severe:"#9B1C1C" };

export default function Forecast() {
  const [routes,  setRoutes]  = useState([]);
  const [route,   setRoute]   = useState("Route_A");
  const [mode,    setMode]    = useState("24h");
  const [data,    setData]    = useState([]);
  const [peaks,   setPeaks]   = useState([]);
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getRoutes().then(r => { setRoutes(r.data.routes || []); }).catch(() => {});
  }, []);

  useEffect(() => { if (route) loadForecast(); }, [route, mode]);

  const loadForecast = async () => {
    setLoading(true); setError("");
    try {
      const fn = mode === "24h" ? forecast24h : forecast7d;
      const [res, pk] = await Promise.all([fn(route), forecastPeak(route)]);
      const preds = res.data?.predictions || [];
      setData(preds.map(p => ({
        label: mode === "24h"
          ? `${new Date(p.timestamp).getHours()}:00`
          : (p.date || p.timestamp?.slice(0,10)),
        vehicle_count:    p.vehicle_count,
        congestion_level: +(p.congestion_level * 100).toFixed(1),
        average_speed:    p.average_speed,
        congestion_label: p.congestion_label || p.congestion_category,
        is_peak:          p.is_peak,
      })));
      setPeaks(pk.data?.peak_predictions || []);
      setAlerts(pk.data?.alerts || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Error fetching forecast. Generate data first.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-36">
          <label className="text-xs text-slate-400 mb-1 block">Route</label>
          <select value={route} onChange={e => setRoute(e.target.value)}>
            {routes.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-36">
          <label className="text-xs text-slate-400 mb-1 block">Horizon</label>
          <div className="flex gap-2">
            {["24h","7d"].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  mode===m ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}>{m === "24h" ? "Next 24 Hours" : "Next 7 Days"}</button>
            ))}
          </div>
        </div>
        <div className="pt-4">
          <button onClick={loadForecast}
            className="btn-primary flex items-center gap-2" disabled={loading}>
            <TrendingUp size={14} />
            {loading ? "Forecasting…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 flex gap-2 items-center">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="bg-yellow-900/30 border border-yellow-800 rounded-lg px-4 py-2.5 text-sm text-yellow-300 flex gap-2">
              ⚠️ {a}
            </div>
          ))}
        </div>
      )}

      {/* Main Charts */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Volume Forecast */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-1">🚗 Vehicle Volume Forecast</h3>
            <p className="text-xs text-slate-500 mb-4">{route} — {mode === "24h" ? "Hourly" : "Daily"} predictions</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill:"#64748b", fontSize:10 }} interval={mode==="24h"?3:0} />
                <YAxis tick={{ fill:"#64748b", fontSize:10 }} />
                <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }}
                  formatter={(v) => [v.toLocaleString(), "Vehicles"]} />
                <Bar dataKey="vehicle_count" fill="#3B82F6" radius={[4,4,0,0]} name="Vehicles" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Congestion Forecast */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-1">🔴 Congestion Level Forecast</h3>
            <p className="text-xs text-slate-500 mb-4">{route} — 0–100% scale</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill:"#64748b", fontSize:10 }} interval={mode==="24h"?3:0} />
                <YAxis domain={[0,100]} tick={{ fill:"#64748b", fontSize:10 }} unit="%" />
                <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }}
                  formatter={(v) => [`${v}%`, "Congestion"]} />
                <ReferenceLine y={60} stroke="#F59E0B" strokeDasharray="4 4" label={{ value:"High", fill:"#F59E0B", fontSize:10 }} />
                <ReferenceLine y={80} stroke="#EF4444" strokeDasharray="4 4" label={{ value:"Severe", fill:"#EF4444", fontSize:10 }} />
                <Line type="monotone" dataKey="congestion_level" stroke="#EF4444" dot={false} name="Congestion %" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Speed Forecast */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-1">⚡ Speed Forecast</h3>
            <p className="text-xs text-slate-500 mb-4">{route} — km/h</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill:"#64748b", fontSize:10 }} interval={mode==="24h"?3:0} />
                <YAxis tick={{ fill:"#64748b", fontSize:10 }} unit=" kph" />
                <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }} />
                <Line type="monotone" dataKey="average_speed" stroke="#10B981" dot={false} strokeWidth={2} name="Speed" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Hours Table */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">🕐 Peak Hours (Top 8)</h3>
            <div className="space-y-2 overflow-y-auto max-h-52">
              {peaks.length === 0 && <p className="text-slate-500 text-sm">No peak data.</p>}
              {peaks.map((p, i) => {
                const hr = new Date(p.timestamp).getHours();
                const cl = p.congestion_level;
                const cat = p.congestion_label;
                return (
                  <div key={i} className="flex items-center gap-3 bg-slate-800 px-3 py-2 rounded-lg">
                    <Clock size={13} className="text-slate-400 shrink-0" />
                    <span className="text-sm text-white w-16">{hr}:00</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all"
                        style={{ width:`${cl*100}%`, background: CONG_COLOR[cat] || "#6b7280" }} />
                    </div>
                    <span className="text-xs font-mono text-white w-10">{(cl*100).toFixed(0)}%</span>
                    <span className={`badge-${cat?.toLowerCase()||"low"} text-xs`}>{cat}</span>
                    {p.is_peak && <span className="text-xs bg-orange-900 text-orange-300 px-2 py-0.5 rounded-full">Rush</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
