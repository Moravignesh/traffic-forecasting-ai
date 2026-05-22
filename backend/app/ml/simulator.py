import pandas as pd
import numpy as np
from typing import Dict, List

SCENARIO_CONFIGS = {
    "road_closure": {
        "vol_factor": 0.0, "cong_boost": 0.85, "speed_factor": 0.10,
        "label": "Road Closure",
        "desc": "Complete road closure — all traffic rerouted",
    },
    "rain": {
        "vol_factor": 1.10, "cong_boost": 0.22, "speed_factor": 0.72,
        "label": "Heavy Rain",
        "desc": "Adverse weather — reduced visibility and wet roads",
    },
    "fog": {
        "vol_factor": 0.92, "cong_boost": 0.18, "speed_factor": 0.65,
        "label": "Dense Fog",
        "desc": "Low visibility — mandatory speed reductions",
    },
    "event_surge": {
        "vol_factor": 1.80, "cong_boost": 0.45, "speed_factor": 0.55,
        "label": "Festival / Event Surge",
        "desc": "Large event nearby causing traffic influx",
    },
    "vehicle_surge": {
        "vol_factor": 1.40, "cong_boost": 0.28, "speed_factor": 0.75,
        "label": "Increased Vehicle Load",
        "desc": "Temporary 40% increase in vehicle volume",
    },
    "accident": {
        "vol_factor": 1.20, "cong_boost": 0.55, "speed_factor": 0.35,
        "label": "Accident",
        "desc": "Multi-vehicle accident reducing lanes",
    },
}

ROUTE_INFO = {
    "Route_A": "Downtown Corridor", "Route_B": "Midtown Bypass",
    "Route_C": "Highway Express",   "Route_D": "Suburb Connector",
    "Route_E": "Ring Road East",
}
ADJACENT = {
    "Route_A": ["Route_B","Route_C"],
    "Route_B": ["Route_A","Route_E"],
    "Route_C": ["Route_A","Route_D"],
    "Route_D": ["Route_C","Route_E"],
    "Route_E": ["Route_B","Route_D"],
}
BASE_TRAVEL_MIN = {"Route_A":22,"Route_B":18,"Route_C":15,"Route_D":12,"Route_E":20}

class ScenarioSimulator:
    def __init__(self):
        self.baseline: Dict = {}

    def fit(self, df: pd.DataFrame):
        for rid in df["route_id"].unique():
            rdf = df[df["route_id"]==rid]
            self.baseline[rid] = {
                "avg_volume": float(rdf["vehicle_count"].mean()),
                "avg_congestion": float(rdf["congestion_level"].mean()),
                "avg_speed": float(rdf["average_speed"].mean()),
            }

    def run(self, scenario_type: str, route_id: str,
            severity: float = 1.0, duration_hours: int = 4) -> Dict:
        if scenario_type not in SCENARIO_CONFIGS:
            raise ValueError(f"Unknown scenario: {scenario_type}")

        cfg = SCENARIO_CONFIGS[scenario_type]
        b   = self.baseline.get(route_id, {
            "avg_volume": 300, "avg_congestion": 0.5, "avg_speed": 45})
        sev = float(np.clip(severity, 0.5, 2.0))

        # Apply scenario modifiers
        new_vol  = b["avg_volume"] * cfg["vol_factor"] * sev
        cong_add = cfg["cong_boost"] * sev
        new_cong = float(np.clip(b["avg_congestion"] + cong_add, 0, 1))
        new_speed= float(max(5, b["avg_speed"] * cfg["speed_factor"] / sev))

        base_tt  = BASE_TRAVEL_MIN.get(route_id, 20)
        new_tt   = base_tt / max(0.05, cfg["speed_factor"] / sev)
        delay    = new_tt - base_tt

        # Impact on adjacent routes
        adjacent_impact = []
        for adj in ADJACENT.get(route_id, []):
            if adj in self.baseline:
                adj_b = self.baseline[adj]
                overflow = 0.35 if scenario_type=="road_closure" else 0.12
                adj_new_cong = float(np.clip(adj_b["avg_congestion"] + overflow*sev, 0, 1))
                adjacent_impact.append({
                    "route_id": adj,
                    "route_name": ROUTE_INFO.get(adj, adj),
                    "congestion_increase": round(adj_new_cong - adj_b["avg_congestion"], 3),
                    "new_congestion": round(adj_new_cong, 3),
                })

        recommendations = _build_recs(scenario_type, route_id, new_cong, delay, adjacent_impact)

        # Hourly breakdown
        hourly = []
        for h in range(duration_hours):
            fade = 1.0 if h < duration_hours//2 else max(0.3, 1-(h-duration_hours//2)*0.25)
            hourly.append({
                "hour_offset": h,
                "vehicle_count": int(new_vol * fade),
                "congestion_level": round(new_cong * fade, 3),
                "average_speed": round(new_speed / max(0.3,fade), 1),
            })

        return {
            "scenario_type": scenario_type,
            "scenario_label": cfg["label"],
            "description": cfg["desc"],
            "route_id": route_id,
            "route_name": ROUTE_INFO.get(route_id, route_id),
            "severity": sev,
            "duration_hours": duration_hours,
            "impact": {
                "baseline_volume": int(b["avg_volume"]),
                "predicted_volume": int(new_vol),
                "baseline_congestion": round(b["avg_congestion"],3),
                "predicted_congestion": round(new_cong,3),
                "congestion_change_pct": round((new_cong - b["avg_congestion"])/max(0.01,b["avg_congestion"])*100, 1),
                "baseline_speed": round(b["avg_speed"],1),
                "predicted_speed": round(new_speed,1),
                "speed_change_pct": round((new_speed - b["avg_speed"])/max(0.01,b["avg_speed"])*100, 1),
                "baseline_travel_min": base_tt,
                "predicted_travel_min": round(new_tt, 1),
                "delay_minutes": round(delay, 1),
            },
            "adjacent_routes": adjacent_impact,
            "hourly_breakdown": hourly,
            "recommendations": recommendations,
        }

def _build_recs(scenario, route_id, cong, delay, adj) -> List[str]:
    recs = []
    adj_names = [a["route_id"] for a in adj]

    if scenario == "road_closure":
        recs.append(f"Immediately activate detour signs toward {' and '.join(adj_names) if adj_names else 'alternate routes'}.")
        recs.append("Deploy traffic management officers at key junctions.")
        recs.append("Issue public advisory via traffic apps and radio.")
    elif scenario in ("rain","fog"):
        recs.append("Enforce reduced speed limits (30% below normal).")
        recs.append("Increase signal timing at major intersections by 15 seconds.")
        recs.append("Activate dynamic message signs with weather warnings.")
    elif scenario == "event_surge":
        recs.append(f"Pre-position traffic officers 2 hours before event on {route_id}.")
        recs.append("Open temporary parking at adjacent zones to reduce through traffic.")
        recs.append("Coordinate with event organisers for staggered exit timing.")
    elif scenario == "accident":
        recs.append("Deploy emergency response immediately; clear within 30 minutes.")
        recs.append(f"Divert to {adj_names[0] if adj_names else 'alternate route'} while clearing.")
        recs.append("Activate contraflow on adjacent lane if available.")
    else:
        recs.append("Monitor congestion levels every 10 minutes.")
        recs.append(f"Suggest alternate routing via {' / '.join(adj_names) if adj_names else 'parallel roads'}.")

    if delay > 10:
        recs.append(f"Expected delay of {delay:.0f} min — advise commuters to depart 20 minutes earlier.")
    if cong > 0.8:
        recs.append("Critical congestion level — activate emergency traffic management protocols.")
    return recs

simulator = ScenarioSimulator()
