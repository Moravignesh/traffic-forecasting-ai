from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import TrafficRecord
from app.ml.anomaly_detector import anomaly_detector
import pandas as pd
from datetime import datetime

router = APIRouter()

def _load_df(db: Session) -> pd.DataFrame:
    records = db.query(TrafficRecord).all()
    if not records:
        raise HTTPException(404, "No data found.")
    return pd.DataFrame([{
        "id": r.id, "timestamp": r.timestamp, "route_id": r.route_id,
        "vehicle_count": r.vehicle_count, "average_speed": r.average_speed,
        "congestion_level": r.congestion_level, "incident_flag": r.incident_flag,
    } for r in records])

@router.get("/detect")
def detect_anomalies(route_id: str = None, db: Session = Depends(get_db)):
    df = _load_df(db)
    if not anomaly_detector.is_fitted:
        anomaly_detector.fit(df)
    if route_id:
        df = df[df["route_id"] == route_id]
    result = anomaly_detector.detect(df)
    anomalies = result[result["is_anomaly"]==True].copy()
    anomalies["timestamp"] = pd.to_datetime(anomalies["timestamp"]).dt.isoformat()
    records = []
    for _, row in anomalies.iterrows():
        records.append({
            "timestamp": str(row["timestamp"]),
            "route_id": row["route_id"],
            "vehicle_count": int(row["vehicle_count"]),
            "congestion_level": round(float(row["congestion_level"]),3),
            "average_speed": round(float(row["average_speed"]),1),
            "anomaly_score": round(float(row.get("composite",0)),3),
            "z_score_volume": round(float(row.get("z_vol",0)),2),
            "reason": str(row.get("reason","Unknown")),
        })
    return {
        "anomalies": records,
        "total_anomalies": len(records),
        "total_checked": len(df),
        "detected_at": datetime.now().isoformat(),
    }

@router.get("/summary")
def anomaly_summary(db: Session = Depends(get_db)):
    df = _load_df(db)
    if not anomaly_detector.is_fitted:
        anomaly_detector.fit(df)
    summary = anomaly_detector.get_anomaly_summary(df)
    alerts = []
    for rid, cnt in summary.get("by_route",{}).items():
        if cnt >= 3:
            alerts.append(f"⚠️  {rid}: {cnt} anomalies detected — investigate sensor data.")
        elif cnt >= 1:
            alerts.append(f"ℹ️  {rid}: {cnt} anomaly detected.")
    return {**summary, "alerts": alerts}

@router.get("/time-series")
def anomaly_time_series(route_id: str, db: Session = Depends(get_db)):
    df = _load_df(db)
    if not anomaly_detector.is_fitted:
        anomaly_detector.fit(df)
    result = anomaly_detector.detect(df[df["route_id"]==route_id])
    result["timestamp"] = pd.to_datetime(result["timestamp"])
    result = result.sort_values("timestamp").tail(200)
    return {
        "route_id": route_id,
        "data": [
            {
                "timestamp": row["timestamp"].isoformat(),
                "vehicle_count": int(row["vehicle_count"]),
                "congestion_level": round(float(row["congestion_level"]),3),
                "is_anomaly": bool(row.get("is_anomaly",False)),
                "anomaly_score": round(float(row.get("composite",0)),3),
            }
            for _, row in result.iterrows()
        ],
    }
