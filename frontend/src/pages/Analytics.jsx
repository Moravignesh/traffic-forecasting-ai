import React, { useState, useEffect } from "react";
import {
  getRouteMetrics, getTrend, getWeatherImpact,
  getPeakHours, getHeatmap, getRoutes,
} from "../services/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";
import { BarChart2, AlertCircle } from "lucide-react";

const ROUTE_COLORS = {
  Route_A:"#3B82F6", Route_B:"#10B981",
  Route_C:"#F59E0B", Route_D:"#EF4444", Route_E:"#8B5CF6",
};
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function Analytics() {
  const [metrics,  setMetrics]  = useState([]);
  const [trend,    setTrend]    = useState([]);
  const [weather,  setWeather]  = useState([]);
  const [peakData, setPeakData] = useState([]);
  const [heatmap,  setHeatmap]  = useState([]);
  const [routes,   setRoutes]   = useState([]);
  const [selRoute, setSelRoute] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    getRoutes().then(r => setRoutes(r.data.routes || [])).catch(() => {});
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true); setError("");
    try {
      const [m, t, w, p, h] = await Promise.all([
        getRouteMetrics(), getTrend(null), getWeatherImpact(),
        getPeakHours(), getHeatmap(null),
      ]);
      setMetrics(m.data.data || []);

      // Pivot trend for multi-line
      const raw = t.data.data || [];
      const byDate = {};
      raw.forEach(d => {
        if (!byDate[d.date]) byDate[d.date] = { date: d.date };
        byDate[d.date][d.route_id] = d.vehicle_count;
      });
      setTrend(Object.values(byDate).sort((a,b) => a.date.localeCompare(b.date)).slice(-30));

      setWeather(w.data.data || []);

      // Peak hours — aggregate across routes
      const ph = p.data.data || [];
      const byHour = {};
      ph.forEach(d => {
        if (!byHour[d.hour]) byHour[d.hour] = { hour: d.hour };
        byHour[d.hour][d.route_id] = +(d.avg_congestion * 100).toFixed(1);
      });
      setPeakData(Object.values(byHour).sort((a,b) => a.hour - b.hour));

      // Heatmap (flatten)
      setHeatmap(h.data.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Load error. Please generate data first.");
    }
    setLoading(false);
  };

  // Build heatmap grid: day x hour → avg congestion
  const heatGrid = {};
  heatmap.forEach(d => {
    const key = `${d.day_of_week}-${d.hour}`;
    heatGrid[key] = d.congestion_level;
  });
  const maxCong = Math.max(...heatmap.map(d => d.congestion_level), 0.01);

  const heatColor = (val) => {
    if (!val) return "#1e293b";
    const t = val / maxCong;
    if (t < 0.33) return `rgba(16,185,129,${0.3+t*0.7})`;
    if (t < 0.66) return `rgba(245,158,11,${0.3+t*0.7})`;
    return `rgba(239,68,68,${0.3+t*0.7})`;
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="card flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <BarChart2 size={16} className="text-blue-400" /> Advanced Analytics Dashboard
        </h3>
        <button onClick={loadAll} disabled={loading} className="btn-primary text-xs">
          {loading ? "Loading…" : "Refresh All"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex gap-2 items-center text-red-300 text-sm">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {/* Route Metrics Table */}
      {metrics.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">📋 Route Performance Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  {["Route","Total Vehicles","Avg Congestion","Avg Speed","Max Cong.","Incidents","Anomalies","Records"].map(h => (
                    <th key={h} className="text-left py-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: ROUTE_COLORS[m.route_id] || "#6b7280" }} />
                        <span className="font-medium text-white">{m.route_id}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-200">{m.total_vehicles?.toLocaleString()}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width:`${m.avg_congestion*100}%`, background: m.avg_congestion>0.65?"#EF4444":m.avg_congestion>0.4?"#F59E0B":"#10B981" }} />
                        </div>
                        <span className="text-white">{(m.avg_congestion*100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-200">{m.avg_speed?.toFixed(1)} kph</td>
                    <td className="py-2.5 pr-4 text-red-300">{(m.max_congestion*100).toFixed(1)}%</td>
                    <td className="py-2.5 pr-4 text-orange-300">{m.incident_count}</td>
                    <td className="py-2.5 pr-4 text-purple-300">{m.anomaly_count}</td>
                    <td className="py-2.5 text-slate-400">{m.records?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-line Trend */}
      {trend.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-1">📈 30-Day Traffic Volume Trend (All Routes)</h3>
          <p className="text-xs text-slate-500 mb-4">Daily total vehicle count per route</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill:"#64748b", fontSize:9 }} interval={4} />
              <YAxis tick={{ fill:"#64748b", fontSize:10 }} tickFormatter={v => (v/1000).toFixed(0)+"k"} />
              <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }}
                formatter={(v,n) => [v?.toLocaleString(), n]} />
              <Legend wrapperStyle={{ fontSize:11, color:"#94a3b8" }} />
              {["Route_A","Route_B","Route_C","Route_D","Route_E"].map(r => (
                <Line key={r} type="monotone" dataKey={r} stroke={ROUTE_COLORS[r]}
                  dot={false} strokeWidth={2} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Peak Hours Heatmap (table-style) */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-1">🔥 Congestion Heatmap</h3>
          <p className="text-xs text-slate-500 mb-4">Day × Hour — darker = more congestion</p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr>
                  <th className="text-left text-slate-500 pr-2 pb-1 font-normal">Day\Hr</th>
                  {Array.from({length:24},(_,h) => (
                    <th key={h} className="text-center text-slate-600 pb-1 font-normal" style={{minWidth:18}}>
                      {h%4===0?h:""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, di) => (
                  <tr key={di}>
                    <td className="text-slate-400 pr-2 py-0.5 whitespace-nowrap">{day}</td>
                    {Array.from({length:24},(_,h) => {
                      const val = heatGrid[`${di}-${h}`];
                      return (
                        <td key={h} title={`${day} ${h}:00 — ${val?(val*100).toFixed(0)+"%":"N/A"}`}
                          style={{ background: heatColor(val), width:18, height:18, borderRadius:2 }} />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{background:"rgba(16,185,129,0.7)"}}/> Low</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{background:"rgba(245,158,11,0.7)"}}/> Moderate</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{background:"rgba(239,68,68,0.8)"}}/> High</div>
            </div>
          </div>
        </div>

        {/* Weather Impact */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-1">🌤️ Weather Impact on Traffic</h3>
          <p className="text-xs text-slate-500 mb-4">Avg congestion & speed per weather condition</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weather.map(w => ({
              weather: w.weather_condition,
              congestion: +(w.avg_congestion*100).toFixed(1),
              speed: +w.avg_speed.toFixed(1),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="weather" tick={{ fill:"#64748b", fontSize:10 }} />
              <YAxis yAxisId="l" tick={{ fill:"#64748b", fontSize:10 }} unit="%" />
              <YAxis yAxisId="r" orientation="right" tick={{ fill:"#64748b", fontSize:10 }} unit=" kph" />
              <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }} />
              <Legend wrapperStyle={{ fontSize:11, color:"#94a3b8" }} />
              <Bar yAxisId="l" dataKey="congestion" fill="#F59E0B" radius={[4,4,0,0]} name="Congestion %" />
              <Bar yAxisId="r" dataKey="speed"      fill="#3B82F6" radius={[4,4,0,0]} name="Speed kph" />
            </BarChart>
          </ResponsiveContainer>

          {/* Weather data table */}
          <div className="mt-4 space-y-2">
            {weather.map((w,i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-slate-300 w-24">{w.weather_condition}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-orange-500"
                    style={{width:`${w.avg_congestion*100}%`}} />
                </div>
                <span className="text-white w-12">{(w.avg_congestion*100).toFixed(1)}%</span>
                <span className="text-blue-300 w-16">{w.avg_speed?.toFixed(0)} kph</span>
                <span className="text-slate-500">{w.records} records</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie: vehicle distribution */}
        {metrics.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">🥧 Vehicle Distribution by Route</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={metrics.map(m=>({ name:m.route_id, value:m.total_vehicles }))}
                    cx={75} cy={75} innerRadius={45} outerRadius={75}
                    paddingAngle={3} dataKey="value">
                    {metrics.map((m,i) => <Cell key={i} fill={ROUTE_COLORS[m.route_id]||"#6b7280"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }}
                    formatter={v=>[v.toLocaleString(),"Vehicles"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {metrics.map((m,i) => {
                  const total = metrics.reduce((s,x)=>s+x.total_vehicles,0);
                  const pct = ((m.total_vehicles/total)*100).toFixed(1);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:ROUTE_COLORS[m.route_id]}} />
                      <span className="text-slate-300 flex-1">{m.route_id}</span>
                      <span className="text-white font-medium">{pct}%</span>
                      <span className="text-slate-500">{m.total_vehicles?.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Peak Hour Congestion by Route */}
        {peakData.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-1">⏰ Hourly Congestion by Route</h3>
            <p className="text-xs text-slate-500 mb-4">Average congestion % per hour of day</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={peakData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" tickFormatter={h=>`${h}h`} tick={{ fill:"#64748b", fontSize:10 }} />
                <YAxis tick={{ fill:"#64748b", fontSize:10 }} unit="%" />
                <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }} />
                <Legend wrapperStyle={{ fontSize:11, color:"#94a3b8" }} />
                {["Route_A","Route_B","Route_C","Route_D","Route_E"].map(r => (
                  <Area key={r} type="monotone" dataKey={r} stroke={ROUTE_COLORS[r]}
                    fill={ROUTE_COLORS[r]} fillOpacity={0.08} dot={false} strokeWidth={1.5} connectNulls />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
