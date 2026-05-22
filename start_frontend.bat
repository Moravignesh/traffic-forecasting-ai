@echo off
echo Starting Traffic Forecasting Frontend...
cd frontend
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
npm run dev
