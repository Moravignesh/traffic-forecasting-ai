from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import TrafficRecord
from app.ml.forecaster import forecaster
import pandas as pd
from datetime import datetime

router = APIRouter()

def _check_trained():
    if not forecaster.is_trained:
        raise HTTPException(503, "Models not trained. Call /api/data/generate first.")

def _load_df(db: Session) -> pd.DataFrame:
    records = db.query(TrafficRecord).all()
    if not records:
        raise HTTPException(404, "No data found.")
    return pd.DataFrame([{
        "timestamp": r.timestamp, "route_id": r.route_id,
        "vehicle_count": r.vehicle_count, "average_speed": r.average_speed,
        "congestion_level": r.congestion_level,
    } for r in records])

@router.get("/train")
def train_models(db: Session = Depends(get_db)):
    df = _load_df(db)
    stats = forecaster.train(df)
    return {"status": "trained", "routes_trained": len(stats), "stats": stats}

@router.get("/24h")
def forecast_24h(route_id: str, db: Session = Depends(get_db)):
    _check_trained()
    try:
        preds = forecaster.predict_24h(route_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {
        "route_id": route_id, "horizon": "24h",
        "predictions": preds, "count": len(preds),
        "generated_at": datetime.now().isoformat(),
    }

@router.get("/7d")
def forecast_7d(route_id: str, db: Session = Depends(get_db)):
    _check_trained()
    try:
        preds = forecaster.predict_7d(route_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {
        "route_id": route_id, "horizon": "7d",
        "predictions": preds, "count": len(preds),
        "generated_at": datetime.now().isoformat(),
    }

@router.get("/peak-hours")
def forecast_peak(route_id: str, db: Session = Depends(get_db)):
    _check_trained()
    try:
        peaks = forecaster.peak_hours(route_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
    alerts = []
    for p in peaks:
        if p["congestion_level"] > 0.7:
            alerts.append(f"High congestion expected on {route_id} at {p['hour']:02d}:00 "
                          f"(congestion: {p['congestion_level']:.0%})")
    return {
        "route_id": route_id, "peak_predictions": peaks,
        "alerts": alerts, "generated_at": datetime.now().isoformat(),
    }

@router.get("/all-routes/24h")
def forecast_all_24h(db: Session = Depends(get_db)):
    _check_trained()
    routes = [r[0] for r in db.query(TrafficRecord.route_id).distinct().all()]
    result = {}
    for rid in routes:
        try:
            result[rid] = forecaster.predict_24h(rid)
        except:
            pass
    return {"forecasts": result, "routes": list(result.keys()),
            "generated_at": datetime.now().isoformat()}
