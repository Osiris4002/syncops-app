# SyncOps — Smart Hospitality Management System

AI-driven housekeeping automation and predictive workforce optimization for hotels.
B.Tech CSE major project — **research paper published in IEEE (2025)**.

## Problem
Hotel housekeeping is largely manual: task allocation over phone/messaging, subjective
cleanliness verification, no staffing forecasts, and no real-time visibility for managers —
driving up room turnaround time and operational cost.

## Solution
- Automated task allocation based on room vacancy status
- CNN-based image recognition for cleanliness verification, replacing manual inspection
- Predictive workforce scheduling based on historical occupancy data
- Real-time dashboard for room status and staff performance

## Tech Stack
React · Python (Flask) · Firebase · ChatGPT API · CNN (image recognition) · GitHub Actions CI/CD

## My Contribution
Full-stack build including JWT-based role authentication (manager/staff/admin), the CNN
cleanliness-verification pipeline, and Pytest coverage on all REST API endpoints. Set up
GitHub Actions CI/CD for deployment.

## Results
Reduced room turnaround time by 20–30% (prototype-level result).

## Publication
[IEEE Paper](https://ieeexplore.ieee.org/document/11325384)

## Getting Started
```bash
# backend
cd backend
pip install -r requirements.txt
python app.py

# frontend
cd frontend
npm install
npm start
```

## License
MIT
