from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import TrafficRecord
import pandas as pd

router = APIRouter()

def _load(db: Session) -> pd.DataFrame:
    records = db.query(TrafficRecord).all()
    return pd.DataFrame([{
        "timestamp": r.timestamp, "route_id": r.route_id,
        "vehicle_count": r.vehicle_count, "average_speed": r.average_speed,
        "congestion_level": r.congestion_level, "weather_condition": r.weather_condition,
        "incident_flag": r.incident_flag, "is_anomaly": r.is_anomaly,
    } for r in records]) if records else pd.DataFrame()

@router.get("/congestion-heatmap")
def congestion_heatmap(route_id: str = None, db: Session = Depends(get_db)):
    df = _load(db)
    if df.empty: return {"data": []}
    if route_id: df = df[df["route_id"]==route_id]
    df["hour"]       = pd.to_datetime(df["timestamp"]).dt.hour
    df["day_of_week"]= pd.to_datetime(df["timestamp"]).dt.dayofweek
    hmap = df.groupby(["day_of_week","hour"])["congestion_level"].mean().reset_index()
    return {"data": hmap.round(3).to_dict(orient="records")}

@router.get("/peak-hours")
def peak_hours(db: Session = Depends(get_db)):
    df = _load(db)
    if df.empty: return {"data": []}
    df["hour"] = pd.to_datetime(df["timestamp"]).dt.hour
    by_hour = df.groupby(["route_id","hour"]).agg(
        avg_volume=("vehicle_count","mean"),
        avg_congestion=("congestion_level","mean"),
        avg_speed=("average_speed","mean"),
    ).reset_index().round(3)
    return {"data": by_hour.to_dict(orient="records")}

@router.get("/route-metrics")
def route_metrics(db: Session = Depends(get_db)):
    df = _load(db)
    if df.empty: return {"data": []}
    metrics = df.groupby("route_id").agg(
        total_vehicles=("vehicle_count","sum"),
        avg_congestion=("congestion_level","mean"),
        avg_speed=("average_speed","mean"),
        max_congestion=("congestion_level","max"),
        incident_count=("incident_flag","sum"),
        anomaly_count=("is_anomaly","sum"),
        records=("vehicle_count","count"),
    ).reset_index()
    metrics = metrics.round(3)
    return {"data": metrics.to_dict(orient="records")}

@router.get("/trend")
def trend(route_id: str = None, db: Session = Depends(get_db)):
    df = _load(db)
    if df.empty: return {"data": []}
    if route_id: df = df[df["route_id"]==route_id]
    df["date"] = pd.to_datetime(df["timestamp"]).dt.date
    daily = df.groupby(["date","route_id"]).agg(
        vehicle_count=("vehicle_count","sum"),
        avg_congestion=("congestion_level","mean"),
        avg_speed=("average_speed","mean"),
    ).reset_index()
    daily["date"] = daily["date"].astype(str)
    return {"data": daily.round(3).to_dict(orient="records")}

@router.get("/weather-impact")
def weather_impact(db: Session = Depends(get_db)):
    df = _load(db)
    if df.empty: return {"data": []}
    wi = df.groupby("weather_condition").agg(
        avg_congestion=("congestion_level","mean"),
        avg_speed=("average_speed","mean"),
        avg_volume=("vehicle_count","mean"),
        records=("vehicle_count","count"),
    ).reset_index().round(3)
    return {"data": wi.to_dict(orient="records")}

@router.get("/kpi")
def kpi_summary(db: Session = Depends(get_db)):
    df = _load(db)
    if df.empty: return {}
    return {
        "total_vehicles": int(df["vehicle_count"].sum()),
        "avg_congestion_pct": round(float(df["congestion_level"].mean())*100, 1),
        "avg_speed_kmh": round(float(df["average_speed"].mean()), 1),
        "total_incidents": int(df["incident_flag"].sum()),
        "total_anomalies": int(df["is_anomaly"].sum()),
        "routes_monitored": int(df["route_id"].nunique()),
        "days_of_data": int((pd.to_datetime(df["timestamp"]).max() - pd.to_datetime(df["timestamp"]).min()).days),
    }
