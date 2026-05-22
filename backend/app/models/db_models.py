from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.database import Base

class TrafficRecord(Base):
    __tablename__ = "traffic_records"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    route_id = Column(String(50), nullable=False, index=True)
    vehicle_count = Column(Integer, nullable=False)
    average_speed = Column(Float, nullable=False)
    congestion_level = Column(Float, nullable=False)
    weather_condition = Column(String(50), default="Clear")
    incident_flag = Column(Boolean, default=False)
    location_lat = Column(Float, nullable=True)
    location_lon = Column(Float, nullable=True)
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())

class ModelMetadata(Base):
    __tablename__ = "model_metadata"
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String(50), nullable=False)
    model_type = Column(String(50), nullable=False)
    trained_at = Column(DateTime, server_default=func.now())
    r2_score = Column(Float, default=0.0)
    mae = Column(Float, default=0.0)
    training_records = Column(Integer, default=0)
