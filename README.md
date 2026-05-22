# 🚦 AI-Based Traffic & Mobility Forecasting System

A full-stack AI platform that predicts traffic conditions and generates intelligent
mobility insights using machine learning, anomaly detection, and scenario simulation.

---

## 🏗️ System Architecture

```
traffic_forecasting/
├── backend/                     # Python FastAPI backend
│   ├── app/
│   │   ├── main.py              # FastAPI entry point + CORS
│   │   ├── config.py            # Environment config
│   │   ├── database.py          # SQLAlchemy + SQLite
│   │   ├── models/db_models.py  # ORM: TrafficRecord, ModelMetadata
│   │   ├── schemas/traffic.py   # Pydantic request/response schemas
│   │   ├── ml/
│   │   │   ├── forecaster.py    # RandomForest time-series forecasting
│   │   │   ├── anomaly_detector.py  # Z-score + IsolationForest
│   │   │   ├── optimizer.py     # Route optimization engine
│   │   │   └── simulator.py     # Scenario simulation engine
│   │   ├── routers/             # REST API endpoints (6 routers)
│   │   └── utils/data_gen.py    # Synthetic data generator (90 days)
│   ├── requirements.txt
│   └── run.py
└── frontend/                    # React + Vite frontend
    └── src/
        ├── pages/               # 6 full pages
        ├── components/          # Sidebar, Header
        └── services/api.js      # Axios API layer
```

---

## 📦 Dataset Explanation

Synthetic traffic dataset generated for **5 routes × 90 days × 24 hours = ~10,800 records/route**.

| Column            | Type    | Description                            |
|-------------------|---------|----------------------------------------|
| timestamp         | DateTime| Hourly timestamp                       |
| route_id          | String  | Route_A … Route_E                      |
| vehicle_count     | Int     | Vehicles per hour                      |
| average_speed     | Float   | km/h (5–70)                            |
| congestion_level  | Float   | 0.0 (free) → 1.0 (gridlock)           |
| weather_condition | String  | Clear, Rain, Heavy Rain, Fog, Cloudy   |
| incident_flag     | Boolean | True if incident reported              |
| location_lat/lon  | Float   | Coordinates (Hyderabad region)         |
| is_anomaly        | Boolean | Ground-truth anomaly label             |

**Traffic Patterns:**
- 🌅 Morning rush: 7–9 AM (2.8× base volume)
- 🌆 Evening rush: 5–7 PM (3.2× base volume)
- 🛌 Night: 11 PM–5 AM (0.08× base volume)
- 📅 Weekends: 0.6× weekday volume
- 🌧️ Rain: −25% speed, +15% volume

---

## 🤖 Forecasting Methodology

**Model:** `RandomForestRegressor` (sklearn) — trained per route.

**Feature Engineering:**
```
Temporal:   hour, day_of_week, month, day_of_year, week_of_year
Binary:     is_weekend, is_rush_morning, is_rush_evening, is_night
Cyclical:   hour_sin/cos, dow_sin/cos, month_sin/cos
```

**Targets:** vehicle_count, congestion_level, average_speed

**Horizons:**
- 24h → hourly predictions for next 24 hours
- 7d  → daily aggregated predictions for next 7 days
- Peak → top 8 highest-congestion hours in next 24h

---

## 🔍 Anomaly Detection

**Method 1 — Z-score Statistical:**
- Compute Z = |x − μ| / σ for vehicle_count
- Flag |Z| > 2.5 as anomaly

**Method 2 — IsolationForest (sklearn):**
- Features: [vehicle_count, congestion_level, average_speed]
- contamination = 0.05
- Flag score > 0.3 as anomaly

**Composite score:**
```
score = 0.4×(Z_vol/3) + 0.3×(iso_score/0.5) + 0.2×(Z_cong/3) + 0.1×(Z_spd/3)
```

**Anomaly Types Detected:**
| Type             | Cause                          |
|------------------|-------------------------------|
| Volume Spike     | Sudden traffic surge           |
| Volume Drop      | Sensor failure / road empty    |
| ML Anomaly       | IsolationForest outlier        |
| Incident         | Reported accident/closure      |

---

## 💡 Optimization Logic

1. **Build hourly profiles** per route from historical data
2. **Identify**: peak hours, best hours, average congestion
3. **Generate alerts** when avg_congestion > 0.65 (High) or > 0.45 (Moderate)
4. **Load balancing**: compare most vs least congested route → suggest overflow diversion
5. **Best travel times**: rank hours by average congestion ascending → top 6

---

## 🎭 Simulation Engine

| Scenario      | Volume × | Speed × | Congestion +  |
|---------------|----------|---------|---------------|
| road_closure  | 0.0      | 0.10    | +0.85         |
| rain          | 1.10     | 0.72    | +0.22         |
| fog           | 0.92     | 0.65    | +0.18         |
| event_surge   | 1.80     | 0.55    | +0.45         |
| vehicle_surge | 1.40     | 0.75    | +0.28         |
| accident      | 1.20     | 0.35    | +0.55         |

Severity multiplier (0.5–2.0) scales all modifiers. Adjacent routes receive
35% (road_closure) or 12% congestion overflow.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+ 
- Node.js 18+

---

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python run.py
```

Backend runs at: **http://localhost:8000**
API Docs: **http://localhost:8000/docs**

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

### 3. First Run

1. Open **http://localhost:5173**
2. Click **"Generate Data"** button in the top-right header
3. Wait ~10–15 seconds for data generation + model training
4. Explore all 6 pages!

---

## 📡 API Documentation

| Method | Endpoint                          | Description                        |
|--------|-----------------------------------|------------------------------------|
| POST   | /api/data/generate?days=90        | Generate synthetic data + train ML |
| POST   | /api/data/upload                  | Upload custom CSV file             |
| GET    | /api/data/historical              | Fetch historical records           |
| GET    | /api/data/summary                 | Data & model status                |
| GET    | /api/forecast/24h?route_id=...    | 24-hour forecast                   |
| GET    | /api/forecast/7d?route_id=...     | 7-day daily forecast               |
| GET    | /api/forecast/peak-hours          | Peak hour predictions + alerts     |
| GET    | /api/forecast/all-routes/24h      | All routes forecast                |
| GET    | /api/anomaly/detect               | Run anomaly detection              |
| GET    | /api/anomaly/summary              | Anomaly statistics                 |
| GET    | /api/anomaly/time-series          | Time-series with flags             |
| GET    | /api/optimize/recommendations     | AI recommendations                 |
| GET    | /api/optimize/route-comparison    | Route comparison metrics           |
| GET    | /api/optimize/best-times          | Best travel times per route        |
| POST   | /api/simulate/run                 | Run scenario simulation            |
| GET    | /api/simulate/scenarios           | List available scenarios           |
| GET    | /api/analytics/congestion-heatmap | Day×Hour congestion heatmap        |
| GET    | /api/analytics/peak-hours         | Hourly peak analytics              |
| GET    | /api/analytics/route-metrics      | Per-route KPIs                     |
| GET    | /api/analytics/trend              | Daily trend data                   |
| GET    | /api/analytics/weather-impact     | Weather vs traffic analysis        |
| GET    | /api/analytics/kpi                | Top-level KPI summary              |

---

## 🖥️ Pages Overview

| Page         | Features                                                    |
|--------------|-------------------------------------------------------------|
| Dashboard    | KPI cards, traffic trend, anomaly overview, recommendations |
| Forecasting  | 24h/7d charts, congestion forecast, peak hours table        |
| Anomalies    | Z-score + IsolationForest, scatter plot, anomaly table      |
| Simulation   | 6 scenario types, hourly breakdown, adjacent route impact   |
| Optimization | AI recommendations, radar chart, best travel times          |
| Analytics    | Heatmap, multi-route trend, weather impact, pie chart       |

---

## 📋 CSV Upload Format

```csv
timestamp,route_id,vehicle_count,average_speed,congestion_level,weather_condition,incident_flag
2024-01-01 08:00:00,Route_A,450,35.5,0.72,Clear,False
2024-01-01 09:00:00,Route_B,320,42.0,0.58,Rain,False
```

---

## 🔧 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Backend    | Python 3.9, FastAPI, Uvicorn        |
| Database   | SQLite + SQLAlchemy ORM             |
| ML         | scikit-learn, pandas, numpy, scipy  |
| Frontend   | React 18, Vite, Recharts, Tailwind  |
| Charts     | Recharts (Line, Bar, Scatter, Pie)  |
| API Client | Axios                               |
