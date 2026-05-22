import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import warnings
warnings.filterwarnings("ignore")

FEATURE_COLS = [
    "hour","day_of_week","month","day_of_year","week_of_year",
    "is_weekend","is_rush_morning","is_rush_evening","is_night",
    "hour_sin","hour_cos","dow_sin","dow_cos","month_sin","month_cos",
]

def _add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    ts = pd.to_datetime(df["timestamp"])
    df["hour"]         = ts.dt.hour
    df["day_of_week"]  = ts.dt.dayofweek
    df["month"]        = ts.dt.month
    df["day_of_year"]  = ts.dt.dayofyear
    df["week_of_year"] = ts.dt.isocalendar().week.astype(int)
    df["is_weekend"]      = (df["day_of_week"] >= 5).astype(int)
    df["is_rush_morning"] = ((df["hour"] >= 7) & (df["hour"] <= 9)).astype(int)
    df["is_rush_evening"] = ((df["hour"] >= 17) & (df["hour"] <= 19)).astype(int)
    df["is_night"]        = ((df["hour"] >= 23) | (df["hour"] <= 5)).astype(int)
    df["hour_sin"]   = np.sin(2*np.pi*df["hour"]/24)
    df["hour_cos"]   = np.cos(2*np.pi*df["hour"]/24)
    df["dow_sin"]    = np.sin(2*np.pi*df["day_of_week"]/7)
    df["dow_cos"]    = np.cos(2*np.pi*df["day_of_week"]/7)
    df["month_sin"]  = np.sin(2*np.pi*df["month"]/12)
    df["month_cos"]  = np.cos(2*np.pi*df["month"]/12)
    return df

def _cong_label(c: float) -> str:
    if c < 0.3: return "Low"
    if c < 0.6: return "Moderate"
    if c < 0.8: return "High"
    return "Severe"

class TrafficForecaster:
    def __init__(self):
        self.models: dict = {}
        self.is_trained: bool = False
        self.training_stats: dict = {}

    def train(self, df: pd.DataFrame) -> dict:
        df = df.dropna(subset=["timestamp","route_id","vehicle_count","congestion_level","average_speed"])
        results = {}
        for rid in df["route_id"].unique():
            rdf = _add_features(df[df["route_id"]==rid].copy().sort_values("timestamp"))
            X   = rdf[FEATURE_COLS].values
            yv, yc, ys = rdf["vehicle_count"].values, rdf["congestion_level"].values, rdf["average_speed"].values

            mv = RandomForestRegressor(n_estimators=120, random_state=42, n_jobs=-1)
            mc = RandomForestRegressor(n_estimators=120, random_state=42, n_jobs=-1)
            ms = RandomForestRegressor(n_estimators=120, random_state=42, n_jobs=-1)
            mv.fit(X, yv); mc.fit(X, yc); ms.fit(X, ys)

            pred_v = mv.predict(X)
            results[rid] = {
                "r2_score": round(float(r2_score(yv, pred_v)), 4),
                "mae": round(float(mean_absolute_error(yv, pred_v)), 2),
                "training_samples": int(len(rdf)),
            }
            self.models[rid] = {"volume": mv, "congestion": mc, "speed": ms}

        self.is_trained = True
        self.training_stats = results
        return results

    def _future_features(self, hours: int) -> tuple:
        now = pd.Timestamp.now().floor("H")
        times = pd.date_range(now, periods=hours, freq="H")
        fdf = _add_features(pd.DataFrame({"timestamp": times}))
        return times, fdf[FEATURE_COLS].values

    def predict_24h(self, route_id: str) -> list:
        if not self.is_trained or route_id not in self.models:
            raise ValueError(f"Model not trained for {route_id}")
        times, X = self._future_features(24)
        m = self.models[route_id]
        out = []
        for i, ts in enumerate(times):
            xi = X[i:i+1]
            v  = max(0, int(m["volume"].predict(xi)[0]))
            c  = float(np.clip(m["congestion"].predict(xi)[0], 0, 1))
            s  = float(max(5, m["speed"].predict(xi)[0]))
            out.append({
                "timestamp": ts.isoformat(), "hour": int(ts.hour),
                "vehicle_count": v, "congestion_level": round(c,3),
                "average_speed": round(s,1), "congestion_label": _cong_label(c),
                "is_peak": bool((7<=ts.hour<=9) or (17<=ts.hour<=19)),
            })
        return out

    def predict_7d(self, route_id: str) -> list:
        if not self.is_trained or route_id not in self.models:
            raise ValueError(f"Model not trained for {route_id}")
        times, X = self._future_features(7*24)
        m = self.models[route_id]
        rows = []
        for i, ts in enumerate(times):
            xi = X[i:i+1]
            rows.append({
                "timestamp": ts, "date": ts.date(),
                "vehicle_count": max(0, int(m["volume"].predict(xi)[0])),
                "congestion_level": float(np.clip(m["congestion"].predict(xi)[0],0,1)),
                "average_speed": float(max(5, m["speed"].predict(xi)[0])),
            })
        daily = pd.DataFrame(rows).groupby("date").agg(
            vehicle_count=("vehicle_count","sum"),
            congestion_level=("congestion_level","mean"),
            average_speed=("average_speed","mean"),
        ).reset_index()
        daily["date"] = daily["date"].astype(str)
        daily["congestion_label"] = daily["congestion_level"].apply(_cong_label)
        daily["congestion_level"] = daily["congestion_level"].round(3)
        daily["average_speed"] = daily["average_speed"].round(1)
        return daily.to_dict(orient="records")

    def peak_hours(self, route_id: str) -> list:
        preds = self.predict_24h(route_id)
        return sorted(preds, key=lambda x: x["congestion_level"], reverse=True)[:8]

    def get_stats(self) -> dict:
        return self.training_stats

forecaster = TrafficForecaster()
