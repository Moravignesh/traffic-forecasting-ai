from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models.db_models import Base
from app.routers import data, forecast, anomaly, optimization, simulation, analytics

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Traffic & Mobility Forecasting API",
    description="AI-powered traffic prediction and mobility optimization system.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router,         prefix="/api/data",     tags=["Data Management"])
app.include_router(forecast.router,     prefix="/api/forecast", tags=["Forecasting"])
app.include_router(anomaly.router,      prefix="/api/anomaly",  tags=["Anomaly Detection"])
app.include_router(optimization.router, prefix="/api/optimize", tags=["Optimization"])
app.include_router(simulation.router,   prefix="/api/simulate", tags=["Simulation"])
app.include_router(analytics.router,    prefix="/api/analytics",tags=["Analytics"])

@app.get("/", tags=["Health"])
async def root():
    return {"message": "Traffic Forecasting API", "status": "running", "docs": "/docs"}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
