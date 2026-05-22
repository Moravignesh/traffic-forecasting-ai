@echo off
echo Starting Traffic Forecasting Backend...
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt -q
python run.py
