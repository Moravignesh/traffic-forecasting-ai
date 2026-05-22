import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000", timeout: 60000 });

// ── Data ──────────────────────────────────────────────
export const generateData  = (days = 90)   => api.post(`/api/data/generate?days=${days}`);
export const uploadCSV     = (file)        => {
  const fd = new FormData(); fd.append("file", file);
  return api.post("/api/data/upload", fd);
};
export const getRoutes     = ()            => api.get("/api/data/routes");
export const getSummary    = ()            => api.get("/api/data/summary");
export const getHistorical = (route, lim) => api.get("/api/data/historical", { params: { route_id: route, limit: lim || 500 } });

// ── Forecasting ───────────────────────────────────────
export const trainModels   = ()            => api.get("/api/forecast/train");
export const forecast24h   = (route)      => api.get("/api/forecast/24h", { params: { route_id: route } });
export const forecast7d    = (route)      => api.get("/api/forecast/7d",  { params: { route_id: route } });
export const forecastPeak  = (route)      => api.get("/api/forecast/peak-hours", { params: { route_id: route } });
export const forecastAll24h = ()          => api.get("/api/forecast/all-routes/24h");

// ── Anomaly ───────────────────────────────────────────
export const detectAnomalies = (route)    => api.get("/api/anomaly/detect",      { params: route ? { route_id: route } : {} });
export const anomalySummary  = ()         => api.get("/api/anomaly/summary");
export const anomalyTS       = (route)    => api.get("/api/anomaly/time-series",  { params: { route_id: route } });

// ── Optimization ──────────────────────────────────────
export const getRecommendations = ()      => api.get("/api/optimize/recommendations");
export const getRouteComparison = ()      => api.get("/api/optimize/route-comparison");
export const getBestTimes       = (route) => api.get("/api/optimize/best-times", { params: { route_id: route } });

// ── Simulation ────────────────────────────────────────
export const runSimulation  = (payload)   => api.post("/api/simulate/run", payload);
export const getScenarios   = ()          => api.get("/api/simulate/scenarios");

// ── Analytics ─────────────────────────────────────────
export const getHeatmap      = (route)    => api.get("/api/analytics/congestion-heatmap", { params: route ? { route_id: route } : {} });
export const getPeakHours    = ()         => api.get("/api/analytics/peak-hours");
export const getRouteMetrics = ()         => api.get("/api/analytics/route-metrics");
export const getTrend        = (route)    => api.get("/api/analytics/trend",       { params: route ? { route_id: route } : {} });
export const getWeatherImpact= ()         => api.get("/api/analytics/weather-impact");
export const getKPI          = ()         => api.get("/api/analytics/kpi");

export default api;
