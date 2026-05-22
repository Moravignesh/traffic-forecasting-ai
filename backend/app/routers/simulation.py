from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import TrafficRecord
from app.ml.simulator import simulator, SCENARIO_CONFIGS
from app.schemas.traffic import SimulationRequest
import pandas as pd

router = APIRouter()

def _ensure_fitted(db: Session):
    if not simulator.baseline:
        records = db.query(TrafficRecord).all()
        if not records:
            raise HTTPException(404, "No data. Call /api/data/generate first.")
        df = pd.DataFrame([{
            "timestamp": r.timestamp, "route_id": r.route_id,
            "vehicle_count": r.vehicle_count, "average_speed": r.average_speed,
            "congestion_level": r.congestion_level,
        } for r in records])
        simulator.fit(df)

@router.post("/run")
def run_simulation(req: SimulationRequest, db: Session = Depends(get_db)):
    _ensure_fitted(db)
    try:
        result = simulator.run(
            scenario_type=req.scenario_type,
            route_id=req.route_id,
            severity=req.severity,
            duration_hours=req.duration_hours,
        )
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/scenarios")
def list_scenarios():
    return {"scenarios": [
        {"id": k, "label": v["label"], "description": v["desc"]}
        for k, v in SCENARIO_CONFIGS.items()
    ]}
