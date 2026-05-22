import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from scipy import stats
import warnings
warnings.filterwarnings("ignore")

class AnomalyDetector:
    def __init__(self):
        self.iso_models: dict = {}
        self.route_stats: dict = {}
        self.is_fitted: bool = False

    def fit(self, df: pd.DataFrame):
        for rid in df["route_id"].unique():
            rdf = df[df["route_id"]==rid].copy()
            self.route_stats[rid] = {
                "vol_mean": rdf["vehicle_count"].mean(),
                "vol_std":  rdf["vehicle_count"].std(),
                "spd_mean": rdf["average_speed"].mean(),
                "spd_std":  rdf["average_speed"].std(),
                "cong_mean":rdf["congestion_level"].mean(),
                "cong_std": rdf["congestion_level"].std(),
            }
            X = rdf[["vehicle_count","congestion_level","average_speed"]].values
            iso = IsolationForest(contamination=0.05, random_state=42, n_jobs=-1)
            iso.fit(X)
            self.iso_models[rid] = iso
        self.is_fitted = True

    def detect(self, df: pd.DataFrame) -> pd.DataFrame:
        results = []
        for rid in df["route_id"].unique():
            rdf = df[df["route_id"]==rid].copy()
            if rid not in self.route_stats:
                continue
            st = self.route_stats[rid]

            # Z-score on vehicle_count
            z_vol  = np.abs(stats.zscore(rdf["vehicle_count"].fillna(0)))
            z_spd  = np.abs(stats.zscore(rdf["average_speed"].fillna(0)))
            z_cong = np.abs(stats.zscore(rdf["congestion_level"].fillna(0)))

            # IsolationForest score
            X = rdf[["vehicle_count","congestion_level","average_speed"]].values
            iso_scores = -self.iso_models[rid].score_samples(X) if rid in self.iso_models else np.zeros(len(rdf))

            rdf = rdf.copy()
            rdf["z_vol"]      = z_vol
            rdf["z_spd"]      = z_spd
            rdf["z_cong"]     = z_cong
            rdf["iso_score"]  = iso_scores
            rdf["composite"]  = 0.4*np.clip(z_vol/3,0,1) + 0.3*np.clip(iso_scores/0.5,0,1) + 0.2*np.clip(z_cong/3,0,1) + 0.1*np.clip(z_spd/3,0,1)
            rdf["is_anomaly"] = (z_vol > 2.5) | (iso_scores > 0.3) | (rdf["incident_flag"].fillna(False))

            def _reason(row):
                r = []
                if row["z_vol"] > 2.5:
                    r.append("Abnormal volume (Z={:.1f})".format(row["z_vol"]))
                if row["iso_score"] > 0.3:
                    r.append("IsolationForest anomaly (score={:.2f})".format(row["iso_score"]))
                if row["z_cong"] > 2.5:
                    r.append("Abnormal congestion (Z={:.1f})".format(row["z_cong"]))
                if row.get("incident_flag", False):
                    r.append("Incident reported")
                return "; ".join(r) if r else "Normal"

            rdf["reason"] = rdf.apply(_reason, axis=1)
            results.append(rdf)

        if results:
            return pd.concat(results, ignore_index=True)
        return df

    def get_anomaly_summary(self, df: pd.DataFrame) -> dict:
        result = self.detect(df)
        anomalies = result[result["is_anomaly"]==True]
        by_route = anomalies.groupby("route_id").size().to_dict()
        return {
            "total_records":  int(len(result)),
            "total_anomalies": int(len(anomalies)),
            "anomaly_rate": round(len(anomalies)/max(1,len(result))*100, 2),
            "by_route": by_route,
            "incident_count": int(result["incident_flag"].sum()) if "incident_flag" in result else 0,
        }

anomaly_detector = AnomalyDetector()
