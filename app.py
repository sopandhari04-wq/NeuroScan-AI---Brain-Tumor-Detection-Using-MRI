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
from datetime import datetime, timezone, timedelta
import matplotlib.pyplot as plt
from supabase import create_client, Client

st.set_page_config(page_title="NeuroScan AI", page_icon="🧠", layout="wide")

# ══════════════════════════════════════════════════════════════════════════════
#  SUPABASE CONNECTION
# ══════════════════════════════════════════════════════════════════════════════
@st.cache_resource
def get_supabase() -> Client:
    url = st.secrets["SUPABASE_URL"]
    key = st.secrets["SUPABASE_KEY"]
    return create_client(url, key)

def get_ist_time():
    """Get current time in IST (UTC+5:30)."""
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).strftime("%Y-%m-%d %H:%M")

# ── User functions ─────────────────────────────────────────────────────────────
def load_users():
    """Load all users from Supabase."""
    try:
        sb = get_supabase()
        res = sb.table("users").select("*").execute()
        users = {}
        for u in res.data:
            users[u["username"]] = {
                "password": u["password"],
                "role":     u["role"],
                "name":     u["name"],
                "created":  u["created"],
                "scans":    get_user_scans(u["username"])
            }
        return users
    except Exception as e:
        st.error(f"Database error: {e}")
        return {}

def get_user_scans(username):
    """Get scan history for a specific user."""
    try:
        sb  = get_supabase()
        res = sb.table("scans").select("*").eq("username", username).order("date", desc=True).execute()
        scans = []
        ist   = timezone(timedelta(hours=5, minutes=30))
        for s in res.data:
            # Convert UTC timestamp to IST
            try:
                dt_utc = datetime.fromisoformat(s["date"].replace("Z", "+00:00"))
                dt_ist = dt_utc.astimezone(ist)
                date_str = dt_ist.strftime("%Y-%m-%d %H:%M")
            except:
                date_str = s["date"][:16]
            scans.append({
                "date":       date_str,
                "prediction": s["prediction"],
                "confidence": s["confidence"],
                "mode":       s["mode"]
            })
        return scans
    except:
        return []

def add_user(username, password, role, name):
    """Add a new user to Supabase."""
    try:
        sb = get_supabase()
        sb.table("users").insert({
            "username": username,
            "password": password,
            "role":     role,
            "name":     name,
            "created":  datetime.now().strftime("%Y-%m-%d")
        }).execute()
        return True
    except Exception as e:
        return False

def add_scan_record(username, predicted_cls, confidence, mode):
    """Save scan record to Supabase."""
    try:
        sb = get_supabase()
        sb.table("scans").insert({
            "username":   username,
            "prediction": predicted_cls,
            "confidence": round(float(confidence), 2),
            "mode":       mode
        }).execute()
    except Exception as e:
        st.warning(f"Could not save scan record: {e}")

def get_all_scans():
    """Get all scans from all users (admin only)."""
    try:
        sb  = get_supabase()
        res = sb.table("scans").select("*, users(name)").order("date", desc=True).limit(50).execute()
        ist = timezone(timedelta(hours=5, minutes=30))
        scans = []
        for s in res.data:
            try:
                dt_utc = datetime.fromisoformat(s["date"].replace("Z", "+00:00"))
                dt_ist = dt_utc.astimezone(ist)
                date_str = dt_ist.strftime("%Y-%m-%d %H:%M")
            except:
                date_str = s["date"][:16]
            scans.append({
                "date":       date_str,
                "prediction": s["prediction"],
                "confidence": s["confidence"],
                "mode":       s["mode"],
                "username":   s["username"],
                "user":       s["users"]["name"] if s.get("users") else s["username"]
            })
        return scans
    except Exception as e:
        return []

def get_dashboard_stats():
    """Get dashboard stats from Supabase."""
    try:
        sb         = get_supabase()
        users_res  = sb.table("users").select("username, role").execute()
        scans_res  = sb.table("scans").select("prediction").execute()
        total_users  = len([u for u in users_res.data if u["role"] == "user"])
        total_scans  = len(scans_res.data)
        tumor_scans  = len([s for s in scans_res.data if s["prediction"] != "notumor"])
        normal_scans = total_scans - tumor_scans
        return total_users, total_scans, tumor_scans, normal_scans
    except:
        return 0, 0, 0, 0

# ── Session state ──────────────────────────────────────────────────────────────
if "logged_in"  not in st.session_state: st.session_state.logged_in  = False
if "username"   not in st.session_state: st.session_state.username   = ""
if "role"       not in st.session_state: st.session_state.role       = ""
if "user_name"  not in st.session_state: st.session_state.user_name  = ""
if "show_dash"  not in st.session_state: st.session_state.show_dash  = False
if "last_scan"  not in st.session_state: st.session_state.last_scan  = None

# ══════════════════════════════════════════════════════════════════════════════
#  CLINICAL KNOWLEDGE BASE
# ══════════════════════════════════════════════════════════════════════════════
TUMOR_DB = {
    "glioma": {
        "full_name":   "Glioma",
        "description": "Gliomas are primary brain tumors arising from glial cells. They range from low-grade (WHO Grade I–II, slow-growing) to high-grade (WHO Grade III–IV, aggressive), with Glioblastoma Multiforme (GBM) being the most aggressive form.",
        "characteristics": "Irregular, infiltrative borders with heterogeneous signal intensity. May show surrounding edema, mass effect, and ring-enhancing pattern on contrast MRI.",
        "clinical_note": "Gliomas require histopathological grading for definitive diagnosis. High-grade gliomas (Grade III–IV) are associated with significantly poorer prognosis and require urgent neurosurgical evaluation.",
        "urgency":      "HIGH — Prompt neurosurgical referral recommended.",
        "urgency_color":"#FF6B6B",
        "treatments": [
            ("🔪 Surgical Resection", "Maximal safe resection is the primary treatment. Gross total resection improves survival in high-grade gliomas. Awake craniotomy may be used for tumors near eloquent cortex."),
            ("☢️ Radiation Therapy", "Standard of care for high-grade gliomas: 60 Gy in 30 fractions (Stupp protocol). Stereotactic radiosurgery (SRS) used for recurrent or residual disease."),
            ("💊 Chemotherapy", "Temozolomide (TMZ) is the first-line chemotherapy agent. CCNU/Lomustine used in MGMT-methylated tumors. Bevacizumab for recurrent GBM."),
            ("🧬 Targeted Therapy", "IDH1/IDH2 inhibitors (Ivosidenib, Enasidenib) for IDH-mutant gliomas. BRAF inhibitors for BRAF V600E-mutant tumors."),
            ("🔬 Tumor Treating Fields", "TTFields (Optune device) — FDA-approved for GBM. Delivers low-intensity alternating electric fields to disrupt tumor cell division."),
        ],
        "followup": "MRI with contrast every 2–3 months post-treatment. Monitor for pseudoprogression vs true progression.",
        "prognosis": "Highly variable. Low-grade gliomas: median survival 5–15 years. GBM: median survival 14–16 months with standard treatment."
    },
    "meningioma": {
        "full_name":   "Meningioma",
        "description": "Meningiomas are typically benign tumors (WHO Grade I) arising from the arachnoid cap cells of the meninges. They are the most common primary intracranial tumor in adults, representing ~37% of all primary brain tumors.",
        "characteristics": "Well-defined extra-axial mass with homogeneous enhancement. Dural tail sign often present. May show calcification. Rarely invasive (WHO Grade II–III).",
        "clinical_note": "Most meningiomas are benign and slow-growing. Small asymptomatic meningiomas may be managed conservatively with surveillance imaging. Symptomatic or growing tumors require intervention.",
        "urgency":      "MODERATE — Neurosurgical assessment recommended.",
        "urgency_color":"#FFB347",
        "treatments": [
            ("👁️ Active Surveillance", "Small (<3cm), asymptomatic meningiomas are monitored with annual MRI. No immediate treatment needed if stable."),
            ("🔪 Surgical Resection", "Simpson Grade I–II resection (complete removal with dural attachment) is curative in most cases. Goal is complete resection with dural coagulation."),
            ("☢️ Stereotactic Radiosurgery", "Gamma Knife or CyberKnife for tumors <3cm or surgically inaccessible locations. Effective for WHO Grade I meningiomas with 90%+ local control rate."),
            ("☢️ Fractionated Radiotherapy", "Used for atypical (Grade II) or malignant (Grade III) meningiomas post-surgery. Also for large tumors near critical structures."),
            ("💊 Emerging Therapies", "Somatostatin analogues (Octreotide) under investigation. Immunotherapy trials ongoing for recurrent/refractory cases."),
        ],
        "followup": "MRI every 6–12 months for 5 years post-treatment, then annually. Monitor for recurrence.",
        "prognosis": "Excellent for WHO Grade I: 10-year recurrence-free survival >80% after complete resection. Grade II–III have higher recurrence rates."
    },
    "pituitary": {
        "full_name":   "Pituitary Adenoma",
        "description": "Pituitary adenomas are benign tumors of the anterior pituitary gland. Classified by size (microadenoma <10mm, macroadenoma ≥10mm) and function (hormone-secreting vs non-functioning).",
        "characteristics": "Sellar/suprasellar mass. Macroadenomas may compress optic chiasm causing visual field defects. Deviation of pituitary stalk. Possible hemorrhage (pituitary apoplexy).",
        "clinical_note": "Functional adenomas cause distinct hormonal syndromes: prolactinoma (galactorrhea, hypogonadism), acromegaly (GH excess), Cushing's disease (ACTH excess). Urgent intervention needed for pituitary apoplexy.",
        "urgency":      "MODERATE — Endocrinological and ophthalmological evaluation needed.",
        "urgency_color":"#FFB347",
        "treatments": [
            ("💊 Medical Therapy (1st line for prolactinoma)", "Dopamine agonists (Cabergoline, Bromocriptine) are first-line for prolactinomas — 80%+ achieve normal prolactin levels and tumor shrinkage."),
            ("🔪 Transsphenoidal Surgery", "Minimally invasive endoscopic or microscopic surgery through the nose/sphenoid sinus. First-line for most non-prolactinoma adenomas. High remission rates for microadenomas."),
            ("☢️ Stereotactic Radiosurgery", "Gamma Knife for residual or recurrent adenomas. Used after incomplete surgical resection. 5-year tumor control ~90%."),
            ("💊 Somatostatin Analogues", "Octreotide/Lanreotide for GH-secreting tumors (acromegaly). Pasireotide for Cushing's disease. Controls hormone excess."),
            ("💊 Hormone Replacement", "Post-surgical hypopituitarism requires lifelong hormone replacement: cortisol, thyroid hormone, sex hormones, growth hormone as needed."),
        ],
        "followup": "MRI every 6 months initially, then annually. Endocrine function tests at each visit. Visual field testing for macroadenomas.",
        "prognosis": "Excellent for most adenomas. Microadenoma surgical remission rate: 80–90%. Macroadenomas: 50–70%. Prolactinomas respond well to medical therapy in >80% of cases."
    },
    "notumor": {
        "full_name":   "No Tumor Detected",
        "description": "No significant intracranial mass lesion identified on the submitted MRI scan. Brain parenchyma appears within normal limits for AI-assisted analysis.",
        "characteristics": "No focal signal abnormality, mass effect, or pathological enhancement pattern identified by the AI model.",
        "clinical_note": "A negative AI screening result does not exclude subtle or early-stage pathology. Clinical correlation with patient symptoms, history, and neurological examination is essential.",
        "urgency":      "LOW — Routine clinical follow-up as indicated.",
        "urgency_color":"#00C8B4",
        "treatments": [],
        "followup":   "Routine clinical follow-up as clinically indicated by symptoms. Repeat imaging if clinical suspicion persists or symptoms develop.",
        "prognosis":  "No pathological findings detected. Continue routine health monitoring."
    }
}

# ══════════════════════════════════════════════════════════════════════════════
#  GRAD-CAM ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════
def analyze_gradcam(cam, predicted_cls, confidence):
    h, w = cam.shape
    peak_y, peak_x = np.unravel_index(cam.argmax(), cam.shape)
    vert  = "Superior" if peak_y < h//3 else "Middle" if peak_y < 2*h//3 else "Inferior"
    horiz = "Left"     if peak_x < w//2 else "Right"
    activation_intensity = float(cam.max()) * 100
    focus_area_pct       = float(np.mean(cam > 0.5)) * 100
    high_act_pct         = float(np.mean(cam > 0.75)) * 100
    mean_activation      = float(cam.mean()) * 100
    if focus_area_pct < 10:
        pattern = "Highly focal"; pattern_desc = "The AI attention is tightly concentrated in a small region, suggesting a well-defined lesion boundary."
    elif focus_area_pct < 25:
        pattern = "Moderately focal"; pattern_desc = "The AI attention is concentrated in a limited area, consistent with a localized pathological process."
    elif focus_area_pct < 50:
        pattern = "Diffuse focal"; pattern_desc = "The AI attention spans a moderate area, possibly indicating infiltrative margins or surrounding edema."
    else:
        pattern = "Widespread"; pattern_desc = "The AI attention is distributed across a large area, suggesting extensive involvement or diffuse pathology."
    if activation_intensity >= 80:
        act_level = "Very High"; act_desc = "Extremely strong pathological signal detected. High model certainty about the detected region."
    elif activation_intensity >= 60:
        act_level = "High"; act_desc = "Strong pathological signal detected. The model identified clear anomalous features in this region."
    elif activation_intensity >= 40:
        act_level = "Moderate"; act_desc = "Moderate pathological signal. Features are present but may warrant additional imaging for confirmation."
    else:
        act_level = "Low"; act_desc = "Weak pathological signal. Results should be interpreted with caution alongside clinical findings."
    conf_pct = int(confidence * 100)
    if conf_pct >= 90:
        conf_interp = "Very High Certainty"; conf_desc = "The model demonstrates very strong certainty. This classification is highly reliable."
    elif conf_pct >= 75:
        conf_interp = "High Certainty"; conf_desc = "The model demonstrates good certainty. Clinical correlation is recommended."
    elif conf_pct >= 60:
        conf_interp = "Moderate Certainty"; conf_desc = "Moderate model certainty. Additional imaging and clinical correlation are particularly important."
    else:
        conf_interp = "Low Certainty"; conf_desc = "Low model certainty. Results should be interpreted with caution. Further evaluation strongly recommended."
    region_notes = {
        "glioma":     f"Gliomas most commonly arise in the cerebral hemispheres. {vert} {horiz} localization is consistent with supratentorial glioma distribution.",
        "meningioma": f"Meningiomas arise from the meninges and are extra-axial. {vert} {horiz} attention suggests possible dural attachment in this region.",
        "pituitary":  "Pituitary adenomas are located in the sellar/suprasellar region. AI attention in the central inferior region is consistent with pituitary pathology.",
        "notumor":    "No significant focal abnormality detected. Diffuse low-level attention is consistent with normal brain parenchyma."
    }
    return {
        "region": f"{vert} {horiz}", "vert": vert, "horiz": horiz,
        "activation_intensity": round(activation_intensity, 1),
        "focus_area_pct": round(focus_area_pct, 1),
        "high_act_pct": round(high_act_pct, 1),
        "mean_activation": round(mean_activation, 1),
        "pattern": pattern, "pattern_desc": pattern_desc,
        "act_level": act_level, "act_desc": act_desc,
        "conf_interp": conf_interp, "conf_desc": conf_desc,
        "conf_pct": conf_pct, "region_note": region_notes.get(predicted_cls, ""),
    }

# ══════════════════════════════════════════════════════════════════════════════
#  SHARED CSS
# ══════════════════════════════════════════════════════════════════════════════
SHARED_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, .stApp { background-color: #07090F !important; color: #C8D6E5 !important; font-family: 'DM Mono', monospace !important; }
#MainMenu, footer, header { visibility: hidden; }
.stApp::before {
    content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(ellipse 60% 45% at 15% 10%, rgba(0,200,180,0.10) 0%, transparent 70%),
                radial-gradient(ellipse 50% 50% at 85% 85%, rgba(80,120,255,0.08) 0%, transparent 70%),
                radial-gradient(ellipse 40% 30% at 50% 50%, rgba(0,200,180,0.04) 0%, transparent 65%);
    pointer-events: none; z-index: 0;
}
.stApp::after {
    content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,200,180,0.006) 3px, rgba(0,200,180,0.006) 4px);
    pointer-events: none; z-index: 0;
}
.element-container, .stMarkdown, .stSpinner, .stButton, .stDownloadButton { position: relative; z-index: 1; }
[data-testid="stTextInput"] input { background: rgba(0,200,180,0.04) !important; border: 1px solid rgba(0,200,180,0.2) !important; border-radius: 10px !important; color: #EEF4FF !important; font-family: 'DM Mono', monospace !important; font-size: 0.85rem !important; padding: 0.65rem 1rem !important; }
[data-testid="stTextInput"] input:focus { border-color: #00C8B4 !important; box-shadow: 0 0 0 3px rgba(0,200,180,0.12) !important; outline: none !important; }
[data-testid="stTextInput"] label { color: #3A6070 !important; font-family: 'DM Mono', monospace !important; font-size: 0.68rem !important; letter-spacing: 0.2em !important; text-transform: uppercase !important; }
[data-testid="stButton"] > button { background: linear-gradient(135deg, #00C8B4 0%, #0097A7 100%) !important; color: #07090F !important; font-family: 'Syne', sans-serif !important; font-weight: 700 !important; font-size: 0.85rem !important; letter-spacing: 0.08em !important; border: none !important; border-radius: 10px !important; padding: 0.65rem 2rem !important; width: 100% !important; box-shadow: 0 4px 24px rgba(0,200,180,0.25) !important; cursor: pointer !important; }
[data-testid="stButton"] > button:hover { opacity: 0.92 !important; transform: translateY(-1px) !important; }
[data-testid="stDownloadButton"] > button { background: rgba(0,200,180,0.08) !important; color: #00C8B4 !important; font-family: 'DM Mono', monospace !important; font-size: 0.78rem !important; border: 1px solid rgba(0,200,180,0.3) !important; border-radius: 10px !important; padding: 0.55rem 1.4rem !important; }
[data-testid="stDownloadButton"] > button:hover { background: rgba(0,200,180,0.14) !important; border-color: rgba(0,200,180,0.55) !important; }
[data-testid="stAlert"] { border-radius: 10px !important; font-family: 'DM Mono', monospace !important; font-size: 0.78rem !important; }
[data-testid="stSidebar"] { background: rgba(10,13,21,0.97) !important; border-right: 1px solid rgba(0,200,180,0.10) !important; }
[data-testid="stSidebar"] h2 { font-family: 'Syne', sans-serif !important; font-weight: 700 !important; color: #EEF4FF !important; font-size: 1rem !important; }
[data-testid="stSidebar"] p, [data-testid="stSidebar"] li { font-size: 0.78rem !important; color: #4A6070 !important; line-height: 1.7 !important; }
[data-testid="stImage"] { border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,200,180,0.14); box-shadow: 0 0 40px rgba(0,200,180,0.08); position: relative; z-index: 1; }
[data-testid="stImage"] img { border-radius: 12px; }
[data-testid="stFileUploader"] { background: transparent !important; position: relative; z-index: 1; }
[data-testid="stFileUploader"] > div { background: rgba(0,200,180,0.03) !important; border: 1px dashed rgba(0,200,180,0.25) !important; border-radius: 12px !important; }
[data-testid="stFileUploader"] > div:hover { background: rgba(0,200,180,0.06) !important; border-color: rgba(0,200,180,0.55) !important; }
[data-testid="stFileUploader"] label { color: #5A8090 !important; font-family: 'DM Mono', monospace !important; font-size: 0.8rem !important; }
[data-testid="stFileUploader"] small { color: #3A5060 !important; font-size: 0.68rem !important; }
.stTabs [data-baseweb="tab-list"] { background: rgba(0,200,180,0.04) !important; border-radius: 12px !important; border: 1px solid rgba(0,200,180,0.12) !important; padding: 4px !important; gap: 4px !important; justify-content: center !important; }
.stTabs [data-baseweb="tab"] { font-family: 'DM Mono', monospace !important; font-size: 0.72rem !important; letter-spacing: 0.12em !important; text-transform: uppercase !important; color: #3A5060 !important; border-radius: 8px !important; padding: 0.5rem 1.2rem !important; border: none !important; }
.stTabs [aria-selected="true"] { background: rgba(0,200,180,0.15) !important; color: #00C8B4 !important; }
.footer { margin-top: 3.5rem; text-align: center; font-size: 0.6rem; letter-spacing: 0.18em; color: #1E3040; text-transform: uppercase; position: relative; z-index: 1; }
.sidebar-badge { display: inline-block; background: rgba(0,200,180,0.1); color: #00C8B4; font-size: 0.6rem; letter-spacing: 0.2em; padding: 0.25rem 0.7rem; border-radius: 99px; border: 1px solid rgba(0,200,180,0.25); margin-bottom: 1rem; text-transform: uppercase; }
.divider { height: 1px; background: linear-gradient(90deg,transparent,#1A3040,transparent); margin: 2rem 0; }
.upload-label { font-size: 0.68rem; letter-spacing: 0.25em; text-transform: uppercase; color: #3A5A70; margin-bottom: 0.5rem; display: block; position: relative; z-index: 1; }
.header-wrap { text-align: center; padding: 2.5rem 0 2rem; position: relative; z-index: 1; }
.header-eyebrow { font-size: 0.7rem; letter-spacing: 0.35em; color: #00C8B4; text-transform: uppercase; margin-bottom: 1rem; }
.header-title { font-family: 'Syne', sans-serif; font-size: clamp(2.2rem,5vw,3.4rem); font-weight: 800; line-height: 1.05; color: #EEF4FF; letter-spacing: -0.02em; }
.header-title span { color: #00C8B4; }
.header-sub { margin-top: 0.9rem; font-size: 0.8rem; color: #5A7090; letter-spacing: 0.05em; }
</style>
"""
st.markdown(SHARED_CSS, unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  LOGIN PAGE
# ══════════════════════════════════════════════════════════════════════════════
if not st.session_state.logged_in:
    st.markdown("<style>.block-container{padding:0 !important;max-width:100% !important;}</style>", unsafe_allow_html=True)

    LOGIN_HTML = """<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
    *{box-sizing:border-box;margin:0;padding:0;}body{background:transparent;font-family:'DM Mono',monospace;color:#C8D6E5;}
    .hero{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1.5rem 2rem;text-align:center;}
    .badge{display:inline-flex;align-items:center;gap:0.4rem;background:rgba(0,200,180,0.10);color:#00C8B4;font-size:0.62rem;letter-spacing:0.28em;text-transform:uppercase;padding:0.3rem 0.9rem;border-radius:99px;border:1px solid rgba(0,200,180,0.28);margin-bottom:1.6rem;}
    .dot{width:6px;height:6px;border-radius:50%;background:#00C8B4;animation:pulse 2s ease-in-out infinite;}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(0.7);}}
    .logo{font-family:'Syne',sans-serif;font-size:clamp(2.6rem,7vw,3.8rem);font-weight:800;letter-spacing:-0.03em;line-height:1;color:#EEF4FF;margin-bottom:0.6rem;}
    .logo span{color:#00C8B4;}
    .tagline{font-size:0.78rem;color:#3A5A70;letter-spacing:0.08em;margin-bottom:2.2rem;}
    .stats{display:flex;gap:1rem;margin-bottom:2.4rem;justify-content:center;flex-wrap:wrap;}
    .stat{background:rgba(0,200,180,0.05);border:1px solid rgba(0,200,180,0.14);border-radius:10px;padding:0.55rem 1.1rem;text-align:center;}
    .stat-val{font-family:'Syne',sans-serif;font-size:1.15rem;font-weight:700;color:#00C8B4;}
    .stat-lbl{font-size:0.58rem;letter-spacing:0.18em;color:#3A5A70;text-transform:uppercase;margin-top:0.1rem;}
    .card{width:100%;max-width:440px;background:rgba(10,14,22,0.85);border:1px solid rgba(0,200,180,0.16);border-radius:20px;padding:2.2rem 2rem 2rem;position:relative;overflow:hidden;backdrop-filter:blur(12px);box-shadow:0 0 0 1px rgba(0,200,180,0.04),0 20px 60px rgba(0,0,0,0.5);}
    .card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#00C8B4,transparent);}
    .card-title{font-family:'Syne',sans-serif;font-size:1.15rem;font-weight:700;color:#EEF4FF;margin-bottom:0.3rem;}
    .card-sub{font-size:0.68rem;color:#3A5060;letter-spacing:0.06em;margin-bottom:1.8rem;}
    .features{display:flex;flex-direction:column;gap:0.5rem;margin-bottom:2rem;}
    .feat{display:flex;align-items:center;gap:0.65rem;background:rgba(0,200,180,0.04);border:1px solid rgba(0,200,180,0.10);border-radius:9px;padding:0.5rem 0.85rem;font-size:0.68rem;color:#4A7080;letter-spacing:0.04em;}
    .feat-icon{font-size:0.9rem;}.feat strong{color:#8ABFC8;font-weight:500;}
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
            <div class="stat"><div class="stat-val">XAI</div><div class="stat-lbl">Explainability</div></div>
        </div>
        <div class="card">
            <div class="card-title">Secure Access</div>
            <div class="card-sub">Authorized personnel only · Research environment</div>
            <div class="features">
                <div class="feat"><span class="feat-icon">🧠</span><span>Detects <strong>Glioma, Meningioma, Pituitary</strong> &amp; No Tumor</span></div>
                <div class="feat"><span class="feat-icon">🔥</span><span><strong>Grad-CAM XAI</strong> — region analysis, intensity, focus mapping</span></div>
                <div class="feat"><span class="feat-icon">📋</span><span><strong>AI Radiology Report</strong> — clinical findings &amp; interpretation</span></div>
                <div class="feat"><span class="feat-icon">💊</span><span><strong>Treatment Guide</strong> — tumor-specific treatment options</span></div>
                <div class="feat"><span class="feat-icon">🧬</span><span><strong>Multi-Modal Fusion</strong> — T1, T1ce, T2, FLAIR analysis</span></div>
                <div class="feat"><span class="feat-icon">📊</span><span><strong>Dashboard</strong> — persistent scan history via Supabase</span></div>
                <div class="feat"><span class="feat-icon">📄</span><span>Professional <strong>PDF report</strong> with full clinical findings</span></div>
            </div>
            <div class="sep"></div>
            <div class="signin-lbl">Sign in to continue</div>
        </div>
        <div class="disclaimer">NeuroScan AI · Research prototype · Not for clinical use<br>© 2025 · For educational and research purposes only</div>
    </div></body></html>"""

    components.html(LOGIN_HTML, height=800, scrolling=False)
    col_l, col_m, col_r = st.columns([1, 2, 1])
    with col_m:
        st.markdown("<style>[data-testid='stTextInput']{margin-bottom:0.4rem;}</style>", unsafe_allow_html=True)
        username = st.text_input("Username", placeholder="Enter username")
        password = st.text_input("Password", type="password", placeholder="Enter password")
        if st.button("Sign In →"):
            try:
                sb  = get_supabase()
                res = sb.table("users").select("*").eq("username", username.strip()).execute()
                if res.data and res.data[0]["password"] == password.strip():
                    u = res.data[0]
                    st.session_state.logged_in = True
                    st.session_state.username  = u["username"]
                    st.session_state.role      = u["role"]
                    st.session_state.user_name = u["name"]
                    st.rerun()
                else:
                    st.error("Invalid credentials. Please try again.")
            except Exception as e:
                st.error(f"Login error: {e}")
    st.markdown('<div style="text-align:center;margin-top:1rem;font-size:0.6rem;color:#1E3040;letter-spacing:0.15em;text-transform:uppercase;">NeuroScan AI · Research Prototype · Not for Clinical Use</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN APP
# ══════════════════════════════════════════════════════════════════════════════
else:
    st.markdown("<style>.block-container{padding:2.5rem 2rem 4rem !important;max-width:900px !important;}</style>", unsafe_allow_html=True)

    with st.sidebar:
        role_badge = "👑 Admin" if st.session_state.role == "admin" else "👤 User"
        st.markdown(f'<span class="sidebar-badge">{role_badge} · {st.session_state.user_name}</span>', unsafe_allow_html=True)
        st.markdown("## NeuroScan AI")
        st.markdown(f"""
Welcome, **{st.session_state.user_name}**!

**Features**
- Single MRI + Grad-CAM XAI
- AI Radiology Report
- Treatment Recommendations
- Multi-Modal Fusion
- Scan history (Supabase)
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
        st.markdown('<div class="header-wrap"><div class="header-eyebrow">System Overview · Real-time Analytics · Supabase</div><div class="header-title">Admin <span>Dashboard</span></div></div>', unsafe_allow_html=True)

        total_users, total_scans, tumor_scans, normal_scans = get_dashboard_stats()
        components.html(f"""<!DOCTYPE html><html><head>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
        <style>*{{box-sizing:border-box;margin:0;padding:0;}}body{{background:transparent;font-family:'DM Mono',monospace;padding:0.5rem 0;}}
        .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;}}
        .card{{background:rgba(0,200,180,0.04);border:1px solid rgba(0,200,180,0.15);border-radius:14px;padding:1.2rem 1rem;text-align:center;position:relative;overflow:hidden;}}
        .card::before{{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--c),transparent);}}
        .val{{font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;color:var(--c);}}
        .lbl{{font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:#3A5060;margin-top:0.3rem;}}</style></head><body>
        <div class="grid">
            <div class="card" style="--c:#00C8B4"><div class="val">{total_users}</div><div class="lbl">Total Users</div></div>
            <div class="card" style="--c:#7B8CDE"><div class="val">{total_scans}</div><div class="lbl">Total Scans</div></div>
            <div class="card" style="--c:#FF6B6B"><div class="val">{tumor_scans}</div><div class="lbl">Tumor Detected</div></div>
            <div class="card" style="--c:#00C8B4"><div class="val">{normal_scans}</div><div class="lbl">Normal Scans</div></div>
        </div></body></html>""", height=130)

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)

        with st.expander("➕ Add New User"):
            c1,c2,c3,c4 = st.columns(4)
            with c1: new_user = st.text_input("Username", key="nu")
            with c2: new_pass = st.text_input("Password", type="password", key="np")
            with c3: new_name = st.text_input("Full Name", key="nn")
            with c4: new_role = st.selectbox("Role", ["user","admin"], key="nr")
            if st.button("Add User"):
                if new_user and new_pass and new_name:
                    ok = add_user(new_user.strip(), str(new_pass).strip(), new_role, str(new_name).strip())
                    if ok:
                        st.success(f"✅ User '{new_user}' added!")
                        st.rerun()
                    else:
                        st.error("Username already exists or database error!")
                else:
                    st.warning("Please fill all fields.")

        # All users
        st.markdown('<span class="upload-label" style="margin-top:1rem;">All Users</span>', unsafe_allow_html=True)
        try:
            sb       = get_supabase()
            usr_res  = sb.table("users").select("*").execute()
            cls_colors = {'glioma':'#FF6B6B','meningioma':'#FFB347','notumor':'#00C8B4','pituitary':'#7B8CDE'}
            for udata in usr_res.data:
                rc = "#FFB347" if udata["role"]=="admin" else "#00C8B4"
                sc_res = sb.table("scans").select("date").eq("username", udata["username"]).order("date", desc=True).limit(1).execute()
                sc_count_res = sb.table("scans").select("id", count="exact").eq("username", udata["username"]).execute()
                sc = sc_count_res.count if sc_count_res.count else 0
                ist = timezone(timedelta(hours=5, minutes=30))
                if sc_res.data:
                    try:
                        dt_utc = datetime.fromisoformat(sc_res.data[0]["date"].replace("Z","+00:00"))
                        ls = dt_utc.astimezone(ist).strftime("%Y-%m-%d %H:%M")
                    except:
                        ls = sc_res.data[0]["date"][:16]
                else:
                    ls = "No scans yet"
                st.markdown(f"""<div style="display:flex;align-items:center;gap:1rem;padding:0.8rem 1.2rem;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);margin-bottom:0.6rem;">
                    <div style="font-family:'Syne',sans-serif;font-size:0.9rem;font-weight:700;color:#EEF4FF;min-width:140px;">{udata['name']}</div>
                    <div style="font-size:0.65rem;color:#3A5060;min-width:100px;">@{udata['username']}</div>
                    <span style="background:{rc}22;color:{rc};font-size:0.58rem;letter-spacing:0.15em;padding:0.2rem 0.6rem;border-radius:99px;border:1px solid {rc}55;text-transform:uppercase;">{udata['role']}</span>
                    <div style="font-size:0.65rem;color:#3A5060;margin-left:auto;">📋 {sc} scans · Last: {ls}</div></div>""", unsafe_allow_html=True)
        except Exception as e:
            st.error(f"Error loading users: {e}")

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        st.markdown('<span class="upload-label">All Scan Records (IST)</span>', unsafe_allow_html=True)

        all_records = get_all_scans()
        cls_colors  = {'glioma':'#FF6B6B','meningioma':'#FFB347','notumor':'#00C8B4','pituitary':'#7B8CDE'}
        if all_records:
            for rec in all_records:
                c = cls_colors.get(rec["prediction"],"#888")
                st.markdown(f"""<div style="display:flex;align-items:center;gap:1rem;padding:0.7rem 1rem;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);margin-bottom:0.4rem;font-size:0.72rem;">
                    <div style="color:#3A5060;min-width:130px;">{rec['date']}</div>
                    <div style="color:#EEF4FF;min-width:120px;font-family:'Syne',sans-serif;font-weight:600;">{rec['user']}</div>
                    <span style="background:{c}22;color:{c};padding:0.15rem 0.55rem;border-radius:99px;font-size:0.6rem;border:1px solid {c}55;text-transform:uppercase;">{rec['prediction']}</span>
                    <div style="color:#3A5060;">{int(rec['confidence']*100)}% confidence</div>
                    <div style="color:#3A5060;margin-left:auto;">{rec['mode']}</div></div>""", unsafe_allow_html=True)
        else:
            st.info("No scan records yet.")

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        if st.button("← Back to Scanner"):
            st.session_state.show_dash = False
            st.rerun()

    # ══════════════════════════════════════════════════════════════════════════
    #  USER DASHBOARD
    # ══════════════════════════════════════════════════════════════════════════
    elif st.session_state.show_dash and st.session_state.role == "user":
        my_scans = get_user_scans(st.session_state.username)
        st.markdown(f'<div class="header-wrap"><div class="header-eyebrow">Personal Analytics · Scan History · IST Time</div><div class="header-title">My <span>Dashboard</span></div><div class="header-sub">Welcome back, {st.session_state.user_name}</div></div>', unsafe_allow_html=True)

        total   = len(my_scans)
        tumors  = sum(1 for s in my_scans if s["prediction"]!="notumor")
        normals = total - tumors
        avg_c   = round(sum(s["confidence"] for s in my_scans)/total*100,1) if total else 0

        components.html(f"""<!DOCTYPE html><html><head>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
        <style>*{{box-sizing:border-box;margin:0;padding:0;}}body{{background:transparent;font-family:'DM Mono',monospace;padding:0.5rem 0;}}
        .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;}}
        .card{{background:rgba(0,200,180,0.04);border:1px solid rgba(0,200,180,0.15);border-radius:14px;padding:1.2rem 1rem;text-align:center;position:relative;overflow:hidden;}}
        .card::before{{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--c),transparent);}}
        .val{{font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;color:var(--c);}}
        .lbl{{font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:#3A5060;margin-top:0.3rem;}}</style></head><body>
        <div class="grid">
            <div class="card" style="--c:#7B8CDE"><div class="val">{total}</div><div class="lbl">Total Scans</div></div>
            <div class="card" style="--c:#FF6B6B"><div class="val">{tumors}</div><div class="lbl">Tumor Detected</div></div>
            <div class="card" style="--c:#00C8B4"><div class="val">{normals}</div><div class="lbl">Normal Scans</div></div>
            <div class="card" style="--c:#FFB347"><div class="val">{avg_c}%</div><div class="lbl">Avg Confidence</div></div>
        </div></body></html>""", height=130)

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        st.markdown('<span class="upload-label">My Scan Records (IST)</span>', unsafe_allow_html=True)
        cls_colors = {'glioma':'#FF6B6B','meningioma':'#FFB347','notumor':'#00C8B4','pituitary':'#7B8CDE'}
        if my_scans:
            for rec in my_scans:
                c = cls_colors.get(rec["prediction"],"#888")
                st.markdown(f"""<div style="display:flex;align-items:center;gap:1rem;padding:0.7rem 1rem;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);margin-bottom:0.4rem;font-size:0.72rem;">
                    <div style="color:#3A5060;min-width:130px;">{rec['date']}</div>
                    <span style="background:{c}22;color:{c};padding:0.15rem 0.55rem;border-radius:99px;font-size:0.6rem;border:1px solid {c}55;text-transform:uppercase;">{rec['prediction']}</span>
                    <div style="color:#3A5060;">{int(rec['confidence']*100)}% confidence</div>
                    <div style="color:#3A5060;margin-left:auto;">{rec['mode']}</div></div>""", unsafe_allow_html=True)
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
        st.markdown("""<div class="header-wrap">
            <div class="header-eyebrow">Deep Learning · MRI Analysis · Grad-CAM XAI · Radiology Report</div>
            <div class="header-title">Neuro<span>Scan</span> AI</div>
            <div class="header-sub">Classification · AI Radiology Report · Treatment Guide · Multi-Modal Fusion</div>
        </div><div class="divider"></div>""", unsafe_allow_html=True)

        @st.cache_resource
        def load_model():
            interpreter = tf.lite.Interpreter(model_path="models/model.tflite")
            interpreter.allocate_tensors()
            return interpreter

        def predict(interpreter, img_array):
            inp = interpreter.get_input_details()[0]
            out = interpreter.get_output_details()[0]
            interpreter.set_tensor(inp['index'], img_array.astype('float32'))
            interpreter.invoke()
            return interpreter.get_tensor(out['index'])[0]

        @st.cache_resource
        def load_keras_model():

            base = tf.keras.applications.MobileNetV2(
                weights=None,
                include_top=False,
                input_shape=(128, 128, 3)
            )

            inputs = tf.keras.Input(shape=(128, 128, 3))

            x = base(inputs, training=False)
            x = tf.keras.layers.GlobalAveragePooling2D()(x)
            x = tf.keras.layers.Dense(128, activation='relu')(x)
            outputs = tf.keras.layers.Dense(4, activation='softmax')(x)

            model = tf.keras.Model(inputs, outputs)

            model.load_weights("models/model_weights.weights.h5")

            return model

        def find_last_conv_layer(model):
            """Search recursively through nested submodels to find the last Conv2D."""
            last_conv = None
            for layer in model.layers:
                # if this layer is itself a model (e.g. MobileNetV2 submodel), go inside it
                if hasattr(layer, 'layers'):
                    for sublayer in layer.layers:
                        if isinstance(sublayer, tf.keras.layers.Conv2D):
                            last_conv = sublayer.name
                elif isinstance(layer, tf.keras.layers.Conv2D):
                    last_conv = layer.name
            if last_conv is None:
                raise ValueError("No Conv2D layer found in model.")
            return last_conv
        def compute_gradcam(keras_model, img_array, predicted_class_idx):
         last_conv_name = find_last_conv_layer(keras_model)

        # get the actual submodel that contains the conv layer (MobileNetV2)
        submodel = None
        for layer in keras_model.layers:
            if hasattr(layer, 'layers'):
                for sublayer in layer.layers:
                    if sublayer.name == last_conv_name:
                        submodel = layer
                        break

        # build grad model: input → [last conv output, final predictions]
        grad_model = tf.keras.Model(
            inputs=keras_model.input,
            outputs=[submodel.get_layer(last_conv_name).output, keras_model.output]
        )

        with tf.GradientTape() as tape:
            inputs = tf.cast(img_array, tf.float32)
            conv_outputs, predictions = grad_model(inputs)
            loss = predictions[:, predicted_class_idx]

        grads        = tape.gradient(loss, conv_outputs)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_outputs = conv_outputs[0]
        cam = tf.reduce_sum(pooled_grads * conv_outputs, axis=-1).numpy()
        cam = np.maximum(cam, 0)
        if cam.max() > 0:
            cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
            return cam

        def overlay_gradcam(pil_img, cam):
            cam_r = cv2.resize(cam, (pil_img.width, pil_img.height))
            hmap  = np.uint8(plt.get_cmap('jet')(np.uint8(255*cam_r)/255.0)*255)[...,:3]
            orig  = np.array(pil_img.convert("RGB"), dtype=np.float32)
            return Image.fromarray((0.45*hmap+0.55*orig).astype(np.uint8)), Image.fromarray(hmap)

        def show_gradcam_analysis(cam, predicted_cls, confidence, accent, class_display):
            a = analyze_gradcam(cam, predicted_cls, confidence)
            components.html(f"""<!DOCTYPE html><html><head>
            <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
            <style>*{{box-sizing:border-box;margin:0;padding:0;}}body{{background:transparent;font-family:'DM Mono',monospace;color:#C8D6E5;padding:0.3rem 0;}}
            .box{{border:1px solid {accent}22;border-radius:14px;background:{accent}06;padding:1.5rem 1.8rem;position:relative;overflow:hidden;}}
            .box::before{{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,{accent},transparent);}}
            .title{{font-family:'Syne',sans-serif;font-size:0.9rem;font-weight:800;color:#EEF4FF;margin-bottom:1.2rem;}}.title span{{color:{accent};}}
            .metrics{{display:grid;grid-template-columns:repeat(4,1fr);gap:0.8rem;margin-bottom:1.2rem;}}
            .metric{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0.8rem 0.6rem;text-align:center;}}
            .m-val{{font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;color:{accent};}}.m-lbl{{font-size:0.55rem;letter-spacing:0.15em;text-transform:uppercase;color:#3A5060;margin-top:0.2rem;}}
            .sep{{height:1px;background:linear-gradient(90deg,transparent,{accent}22,transparent);margin:1rem 0;}}
            .row{{display:flex;gap:0.6rem;align-items:flex-start;font-size:0.7rem;color:#4A7080;line-height:1.7;margin-bottom:0.6rem;}}
            .dot{{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px;}}
            .badge{{display:inline-block;background:{accent}22;color:{accent};font-size:0.6rem;letter-spacing:0.15em;padding:0.2rem 0.6rem;border-radius:99px;border:1px solid {accent}55;text-transform:uppercase;font-family:'Syne',sans-serif;font-weight:700;margin-bottom:0.8rem;}}
            .bar-bg{{height:4px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;margin-top:0.3rem;}}
            .bar-fill{{height:100%;border-radius:99px;background:linear-gradient(90deg,{accent}88,{accent});}}</style></head><body>
            <div class="box">
                <div class="title">🔥 Grad-CAM <span>XAI Analysis</span></div>
                <div class="metrics">
                    <div class="metric"><div class="m-val">{a['activation_intensity']}%</div><div class="m-lbl">Activation Intensity</div></div>
                    <div class="metric"><div class="m-val">{a['region']}</div><div class="m-lbl">Primary Focus Region</div></div>
                    <div class="metric"><div class="m-val">{a['focus_area_pct']}%</div><div class="m-lbl">Heatmap Coverage</div></div>
                    <div class="metric"><div class="m-val">{a['pattern']}</div><div class="m-lbl">Attention Pattern</div></div>
                </div>
                <div class="badge">AI Confidence: {a['conf_interp']} · {a['conf_pct']}%</div>
                <div class="bar-bg"><div class="bar-fill" style="width:{a['conf_pct']}%;"></div></div>
                <div class="sep"></div>
                <div class="row"><div class="dot" style="background:#FF4444;"></div><div><strong style="color:#EEF4FF;">Red/Yellow regions — Primary AI attention.</strong> {a['act_desc']}</div></div>
                <div class="row"><div class="dot" style="background:#4488FF;"></div><div><strong style="color:#EEF4FF;">Blue/Green regions — Low attention zones.</strong> These areas show normal brain tissue characteristics with no significant pathological features detected by the model.</div></div>
                <div class="row"><div class="dot" style="background:{accent};"></div><div><strong style="color:#EEF4FF;">Attention pattern: {a['pattern']}.</strong> {a['pattern_desc']}</div></div>
                <div class="row"><div class="dot" style="background:#FFB347;"></div><div><strong style="color:#EEF4FF;">Region analysis:</strong> {a['region_note']}</div></div>
                <div class="row"><div class="dot" style="background:#7B8CDE;"></div><div><strong style="color:#EEF4FF;">Confidence interpretation:</strong> {a['conf_desc']}</div></div>
            </div></body></html>""", height=420, scrolling=False)

        def show_radiology_report(predicted_cls, confidence, cam_analysis, accent):
            info = TUMOR_DB[predicted_cls]
            a    = cam_analysis
            uc   = info["urgency_color"]
            components.html(f"""<!DOCTYPE html><html><head>
            <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
            <style>*{{box-sizing:border-box;margin:0;padding:0;}}body{{background:transparent;font-family:'DM Mono',monospace;color:#C8D6E5;padding:0.3rem 0;}}
            .box{{border:1px solid {accent}22;border-radius:14px;background:{accent}06;padding:1.5rem 1.8rem;position:relative;overflow:hidden;}}
            .box::before{{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,{accent},transparent);}}
            .title{{font-family:'Syne',sans-serif;font-size:0.9rem;font-weight:800;color:#EEF4FF;margin-bottom:0.5rem;}}.title span{{color:{accent};}}
            .diagnosis{{font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;color:{accent};margin-bottom:0.4rem;}}
            .urgency{{display:inline-block;background:{uc}22;color:{uc};font-size:0.62rem;letter-spacing:0.15em;padding:0.25rem 0.7rem;border-radius:99px;border:1px solid {uc}55;text-transform:uppercase;font-family:'Syne',sans-serif;font-weight:700;margin-bottom:1rem;}}
            .sep{{height:1px;background:linear-gradient(90deg,transparent,{accent}22,transparent);margin:0.9rem 0;}}
            .sec-lbl{{font-size:0.58rem;letter-spacing:0.25em;text-transform:uppercase;color:{accent};margin-bottom:0.35rem;}}
            .sec-val{{font-size:0.73rem;color:#C8D6E5;line-height:1.75;}}
            .grid2{{display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;margin:0.8rem 0;}}
            .info-box{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0.8rem 1rem;}}
            .info-val{{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:{accent};}}.info-lbl{{font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase;color:#3A5060;margin-top:0.2rem;}}
            .disc{{font-size:0.6rem;color:#2A3A4A;line-height:1.6;margin-top:0.8rem;padding:0.6rem 0.8rem;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.05);}}</style></head><body>
            <div class="box">
                <div class="title">📋 AI <span>Radiology Report</span></div>
                <div class="diagnosis">{info['full_name']}</div>
                <div class="urgency">{info['urgency']}</div>
                <div class="sec-lbl">Clinical Description</div><div class="sec-val">{info['description']}</div><div class="sep"></div>
                <div class="sec-lbl">Imaging Characteristics</div><div class="sec-val">{info['characteristics']}</div><div class="sep"></div>
                <div class="grid2">
                    <div class="info-box"><div class="info-val">{a['conf_pct']}%</div><div class="info-lbl">Model Confidence</div></div>
                    <div class="info-box"><div class="info-val">{a['act_level']}</div><div class="info-lbl">Activation Level</div></div>
                    <div class="info-box"><div class="info-val">{a['region']}</div><div class="info-lbl">Focus Region</div></div>
                    <div class="info-box"><div class="info-val">{a['pattern']}</div><div class="info-lbl">Attention Pattern</div></div>
                </div>
                <div class="sep"></div>
                <div class="sec-lbl">Clinical Note</div><div class="sec-val">{info['clinical_note']}</div><div class="sep"></div>
                <div class="sec-lbl">Recommended Follow-up</div><div class="sec-val">{info['followup']}</div><div class="sep"></div>
                <div class="sec-lbl">Prognosis</div><div class="sec-val">{info['prognosis']}</div>
                <div class="disc">⚠ This AI-generated report is for research and educational purposes only. Not intended as a clinical diagnosis. Generated: {datetime.now(timezone(timedelta(hours=5,minutes=30))).strftime('%Y-%m-%d %H:%M IST')}</div>
            </div></body></html>""", height=680, scrolling=False)

        def show_treatment_guide(predicted_cls, accent):
            info = TUMOR_DB[predicted_cls]
            if not info["treatments"]: return
            treatments_html = ""
            treat_colors = ["#FF6B6B","#FFB347","#7B8CDE","#00C8B4","#FF8FAB"]
            for i, (title, desc) in enumerate(info["treatments"]):
                tc = treat_colors[i % len(treat_colors)]
                treatments_html += f"""<div style="display:flex;gap:1rem;align-items:flex-start;padding:0.9rem 1rem;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);margin-bottom:0.6rem;">
                    <div style="width:32px;height:32px;border-radius:50%;background:{tc}22;border:1px solid {tc}55;display:flex;align-items:center;justify-content:center;font-size:0.85rem;flex-shrink:0;">{title.split()[0]}</div>
                    <div><div style="font-family:'Syne',sans-serif;font-size:0.82rem;font-weight:700;color:#EEF4FF;margin-bottom:0.25rem;">{' '.join(title.split()[1:])}</div>
                    <div style="font-size:0.7rem;color:#4A7080;line-height:1.7;">{desc}</div></div></div>"""
            components.html(f"""<!DOCTYPE html><html><head>
            <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
            <style>*{{box-sizing:border-box;margin:0;padding:0;}}body{{background:transparent;font-family:'DM Mono',monospace;color:#C8D6E5;padding:0.3rem 0;}}
            .box{{border:1px solid {accent}22;border-radius:14px;background:{accent}06;padding:1.5rem 1.8rem;position:relative;overflow:hidden;}}
            .box::before{{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,{accent},transparent);}}
            .title{{font-family:'Syne',sans-serif;font-size:0.9rem;font-weight:800;color:#EEF4FF;margin-bottom:0.4rem;}}.title span{{color:{accent};}}
            .sub{{font-size:0.68rem;color:#3A5060;margin-bottom:1.2rem;}}
            .disc{{font-size:0.6rem;color:#2A3A4A;line-height:1.6;margin-top:0.8rem;padding:0.6rem 0.8rem;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.05);}}</style></head><body>
            <div class="box">
                <div class="title">💊 Treatment <span>Recommendations</span></div>
                <div class="sub">Standard treatment approaches for {info['full_name']} — for educational reference only</div>
                {treatments_html}
                <div class="disc">⚠ Treatment decisions must be made by qualified medical professionals. This is for educational purposes only.</div>
            </div></body></html>""", height=len(info["treatments"])*110+180, scrolling=False)

        def generate_pdf_report(predicted_cls, confidence, mode, username, user_name, scan_history, cam_analysis=None):
            buffer  = BytesIO()
            doc     = SimpleDocTemplate(buffer, pagesize=letter, topMargin=40, bottomMargin=40, leftMargin=50, rightMargin=50)
            styles  = getSampleStyleSheet()
            teal    = colors.HexColor('#00C8B4')
            elems   = []
            title_s  = ParagraphStyle('t', parent=styles['Title'],  textColor=teal, fontSize=22, spaceAfter=4)
            sub_s    = ParagraphStyle('s', parent=styles['Normal'], textColor=colors.HexColor('#5A7090'), fontSize=9)
            body_s   = ParagraphStyle('b', parent=styles['Normal'], textColor=colors.HexColor('#2A3A4A'), fontSize=10, leading=16)
            label_s  = ParagraphStyle('l', parent=styles['Normal'], textColor=teal, fontSize=8, fontName='Helvetica-Bold', spaceAfter=2)
            section_s= ParagraphStyle('sec', parent=styles['Normal'], textColor=colors.HexColor('#007A6E'), fontSize=11, fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=4)
            ist      = timezone(timedelta(hours=5, minutes=30))
            now_ist  = datetime.now(ist).strftime("%Y-%m-%d %H:%M IST")
            elems   += [Paragraph("NeuroScan AI", title_s), Paragraph("MRI Brain Tumor Analysis Report", sub_s), Spacer(1,16)]
            info_t   = Table([["Patient / User",user_name],["Username",f"@{username}"],["Analysis Mode",mode],["Generated On",now_ist]], colWidths=[140,340])
            info_t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(0,-1),colors.HexColor('#EEF9F7')),('TEXTCOLOR',(0,0),(0,-1),colors.HexColor('#007A6E')),
                ('TEXTCOLOR',(1,0),(1,-1),colors.HexColor('#2A3A4A')),('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),
                ('FONTSIZE',(0,0),(-1,-1),9),('ROWBACKGROUNDS',(0,0),(-1,-1),[colors.HexColor('#F7FDFC'),colors.white]),
                ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#D0EDE9')),('PADDING',(0,0),(-1,-1),8),
            ]))
            elems += [info_t, Spacer(1,20)]
            cls_map = {'glioma':'Glioma','meningioma':'Meningioma','notumor':'No Tumor','pituitary':'Pituitary'}
            cls_hex = {'glioma':'#FF6B6B','meningioma':'#FFB347','notumor':'#00C8B4','pituitary':'#7B8CDE'}
            res_s   = ParagraphStyle('r', parent=styles['Normal'], textColor=colors.HexColor(cls_hex.get(predicted_cls,'#00C8B4')), fontSize=18, fontName='Helvetica-Bold', spaceAfter=4)
            elems  += [Paragraph("Prediction Result", label_s), Paragraph(cls_map.get(predicted_cls,predicted_cls), res_s),
                       Paragraph(f"Confidence Score: <b>{int(confidence*100)}%</b>", body_s), Spacer(1,12)]
            info = TUMOR_DB[predicted_cls]
            elems += [Paragraph("AI Radiology Report", section_s),
                      Paragraph(f"<b>Diagnosis:</b> {info['full_name']}", body_s),
                      Paragraph(f"<b>Urgency:</b> {info['urgency']}", body_s), Spacer(1,6),
                      Paragraph(f"<b>Description:</b> {info['description']}", body_s), Spacer(1,6),
                      Paragraph(f"<b>Imaging Characteristics:</b> {info['characteristics']}", body_s), Spacer(1,6),
                      Paragraph(f"<b>Clinical Note:</b> {info['clinical_note']}", body_s), Spacer(1,6),
                      Paragraph(f"<b>Recommended Follow-up:</b> {info['followup']}", body_s), Spacer(1,6),
                      Paragraph(f"<b>Prognosis:</b> {info['prognosis']}", body_s), Spacer(1,10)]
            if cam_analysis:
                a = cam_analysis
                elems += [Paragraph("Grad-CAM XAI Analysis", section_s),
                          Paragraph(f"<b>Activation Intensity:</b> {a['activation_intensity']}%", body_s),
                          Paragraph(f"<b>Primary Focus Region:</b> {a['region']}", body_s),
                          Paragraph(f"<b>Heatmap Coverage:</b> {a['focus_area_pct']}%", body_s),
                          Paragraph(f"<b>Attention Pattern:</b> {a['pattern']} — {a['pattern_desc']}", body_s),
                          Paragraph(f"<b>Model Confidence:</b> {a['conf_interp']} ({a['conf_pct']}%) — {a['conf_desc']}", body_s), Spacer(1,10)]
            if info["treatments"]:
                elems.append(Paragraph("Treatment Recommendations", section_s))
                for title, desc in info["treatments"]:
                    elems += [Paragraph(f"<b>{title}</b>", body_s), Paragraph(desc, body_s), Spacer(1,4)]
                elems.append(Spacer(1,8))
            disc_s = ParagraphStyle('d', parent=styles['Normal'], textColor=colors.HexColor('#888888'), fontSize=8, backColor=colors.HexColor('#F5F5F5'), borderPad=8, leading=13)
            elems += [Paragraph("⚠ DISCLAIMER: This AI-generated result is for educational and research purposes only. Not intended as a clinical diagnosis. Please consult a qualified medical professional.", disc_s), Spacer(1,20)]
            if scan_history:
                elems.append(Paragraph("Scan History", label_s))
                elems.append(Spacer(1,6))
                hd = [["Date (IST)","Prediction","Confidence","Mode"]] + [[s["date"],cls_map.get(s["prediction"],s["prediction"]),f"{int(s['confidence']*100)}%",s["mode"]] for s in scan_history[:10]]
                ht = Table(hd, colWidths=[130,130,90,130])
                ht.setStyle(TableStyle([
                    ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#00C8B4')),('TEXTCOLOR',(0,0),(-1,0),colors.white),
                    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),
                    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F7FDFC'),colors.white]),
                    ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#D0EDE9')),('PADDING',(0,0),(-1,-1),7),
                ]))
                elems.append(ht)
            doc.build(elems)
            buffer.seek(0)
            return buffer

        def result_chips(probs, predicted_idx, class_names, class_display, class_colors):
            chips_html = ""
            for i, cls in enumerate(class_names):
                active = i == predicted_idx
                p = int(probs[i]*100)
                hx = class_colors[cls][1:]
                r,g,b = int(hx[0:2],16),int(hx[2:4],16),int(hx[4:6],16)
                bg     = f"rgba({r},{g},{b},0.12)" if active else "rgba(255,255,255,0.03)"
                border = f"1px solid {class_colors[cls]}55" if active else "1px solid rgba(255,255,255,0.07)"
                cc     = class_colors[cls] if active else "#3A5060"
                pc     = class_colors[cls] if active else "#EEF4FF"
                chips_html += f"""<div style="background:{bg};border:{border};border-radius:10px;padding:0.8rem 0.5rem;text-align:center;font-family:'DM Mono',monospace;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:{cc};">
                    {class_display[cls]}<div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:{pc};margin-top:0.3rem;">{p}%</div></div>"""
            return chips_html

        def result_card(predicted_cls, probs, predicted_idx, class_names, class_display, class_colors):
            accent = class_colors[predicted_cls]
            pct    = int(probs[predicted_idx]*100)
            chips  = result_chips(probs, predicted_idx, class_names, class_display, class_colors)
            html   = f"""<!DOCTYPE html><html><head>
            <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
            <style>*{{box-sizing:border-box;margin:0;padding:0;}}body{{background:transparent;font-family:'DM Mono',monospace;color:#C8D6E5;}}
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
            <div class="card"><div class="tag">Classification result</div><div class="label">{class_display[predicted_cls]}</div>
            <div class="conf-row"><span class="conf-lbl">Confidence</span><div class="track"><div class="fill" id="bar"></div></div><span class="conf-val">{pct}%</span></div>
            <div class="sep"></div><div class="grid">{chips}</div></div>
            <script>requestAnimationFrame(()=>{{setTimeout(()=>{{document.getElementById('bar').style.width='{pct}%';}},80);}});</script>
            </body></html>"""
            return html, accent

        class_names   = ['glioma','meningioma','notumor','pituitary']
        class_display = {'glioma':'Glioma','meningioma':'Meningioma','notumor':'No Tumor','pituitary':'Pituitary'}
        class_colors  = {'glioma':'#FF6B6B','meningioma':'#FFB347','notumor':'#00C8B4','pituitary':'#7B8CDE'}

        tab1, tab2 = st.tabs(["🧠  Single MRI · Grad-CAM", "🧬  Multi-Modal Fusion"])

        # ── TAB 1 ──────────────────────────────────────────────────────────────
        with tab1:
            st.markdown('<span class="upload-label">Upload MRI scan</span>', unsafe_allow_html=True)
            uploaded_file = st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed", key="tab1_upload")
            if uploaded_file is not None:
                if "model" not in st.session_state:
                    with st.spinner("Loading AI model..."):
                        st.session_state.model = load_model()
                model = st.session_state.model
                img   = Image.open(uploaded_file).convert("RGB")
                col1,col2,col3 = st.columns([1,8,1])
                with col2: st.image(img, caption="", use_container_width=True)
                img_resized = img.resize((128,128))
                img_array   = image.img_to_array(img_resized)
                img_array   = np.expand_dims(img_array, axis=0) / 255.0
                with st.spinner("Analysing scan…"):
                    probs = predict(model, img_array)
                predicted_idx = int(np.argmax(probs))
                predicted_cls = class_names[predicted_idx]
                accent        = class_colors[predicted_cls]
                add_scan_record(st.session_state.username, predicted_cls, float(probs[predicted_idx]), "Single MRI")
                card_html, accent = result_card(predicted_cls, probs, predicted_idx, class_names, class_display, class_colors)
                components.html(card_html, height=300, scrolling=False)
                st.markdown("""<div style="margin-top:2rem;margin-bottom:0.8rem;"><span style="font-size:0.68rem;letter-spacing:0.25em;text-transform:uppercase;color:#3A5A70;">🔥 Grad-CAM · AI Attention Heatmap</span></div>""", unsafe_allow_html=True)
                cam_analysis = None
                with st.spinner("Generating heatmap…"):
                    try:
                        keras_model    = load_keras_model()
                        cam            = compute_gradcam(keras_model, img_array, predicted_idx)
                        overlay_img, _ = overlay_gradcam(img, cam)
                        col_a,col_b    = st.columns(2)
                        with col_a:
                            st.markdown('<p style="font-size:0.65rem;letter-spacing:0.2em;color:#3A5060;text-transform:uppercase;margin-bottom:0.4rem;">Original MRI</p>', unsafe_allow_html=True)
                            st.image(img, use_container_width=True)
                        with col_b:
                            st.markdown('<p style="font-size:0.65rem;letter-spacing:0.2em;color:#3A5060;text-transform:uppercase;margin-bottom:0.4rem;">Grad-CAM Overlay</p>', unsafe_allow_html=True)
                            st.image(overlay_img, use_container_width=True)
                        cam_analysis = analyze_gradcam(cam, predicted_cls, float(probs[predicted_idx]))
                        show_gradcam_analysis(cam, predicted_cls, float(probs[predicted_idx]), accent, class_display)
                    except Exception as e:
                        st.info(f"Grad-CAM unavailable: {e}")
                st.markdown("""<div style="margin-top:2rem;margin-bottom:0.8rem;"><span style="font-size:0.68rem;letter-spacing:0.25em;text-transform:uppercase;color:#3A5A70;">📋 AI Radiology Report · Clinical Findings</span></div>""", unsafe_allow_html=True)
                if cam_analysis is None: cam_analysis = analyze_gradcam(np.zeros((4,4)), predicted_cls, float(probs[predicted_idx]))
                show_radiology_report(predicted_cls, float(probs[predicted_idx]), cam_analysis, accent)
                if predicted_cls != "notumor":
                    st.markdown("""<div style="margin-top:2rem;margin-bottom:0.8rem;"><span style="font-size:0.68rem;letter-spacing:0.25em;text-transform:uppercase;color:#3A5A70;">💊 Treatment Recommendations · Educational Reference</span></div>""", unsafe_allow_html=True)
                    show_treatment_guide(predicted_cls, accent)
                scan_history = get_user_scans(st.session_state.username)
                pdf_file = generate_pdf_report(predicted_cls, float(probs[predicted_idx]), "Single MRI", st.session_state.username, st.session_state.user_name, scan_history, cam_analysis)
                st.download_button(label="📄 Download Full Clinical Report (PDF)", data=pdf_file, file_name="NeuroScan_Report.pdf", mime="application/pdf")
                if predicted_cls != "notumor":
                    st.warning("⚠  Anomaly detected. Please consult a qualified radiologist or neurologist for clinical evaluation.")
                else:
                    st.success("✓  No tumor indicators detected in this scan.")
            else:
                st.markdown("""<div style="text-align:center;padding:3rem 1.5rem;border:1px dashed rgba(0,200,180,0.12);border-radius:16px;margin-top:1rem;background:rgba(0,200,180,0.02);">
                    <div style="font-size:2.5rem;margin-bottom:0.8rem;opacity:0.25;">🔬</div>
                    <div style="font-size:0.68rem;letter-spacing:0.18em;text-transform:uppercase;color:#1A3040;">Upload a JPG or PNG MRI image to begin</div></div>""", unsafe_allow_html=True)

        # ── TAB 2 ──────────────────────────────────────────────────────────────
        with tab2:
            st.markdown("""<div style="padding:1rem 1.4rem;border-radius:12px;background:rgba(0,200,180,0.04);border:1px solid rgba(0,200,180,0.15);margin-bottom:1.5rem;font-size:0.75rem;color:#4A7080;line-height:1.8;">
                🧬 <strong style="color:#EEF4FF;">Multi-Modal Fusion</strong> — Upload 4 MRI scans (T1, T1ce, T2, FLAIR). Fused into a 4-channel tensor for richer classification.<br>
                <span style="color:#3A5060;font-size:0.65rem;">Tip: You can upload the same image 4 times to test.</span></div>""", unsafe_allow_html=True)
            col1,col2 = st.columns(2)
            with col1:
                st.markdown('<span class="upload-label">T1 — Native anatomy</span>', unsafe_allow_html=True)
                t1   = st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed", key="t1")
                st.markdown('<span class="upload-label">T2 — Fluid / Edema</span>', unsafe_allow_html=True)
                t2   = st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed", key="t2")
            with col2:
                st.markdown('<span class="upload-label">T1ce — Contrast Enhanced</span>', unsafe_allow_html=True)
                t1ce = st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed", key="t1ce")
                st.markdown('<span class="upload-label">FLAIR — Whole Tumor</span>', unsafe_allow_html=True)
                flair= st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed", key="flair")
            channels      = [t1,t1ce,t2,flair]
            channel_names = ["T1","T1ce","T2","FLAIR"]
            all_uploaded  = all(c is not None for c in channels)
            if all_uploaded:
                st.markdown('<span class="upload-label" style="margin-top:1rem;">Uploaded scans preview</span>', unsafe_allow_html=True)
                prev_cols = st.columns(4)
                pil_imgs  = []
                for i,(ch,name) in enumerate(zip(channels,channel_names)):
                    pil_img = Image.open(ch).convert("RGB")
                    pil_imgs.append(pil_img)
                    with prev_cols[i]: st.image(pil_img, caption=name, use_container_width=True)
                gray_arrays = [np.array(p.convert("L").resize((128,128)),dtype=np.float32)/255.0 for p in pil_imgs]
                fused_4ch   = np.stack(gray_arrays, axis=-1)
                r = fused_4ch[:,:,0]*0.5+fused_4ch[:,:,1]*0.5
                g = fused_4ch[:,:,1]*0.5+fused_4ch[:,:,2]*0.5
                b = fused_4ch[:,:,2]*0.5+fused_4ch[:,:,3]*0.5
                fused_rgb   = np.stack([r,g,b], axis=-1)
                fused_input = np.expand_dims(fused_rgb, axis=0)
                st.markdown('<span class="upload-label" style="margin-top:1rem;">Fused multi-modal image</span>', unsafe_allow_html=True)
                fused_pil = Image.fromarray(np.uint8(fused_rgb*255))
                col_f1,col_f2,col_f3 = st.columns([1,4,1])
                with col_f2: st.image(fused_pil, caption="4-channel weighted fusion", use_container_width=True)
                if "model" not in st.session_state:
                    with st.spinner("Loading AI model..."): st.session_state.model = load_model()
                model = st.session_state.model
                with st.spinner("Running multi-modal fusion analysis…"): probs = predict(model, fused_input)
                predicted_idx = int(np.argmax(probs))
                predicted_cls = class_names[predicted_idx]
                accent        = class_colors[predicted_cls]
                current_scan  = {"prediction":predicted_cls,"confidence":round(float(probs[predicted_idx]),2),"mode":"Multi-Modal Fusion"}
                if st.session_state.last_scan != current_scan:
                    add_scan_record(st.session_state.username, predicted_cls, float(probs[predicted_idx]), "Multi-Modal Fusion")
                    st.session_state.last_scan = current_scan
                card_html, accent = result_card(predicted_cls, probs, predicted_idx, class_names, class_display, class_colors)
                components.html(card_html, height=300, scrolling=False)
                st.markdown("""<div style="margin-top:2rem;margin-bottom:0.8rem;"><span style="font-size:0.68rem;letter-spacing:0.25em;text-transform:uppercase;color:#3A5A70;">🔥 Fusion Grad-CAM · AI Attention Heatmap</span></div>""", unsafe_allow_html=True)
                cam_analysis = None
                with st.spinner("Generating fusion heatmap…"):
                    try:
                        keras_model    = load_keras_model()
                        cam            = compute_gradcam(keras_model, fused_input, predicted_idx)
                        overlay_img, _ = overlay_gradcam(fused_pil, cam)
                        col_a,col_b    = st.columns(2)
                        with col_a:
                            st.markdown('<p style="font-size:0.65rem;letter-spacing:0.2em;color:#3A5060;text-transform:uppercase;margin-bottom:0.4rem;">Fused MRI</p>', unsafe_allow_html=True)
                            st.image(fused_pil, use_container_width=True)
                        with col_b:
                            st.markdown('<p style="font-size:0.65rem;letter-spacing:0.2em;color:#3A5060;text-transform:uppercase;margin-bottom:0.4rem;">Fusion Grad-CAM</p>', unsafe_allow_html=True)
                            st.image(overlay_img, use_container_width=True)
                        cam_analysis = analyze_gradcam(cam, predicted_cls, float(probs[predicted_idx]))
                        show_gradcam_analysis(cam, predicted_cls, float(probs[predicted_idx]), accent, class_display)
                    except Exception as e:
                        st.info(f"Grad-CAM unavailable: {e}")
                st.markdown("""<div style="margin-top:2rem;margin-bottom:0.8rem;"><span style="font-size:0.68rem;letter-spacing:0.25em;text-transform:uppercase;color:#3A5A70;">📋 AI Radiology Report · Fusion Findings</span></div>""", unsafe_allow_html=True)
                if cam_analysis is None: cam_analysis = analyze_gradcam(np.zeros((4,4)), predicted_cls, float(probs[predicted_idx]))
                show_radiology_report(predicted_cls, float(probs[predicted_idx]), cam_analysis, accent)
                if predicted_cls != "notumor":
                    st.markdown("""<div style="margin-top:2rem;margin-bottom:0.8rem;"><span style="font-size:0.68rem;letter-spacing:0.25em;text-transform:uppercase;color:#3A5A70;">💊 Treatment Recommendations · Educational Reference</span></div>""", unsafe_allow_html=True)
                    show_treatment_guide(predicted_cls, accent)
                scan_history = get_user_scans(st.session_state.username)
                pdf_file = generate_pdf_report(predicted_cls, float(probs[predicted_idx]), "Multi-Modal Fusion", st.session_state.username, st.session_state.user_name, scan_history, cam_analysis)
                st.download_button(label="📄 Download Full Fusion Report (PDF)", data=pdf_file, file_name="NeuroScan_Fusion_Report.pdf", mime="application/pdf")
                if predicted_cls != "notumor":
                    st.warning("⚠  Anomaly detected. Please consult a qualified radiologist for clinical evaluation.")
                else:
                    st.success("✓  No tumor indicators detected across all 4 modalities.")
            else:
                missing = [n for n,c in zip(channel_names,channels) if c is None]
                if any(c is not None for c in channels): st.info(f"Still waiting for: **{', '.join(missing)}**")
                else:
                    st.markdown("""<div style="text-align:center;padding:3rem 1.5rem;border:1px dashed rgba(0,200,180,0.12);border-radius:16px;margin-top:1rem;background:rgba(0,200,180,0.02);">
                        <div style="font-size:2.5rem;margin-bottom:0.8rem;opacity:0.25;">🧬</div>
                        <div style="font-size:0.68rem;letter-spacing:0.18em;text-transform:uppercase;color:#1A3040;">Upload all 4 MRI modalities to begin fusion analysis</div></div>""", unsafe_allow_html=True)

    st.markdown('<div class="footer">NeuroScan AI · Research prototype · Not for clinical use</div>', unsafe_allow_html=True)