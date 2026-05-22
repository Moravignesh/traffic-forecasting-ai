from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import TrafficRecord
from app.utils.data_gen import generate_traffic_data
from app.ml.forecaster import forecaster
from app.ml.anomaly_detector import anomaly_detector
from app.ml.optimizer import optimizer
from app.ml.simulator import simulator
import pandas as pd, io

router = APIRouter()

def _train_all(df: pd.DataFrame):
    forecaster.train(df)
    anomaly_detector.fit(df)
    optimizer.fit(df)
    simulator.fit(df)

@router.post("/generate")
def generate_data(days: int = 90, db: Session = Depends(get_db)):
    """Generate synthetic traffic data and train all ML models."""
    db.query(TrafficRecord).delete()
    db.commit()
    df = generate_traffic_data(days=days)
    records = [TrafficRecord(**row) for row in df.to_dict(orient="records")]
    db.add_all(records)
    db.commit()
    _train_all(df)
    return {
        "status": "success",
        "records_created": len(records),
        "routes": list(df["route_id"].unique()),
        "date_range": f"{df['timestamp'].min()} to {df['timestamp'].max()}",
        "ml_status": "trained",
    }

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a CSV file with traffic data."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files supported.")
    content = await file.read()
    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
        required = {"timestamp","route_id","vehicle_count","average_speed","congestion_level"}
        missing = required - set(df.columns)
        if missing:
            raise HTTPException(400, f"Missing columns: {missing}")
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.fillna({"weather_condition":"Clear","incident_flag":False,
                        "location_lat":17.385,"location_lon":78.486,
                        "is_anomaly":False,"anomaly_score":0.0})
        records = [TrafficRecord(**{k:v for k,v in row.items() if hasattr(TrafficRecord,k)})
                   for row in df.to_dict(orient="records")]
        db.add_all(records)
        db.commit()
        _train_all(df)
        return {"status":"success","records_uploaded":len(records)}
    except Exception as e:
        raise HTTPException(400, str(e))

@router.get("/routes")
def get_routes(db: Session = Depends(get_db)):
    routes = db.query(TrafficRecord.route_id).distinct().all()
    return {"routes": [r[0] for r in routes]}

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total = db.query(TrafficRecord).count()
    if total == 0:
        return {"status":"no_data","message":"No data yet. Call /api/data/generate first."}
    routes = [r[0] for r in db.query(TrafficRecord.route_id).distinct().all()]
    return {
        "total_records": total,
        "routes": routes,
        "model_trained": forecaster.is_trained,
        "training_stats": forecaster.get_stats(),
    }

@router.get("/historical")
def get_historical(route_id: str = None, limit: int = 500, db: Session = Depends(get_db)):
    q = db.query(TrafficRecord).order_by(TrafficRecord.timestamp.desc())
    if route_id:
        q = q.filter(TrafficRecord.route_id == route_id)
    records = q.limit(limit).all()
    data = []
    for r in reversed(records):
        data.append({
            "id": r.id, "timestamp": r.timestamp.isoformat(),
            "route_id": r.route_id,
            "vehicle_count": r.vehicle_count, "average_speed": r.average_speed,
            "congestion_level": r.congestion_level, "weather_condition": r.weather_condition,
            "incident_flag": r.incident_flag, "is_anomaly": r.is_anomaly,
        })
    return {"data": data, "count": len(data)}
