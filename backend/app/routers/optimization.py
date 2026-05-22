from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import TrafficRecord
from app.ml.optimizer import optimizer
import pandas as pd

router = APIRouter()

def _ensure_fitted(db: Session):
    if not optimizer.route_metrics:
        records = db.query(TrafficRecord).all()
        if not records:
            raise HTTPException(404, "No data. Call /api/data/generate first.")
        df = pd.DataFrame([{
            "timestamp": r.timestamp, "route_id": r.route_id,
            "vehicle_count": r.vehicle_count, "average_speed": r.average_speed,
            "congestion_level": r.congestion_level,
        } for r in records])
        optimizer.fit(df)

@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    _ensure_fitted(db)
    recs = optimizer.get_recommendations()
    return {"recommendations": recs, "count": len(recs)}

@router.get("/route-comparison")
def route_comparison(db: Session = Depends(get_db)):
    _ensure_fitted(db)
    return {"comparison": optimizer.route_comparison()}

@router.get("/best-times")
def best_times(route_id: str, db: Session = Depends(get_db)):
    _ensure_fitted(db)
    times = optimizer.best_travel_times(route_id)
    if not times:
        raise HTTPException(404, f"No data for route {route_id}")
    return {"route_id": route_id, "best_times": times}
