import React, { useState, useEffect } from "react";
import { runSimulation, getScenarios, getRoutes } from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import { PlayCircle, AlertCircle } from "lucide-react";

const SCENARIO_ICONS = {
  road_closure:"🚧", rain:"🌧️", fog:"🌫️",
  event_surge:"🎉",  vehicle_surge:"🚗", accident:"💥",
};

export default function Simulation() {
  const [scenarios, setScenarios] = useState([]);
  const [routes,    setRoutes]    = useState([]);
  const [form, setForm] = useState({
    scenario_type:"rain", route_id:"Route_A",
    severity:1.0, duration_hours:4,
  });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getScenarios().then(r => setScenarios(r.data.scenarios || [])).catch(() => {});
    getRoutes().then(r => setRoutes(r.data.routes || [])).catch(() => {});
  }, []);

  const run = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await runSimulation(form);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Simulation failed. Generate data first.");
    }
    setLoading(false);
  };

  const impactColor = (v) => v > 0 ? "#EF4444" : "#10B981";

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4">⚙️ Scenario Configuration</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Scenario Type</label>
            <select value={form.scenario_type}
              onChange={e => setForm({...form, scenario_type: e.target.value})}>
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>
                  {SCENARIO_ICONS[s.id]} {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Route</label>
            <select value={form.route_id}
              onChange={e => setForm({...form, route_id: e.target.value})}>
              {routes.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Severity: <span className="text-white font-medium">{form.severity}x</span>
            </label>
            <input type="range" min="0.5" max="2.0" step="0.1"
              value={form.severity}
              onChange={e => setForm({...form, severity: parseFloat(e.target.value)})}
              className="w-full accent-blue-500 mt-2"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Mild</span><span>Moderate</span><span>Severe</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Duration: {form.duration_hours}h</label>
            <input type="range" min="1" max="12" step="1"
              value={form.duration_hours}
              onChange={e => setForm({...form, duration_hours: parseInt(e.target.value)})}
              className="w-full accent-blue-500 mt-2"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1h</span><span>6h</span><span>12h</span>
            </div>
          </div>
        </div>
        <button onClick={run} disabled={loading}
          className="btn-primary flex items-center gap-2 text-sm">
          <PlayCircle size={16} />
          {loading ? "Simulating…" : "Run Simulation"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex gap-2 items-center text-red-300 text-sm">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Header */}
          <div className="card bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{SCENARIO_ICONS[result.scenario_type]}</span>
              <div>
                <h2 className="text-white font-bold text-lg">{result.scenario_label}</h2>
                <p className="text-slate-400 text-sm">{result.description}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400">Route</p>
                <p className="text-white font-semibold">{result.route_name}</p>
              </div>
            </div>
          </div>

          {/* Impact Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:"Volume Change",     base: result.impact.baseline_volume,    pred: result.impact.predicted_volume,    unit:"veh/h" },
              { label:"Congestion Change", base: `${(result.impact.baseline_congestion*100).toFixed(0)}%`, pred: `${(result.impact.predicted_congestion*100).toFixed(0)}%`, pct: result.impact.congestion_change_pct, unit:"" },
              { label:"Speed Change",      base: `${result.impact.baseline_speed.toFixed(0)} kph`, pred: `${result.impact.predicted_speed.toFixed(0)} kph`, pct: result.impact.speed_change_pct, unit:"" },
              { label:"Travel Time",       base: `${result.impact.baseline_travel_min}m`, pred: `${result.impact.predicted_travel_min}m`, pct: ((result.impact.delay_minutes / result.impact.baseline_travel_min)*100).toFixed(1), unit:"" },
            ].map(({ label, base, pred, pct, unit }) => (
              <div key={label} className="card text-center">
                <p className="text-xs text-slate-400 mb-2">{label}</p>
                <p className="text-lg font-bold text-white">{pred}{unit}</p>
                <p className="text-xs text-slate-500">Base: {base}{unit}</p>
                {pct !== undefined && (
                  <p className={`text-sm font-medium mt-1 ${parseFloat(pct) > 0 ? "text-red-400":"text-emerald-400"}`}>
                    {parseFloat(pct) > 0 ? "+" : ""}{pct}%
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Hourly Breakdown Chart */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">📊 Hourly Impact Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={result.hourly_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour_offset" tickFormatter={v=>`+${v}h`} tick={{ fill:"#64748b", fontSize:10 }} />
                  <YAxis yAxisId="left" tick={{ fill:"#64748b", fontSize:10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill:"#64748b", fontSize:10 }} domain={[0,1]} />
                  <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }} />
                  <Legend wrapperStyle={{ fontSize:11, color:"#94a3b8" }} />
                  <Bar yAxisId="left" dataKey="vehicle_count"    fill="#3B82F6" name="Vehicles" radius={[3,3,0,0]} />
                  <Bar yAxisId="right" dataKey="congestion_level" fill="#EF4444" name="Congestion" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Adjacent Routes */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">🔀 Impact on Adjacent Routes</h3>
              {result.adjacent_routes?.length === 0
                ? <p className="text-slate-500 text-sm">No adjacent route impact.</p>
                : (
                  <div className="space-y-3">
                    {result.adjacent_routes.map((adj, i) => (
                      <div key={i} className="bg-slate-800 rounded-lg p-3">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-white">{adj.route_name}</span>
                          <span className="text-xs text-red-400">+{(adj.congestion_increase*100).toFixed(1)}% congestion</span>
                        </div>
                        <div className="bg-slate-700 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full"
                            style={{ width:`${adj.new_congestion*100}%` }} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">New congestion: {(adj.new_congestion*100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                )
              }

              {/* Recommendations */}
              <h3 className="text-sm font-semibold text-white mt-4 mb-3">💡 Recommendations</h3>
              <div className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-2 items-start bg-blue-900/20 border border-blue-900/50 rounded-lg p-2.5">
                    <span className="text-blue-400 text-sm mt-0.5">→</span>
                    <p className="text-xs text-slate-300">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
