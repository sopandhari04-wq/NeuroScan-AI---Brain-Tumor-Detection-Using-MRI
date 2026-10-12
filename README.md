# NeuroScan AI - Brain Tumor Detection Using MRI

A full-stack AI-powered brain tumor detection system built for MRI analysis, clinical assistance, and patient management. The project combines a React frontend, Python-based medical AI prediction engine, and Supabase integration for authentication and scan history.

## Overview

NeuroScan AI is designed to help detect and classify brain tumors from MRI scans using a deep learning model. It includes:

- MRI upload and prediction
- tumor classification into four categories:
  - Glioma
  - Meningioma
  - Pituitary
  - No Tumor
- Grad-CAM explainability for AI attention visualization
- user authentication and dashboard
- scan history tracking with Supabase
- PDF medical report generation
- modern healthcare-themed dashboard UI

## Features

- AI-based brain tumor detection using a trained TensorFlow model
- MRI preprocessing and inference pipeline
- Grad-CAM visualization for model explainability
- Multi-role user management
- Supabase-powered login/sign-up and user data persistence
- Dashboard for statistics and scan history
- PDF report generation for predicted outcomes
- Clean responsive frontend built with React
- Python backend support with Streamlit and FastAPI

## Tech Stack

### Frontend
- React
- React Router
- Supabase JavaScript client
- Recharts

### Backend / AI
- Python
- Streamlit
- FastAPI
- TensorFlow / Keras
- OpenCV
- Pillow
- NumPy
- Matplotlib
- ReportLab

### Database
- Supabase PostgreSQL

## Project Structure

```text
BrainTumorDetction/
├── app.py                          # Streamlit application
├── train.py                       # Model training script
├── predict.py                     # Prediction helper / placeholder script
├── requirements.txt               # Python dependencies
├── .nvmrc                         # Node 24 requirement
├── .streamlit/
│   └── secrets.toml.example       # Streamlit Supabase config template
├── neuroscan-backend/
│   ├── main.py                   # FastAPI backend
│   ├── requirements.txt          # Backend dependencies
│   └── models/
│       └── model.tflite         # TensorFlow Lite model
├── neuroscan-frontend/
│   ├── .env.example              # Frontend environment example
│   ├── package.json              # React app scripts and deps
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── components/
│       ├── lib/
│       ├── pages/
│       └── index.css
├── dataset/
│   ├── Training/
│   └── Testing/
├── models/
│   ├── model.keras
│   ├── model.tflite
│   ├── model_weights.weights.h5
│   ├── brain_tumor_model.h5
│   └── new_model.h5
├── README.md
└── .gitignore
```

## Prerequisites

- Python 3.10+
- Node.js 24.x
- npm
- Git
- Supabase project

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/sopandhari04-wq/NeuroScan-AI---Brain-Tumor-Detection-Using-MRI.git
cd NeuroScan-AI---Brain-Tumor-Detection-Using-MRI
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd neuroscan-frontend
npm install
```

### 4. Configure environment variables

#### Frontend
Create `neuroscan-frontend/.env.local` using the example in `neuroscan-frontend/.env.example`:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

#### Streamlit app
Create `.streamlit/secrets.toml` using `.streamlit/secrets.toml.example`:

```toml
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "your-anon-or-service-role-key"
```

> Use the Supabase project URL and the correct public or service key depending on your usage. For frontend auth, use the anon key.

## Run the Application

### Start the frontend

```bash
cd neuroscan-frontend
npm start
```

### Start the Streamlit app

```bash
cd ..
python -m streamlit run app.py
```

### Start the FastAPI backend

```bash
cd neuroscan-backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Supabase Setup

Create the following tables in Supabase:

### users

```sql
create table users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text not null,
  role text default 'user',
  name text,
  created text
);
```

### scans

```sql
create table scans (
  id uuid default gen_random_uuid() primary key,
  username text not null,
  prediction text not null,
  confidence numeric,
  mode text,
  date timestamptz default now()
);
```

## Model Information

The project uses deep learning for MRI classification. The model is trained on MRI images and classifies the scan into:

- Glioma
- Meningioma
- Pituitary
- No Tumor

The model files are stored in the `models/` folder and the TensorFlow Lite model is used for inference in the backend.

## Deployment

This project is designed as a multi-part application:

- React frontend can be deployed on Vercel
- Python/ML app can be deployed on Render, Railway, Azure, or another Python host
- Supabase handles database and auth

## Usage

1. Create a user account or sign in
2. Upload a brain MRI image
3. The model predicts the tumor type
4. View Grad-CAM explainability
5. Review the medical report
6. Check scan history and dashboard data

## License

This project is for educational and research purposes. It is not a substitute for professional medical diagnosis.

## Disclaimer

This software is intended to support medical image analysis and educational use only. It should not be used as a final clinical diagnosis without expert review by a qualified physician or radiologist.

## Contact

If you want to collaborate or improve the project, feel free to open an issue or pull request on the repository.
