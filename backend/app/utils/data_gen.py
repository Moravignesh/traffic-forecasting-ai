import pandas as pd
import numpy as np
from datetime import datetime, timedelta

ROUTES = {
    "Route_A": {"base_volume": 450, "free_speed": 65, "capacity": 600,
                "lat": 17.385, "lon": 78.486, "desc": "Downtown Corridor"},
    "Route_B": {"base_volume": 320, "free_speed": 55, "capacity": 420,
                "lat": 17.412, "lon": 78.524, "desc": "Midtown Bypass"},
    "Route_C": {"base_volume": 280, "free_speed": 70, "capacity": 380,
                "lat": 17.360, "lon": 78.468, "desc": "Highway Express"},
    "Route_D": {"base_volume": 180, "free_speed": 50, "capacity": 250,
                "lat": 17.438, "lon": 78.498, "desc": "Suburb Connector"},
    "Route_E": {"base_volume": 220, "free_speed": 60, "capacity": 300,
                "lat": 17.395, "lon": 78.550, "desc": "Ring Road East"},
}

WEATHER_POOL = [
    ("Clear", 1.00, 1.00), ("Cloudy", 0.97, 1.00),
    ("Rain", 0.75, 1.15),  ("Heavy Rain", 0.55, 0.85),
    ("Fog", 0.60, 0.90),
]
WEATHER_PROBS = [0.50, 0.25, 0.15, 0.07, 0.03]

def _hour_factor(hour, is_weekend):
    if is_weekend:
        if 10 <= hour <= 18: return 1.3
        if hour < 7 or hour > 22: return 0.10
        return 0.75
    else:
        if 7 <= hour <= 9:   return 2.8
        if 17 <= hour <= 19: return 3.2
        if 11 <= hour <= 15: return 1.5
        if hour < 5 or hour > 22: return 0.08
        return 0.90

def generate_traffic_data(days: int = 90) -> pd.DataFrame:
    np.random.seed(42)
    start = datetime.now() - timedelta(days=days)
    records = []

    for d in range(days):
        day_dt = start + timedelta(days=d)
        dow = day_dt.weekday()
        is_weekend = dow >= 5

        idx = np.random.choice(len(WEATHER_POOL), p=WEATHER_PROBS)
        weather_name, w_speed, w_vol = WEATHER_POOL[idx]

        for hour in range(24):
            ts = day_dt.replace(hour=hour, minute=0, second=0, microsecond=0)
            hf = _hour_factor(hour, is_weekend)

            for rid, info in ROUTES.items():
                vol = int(info["base_volume"] * hf * w_vol * np.random.uniform(0.88, 1.12))
                vol = max(0, vol)
                cong = min(1.0, max(0.0, vol / info["capacity"] + np.random.uniform(-0.04, 0.04)))
                speed = info["free_speed"] * (1 - 0.72 * cong) * w_speed
                speed = max(5.0, speed + np.random.uniform(-2.5, 2.5))

                records.append({
                    "timestamp": ts,
                    "route_id": rid,
                    "vehicle_count": vol,
                    "average_speed": round(speed, 1),
                    "congestion_level": round(cong, 3),
                    "weather_condition": weather_name,
                    "incident_flag": False,
                    "location_lat": info["lat"],
                    "location_lon": info["lon"],
                    "is_anomaly": False,
                    "anomaly_score": 0.0,
                })

    df = pd.DataFrame(records)

    # Inject realistic anomalies (sudden spikes / drops)
    anomaly_indices = np.random.choice(len(df), size=18, replace=False)
    for idx in anomaly_indices:
        kind = np.random.choice(["spike", "drop", "incident"])
        if kind == "spike":
            df.at[idx, "vehicle_count"] = int(df.at[idx, "vehicle_count"] * np.random.uniform(2.5, 4.0))
            df.at[idx, "congestion_level"] = min(1.0, df.at[idx, "congestion_level"] * 2.2)
            df.at[idx, "average_speed"] = max(5.0, df.at[idx, "average_speed"] * 0.3)
        elif kind == "drop":
            df.at[idx, "vehicle_count"] = int(df.at[idx, "vehicle_count"] * np.random.uniform(0.05, 0.15))
            df.at[idx, "congestion_level"] = df.at[idx, "congestion_level"] * 0.1
            df.at[idx, "average_speed"] = df.at[idx, "average_speed"] * 1.6
        else:
            df.at[idx, "incident_flag"] = True
            df.at[idx, "vehicle_count"] = int(df.at[idx, "vehicle_count"] * 1.8)
            df.at[idx, "average_speed"] = max(5.0, df.at[idx, "average_speed"] * 0.4)
            df.at[idx, "congestion_level"] = min(1.0, df.at[idx, "congestion_level"] * 1.9)
        df.at[idx, "is_anomaly"] = True
        df.at[idx, "anomaly_score"] = round(np.random.uniform(0.75, 0.99), 3)

    return df
