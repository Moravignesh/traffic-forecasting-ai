from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class TrafficRecordBase(BaseModel):
    timestamp: datetime
    route_id: str
    vehicle_count: int
    average_speed: float
    congestion_level: float
    weather_condition: Optional[str] = "Clear"
    incident_flag: Optional[bool] = False
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None

class TrafficRecordCreate(TrafficRecordBase):
    pass

class TrafficRecord(TrafficRecordBase):
    id: int
    is_anomaly: bool = False
    anomaly_score: float = 0.0
    class Config:
        from_attributes = True

class SimulationRequest(BaseModel):
    scenario_type: str
    route_id: str
    severity: float = 1.0
    duration_hours: int = 4

class ForecastResponse(BaseModel):
    route_id: str
    horizon: str
    predictions: List[Dict[str, Any]]
    training_stats: Optional[Dict] = None
    generated_at: str
