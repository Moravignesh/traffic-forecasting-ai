import React, { useState, useEffect } from "react";
import { getRecommendations, getRouteComparison, getBestTimes, getRoutes } from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import { Lightbulb, Clock, Route, AlertCircle } from "lucide-react";

const PRIORITY_STYLE = {
  High:   "border-l-4 border-red-500 bg-red-900/20",
  Medium: "border-l-4 border-yellow-500 bg-yellow-900/20",
  Info:   "border-l-4 border-blue-500 bg-blue-900/20",
};

export default function Optimization() {
  const [recs,    setRecs]    = useState([]);
  const [compare, setCompare] = useState([]);
  const [times,   setTimes]   = useState([]);
  const [routes,  setRoutes]  = useState([]);
  const [route,   setRoute]   = useState("Route_A");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getRoutes().then(r => setRoutes(r.data.routes || [])).catch(() => {});
    loadAll("Route_A");
  }, []);

  useEffect(() => { if (route) getBestTimes(route).then(r => setTimes(r.data.best_times || [])).catch(() => {}); }, [route]);

  const loadAll = async (r) => {
    setLoading(true); setError("");
    try {
      const [rec, cmp] = await Promise.all([getRecommendations(), getRouteComparison()]);
      setRecs(rec.data.recommendations || []);
      setCompare(cmp.data.comparison   || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load optimization data. Generate data first.");
    }
    setLoading(false);
  };

  const radarData = compare.map(c => ({
    route: c.route_id,
    Congestion: +(c.avg_congestion * 100).toFixed(1),
    Speed: c.avg_speed_kmh,
  }));

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex gap-2 items-center text-red-300 text-sm">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {/* Recommendations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Lightbulb size={16} className="text-yellow-400" /> AI Recommendations ({recs.length})
          </h3>
          <button onClick={() => loadAll(route)} disabled={loading}
            className="btn-secondary text-xs">{loading ? "Loading…" : "Refresh"}</button>
        </div>
        <div className="space-y-3">
          {recs.length === 0 && !loading && <p className="text-slate-500 text-sm">No recommendations. Generate data first.</p>}
          {recs.map((r, i) => (
            <div key={i} className={`rounded-lg p-4 ${PRIORITY_STYLE[r.priority] || ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{r.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-white">{r.route_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.priority==="High"   ? "bg-red-800 text-red-200" :
                        r.priority==="Medium" ? "bg-yellow-800 text-yellow-200" : "bg-blue-800 text-blue-200"
                      }`}>{r.priority}</span>
                      <span className="text-xs text-slate-400">{r.type?.replace(/_/g," ")}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{r.message}</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={11} /> {r.time_period}
                      </span>
                      <span className="text-xs text-emerald-400">📈 {r.estimated_improvement}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Route Comparison Bar Chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Route size={15} className="text-blue-400" /> Route Congestion Comparison
          </h3>
          <p className="text-xs text-slate-500 mb-4">Average congestion level per route (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={compare.map(c => ({
              route: c.route_id, congestion: +(c.avg_congestion*100).toFixed(1),
              speed: c.avg_speed_kmh
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="route" tick={{ fill:"#64748b", fontSize:10 }} />
              <YAxis tick={{ fill:"#64748b", fontSize:10 }} unit="%" />
              <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }}
                formatter={(v,n) => [n==="congestion"?`${v}%`:`${v} kph`, n==="congestion"?"Congestion":"Speed"]} />
              <Legend wrapperStyle={{ fontSize:11, color:"#94a3b8" }} />
              <Bar dataKey="congestion" fill="#EF4444" radius={[4,4,0,0]} name="Congestion %" />
              <Bar dataKey="speed"      fill="#10B981" radius={[4,4,0,0]} name="Speed kph" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">🕸️ Route Performance Radar</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="route" tick={{ fill:"#64748b", fontSize:10 }} />
              <PolarRadiusAxis tick={{ fill:"#64748b", fontSize:9 }} />
              <Radar name="Congestion" dataKey="Congestion" stroke="#EF4444" fill="#EF4444" fillOpacity={0.25} />
              <Radar name="Speed"      dataKey="Speed"      stroke="#10B981" fill="#10B981" fillOpacity={0.25} />
              <Legend wrapperStyle={{ fontSize:11, color:"#94a3b8" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Route Table */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">📋 Route Metrics Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  {["Route","Name","Avg Cong.","Avg Speed","Peak Hr","Best Hr","Status"].map(h => (
                    <th key={h} className="text-left py-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compare.map((c, i) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                    <td className="py-2 pr-3 font-medium text-blue-400">{c.route_id}</td>
                    <td className="py-2 pr-3 text-slate-300">{c.route_name}</td>
                    <td className="py-2 pr-3 text-white">{(c.avg_congestion*100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 text-white">{c.avg_speed_kmh} kph</td>
                    <td className="py-2 pr-3 text-orange-300">{c.peak_hour}:00</td>
                    <td className="py-2 pr-3 text-emerald-300">{c.best_hour}:00</td>
                    <td className="py-2">
                      <span className={`badge-${c.congestion_label?.toLowerCase()}`}>{c.congestion_label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Best Times */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock size={15} className="text-emerald-400" /> Best Travel Times
          </h3>
          <div className="mb-3">
            <select value={route} onChange={e => setRoute(e.target.value)} className="text-sm">
              {routes.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {times.length === 0 && <p className="text-slate-500 text-sm">Select a route to see best travel times.</p>}
            {times.map((t, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                i===0 ? "bg-emerald-900/30 border border-emerald-800" : "bg-slate-800"
              }`}>
                <span className="text-xl">{i===0?"🏆":i<3?"✅":"⏰"}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-white">{t.label}</span>
                    <span className="text-xs text-emerald-400">{t.recommendation}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span>Congestion: {(t.avg_congestion*100).toFixed(0)}%</span>
                    <span>Speed: {t.avg_speed.toFixed(0)} kph</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
