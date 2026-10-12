# NeuroScan-AI---Brain-Tumor-Detection-Using-MRI
An AI-powered MRI brain tumor detection platform with futuristic healthcare UI, PDF medical reports, and intelligent tumor classification using deep learning.

## Setup

### Required Node version
This project is pinned to Node 20 LTS. The older React build dependencies can fail on Node 24.

- Install Node 20 and set the workspace to that version, or use:
  - `nvm install 20`
  - `nvm use 20`
  - `node -v`

### Environment variables
Create the following files from the examples before running the app:

- Frontend: `neuroscan-frontend/.env.local` from `neuroscan-frontend/.env.example`
- Streamlit app: `.streamlit/secrets.toml` from `.streamlit/secrets.toml.example`

Example values:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

```toml
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "your-anon-or-service-role-key"
```

### Run locally

```bash
cd neuroscan-frontend
npm install
npm start
```

```bash
cd ..
python -m streamlit run app.py
```
