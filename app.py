import cv2
import json
import os
import matplotlib.cm as cm
import streamlit as st
import streamlit.components.v1 as components
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
from PIL import Image
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from io import BytesIO
from datetime import datetime
import matplotlib.pyplot as plt

# ── Must be FIRST Streamlit call ───────────────────────────────────────────────
st.set_page_config(page_title="NeuroScan AI", page_icon="🧠", layout="wide")

# ══════════════════════════════════════════════════════════════════════════════
#  JSON USER DATABASE
# ══════════════════════════════════════════════════════════════════════════════
USERS_FILE = "users.json"

def load_users():
    if not os.path.exists(USERS_FILE):
        default = {
            "admin": {
                "password": "brain123",
                "role": "admin",
                "name": "Administrator",
                "created": datetime.now().strftime("%Y-%m-%d"),
                "scans": []
            },
            "doctor1": {
                "password": "doc123",
                "role": "user",
                "name": "Dr. Smith",
                "created": datetime.now().strftime("%Y-%m-%d"),
                "scans": []
            },
            "doctor2": {
                "password": "doc456",
                "role": "user",
                "name": "Dr. Johnson",
                "created": datetime.now().strftime("%Y-%m-%d"),
                "scans": []
            }
        }
        save_users(default)
        return default
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)

def add_scan_record(username, predicted_cls, confidence, mode):
    users = load_users()
    if username in users:
        record = {
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "prediction": predicted_cls,
            "confidence": round(float(confidence), 2),
            "mode": mode
        }
        users[username]["scans"].append(record)
        save_users(users)

# ── Session state ──────────────────────────────────────────────────────────────
if "logged_in"  not in st.session_state: st.session_state.logged_in  = False
if "username"   not in st.session_state: st.session_state.username   = ""
if "role"       not in st.session_state: st.session_state.role       = ""
if "user_name"  not in st.session_state: st.session_state.user_name  = ""
if "show_dash"  not in st.session_state: st.session_state.show_dash  = False

# ══════════════════════════════════════════════════════════════════════════════
#  SHARED CSS
# ══════════════════════════════════════════════════════════════════════════════
SHARED_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, .stApp {
    background-color: #07090F !important;
    color: #C8D6E5 !important;
    font-family: 'DM Mono', monospace !important;
}
#MainMenu, footer, header { visibility: hidden; }
.stApp::before {
    content: '';
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background:
        radial-gradient(ellipse 60% 45% at 15% 10%, rgba(0,200,180,0.10) 0%, transparent 70%),
        radial-gradient(ellipse 50% 50% at 85% 85%, rgba(80,120,255,0.08) 0%, transparent 70%),
        radial-gradient(ellipse 40% 30% at 50% 50%, rgba(0,200,180,0.04) 0%, transparent 65%);
    pointer-events: none; z-index: 0;
}
.stApp::after {
    content: '';
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 3px,
        rgba(0,200,180,0.006) 3px, rgba(0,200,180,0.006) 4px);
    pointer-events: none; z-index: 0;
}
.element-container, .stMarkdown, .stSpinner,
.stButton, .stDownloadButton { position: relative; z-index: 1; }
[data-testid="stTextInput"] input {
    background: rgba(0,200,180,0.04) !important;
    border: 1px solid rgba(0,200,180,0.2) !important;
    border-radius: 10px !important; color: #EEF4FF !important;
    font-family: 'DM Mono', monospace !important; font-size: 0.85rem !important;
    padding: 0.65rem 1rem !important; transition: border-color 0.3s, box-shadow 0.3s !important;
}
[data-testid="stTextInput"] input:focus {
    border-color: #00C8B4 !important;
    box-shadow: 0 0 0 3px rgba(0,200,180,0.12) !important; outline: none !important;
}
[data-testid="stTextInput"] label {
    color: #3A6070 !important; font-family: 'DM Mono', monospace !important;
    font-size: 0.68rem !important; letter-spacing: 0.2em !important; text-transform: uppercase !important;
}
[data-testid="stButton"] > button {
    background: linear-gradient(135deg, #00C8B4 0%, #0097A7 100%) !important;
    color: #07090F !important; font-family: 'Syne', sans-serif !important;
    font-weight: 700 !important; font-size: 0.85rem !important;
    letter-spacing: 0.08em !important; border: none !important;
    border-radius: 10px !important; padding: 0.65rem 2rem !important;
    width: 100% !important; transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s !important;
    box-shadow: 0 4px 24px rgba(0,200,180,0.25) !important; cursor: pointer !important;
}
[data-testid="stButton"] > button:hover {
    opacity: 0.92 !important; transform: translateY(-1px) !important;
    box-shadow: 0 6px 32px rgba(0,200,180,0.38) !important;
}
[data-testid="stButton"] > button:active { transform: translateY(0) !important; }
[data-testid="stDownloadButton"] > button {
    background: rgba(0,200,180,0.08) !important; color: #00C8B4 !important;
    font-family: 'DM Mono', monospace !important; font-size: 0.78rem !important;
    border: 1px solid rgba(0,200,180,0.3) !important; border-radius: 10px !important;
    padding: 0.55rem 1.4rem !important; transition: background 0.2s, border-color 0.2s !important;
}
[data-testid="stDownloadButton"] > button:hover {
    background: rgba(0,200,180,0.14) !important; border-color: rgba(0,200,180,0.55) !important;
}
[data-testid="stAlert"] {
    border-radius: 10px !important; font-family: 'DM Mono', monospace !important; font-size: 0.78rem !important;
}
[data-testid="stSidebar"] {
    background: rgba(10,13,21,0.97) !important;
    border-right: 1px solid rgba(0,200,180,0.10) !important;
}
[data-testid="stSidebar"] h2 {
    font-family: 'Syne', sans-serif !important; font-weight: 700 !important;
    color: #EEF4FF !important; font-size: 1rem !important;
}
[data-testid="stSidebar"] p, [data-testid="stSidebar"] li {
    font-size: 0.78rem !important; color: #4A6070 !important; line-height: 1.7 !important;
}
[data-testid="stImage"] {
    border-radius: 12px; overflow: hidden;
    border: 1px solid rgba(0,200,180,0.14);
    box-shadow: 0 0 40px rgba(0,200,180,0.08); position: relative; z-index: 1;
}
[data-testid="stImage"] img { border-radius: 12px; }
[data-testid="stFileUploader"] { background: transparent !important; position: relative; z-index: 1; }
[data-testid="stFileUploader"] > div {
    background: rgba(0,200,180,0.03) !important;
    border: 1px dashed rgba(0,200,180,0.25) !important;
    border-radius: 12px !important; transition: border-color 0.3s, background 0.3s !important;
}
[data-testid="stFileUploader"] > div:hover {
    background: rgba(0,200,180,0.06) !important; border-color: rgba(0,200,180,0.55) !important;
}
[data-testid="stFileUploader"] label { color: #5A8090 !important; font-family: 'DM Mono', monospace !important; font-size: 0.8rem !important; }
[data-testid="stFileUploader"] small { color: #3A5060 !important; font-size: 0.68rem !important; }
.stTabs [data-baseweb="tab-list"] {
    background: rgba(0,200,180,0.04) !important;
    border-radius: 12px !important; border: 1px solid rgba(0,200,180,0.12) !important;
    padding: 4px !important; gap: 4px !important; justify-content: center !important;
}
.stTabs [data-baseweb="tab"] {
    font-family: 'DM Mono', monospace !important; font-size: 0.72rem !important;
    letter-spacing: 0.12em !important; text-transform: uppercase !important;
    color: #3A5060 !important; border-radius: 8px !important;
    padding: 0.5rem 1.2rem !important; border: none !important;
}
.stTabs [aria-selected="true"] { background: rgba(0,200,180,0.15) !important; color: #00C8B4 !important; }
.footer {
    margin-top: 3.5rem; text-align: center; font-size: 0.6rem;
    letter-spacing: 0.18em; color: #1E3040; text-transform: uppercase; position: relative; z-index: 1;
}
.sidebar-badge {
    display: inline-block; background: rgba(0,200,180,0.1); color: #00C8B4;
    font-size: 0.6rem; letter-spacing: 0.2em; padding: 0.25rem 0.7rem;
    border-radius: 99px; border: 1px solid rgba(0,200,180,0.25); margin-bottom: 1rem; text-transform: uppercase;
}
.divider { height: 1px; background: linear-gradient(90deg,transparent,#1A3040,transparent); margin: 2rem 0; }
.upload-label {
    font-size: 0.68rem; letter-spacing: 0.25em; text-transform: uppercase;
    color: #3A5A70; margin-bottom: 0.5rem; display: block; position: relative; z-index: 1;
}
.header-wrap { text-align: center; padding: 2.5rem 0 2rem; position: relative; z-index: 1; }
.header-eyebrow { font-size: 0.7rem; letter-spacing: 0.35em; color: #00C8B4; text-transform: uppercase; margin-bottom: 1rem; }
.header-title { font-family: 'Syne', sans-serif; font-size: clamp(2.2rem,5vw,3.4rem); font-weight: 800; line-height: 1.05; color: #EEF4FF; letter-spacing: -0.02em; }
.header-title span { color: #00C8B4; }
.header-sub { margin-top: 0.9rem; font-size: 0.8rem; color: #5A7090; letter-spacing: 0.05em; }
/* Dashboard metric cards */
.metric-card {
    background: rgba(0,200,180,0.04); border: 1px solid rgba(0,200,180,0.15);
    border-radius: 14px; padding: 1.2rem 1.5rem; text-align: center; position: relative;
}
.metric-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, #00C8B4, transparent); border-radius: 14px 14px 0 0;
}
.metric-val { font-family: 'Syne', sans-serif; font-size: 2rem; font-weight: 800; color: #00C8B4; }
.metric-lbl { font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase; color: #3A5060; margin-top: 0.3rem; }
/* Scan history table */
.scan-row {
    display: flex; align-items: center; gap: 1rem;
    padding: 0.7rem 1rem; border-radius: 10px;
    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 0.5rem; font-size: 0.72rem;
}
.scan-badge {
    padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.58rem;
    letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
}
</style>
"""
st.markdown(SHARED_CSS, unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  LOGIN PAGE
# ══════════════════════════════════════════════════════════════════════════════
if not st.session_state.logged_in:
    st.markdown("""
    <style>.block-container { padding: 0 !important; max-width: 100% !important; }</style>
    """, unsafe_allow_html=True)

    LOGIN_HTML = """
    <!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:transparent;font-family:'DM Mono',monospace;color:#C8D6E5;}
    .hero{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1.5rem 2rem;text-align:center;}
    .badge{display:inline-flex;align-items:center;gap:0.4rem;background:rgba(0,200,180,0.10);color:#00C8B4;
           font-size:0.62rem;letter-spacing:0.28em;text-transform:uppercase;padding:0.3rem 0.9rem;
           border-radius:99px;border:1px solid rgba(0,200,180,0.28);margin-bottom:1.6rem;}
    .dot{width:6px;height:6px;border-radius:50%;background:#00C8B4;animation:pulse 2s ease-in-out infinite;}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(0.7);}}
    .logo{font-family:'Syne',sans-serif;font-size:clamp(2.6rem,7vw,3.8rem);font-weight:800;
          letter-spacing:-0.03em;line-height:1;color:#EEF4FF;margin-bottom:0.6rem;}
    .logo span{color:#00C8B4;}
    .tagline{font-size:0.78rem;color:#3A5A70;letter-spacing:0.08em;margin-bottom:2.2rem;}
    .stats{display:flex;gap:1rem;margin-bottom:2.4rem;justify-content:center;flex-wrap:wrap;}
    .stat{background:rgba(0,200,180,0.05);border:1px solid rgba(0,200,180,0.14);border-radius:10px;padding:0.55rem 1.1rem;text-align:center;}
    .stat-val{font-family:'Syne',sans-serif;font-size:1.15rem;font-weight:700;color:#00C8B4;}
    .stat-lbl{font-size:0.58rem;letter-spacing:0.18em;color:#3A5A70;text-transform:uppercase;margin-top:0.1rem;}
    .card{width:100%;max-width:420px;background:rgba(10,14,22,0.85);border:1px solid rgba(0,200,180,0.16);
          border-radius:20px;padding:2.2rem 2rem 2rem;position:relative;overflow:hidden;
          backdrop-filter:blur(12px);box-shadow:0 0 0 1px rgba(0,200,180,0.04),0 20px 60px rgba(0,0,0,0.5);}
    .card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
                  background:linear-gradient(90deg,transparent,#00C8B4,transparent);}
    .card-title{font-family:'Syne',sans-serif;font-size:1.15rem;font-weight:700;color:#EEF4FF;margin-bottom:0.3rem;}
    .card-sub{font-size:0.68rem;color:#3A5060;letter-spacing:0.06em;margin-bottom:1.8rem;}
    .features{display:flex;flex-direction:column;gap:0.55rem;margin-bottom:2rem;}
    .feat{display:flex;align-items:center;gap:0.65rem;background:rgba(0,200,180,0.04);
          border:1px solid rgba(0,200,180,0.10);border-radius:9px;padding:0.55rem 0.85rem;
          font-size:0.7rem;color:#4A7080;letter-spacing:0.04em;}
    .feat-icon{font-size:0.9rem;}
    .feat strong{color:#8ABFC8;font-weight:500;}
    .sep{height:1px;background:linear-gradient(90deg,transparent,rgba(0,200,180,0.18),transparent);margin:1.5rem 0;}
    .signin-lbl{font-size:0.6rem;letter-spacing:0.28em;color:#3A5060;text-transform:uppercase;margin-bottom:1.2rem;}
    .disclaimer{margin-top:1.6rem;font-size:0.6rem;color:#1E3040;letter-spacing:0.06em;text-align:center;line-height:1.6;}
    </style></head><body>
    <div class="hero">
        <div class="badge"><div class="dot"></div>Deep Learning · MRI Analysis</div>
        <div class="logo">Neuro<span>Scan</span> AI</div>
        <div class="tagline">Instant brain tumor classification from MRI scans</div>
        <div class="stats">
            <div class="stat"><div class="stat-val">4</div><div class="stat-lbl">Tumor Classes</div></div>
            <div class="stat"><div class="stat-val">3K+</div><div class="stat-lbl">Training Scans</div></div>
            <div class="stat"><div class="stat-val">CNN</div><div class="stat-lbl">Architecture</div></div>
            <div class="stat"><div class="stat-val">Grad-CAM</div><div class="stat-lbl">Explainability</div></div>
        </div>
        <div class="card">
            <div class="card-title">Secure Access</div>
            <div class="card-sub">Authorized personnel only · Research environment</div>
            <div class="features">
                <div class="feat"><span class="feat-icon">🧠</span><span>Detects <strong>Glioma, Meningioma, Pituitary</strong> &amp; No Tumor</span></div>
                <div class="feat"><span class="feat-icon">🔥</span><span><strong>Grad-CAM</strong> attention heatmaps for explainability</span></div>
                <div class="feat"><span class="feat-icon">🧬</span><span><strong>Multi-Modal Fusion</strong> — fuse 4 MRI scans for richer analysis</span></div>
                <div class="feat"><span class="feat-icon">📊</span><span><strong>Dashboard</strong> — scan history &amp; analytics</span></div>
                <div class="feat"><span class="feat-icon">📄</span><span>One-click <strong>PDF report</strong> generation</span></div>
            </div>
            <div class="sep"></div>
            <div class="signin-lbl">Sign in to continue</div>
        </div>
        <div class="disclaimer">NeuroScan AI · Research prototype · Not for clinical use<br>© 2025 · For educational and research purposes only</div>
    </div>
    </body></html>"""

    components.html(LOGIN_HTML, height=720, scrolling=False)

    col_l, col_m, col_r = st.columns([1, 2, 1])
    with col_m:
        st.markdown("<style>[data-testid='stTextInput']{margin-bottom:0.4rem;}</style>", unsafe_allow_html=True)
        username = st.text_input("Username", placeholder="Enter username")
        password = st.text_input("Password", type="password", placeholder="Enter password")
        if st.button("Sign In →"):

            users = load_users()

            username = username.strip()
            password = password.strip()

            if username in users:

                saved_password = str(users[username]["password"]).strip()

                if saved_password == password:

                    st.session_state.logged_in = True
                    st.session_state.username  = username
                    st.session_state.role      = users[username]["role"]
                    st.session_state.user_name = users[username]["name"]

                    st.success("Login successful")
                    st.rerun()

                else:
                    st.error("Wrong password")

            else:
                st.error("User not found")

    st.markdown("""<div style="text-align:center;margin-top:1rem;font-size:0.6rem;
                color:#1E3040;letter-spacing:0.15em;text-transform:uppercase;position:relative;z-index:1;">
        NeuroScan AI · Research Prototype · Not for Clinical Use</div>""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN APP
# ══════════════════════════════════════════════════════════════════════════════
else:
    st.markdown("""<style>.block-container{padding:2.5rem 2rem 4rem !important;max-width:900px !important;}</style>""", unsafe_allow_html=True)

    # ── Sidebar ────────────────────────────────────────────────────────────────
    with st.sidebar:
        role_badge = "👑 Admin" if st.session_state.role == "admin" else "👤 User"
        st.markdown(f'<span class="sidebar-badge">{role_badge} · {st.session_state.user_name}</span>', unsafe_allow_html=True)
        st.markdown("## NeuroScan AI")
        st.markdown(f"""
Welcome, **{st.session_state.user_name}**!

**Detectable classes**
- Glioma · Meningioma
- Pituitary · No Tumor

**Features**
- Single MRI + Grad-CAM
- Multi-Modal Fusion
- Scan history dashboard
- PDF report export

---
*For research use only.*
""")
        st.markdown("---")
        if st.session_state.role == "admin":
            if st.button("📊 Admin Dashboard"):
                st.session_state.show_dash = not st.session_state.show_dash
                st.rerun()
        else:
            if st.button("📋 My Scan History"):
                st.session_state.show_dash = not st.session_state.show_dash
                st.rerun()
        if st.button("🚪 Sign Out"):
            st.session_state.logged_in = False
            st.session_state.username  = ""
            st.session_state.role      = ""
            st.session_state.user_name = ""
            st.session_state.show_dash = False
            st.rerun()

    # ══════════════════════════════════════════════════════════════════════════
    #  ADMIN DASHBOARD
    # ══════════════════════════════════════════════════════════════════════════
    if st.session_state.show_dash and st.session_state.role == "admin":
        users = load_users()
        st.markdown("""
        <div class="header-wrap">
            <div class="header-eyebrow">System Overview · Real-time Analytics</div>
            <div class="header-title">Admin <span>Dashboard</span></div>
        </div>""", unsafe_allow_html=True)

        # ── Stat cards ─────────────────────────────────────────────────────────
        total_users  = len([u for u in users if users[u]["role"] == "user"])
        total_scans  = sum(len(users[u]["scans"]) for u in users)
        tumor_scans  = sum(1 for u in users for s in users[u]["scans"] if s["prediction"] != "notumor")
        normal_scans = total_scans - tumor_scans

        components.html(f"""<!DOCTYPE html><html><head>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
        <style>
        *{{box-sizing:border-box;margin:0;padding:0;}}
        body{{background:transparent;font-family:'DM Mono',monospace;padding:0.5rem 0;}}
        .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;}}
        .card{{background:rgba(0,200,180,0.04);border:1px solid rgba(0,200,180,0.15);
               border-radius:14px;padding:1.2rem 1rem;text-align:center;position:relative;overflow:hidden;}}
        .card::before{{content:'';position:absolute;top:0;left:0;right:0;height:2px;
                       background:linear-gradient(90deg,transparent,var(--c),transparent);}}
        .val{{font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;color:var(--c);}}
        .lbl{{font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:#3A5060;margin-top:0.3rem;}}
        </style></head><body>
        <div class="grid">
            <div class="card" style="--c:#00C8B4"><div class="val">{total_users}</div><div class="lbl">Total Users</div></div>
            <div class="card" style="--c:#7B8CDE"><div class="val">{total_scans}</div><div class="lbl">Total Scans</div></div>
            <div class="card" style="--c:#FF6B6B"><div class="val">{tumor_scans}</div><div class="lbl">Tumor Detected</div></div>
            <div class="card" style="--c:#00C8B4"><div class="val">{normal_scans}</div><div class="lbl">Normal Scans</div></div>
        </div>
        </body></html>""", height=130)

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)

        # ── Add new user ───────────────────────────────────────────────────────
        with st.expander("➕ Add New User"):
            c1, c2, c3, c4 = st.columns(4)
            with c1: new_user = st.text_input("Username", key="nu")
            with c2: new_pass = st.text_input("Password", type="password", key="np")
            with c3: new_name = st.text_input("Full Name", key="nn")
            with c4: new_role = st.selectbox("Role", ["user", "admin"], key="nr")
            if st.button("Add User"):
                if new_user and new_pass and new_name:
                    users = load_users()
                    if new_user in users:
                        st.error("Username already exists!")
                    else:
                        users[new_user.strip()] = {
    "password": str(new_pass).strip(),
    "role": str(new_role).strip().lower(),
    "name": str(new_name).strip(),
    "created": datetime.now().strftime("%Y-%m-%d"),
    "scans": []
}
                        save_users(users)
                        st.success(f"✅ User '{new_user}' added successfully!")
                        st.rerun()
                else:
                    st.warning("Please fill all fields.")

        # ── All users table ────────────────────────────────────────────────────
        st.markdown('<span class="upload-label" style="margin-top:1rem;">All Users</span>', unsafe_allow_html=True)
        users = load_users()
        for uname, udata in users.items():
            role_color = "#FFB347" if udata["role"] == "admin" else "#00C8B4"
            scan_count = len(udata["scans"])
            last_scan  = udata["scans"][-1]["date"] if udata["scans"] else "No scans yet"
            st.markdown(f"""
            <div style="display:flex;align-items:center;gap:1rem;padding:0.8rem 1.2rem;
                        border-radius:12px;background:rgba(255,255,255,0.02);
                        border:1px solid rgba(255,255,255,0.06);margin-bottom:0.6rem;">
                <div style="font-family:'Syne',sans-serif;font-size:0.9rem;font-weight:700;
                            color:#EEF4FF;min-width:140px;">{udata['name']}</div>
                <div style="font-size:0.65rem;color:#3A5060;min-width:100px;">@{uname}</div>
                <span style="background:{role_color}22;color:{role_color};font-size:0.58rem;
                             letter-spacing:0.15em;padding:0.2rem 0.6rem;border-radius:99px;
                             border:1px solid {role_color}55;text-transform:uppercase;">
                    {udata['role']}</span>
                <div style="font-size:0.65rem;color:#3A5060;margin-left:auto;">
                    📋 {scan_count} scans · Last: {last_scan}</div>
            </div>""", unsafe_allow_html=True)

        # ── All scan history ───────────────────────────────────────────────────
        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        st.markdown('<span class="upload-label">All Scan Records</span>', unsafe_allow_html=True)

        all_records = []
        for uname, udata in users.items():
            for s in udata["scans"]:
                all_records.append({**s, "user": udata["name"], "username": uname})

        all_records.sort(key=lambda x: x["date"], reverse=True)

        if all_records:
            cls_colors = {'glioma':'#FF6B6B','meningioma':'#FFB347','notumor':'#00C8B4','pituitary':'#7B8CDE'}
            for rec in all_records[:50]:
                c  = cls_colors.get(rec["prediction"], "#888")
                st.markdown(f"""
                <div style="display:flex;align-items:center;gap:1rem;padding:0.7rem 1rem;
                            border-radius:10px;background:rgba(255,255,255,0.02);
                            border:1px solid rgba(255,255,255,0.05);margin-bottom:0.4rem;font-size:0.72rem;">
                    <div style="color:#3A5060;min-width:130px;">{rec['date']}</div>
                    <div style="color:#EEF4FF;min-width:120px;font-family:'Syne',sans-serif;font-weight:600;">{rec['user']}</div>
                    <span style="background:{c}22;color:{c};padding:0.15rem 0.55rem;border-radius:99px;
                                 font-size:0.6rem;border:1px solid {c}55;text-transform:uppercase;">
                        {rec['prediction']}</span>
                    <div style="color:#3A5060;">{int(rec['confidence']*100)}% confidence</div>
                    <div style="color:#3A5060;margin-left:auto;">{rec['mode']}</div>
                </div>""", unsafe_allow_html=True)
        else:
            st.info("No scan records yet.")

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        if st.button("← Back to Scanner"):
            st.session_state.show_dash = False
            st.rerun()

    # ══════════════════════════════════════════════════════════════════════════
    #  USER SCAN HISTORY DASHBOARD
    # ══════════════════════════════════════════════════════════════════════════
    elif st.session_state.show_dash and st.session_state.role == "user":
        users    = load_users()
        udata    = users[st.session_state.username]
        my_scans = udata["scans"]

        st.markdown(f"""
        <div class="header-wrap">
            <div class="header-eyebrow">Personal Analytics · Scan History</div>
            <div class="header-title">My <span>Dashboard</span></div>
            <div class="header-sub">Welcome back, {st.session_state.user_name}</div>
        </div>""", unsafe_allow_html=True)

        total    = len(my_scans)
        tumors   = sum(1 for s in my_scans if s["prediction"] != "notumor")
        normals  = total - tumors
        avg_conf = round(sum(s["confidence"] for s in my_scans) / total * 100, 1) if total else 0

        components.html(f"""<!DOCTYPE html><html><head>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
        <style>
        *{{box-sizing:border-box;margin:0;padding:0;}}
        body{{background:transparent;font-family:'DM Mono',monospace;padding:0.5rem 0;}}
        .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;}}
        .card{{background:rgba(0,200,180,0.04);border:1px solid rgba(0,200,180,0.15);
               border-radius:14px;padding:1.2rem 1rem;text-align:center;position:relative;overflow:hidden;}}
        .card::before{{content:'';position:absolute;top:0;left:0;right:0;height:2px;
                       background:linear-gradient(90deg,transparent,var(--c),transparent);}}
        .val{{font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;color:var(--c);}}
        .lbl{{font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:#3A5060;margin-top:0.3rem;}}
        </style></head><body>
        <div class="grid">
            <div class="card" style="--c:#7B8CDE"><div class="val">{total}</div><div class="lbl">Total Scans</div></div>
            <div class="card" style="--c:#FF6B6B"><div class="val">{tumors}</div><div class="lbl">Tumor Detected</div></div>
            <div class="card" style="--c:#00C8B4"><div class="val">{normals}</div><div class="lbl">Normal Scans</div></div>
            <div class="card" style="--c:#FFB347"><div class="val">{avg_conf}%</div><div class="lbl">Avg Confidence</div></div>
        </div>
        </body></html>""", height=130)

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        st.markdown('<span class="upload-label">My Scan Records</span>', unsafe_allow_html=True)

        cls_colors = {'glioma':'#FF6B6B','meningioma':'#FFB347','notumor':'#00C8B4','pituitary':'#7B8CDE'}
        if my_scans:
            for rec in reversed(my_scans):
                c = cls_colors.get(rec["prediction"], "#888")
                st.markdown(f"""
                <div style="display:flex;align-items:center;gap:1rem;padding:0.7rem 1rem;
                            border-radius:10px;background:rgba(255,255,255,0.02);
                            border:1px solid rgba(255,255,255,0.05);margin-bottom:0.4rem;font-size:0.72rem;">
                    <div style="color:#3A5060;min-width:130px;">{rec['date']}</div>
                    <span style="background:{c}22;color:{c};padding:0.15rem 0.55rem;border-radius:99px;
                                 font-size:0.6rem;border:1px solid {c}55;text-transform:uppercase;">
                        {rec['prediction']}</span>
                    <div style="color:#3A5060;">{int(rec['confidence']*100)}% confidence</div>
                    <div style="color:#3A5060;margin-left:auto;">{rec['mode']}</div>
                </div>""", unsafe_allow_html=True)
        else:
            st.info("No scans yet. Go to the scanner to analyse your first MRI!")

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        if st.button("← Back to Scanner"):
            st.session_state.show_dash = False
            st.rerun()

    # ══════════════════════════════════════════════════════════════════════════
    #  MAIN SCANNER
    # ══════════════════════════════════════════════════════════════════════════
    else:
        st.markdown("""
        <div class="header-wrap">
            <div class="header-eyebrow">Deep Learning · MRI Analysis · Grad-CAM · Multi-Modal</div>
            <div class="header-title">Neuro<span>Scan</span> AI</div>
            <div class="header-sub">Single scan classification · Multi-modal fusion · AI heatmap</div>
        </div>
        <div class="divider"></div>""", unsafe_allow_html=True)

        # ── Shared functions ───────────────────────────────────────────────────
        @st.cache_resource
        def load_model():
            interpreter = tf.lite.Interpreter(model_path="models/model.tflite")
            interpreter.allocate_tensors()
            return interpreter

        def predict(interpreter, img_array):
            input_details  = interpreter.get_input_details()
            output_details = interpreter.get_output_details()
            interpreter.set_tensor(input_details[0]['index'], img_array.astype('float32'))
            interpreter.invoke()
            return interpreter.get_tensor(output_details[0]['index'])[0]

        @st.cache_resource
        def load_keras_model():
            base_model = tf.keras.applications.MobileNetV2(
                weights='imagenet', include_top=False, input_shape=(128, 128, 3)
            )
            base_model.trainable = False
            feat_model = tf.keras.Model(
                inputs=base_model.input,
                outputs=base_model.get_layer('out_relu').output
            )
            return feat_model

        def compute_gradcam(feat_model, img_array):
            features = feat_model(img_array, training=False)
            cam = np.mean(features[0].numpy(), axis=-1)
            cam = np.maximum(cam, 0)
            if cam.max() > 0:
                cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
            return cam

        def overlay_gradcam(pil_img, cam):
            cam_resized = cv2.resize(cam, (pil_img.width, pil_img.height))
            cam_uint8   = np.uint8(255 * cam_resized)
            colormap    = plt.get_cmap('jet')
            heatmap     = np.uint8(colormap(cam_uint8 / 255.0) * 255)[..., :3]
            original    = np.array(pil_img.convert("RGB"), dtype=np.float32)
            overlay     = (0.45 * heatmap + 0.55 * original).astype(np.uint8)
            return Image.fromarray(overlay), Image.fromarray(heatmap)

        def generate_pdf_report(predicted_cls, confidence, mode, username, user_name, scan_history):
            buffer = BytesIO()
            doc    = SimpleDocTemplate(buffer, pagesize=letter,
                                       topMargin=40, bottomMargin=40,
                                       leftMargin=50, rightMargin=50)
            styles = getSampleStyleSheet()
            teal   = colors.HexColor('#00C8B4')
            dark   = colors.HexColor('#07090F')
            elems  = []

            # Header
            title_style = ParagraphStyle('title', parent=styles['Title'],
                                         textColor=teal, fontSize=22, spaceAfter=4)
            sub_style   = ParagraphStyle('sub', parent=styles['Normal'],
                                         textColor=colors.HexColor('#5A7090'), fontSize=9)
            body_style  = ParagraphStyle('body', parent=styles['Normal'],
                                         textColor=colors.HexColor('#2A3A4A'), fontSize=10, leading=16)
            label_style = ParagraphStyle('label', parent=styles['Normal'],
                                         textColor=teal, fontSize=8,
                                         fontName='Helvetica-Bold', spaceAfter=2)

            elems.append(Paragraph("NeuroScan AI", title_style))
            elems.append(Paragraph("MRI Brain Tumor Analysis Report", sub_style))
            elems.append(Spacer(1, 16))

            # Info table
            info_data = [
                ["Patient / User", user_name],
                ["Username",       f"@{username}"],
                ["Analysis Mode",  mode],
                ["Generated On",   datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
            ]
            info_table = Table(info_data, colWidths=[140, 340])
            info_table.setStyle(TableStyle([
                ('BACKGROUND',  (0,0), (0,-1), colors.HexColor('#EEF9F7')),
                ('TEXTCOLOR',   (0,0), (0,-1), colors.HexColor('#007A6E')),
                ('TEXTCOLOR',   (1,0), (1,-1), colors.HexColor('#2A3A4A')),
                ('FONTNAME',    (0,0), (0,-1), 'Helvetica-Bold'),
                ('FONTSIZE',    (0,0), (-1,-1), 9),
                ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.HexColor('#F7FDFC'), colors.white]),
                ('GRID',        (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
                ('PADDING',     (0,0), (-1,-1), 8),
                ('ROUNDEDCORNERS', [6]),
            ]))
            elems.append(info_table)
            elems.append(Spacer(1, 20))

            # Result
            cls_map = {'glioma':'Glioma','meningioma':'Meningioma','notumor':'No Tumor','pituitary':'Pituitary'}
            cls_colors_hex = {'glioma':'#FF6B6B','meningioma':'#FFB347','notumor':'#00C8B4','pituitary':'#7B8CDE'}
            result_color = colors.HexColor(cls_colors_hex.get(predicted_cls, '#00C8B4'))

            result_style = ParagraphStyle('result', parent=styles['Normal'],
                                          textColor=result_color, fontSize=18,
                                          fontName='Helvetica-Bold', spaceAfter=4)
            elems.append(Paragraph("Prediction Result", label_style))
            elems.append(Paragraph(cls_map.get(predicted_cls, predicted_cls), result_style))
            elems.append(Paragraph(f"Confidence Score: <b>{int(confidence*100)}%</b>", body_style))
            elems.append(Spacer(1, 16))

            # Disclaimer
            disc_style = ParagraphStyle('disc', parent=styles['Normal'],
                                        textColor=colors.HexColor('#888888'), fontSize=8,
                                        backColor=colors.HexColor('#F5F5F5'),
                                        borderPad=8, leading=13)
            elems.append(Paragraph(
                "⚠ DISCLAIMER: This AI-generated result is for educational and research purposes only. "
                "It is not intended as a clinical diagnosis. Please consult a qualified medical professional "
                "for clinical evaluation and diagnosis.",
                disc_style
            ))
            elems.append(Spacer(1, 20))

            # Scan history table
            if scan_history:
                elems.append(Paragraph("Scan History", label_style))
                elems.append(Spacer(1, 6))
                hist_data = [["Date", "Prediction", "Confidence", "Mode"]]
                for s in reversed(scan_history[-10:]):
                    hist_data.append([
                        s["date"],
                        cls_map.get(s["prediction"], s["prediction"]),
                        f"{int(s['confidence']*100)}%",
                        s["mode"]
                    ])
                hist_table = Table(hist_data, colWidths=[130, 130, 90, 130])
                hist_table.setStyle(TableStyle([
                    ('BACKGROUND',   (0,0), (-1,0), colors.HexColor('#00C8B4')),
                    ('TEXTCOLOR',    (0,0), (-1,0), colors.white),
                    ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
                    ('FONTSIZE',     (0,0), (-1,-1), 8),
                    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F7FDFC'), colors.white]),
                    ('GRID',         (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
                    ('PADDING',      (0,0), (-1,-1), 7),
                    ('ALIGN',        (2,0), (2,-1), 'CENTER'),
                ]))
                elems.append(hist_table)

            doc.build(elems)
            buffer.seek(0)
            return buffer

        def result_chips(probs, predicted_idx, class_names, class_display, class_colors, accent):
            chips_html = ""
            for i, cls in enumerate(class_names):
                active = i == predicted_idx
                p      = int(probs[i] * 100)
                hx     = class_colors[cls][1:]
                r,g,b  = int(hx[0:2],16), int(hx[2:4],16), int(hx[4:6],16)
                bg     = f"rgba({r},{g},{b},0.12)" if active else "rgba(255,255,255,0.03)"
                border = f"1px solid {class_colors[cls]}55" if active else "1px solid rgba(255,255,255,0.07)"
                cc     = class_colors[cls] if active else "#3A5060"
                pc     = class_colors[cls] if active else "#EEF4FF"
                chips_html += f"""
                <div style="background:{bg};border:{border};border-radius:10px;
                            padding:0.8rem 0.5rem;text-align:center;
                            font-family:'DM Mono',monospace;font-size:0.6rem;
                            letter-spacing:0.1em;text-transform:uppercase;color:{cc};">
                    {class_display[cls]}
                    <div style="font-family:'Syne',sans-serif;font-size:1rem;
                                font-weight:700;color:{pc};margin-top:0.3rem;">{p}%</div>
                </div>"""
            return chips_html

        def result_card(predicted_cls, probs, predicted_idx, class_names, class_display, class_colors):
            accent     = class_colors[predicted_cls]
            pct        = int(probs[predicted_idx] * 100)
            chips_html = result_chips(probs, predicted_idx, class_names, class_display, class_colors, accent)
            card_html  = f"""<!DOCTYPE html><html><head>
            <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
            <style>
            *{{box-sizing:border-box;margin:0;padding:0;}}
            body{{background:transparent;font-family:'DM Mono',monospace;color:#C8D6E5;}}
            .card{{border:1px solid {accent}33;border-radius:16px;background:{accent}08;padding:1.8rem 2rem;position:relative;overflow:hidden;}}
            .card::before{{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,{accent},transparent);}}
            .tag{{font-size:0.6rem;letter-spacing:0.3em;text-transform:uppercase;color:{accent};margin-bottom:0.5rem;}}
            .label{{font-family:'Syne',sans-serif;font-size:2.2rem;font-weight:800;color:{accent};letter-spacing:-0.02em;}}
            .conf-row{{display:flex;align-items:center;gap:1rem;margin-top:1.4rem;}}
            .conf-lbl{{font-size:0.65rem;color:#3A5060;letter-spacing:0.12em;min-width:80px;text-transform:uppercase;}}
            .track{{flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;}}
            .fill{{height:100%;border-radius:99px;background:linear-gradient(90deg,{accent}88,{accent});width:0%;transition:width 1.2s cubic-bezier(.4,0,.2,1);}}
            .conf-val{{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:{accent};min-width:44px;text-align:right;}}
            .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin-top:1.6rem;}}
            .sep{{height:1px;background:linear-gradient(90deg,transparent,{accent}22,transparent);margin:1.4rem 0 0;}}
            </style></head><body>
            <div class="card">
                <div class="tag">Classification result</div>
                <div class="label">{class_display[predicted_cls]}</div>
                <div class="conf-row">
                  <span class="conf-lbl">Confidence</span>
                  <div class="track"><div class="fill" id="bar"></div></div>
                  <span class="conf-val">{pct}%</span>
                </div>
                <div class="sep"></div>
                <div class="grid">{chips_html}</div>
            </div>
            <script>requestAnimationFrame(()=>{{setTimeout(()=>{{document.getElementById('bar').style.width='{pct}%';}},80);}});</script>
            </body></html>"""
            return card_html, accent

        class_names   = ['glioma', 'meningioma', 'notumor', 'pituitary']
        class_display = {'glioma':'Glioma','meningioma':'Meningioma','notumor':'No Tumor','pituitary':'Pituitary'}
        class_colors  = {'glioma':'#FF6B6B','meningioma':'#FFB347','notumor':'#00C8B4','pituitary':'#7B8CDE'}

        tab1, tab2 = st.tabs(["🧠  Single MRI · Grad-CAM", "🧬  Multi-Modal Fusion"])

        # ── TAB 1 ──────────────────────────────────────────────────────────────
        with tab1:
            st.markdown('<span class="upload-label">Upload MRI scan</span>', unsafe_allow_html=True)
            uploaded_file = st.file_uploader("", type=["jpg","jpeg","png"],
                                             label_visibility="collapsed", key="tab1_upload")
            if uploaded_file is not None:
                if "model" not in st.session_state:
                    with st.spinner("Loading AI model..."):
                        st.session_state.model = load_model()
                model = st.session_state.model

                img = Image.open(uploaded_file).convert("RGB")
                col1, col2, col3 = st.columns([1, 8, 1])
                with col2:
                    st.image(img, caption="", use_container_width=True)

                img_resized = img.resize((128, 128))
                img_array   = image.img_to_array(img_resized)
                img_array   = np.expand_dims(img_array, axis=0) / 255.0

                with st.spinner("Analysing scan…"):
                    probs = predict(model, img_array)

                predicted_idx = int(np.argmax(probs))
                predicted_cls = class_names[predicted_idx]
                accent        = class_colors[predicted_cls]

                # Save to history
                add_scan_record(st.session_state.username, predicted_cls,
                                float(probs[predicted_idx]), "Single MRI")

                card_html, accent = result_card(predicted_cls, probs, predicted_idx,
                                                class_names, class_display, class_colors)
                components.html(card_html, height=300, scrolling=False)

                # Grad-CAM
                st.markdown("""<div style="margin-top:2rem;margin-bottom:0.8rem;">
                    <span style="font-size:0.68rem;letter-spacing:0.25em;text-transform:uppercase;color:#3A5A70;">
                    🔥 Grad-CAM · AI Attention Heatmap</span></div>""", unsafe_allow_html=True)

                with st.spinner("Generating heatmap…"):
                    try:
                        feat_model               = load_keras_model()
                        cam                      = compute_gradcam(feat_model, img_array)
                        overlay_img, heatmap_img = overlay_gradcam(img, cam)
                        col_a, col_b = st.columns(2)
                        with col_a:
                            st.markdown('<p style="font-size:0.65rem;letter-spacing:0.2em;color:#3A5060;text-transform:uppercase;margin-bottom:0.4rem;">Original MRI</p>', unsafe_allow_html=True)
                            st.image(img, use_container_width=True)
                        with col_b:
                            st.markdown('<p style="font-size:0.65rem;letter-spacing:0.2em;color:#3A5060;text-transform:uppercase;margin-bottom:0.4rem;">Grad-CAM Overlay</p>', unsafe_allow_html=True)
                            st.image(overlay_img, use_container_width=True)
                        st.markdown(f"""<div style="padding:1rem 1.4rem;border-radius:12px;background:rgba(0,200,180,0.04);
                                    border:1px solid rgba(0,200,180,0.15);margin-top:0.8rem;font-size:0.72rem;color:#4A7080;line-height:1.8;">
                            🔴 <strong style="color:#EEF4FF;">Red/Yellow</strong> — AI focused here most<br>
                            🔵 <strong style="color:#EEF4FF;">Blue/Green</strong> — less relevant areas<br>
                            <span style="color:#3A5060;font-size:0.65rem;">Prediction:
                            <strong style="color:{accent};">{class_display[predicted_cls]}</strong></span>
                            </div>""", unsafe_allow_html=True)
                    except Exception as e:
                        st.info(f"Grad-CAM unavailable: {e}")

                users    = load_users()
                pdf_file = generate_pdf_report(
                    predicted_cls, float(probs[predicted_idx]), "Single MRI",
                    st.session_state.username, st.session_state.user_name,
                    users[st.session_state.username]["scans"]
                )
                st.download_button(label="📄 Download MRI Report", data=pdf_file,
                                   file_name="NeuroScan_Report.pdf", mime="application/pdf")

                if predicted_cls != "notumor":
                    st.warning("⚠  Anomaly detected. Please consult a qualified radiologist.")
                else:
                    st.success("✓  No tumor indicators detected in this scan.")
            else:
                st.markdown("""<div style="text-align:center;padding:3rem 1.5rem;border:1px dashed rgba(0,200,180,0.12);
                            border-radius:16px;margin-top:1rem;background:rgba(0,200,180,0.02);">
                    <div style="font-size:2.5rem;margin-bottom:0.8rem;opacity:0.25;">🔬</div>
                    <div style="font-size:0.68rem;letter-spacing:0.18em;text-transform:uppercase;color:#1A3040;">
                        Upload a JPG or PNG MRI image to begin</div></div>""", unsafe_allow_html=True)

        # ── TAB 2 ──────────────────────────────────────────────────────────────
        with tab2:
            st.markdown("""<div style="padding:1rem 1.4rem;border-radius:12px;background:rgba(0,200,180,0.04);
                        border:1px solid rgba(0,200,180,0.15);margin-bottom:1.5rem;font-size:0.75rem;color:#4A7080;line-height:1.8;">
                🧬 <strong style="color:#EEF4FF;">Multi-Modal Fusion</strong> — Upload 4 MRI scans (T1, T1ce, T2, FLAIR).
                Fused into a 4-channel tensor for richer classification.<br>
                <span style="color:#3A5060;font-size:0.65rem;">Tip: You can upload the same image 4 times to test.</span>
                </div>""", unsafe_allow_html=True)

            col1, col2 = st.columns(2)
            with col1:
                st.markdown('<span class="upload-label">T1 — Native anatomy</span>', unsafe_allow_html=True)
                t1 = st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed", key="t1")
                st.markdown('<span class="upload-label">T2 — Fluid / Edema</span>', unsafe_allow_html=True)
                t2 = st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed", key="t2")
            with col2:
                st.markdown('<span class="upload-label">T1ce — Contrast Enhanced</span>', unsafe_allow_html=True)
                t1ce = st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed", key="t1ce")
                st.markdown('<span class="upload-label">FLAIR — Whole Tumor</span>', unsafe_allow_html=True)
                flair = st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed", key="flair")

            channels      = [t1, t1ce, t2, flair]
            channel_names = ["T1", "T1ce", "T2", "FLAIR"]
            all_uploaded  = all(c is not None for c in channels)

            if all_uploaded:
                st.markdown('<span class="upload-label" style="margin-top:1rem;">Uploaded scans preview</span>', unsafe_allow_html=True)
                prev_cols = st.columns(4)
                pil_imgs  = []
                for i, (ch, name) in enumerate(zip(channels, channel_names)):
                    pil_img = Image.open(ch).convert("RGB")
                    pil_imgs.append(pil_img)
                    with prev_cols[i]:
                        st.image(pil_img, caption=name, use_container_width=True)

                gray_arrays = [np.array(p.convert("L").resize((128,128)), dtype=np.float32)/255.0 for p in pil_imgs]
                fused_4ch   = np.stack(gray_arrays, axis=-1)
                r = (fused_4ch[:,:,0]*0.5 + fused_4ch[:,:,1]*0.5)
                g = (fused_4ch[:,:,1]*0.5 + fused_4ch[:,:,2]*0.5)
                b = (fused_4ch[:,:,2]*0.5 + fused_4ch[:,:,3]*0.5)
                fused_rgb   = np.stack([r,g,b], axis=-1)
                fused_input = np.expand_dims(fused_rgb, axis=0)

                st.markdown('<span class="upload-label" style="margin-top:1rem;">Fused multi-modal image</span>', unsafe_allow_html=True)
                fused_pil = Image.fromarray(np.uint8(fused_rgb * 255))
                col_f1, col_f2, col_f3 = st.columns([1,4,1])
                with col_f2:
                    st.image(fused_pil, caption="4-channel weighted fusion", use_container_width=True)

                if "model" not in st.session_state:
                    with st.spinner("Loading AI model..."):
                        st.session_state.model = load_model()
                model = st.session_state.model

                with st.spinner("Running multi-modal fusion analysis…"):
                    probs = predict(model, fused_input)

                predicted_idx = int(np.argmax(probs))
                predicted_cls = class_names[predicted_idx]
                accent        = class_colors[predicted_cls]

                # Save to history
                # Prevent duplicate history entries
                current_scan = {
                    "prediction": predicted_cls,
                    "confidence": round(float(probs[predicted_idx]), 2),
                    "mode": "Multi-Modal Fusion"
                }

                if "last_scan" not in st.session_state:
                    st.session_state.last_scan = None

                if st.session_state.last_scan != current_scan:

                    add_scan_record(
                        st.session_state.username,
                        predicted_cls,
                        float(probs[predicted_idx]),
                        "Multi-Modal Fusion"
                    )

                    st.session_state.last_scan = current_scan

                card_html, accent = result_card(
                    predicted_cls,
                    probs,
                    predicted_idx,
                    class_names,
                    class_display,
                    class_colors
                )

                components.html(card_html, height=300, scrolling=False)

                st.markdown("""<div style="margin-top:2rem;margin-bottom:0.8rem;">
                    <span style="font-size:0.68rem;letter-spacing:0.25em;text-transform:uppercase;color:#3A5A70;">
                    🔥 Fusion Grad-CAM · AI Attention Heatmap</span></div>""", unsafe_allow_html=True)

                with st.spinner("Generating fusion heatmap…"):
                    try:
                        feat_model     = load_keras_model()
                        cam            = compute_gradcam(feat_model, fused_input)
                        overlay_img, _ = overlay_gradcam(fused_pil, cam)
                        col_a, col_b   = st.columns(2)
                        with col_a:
                            st.markdown('<p style="font-size:0.65rem;letter-spacing:0.2em;color:#3A5060;text-transform:uppercase;margin-bottom:0.4rem;">Fused MRI</p>', unsafe_allow_html=True)
                            st.image(fused_pil, use_container_width=True)
                        with col_b:
                            st.markdown('<p style="font-size:0.65rem;letter-spacing:0.2em;color:#3A5060;text-transform:uppercase;margin-bottom:0.4rem;">Fusion Grad-CAM</p>', unsafe_allow_html=True)
                            st.image(overlay_img, use_container_width=True)
                    except Exception as e:
                        st.info(f"Grad-CAM unavailable: {e}")

                users    = load_users()
                pdf_file = generate_pdf_report(
                    predicted_cls, float(probs[predicted_idx]), "Multi-Modal Fusion",
                    st.session_state.username, st.session_state.user_name,
                    users[st.session_state.username]["scans"]
                )
                st.download_button(label="📄 Download Fusion Report", data=pdf_file,
                                   file_name="NeuroScan_Fusion_Report.pdf", mime="application/pdf")

                if predicted_cls != "notumor":
                    st.warning("⚠  Anomaly detected. Please consult a qualified radiologist.")
                else:
                    st.success("✓  No tumor indicators detected across all 4 modalities.")
            else:
                missing = [n for n,c in zip(channel_names,channels) if c is None]
                if any(c is not None for c in channels):
                    st.info(f"Still waiting for: **{', '.join(missing)}**")
                else:
                    st.markdown("""<div style="text-align:center;padding:3rem 1.5rem;border:1px dashed rgba(0,200,180,0.12);
                                border-radius:16px;margin-top:1rem;background:rgba(0,200,180,0.02);">
                        <div style="font-size:2.5rem;margin-bottom:0.8rem;opacity:0.25;">🧬</div>
                        <div style="font-size:0.68rem;letter-spacing:0.18em;text-transform:uppercase;color:#1A3040;">
                            Upload all 4 MRI modalities to begin fusion analysis</div></div>""", unsafe_allow_html=True)

    st.markdown('<div class="footer">NeuroScan AI · Research prototype · Not for clinical use</div>',
                unsafe_allow_html=True)