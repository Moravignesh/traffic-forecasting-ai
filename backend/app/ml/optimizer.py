import pandas as pd
import numpy as np
from typing import List, Dict

ROUTE_INFO = {
    "Route_A": "Downtown Corridor",
    "Route_B": "Midtown Bypass",
    "Route_C": "Highway Express",
    "Route_D": "Suburb Connector",
    "Route_E": "Ring Road East",
}

class RouteOptimizer:
    def __init__(self):
        self.hourly_profile: Dict = {}
        self.route_metrics: Dict = {}

    def fit(self, df: pd.DataFrame):
        df = df.copy()
        df["hour"] = pd.to_datetime(df["timestamp"]).dt.hour
        df["day_of_week"] = pd.to_datetime(df["timestamp"]).dt.dayofweek
        df["is_weekend"] = (df["day_of_week"] >= 5)

        for rid in df["route_id"].unique():
            rdf = df[df["route_id"]==rid]
            by_hour = rdf.groupby("hour").agg(
                avg_volume=("vehicle_count","mean"),
                avg_congestion=("congestion_level","mean"),
                avg_speed=("average_speed","mean"),
            ).reset_index()
            self.hourly_profile[rid] = by_hour.to_dict(orient="records")
            self.route_metrics[rid] = {
                "avg_congestion": float(rdf["congestion_level"].mean()),
                "peak_hour":      int(rdf.groupby("hour")["vehicle_count"].mean().idxmax()),
                "best_hour":      int(rdf.groupby("hour")["congestion_level"].mean().idxmin()),
                "avg_speed":      float(rdf["average_speed"].mean()),
                "total_records":  int(len(rdf)),
            }

    def get_recommendations(self) -> List[Dict]:
        recs = []
        for rid, metrics in self.route_metrics.items():
            cong = metrics["avg_congestion"]
            best = metrics["best_hour"]
            peak = metrics["peak_hour"]
            name = ROUTE_INFO.get(rid, rid)

            if cong > 0.65:
                recs.append({
                    "type": "congestion_alert",
                    "route_id": rid,
                    "route_name": name,
                    "priority": "High",
                    "message": f"{name} shows severe average congestion ({cong:.0%}). Consider rerouting traffic.",
                    "time_period": f"Peak at {peak:02d}:00",
                    "estimated_improvement": "20–35% reduction with redistribution",
                    "icon": "🔴",
                })
            elif cong > 0.45:
                recs.append({
                    "type": "moderate_congestion",
                    "route_id": rid,
                    "route_name": name,
                    "priority": "Medium",
                    "message": f"Moderate congestion on {name}. Travel after {best:02d}:00 reduces delay.",
                    "time_period": f"Best at {best:02d}:00",
                    "estimated_improvement": "10–20% travel time saving",
                    "icon": "🟡",
                })

        # Load balancing
        if len(self.route_metrics) >= 2:
            sorted_r = sorted(self.route_metrics.items(), key=lambda x: x[1]["avg_congestion"])
            lo_rid, lo_m = sorted_r[0]
            hi_rid, hi_m = sorted_r[-1]
            if hi_m["avg_congestion"] - lo_m["avg_congestion"] > 0.25:
                recs.append({
                    "type": "load_balance",
                    "route_id": hi_rid,
                    "route_name": ROUTE_INFO.get(hi_rid, hi_rid),
                    "priority": "Medium",
                    "message": f"Redirect {hi_rid} overflow to {lo_rid} ({ROUTE_INFO.get(lo_rid,lo_rid)}) which has spare capacity.",
                    "time_period": "All day",
                    "estimated_improvement": "15–25% congestion reduction on " + hi_rid,
                    "icon": "🔀",
                })

        # Best travel times
        all_hourly = []
        for rid, profile in self.hourly_profile.items():
            for h in profile:
                all_hourly.append({"route_id": rid, **h})
        if all_hourly:
            hdf = pd.DataFrame(all_hourly)
            overall_best = hdf.groupby("hour")["avg_congestion"].mean().idxmin()
            recs.append({
                "type": "best_time",
                "route_id": "ALL",
                "route_name": "All Routes",
                "priority": "Info",
                "message": f"Overall least congestion across all routes at {overall_best:02d}:00. Plan trips then.",
                "time_period": f"{overall_best:02d}:00 – {(overall_best+1)%24:02d}:00",
                "estimated_improvement": "Up to 30% faster travel",
                "icon": "✅",
            })

        return sorted(recs, key=lambda x: {"High":0,"Medium":1,"Info":2}.get(x["priority"],3))

    def route_comparison(self) -> List[Dict]:
        rows = []
        for rid, m in self.route_metrics.items():
            congestion_pct = m["avg_congestion"]
            rows.append({
                "route_id": rid,
                "route_name": ROUTE_INFO.get(rid, rid),
                "avg_congestion": round(congestion_pct, 3),
                "avg_speed_kmh": round(m["avg_speed"], 1),
                "peak_hour": m["peak_hour"],
                "best_hour": m["best_hour"],
                "congestion_label": "High" if congestion_pct>0.65 else "Moderate" if congestion_pct>0.4 else "Low",
            })
        return sorted(rows, key=lambda x: x["avg_congestion"], reverse=True)

    def best_travel_times(self, route_id: str) -> List[Dict]:
        if route_id not in self.hourly_profile:
            return []
        profile = sorted(self.hourly_profile[route_id], key=lambda x: x["avg_congestion"])
        return [
            {
                "hour": h["hour"],
                "label": f"{h['hour']:02d}:00",
                "avg_congestion": round(h["avg_congestion"],3),
                "avg_speed": round(h["avg_speed"],1),
                "recommendation": "Best time" if i==0 else "Good time" if i<3 else "Acceptable",
            }
            for i, h in enumerate(profile[:6])
        ]

optimizer = RouteOptimizer()
