import React, { useState, useEffect } from "react";
import { detectAnomalies, anomalySummary, anomalyTS, getRoutes } from "../services/api";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Legend,
} from "recharts";
import { AlertTriangle, ShieldCheck, Activity } from "lucide-react";

const REASONS_MAP = (r) => {
  if (r?.includes("volume"))    return { color:"bg-red-900 text-red-300",    label:"Volume Spike" };
  if (r?.includes("Isolation")) return { color:"bg-purple-900 text-purple-300", label:"ML Anomaly" };
  if (r?.includes("Incident"))  return { color:"bg-orange-900 text-orange-300", label:"Incident" };
  return                               { color:"bg-slate-700 text-slate-300",   label:"Statistical" };
};

export default function Anomalies() {
  const [routes,   setRoutes]   = useState([]);
  const [route,    setRoute]    = useState("Route_A");
  const [anomalies,setAnomalies]= useState([]);
  const [summary,  setSummary]  = useState(null);
  const [tsData,   setTsData]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    getRoutes().then(r => setRoutes(r.data.routes || [])).catch(() => {});
    loadSummary();
  }, []);

  useEffect(() => { if (route) loadRoute(); }, [route]);

  const loadSummary = async () => {
    try {
      const r = await anomalySummary();
      setSummary(r.data);
    } catch {}
  };

  const loadRoute = async () => {
    setLoading(true); setError("");
    try {
      const [a, ts] = await Promise.all([detectAnomalies(route), anomalyTS(route)]);
      setAnomalies(a.data?.anomalies || []);
      const raw = ts.data?.data || [];
      setTsData(raw.map((d, i) => ({
        idx: i,
        time: new Date(d.timestamp).toLocaleString("en-IN", { month:"short", day:"numeric", hour:"2-digit" }),
        vehicle_count:    d.vehicle_count,
        congestion_level: +(d.congestion_level * 100).toFixed(1),
        is_anomaly:       d.is_anomaly,
        anomaly_score:    d.anomaly_score,
      })));
    } catch (e) {
      setError(e.response?.data?.detail || "Error loading anomaly data. Generate data first.");
    }
    setLoading(false);
  };

  const normal  = tsData.filter(d => !d.is_anomaly);
  const flagged = tsData.filter(d =>  d.is_anomaly);

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload.is_anomaly) return null;
    return <circle cx={cx} cy={cy} r={5} fill="#EF4444" stroke="#fff" strokeWidth={1} />;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Activity,      label:"Total Records",  val: summary.total_records?.toLocaleString(),  color:"bg-blue-600" },
            { icon: AlertTriangle, label:"Anomalies Found",val: summary.total_anomalies,                  color:"bg-red-600" },
            { icon: ShieldCheck,   label:"Anomaly Rate",   val: `${summary.anomaly_rate}%`,               color:"bg-purple-600" },
            { icon: AlertTriangle, label:"Incidents",      val: summary.incident_count,                   color:"bg-orange-600" },
          ].map(({icon:Icon, label, val, color}) => (
            <div key={label} className="card flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${color}`}><Icon size={18} className="text-white" /></div>
              <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-xl font-bold text-white">{val}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="card flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-36">
          <label className="text-xs text-slate-400 mb-1 block">Select Route</label>
          <select value={route} onChange={e => setRoute(e.target.value)}>
            {routes.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button onClick={loadRoute} disabled={loading}
          className="btn-primary flex items-center gap-2">
          <AlertTriangle size={14} />
          {loading ? "Detecting…" : "Run Detection"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>
      )}

      {tsData.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Time-Series with Anomaly Highlights */}
          <div className="card xl:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-1">📈 Traffic Volume with Anomaly Detection — {route}</h3>
            <p className="text-xs text-slate-500 mb-4">Red dots = detected anomalies (Z-score + IsolationForest)</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={tsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" tick={{ fill:"#64748b", fontSize:9 }} interval={20} />
                <YAxis tick={{ fill:"#64748b", fontSize:10 }} />
                <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }}
                  formatter={(v,n) => [n==="vehicle_count" ? v.toLocaleString() : `${v}%`, n==="vehicle_count" ? "Vehicles":"Congestion"]} />
                <Legend wrapperStyle={{ fontSize:11, color:"#94a3b8" }} />
                <Line type="monotone" dataKey="vehicle_count" stroke="#3B82F6" dot={<CustomDot />} name="Vehicle Count" strokeWidth={1.5} />
                <Line type="monotone" dataKey="congestion_level" stroke="#F59E0B" dot={false} name="Congestion %" strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Scatter: Normal vs Anomaly */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-1">🔵 Scatter — Normal vs Anomaly</h3>
            <p className="text-xs text-slate-500 mb-4">Volume vs Congestion — red = anomaly</p>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="vehicle_count" name="Volume" tick={{ fill:"#64748b", fontSize:10 }} />
                <YAxis dataKey="congestion_level" name="Congestion%" tick={{ fill:"#64748b", fontSize:10 }} unit="%" />
                <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }} />
                <Scatter name="Normal"  data={normal}  fill="#3B82F6" opacity={0.5} />
                <Scatter name="Anomaly" data={flagged} fill="#EF4444" opacity={0.9} />
                <Legend wrapperStyle={{ fontSize:11, color:"#94a3b8" }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Anomaly Table */}
          <div className="card overflow-hidden">
            <h3 className="text-sm font-semibold text-white mb-4">⚠️ Detected Anomalies — {route}</h3>
            {anomalies.length === 0
              ? <p className="text-slate-500 text-sm text-center py-6">No anomalies detected on this route.</p>
              : (
                <div className="overflow-y-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left py-2">Time</th>
                        <th className="text-right py-2">Volume</th>
                        <th className="text-right py-2">Z-Score</th>
                        <th className="text-right py-2">Score</th>
                        <th className="text-left py-2 pl-2">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.map((a, i) => {
                        const rm = REASONS_MAP(a.reason);
                        return (
                          <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                            <td className="py-2 text-slate-300">{new Date(a.timestamp).toLocaleString("en-IN",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
                            <td className="py-2 text-right text-white font-mono">{a.vehicle_count.toLocaleString()}</td>
                            <td className="py-2 text-right font-mono text-orange-300">{a.z_score_volume?.toFixed(2)}</td>
                            <td className="py-2 text-right font-mono text-red-300">{a.anomaly_score?.toFixed(3)}</td>
                            <td className="py-2 pl-2"><span className={`px-2 py-0.5 rounded-full text-xs ${rm.color}`}>{rm.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}
