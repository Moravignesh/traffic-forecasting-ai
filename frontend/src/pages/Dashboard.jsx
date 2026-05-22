import React, { useEffect, useState } from "react";
import { getKPI, getSummary, getHistorical, anomalySummary, getRecommendations } from "../services/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend,
} from "recharts";
import { Car, Zap, AlertTriangle, Route, TrendingUp, Activity } from "lucide-react";

const COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6"];
const ROUTES = ["Route_A","Route_B","Route_C","Route_D","Route_E"];

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="card flex items-start gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const fmt = (ts) => {
  const d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:00`;
};

export default function Dashboard() {
  const [kpi,    setKpi]    = useState(null);
  const [hist,   setHist]   = useState([]);
  const [recs,   setRecs]   = useState([]);
  const [aSum,   setASum]   = useState(null);
  const [loading,setLoading]= useState(true);
  const [noData, setNoData] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [k, h, r, a] = await Promise.all([
        getKPI(), getHistorical(null, 300), getRecommendations(), anomalySummary(),
      ]);
      if (k.data && Object.keys(k.data).length > 0) {
        setKpi(k.data); setNoData(false);
      } else { setNoData(true); }
      const raw = h.data?.data || [];
      const sample = raw.filter((_,i) => i % 3 === 0).slice(-80);
      setHist(sample.map(d => ({
        time: fmt(d.timestamp),
        [d.route_id]: d.vehicle_count,
        congestion: d.congestion_level,
        speed: d.average_speed,
        route: d.route_id,
      })));
      setRecs(r.data?.recommendations?.slice(0,4) || []);
      setASum(a.data || null);
    } catch { setNoData(true); }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading dashboard…</p>
      </div>
    </div>
  );

  if (noData) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Activity size={48} className="text-slate-600" />
      <div className="text-center">
        <p className="text-white font-semibold text-lg">No Data Available</p>
        <p className="text-slate-400 text-sm mt-1">Click "Generate Data" in the header to load 90 days of traffic data.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Car}          label="Total Vehicles"     value={kpi?.total_vehicles?.toLocaleString()} color="bg-blue-600"    sub="All routes"/>
        <StatCard icon={Zap}          label="Avg Congestion"     value={`${kpi?.avg_congestion_pct}%`}         color="bg-orange-500"  sub="Network-wide"/>
        <StatCard icon={TrendingUp}   label="Avg Speed"          value={`${kpi?.avg_speed_kmh} kph`}           color="bg-emerald-600" sub="All routes"/>
        <StatCard icon={AlertTriangle}label="Total Incidents"    value={kpi?.total_incidents}                  color="bg-red-600"     sub="Last 90 days"/>
        <StatCard icon={Activity}     label="Anomalies Detected" value={kpi?.total_anomalies}                  color="bg-purple-600"  sub="Auto-detected"/>
        <StatCard icon={Route}        label="Routes Monitored"   value={kpi?.routes_monitored}                 color="bg-cyan-600"    sub={`${kpi?.days_of_data} days`}/>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Traffic Volume Chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">📊 Historical Traffic Volume</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hist}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" tick={{ fill:"#64748b", fontSize:10 }} interval={15} />
              <YAxis tick={{ fill:"#64748b", fontSize:10 }} />
              <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }} />
              <Area type="monotone" dataKey="congestion" stroke="#3B82F6" fill="url(#g1)" name="Congestion" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Speed Chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">⚡ Average Speed Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" tick={{ fill:"#64748b", fontSize:10 }} interval={15} />
              <YAxis tick={{ fill:"#64748b", fontSize:10 }} />
              <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"8px" }} />
              <Line type="monotone" dataKey="speed" stroke="#10B981" dot={false} name="Speed (kph)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recommendations */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">💡 AI Recommendations</h3>
          <div className="space-y-3">
            {recs.length === 0 && <p className="text-slate-500 text-sm">No recommendations available.</p>}
            {recs.map((r, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg">
                <span className="text-lg">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-white">{r.route_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.priority==="High" ? "bg-red-900 text-red-300" :
                      r.priority==="Medium" ? "bg-yellow-900 text-yellow-300" : "bg-blue-900 text-blue-300"
                    }`}>{r.priority}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{r.message}</p>
                  <p className="text-xs text-emerald-400 mt-1">{r.estimated_improvement}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Anomaly Summary */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">🔍 Anomaly Overview</h3>
          {aSum ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:"Total Records", val: aSum.total_records?.toLocaleString() },
                  { label:"Anomalies",     val: aSum.total_anomalies },
                  { label:"Anomaly Rate",  val: `${aSum.anomaly_rate}%` },
                ].map(({label,val}) => (
                  <div key={label} className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-white">{val}</p>
                    <p className="text-xs text-slate-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 mt-2">
                {Object.entries(aSum.by_route || {}).map(([route, cnt]) => (
                  <div key={route} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-20">{route}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100,(cnt/Math.max(1,aSum.total_anomalies)*100))}%` }} />
                    </div>
                    <span className="text-xs text-white w-6">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">No anomaly data.</p>}
        </div>
      </div>
    </div>
  );
}
