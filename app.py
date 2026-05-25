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

st.set_page_config(page_title="NeuroScan AI", page_icon="🧠", layout="wide")

# ══════════════════════════════════════════════════════════════════════════════
#  JSON USER DATABASE
# ══════════════════════════════════════════════════════════════════════════════
USERS_FILE = "users.json"

def load_users():
    if not os.path.exists(USERS_FILE):
        default = {
            "admin":   {"password":"brain123","role":"admin","name":"Administrator","created":datetime.now().strftime("%Y-%m-%d"),"scans":[]},
            "doctor1": {"password":"doc123",  "role":"user", "name":"Dr. Smith",    "created":datetime.now().strftime("%Y-%m-%d"),"scans":[]},
            "doctor2": {"password":"doc456",  "role":"user", "name":"Dr. Johnson",  "created":datetime.now().strftime("%Y-%m-%d"),"scans":[]}
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
        users[username]["scans"].append({
            "date":       datetime.now().strftime("%Y-%m-%d %H:%M"),
            "prediction": predicted_cls,
            "confidence": round(float(confidence), 2),
            "mode":       mode
        })
        save_users(users)

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
        "urgency_color":"#FF5757",
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
        "urgency_color":"#FFAD3B",
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
        "urgency_color":"#FFAD3B",
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
        "urgency_color":"#0CF2C8",
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
        "glioma": f"Gliomas most commonly arise in the cerebral hemispheres. {vert} {horiz} localization is consistent with supratentorial glioma distribution.",
        "meningioma": f"Meningiomas arise from the meninges and are extra-axial. {vert} {horiz} attention suggests possible dural attachment in this region.",
        "pituitary": "Pituitary adenomas are located in the sellar/suprasellar region. AI attention in the central inferior region is consistent with pituitary pathology.",
        "notumor": "No significant focal abnormality detected. Diffuse low-level attention is consistent with normal brain parenchyma."
    }
    return {
        "region": f"{vert} {horiz}", "vert": vert, "horiz": horiz,
        "activation_intensity": round(activation_intensity, 1),
        "focus_area_pct": round(focus_area_pct, 1), "high_act_pct": round(high_act_pct, 1),
        "mean_activation": round(mean_activation, 1),
        "pattern": pattern, "pattern_desc": pattern_desc,
        "act_level": act_level, "act_desc": act_desc,
        "conf_interp": conf_interp, "conf_desc": conf_desc, "conf_pct": conf_pct,
        "region_note": region_notes.get(predicted_cls, ""),
    }

# ══════════════════════════════════════════════════════════════════════════════
#  REDESIGNED SHARED CSS
# ══════════════════════════════════════════════════════════════════════════════
SHARED_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #060810;
  --surface: #0C0F1A;
  --border: rgba(255,255,255,0.06);
  --teal: #0CF2C8;
  --red: #FF5757;
  --amber: #FFAD3B;
  --indigo: #7B82F5;
  --text: #E8EDF5;
  --text-2: #8896AA;
  --text-3: #3D4E60;
  --font-sans: 'Space Grotesk', sans-serif;
  --font-serif: 'Instrument Serif', serif;
  --font-mono: 'JetBrains Mono', monospace;
}

html, body, .stApp {
  background-color: var(--bg) !important;
  color: var(--text) !important;
  font-family: var(--font-sans) !important;
}

#MainMenu, footer, header { visibility: hidden; }

.stApp::before {
  content: '';
  position: fixed; inset: 0;
  background:
    radial-gradient(ellipse 70% 55% at 5% 0%, rgba(12,242,200,0.07) 0%, transparent 60%),
    radial-gradient(ellipse 50% 60% at 95% 100%, rgba(123,130,245,0.06) 0%, transparent 60%),
    radial-gradient(ellipse 35% 35% at 50% 50%, rgba(12,242,200,0.025) 0%, transparent 65%);
  pointer-events: none; z-index: 0;
}

.stApp::after {
  content: '';
  position: fixed; inset: 0;
  background-image:
    linear-gradient(rgba(12,242,200,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(12,242,200,0.018) 1px, transparent 1px);
  background-size: 44px 44px;
  pointer-events: none; z-index: 0;
}

.element-container, .stMarkdown, .stSpinner, .stButton, .stDownloadButton {
  position: relative; z-index: 1;
}

[data-testid="stTextInput"] input {
  background: rgba(12,242,200,0.03) !important;
  border: 1px solid rgba(12,242,200,0.15) !important;
  border-radius: 8px !important;
  color: var(--text) !important;
  font-family: var(--font-mono) !important;
  font-size: 0.82rem !important;
  padding: 0.7rem 1.1rem !important;
  transition: border-color 0.2s, box-shadow 0.2s !important;
  letter-spacing: 0.01em !important;
}
[data-testid="stTextInput"] input:focus {
  border-color: var(--teal) !important;
  box-shadow: 0 0 0 3px rgba(12,242,200,0.10) !important;
  outline: none !important;
}
[data-testid="stTextInput"] label {
  color: var(--text-3) !important;
  font-family: var(--font-mono) !important;
  font-size: 0.62rem !important;
  letter-spacing: 0.22em !important;
  text-transform: uppercase !important;
  margin-bottom: 0.3rem !important;
}

[data-testid="stButton"] > button {
  background: var(--teal) !important;
  color: #020508 !important;
  font-family: var(--font-sans) !important;
  font-weight: 600 !important;
  font-size: 0.82rem !important;
  letter-spacing: 0.04em !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.7rem 2rem !important;
  width: 100% !important;
  transition: opacity 0.15s, transform 0.15s, box-shadow 0.2s !important;
  box-shadow: 0 0 24px rgba(12,242,200,0.20), 0 2px 8px rgba(0,0,0,0.4) !important;
  cursor: pointer !important;
}
[data-testid="stButton"] > button:hover {
  opacity: 0.88 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 0 36px rgba(12,242,200,0.30), 0 4px 16px rgba(0,0,0,0.5) !important;
}

[data-testid="stDownloadButton"] > button {
  background: transparent !important;
  color: var(--teal) !important;
  font-family: var(--font-mono) !important;
  font-size: 0.76rem !important;
  border: 1px solid rgba(12,242,200,0.28) !important;
  border-radius: 8px !important;
  padding: 0.6rem 1.5rem !important;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s !important;
  letter-spacing: 0.04em !important;
}
[data-testid="stDownloadButton"] > button:hover {
  background: rgba(12,242,200,0.08) !important;
  border-color: rgba(12,242,200,0.5) !important;
  box-shadow: 0 0 20px rgba(12,242,200,0.12) !important;
}

[data-testid="stAlert"] {
  border-radius: 8px !important;
  font-family: var(--font-mono) !important;
  font-size: 0.76rem !important;
  border-left-width: 3px !important;
}

[data-testid="stSidebar"] {
  background: rgba(6,8,16,0.97) !important;
  border-right: 1px solid var(--border) !important;
}
[data-testid="stSidebar"] h2 {
  font-family: var(--font-sans) !important;
  font-weight: 700 !important;
  color: var(--text) !important;
  font-size: 1rem !important;
  letter-spacing: -0.01em !important;
}
[data-testid="stSidebar"] p, [data-testid="stSidebar"] li {
  font-size: 0.77rem !important;
  color: var(--text-3) !important;
  line-height: 1.8 !important;
  font-family: var(--font-mono) !important;
}
[data-testid="stSidebar"] strong { color: var(--text-2) !important; }

[data-testid="stImage"] {
  border-radius: 10px; overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: 0 4px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(12,242,200,0.04);
  position: relative; z-index: 1;
}
[data-testid="stImage"] img { border-radius: 10px; }

[data-testid="stFileUploader"] { background: transparent !important; position: relative; z-index: 1; }
[data-testid="stFileUploader"] > div {
  background: rgba(12,242,200,0.02) !important;
  border: 1px dashed rgba(12,242,200,0.20) !important;
  border-radius: 10px !important;
  transition: background 0.2s, border-color 0.2s !important;
}
[data-testid="stFileUploader"] > div:hover {
  background: rgba(12,242,200,0.05) !important;
  border-color: rgba(12,242,200,0.45) !important;
}
[data-testid="stFileUploader"] label {
  color: var(--text-3) !important;
  font-family: var(--font-mono) !important;
  font-size: 0.76rem !important;
}
[data-testid="stFileUploader"] small { color: var(--text-3) !important; font-size: 0.66rem !important; }

.stTabs [data-baseweb="tab-list"] {
  background: var(--surface) !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  padding: 4px !important; gap: 4px !important;
}
.stTabs [data-baseweb="tab"] {
  font-family: var(--font-mono) !important;
  font-size: 0.7rem !important; letter-spacing: 0.10em !important;
  text-transform: uppercase !important; color: var(--text-3) !important;
  border-radius: 7px !important; padding: 0.5rem 1.4rem !important;
  border: none !important; transition: color 0.2s, background 0.2s !important;
}
.stTabs [aria-selected="true"] {
  background: rgba(12,242,200,0.10) !important;
  color: var(--teal) !important;
}

.footer {
  margin-top: 4rem; text-align: center;
  font-size: 0.58rem; letter-spacing: 0.22em;
  color: var(--text-3); text-transform: uppercase;
  position: relative; z-index: 1;
  font-family: var(--font-mono);
}
.sidebar-badge {
  display: inline-flex; align-items: center; gap: 0.4rem;
  background: rgba(12,242,200,0.07); color: var(--teal);
  font-size: 0.58rem; letter-spacing: 0.18em;
  padding: 0.28rem 0.75rem; border-radius: 99px;
  border: 1px solid rgba(12,242,200,0.2);
  margin-bottom: 1rem; text-transform: uppercase;
  font-family: var(--font-mono);
}
.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(12,242,200,0.12), transparent);
  margin: 2rem 0;
}
.upload-label {
  font-size: 0.62rem; letter-spacing: 0.24em;
  text-transform: uppercase; color: var(--text-3);
  margin-bottom: 0.5rem; display: block;
  position: relative; z-index: 1; font-family: var(--font-mono);
}
.header-wrap {
  text-align: center; padding: 3rem 0 2.2rem;
  position: relative; z-index: 1;
}
.header-eyebrow {
  font-size: 0.62rem; letter-spacing: 0.32em;
  color: var(--teal); text-transform: uppercase;
  margin-bottom: 1.1rem; font-family: var(--font-mono); opacity: 0.85;
}
.header-title {
  font-family: var(--font-sans);
  font-size: clamp(2.4rem,5.5vw,3.6rem);
  font-weight: 700; line-height: 1.02;
  color: var(--text); letter-spacing: -0.03em;
}
.header-title span { color: var(--teal); }
.header-title em {
  font-family: var(--font-serif);
  font-style: italic; font-weight: 300; letter-spacing: 0;
}
.header-sub {
  margin-top: 0.9rem; font-size: 0.78rem;
  color: var(--text-2); letter-spacing: 0.03em;
  font-family: var(--font-mono); opacity: 0.75;
}
.section-label {
  font-family: var(--font-mono);
  font-size: 0.6rem; letter-spacing: 0.24em;
  text-transform: uppercase; color: var(--text-3);
  margin: 2rem 0 0.75rem; display: block; position: relative; z-index: 1;
}
</style>
"""
st.markdown(SHARED_CSS, unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  LOGIN PAGE
# ══════════════════════════════════════════════════════════════════════════════
if not st.session_state.logged_in:
    st.markdown("<style>.block-container{padding:0 !important;max-width:100% !important;}</style>", unsafe_allow_html=True)

    LOGIN_HTML = """<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
    <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: transparent; font-family: 'Space Grotesk', sans-serif; color: #E8EDF5; }

    .hero {
      display: flex; flex-direction: column;
      align-items: center; padding: 3.2rem 1.5rem 1.5rem; text-align: center;
    }

    .pill {
      display: inline-flex; align-items: center; gap: 0.45rem;
      background: rgba(12,242,200,0.08); border: 1px solid rgba(12,242,200,0.22);
      color: #0CF2C8; font-family: 'JetBrains Mono', monospace;
      font-size: 0.6rem; letter-spacing: 0.26em; text-transform: uppercase;
      padding: 0.32rem 0.9rem; border-radius: 99px; margin-bottom: 2rem;
    }
    .pill-dot {
      width: 5px; height: 5px; border-radius: 50%; background: #0CF2C8;
      animation: blink 2.4s ease-in-out infinite;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

    .logo-pre {
      font-family: 'Instrument Serif', serif; font-style: italic;
      font-weight: 300; font-size: clamp(0.9rem, 2.5vw, 1.1rem);
      color: rgba(12,242,200,0.55); letter-spacing: 0.06em;
      display: block; margin-bottom: -0.15rem;
    }
    .logo-main {
      font-size: clamp(3rem, 9vw, 4.8rem); font-weight: 700;
      letter-spacing: -0.04em; line-height: 1; color: #E8EDF5;
      margin-bottom: 0.5rem;
    }
    .logo-main span { color: #0CF2C8; }

    .tagline {
      font-family: 'JetBrains Mono', monospace; font-size: 0.7rem;
      color: #2A3A4A; letter-spacing: 0.1em; margin-bottom: 2.5rem;
    }

    .stats {
      display: flex; gap: 1px; margin-bottom: 2.8rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px; overflow: hidden; width: 100%; max-width: 460px;
    }
    .stat {
      flex: 1; padding: 1rem 0.6rem; text-align: center;
      background: rgba(10,13,24,0.85); transition: background 0.2s;
    }
    .stat:hover { background: rgba(12,242,200,0.04); }
    .stat + .stat { border-left: 1px solid rgba(255,255,255,0.05); }
    .stat-val { font-size: 1.25rem; font-weight: 700; color: #0CF2C8; line-height: 1; }
    .stat-lbl {
      font-family: 'JetBrains Mono', monospace; font-size: 0.52rem;
      letter-spacing: 0.18em; color: #2A3A4A;
      text-transform: uppercase; margin-top: 0.3rem;
    }

    .card {
      width: 100%; max-width: 460px;
      background: rgba(10,13,24,0.92);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px; padding: 2.2rem 2.2rem 2rem;
      position: relative; overflow: hidden;
      backdrop-filter: blur(20px);
      box-shadow: 0 0 0 1px rgba(12,242,200,0.03), 0 28px 72px rgba(0,0,0,0.65);
    }
    .card::before {
      content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(12,242,200,0.55), transparent);
    }

    .card-eyebrow {
      font-family: 'JetBrains Mono', monospace; font-size: 0.56rem;
      letter-spacing: 0.24em; color: #2A3A4A;
      text-transform: uppercase; margin-bottom: 0.3rem;
    }
    .card-title {
      font-size: 1.1rem; font-weight: 600; color: #E8EDF5;
      letter-spacing: -0.01em; margin-bottom: 1.6rem;
    }

    .features { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.8rem; }
    .feat {
      display: flex; align-items: flex-start; gap: 0.65rem;
      padding: 0.52rem 0.8rem;
      background: rgba(255,255,255,0.018);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px; font-family: 'JetBrains Mono', monospace;
      font-size: 0.64rem; color: #3D4E60; line-height: 1.55;
      transition: border-color 0.2s, background 0.2s;
    }
    .feat:hover { background: rgba(12,242,200,0.03); border-color: rgba(12,242,200,0.12); }
    .feat-icon { font-size: 0.85rem; margin-top: 0.04rem; flex-shrink: 0; }
    .feat strong { color: #7A8A9A; font-weight: 500; }

    .sep {
      height: 1px; margin: 1.4rem 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
    }
    .signin-lbl {
      font-family: 'JetBrains Mono', monospace; font-size: 0.56rem;
      letter-spacing: 0.26em; color: #2A3A4A;
      text-transform: uppercase; margin-bottom: 1.2rem;
    }
    .disclaimer {
      margin-top: 1.8rem; font-family: 'JetBrains Mono', monospace;
      font-size: 0.56rem; color: #1A2530;
      letter-spacing: 0.06em; text-align: center; line-height: 1.75;
    }
    </style></head><body>
    <div class="hero">
      <div class="pill"><div class="pill-dot"></div>Deep Learning · MRI Analysis · XAI</div>
      <span class="logo-pre">clinical intelligence</span>
      <div class="logo-main">Neuro<span>Scan</span></div>
      <div class="tagline">Instant brain tumor classification from MRI</div>

      <div class="stats">
        <div class="stat"><div class="stat-val">4</div><div class="stat-lbl">Classes</div></div>
        <div class="stat"><div class="stat-val">3K+</div><div class="stat-lbl">Scans</div></div>
        <div class="stat"><div class="stat-val">CNN</div><div class="stat-lbl">Architecture</div></div>
        <div class="stat"><div class="stat-val">XAI</div><div class="stat-lbl">Explainability</div></div>
      </div>

      <div class="card">
        <div class="card-eyebrow">Authorized access only</div>
        <div class="card-title">Secure Sign In</div>
        <div class="features">
          <div class="feat"><span class="feat-icon">🧠</span><span>Detects <strong>Glioma, Meningioma, Pituitary</strong> &amp; No Tumor</span></div>
          <div class="feat"><span class="feat-icon">🔥</span><span><strong>Grad-CAM XAI</strong> — region analysis, intensity &amp; focus mapping</span></div>
          <div class="feat"><span class="feat-icon">📋</span><span><strong>AI Radiology Report</strong> — clinical findings &amp; interpretation</span></div>
          <div class="feat"><span class="feat-icon">💊</span><span><strong>Treatment Guide</strong> — tumor-specific treatment options</span></div>
          <div class="feat"><span class="feat-icon">🧬</span><span><strong>Multi-Modal Fusion</strong> — T1, T1ce, T2, FLAIR analysis</span></div>
          <div class="feat"><span class="feat-icon">📊</span><span><strong>Dashboard</strong> — scan history &amp; analytics</span></div>
          <div class="feat"><span class="feat-icon">📄</span><span>Professional <strong>PDF report</strong> with full clinical findings</span></div>
        </div>
        <div class="sep"></div>
        <div class="signin-lbl">Enter credentials to continue</div>
      </div>
      <div class="disclaimer">NeuroScan AI · Research prototype · Not for clinical use<br>© 2026 · For educational and research purposes only</div>
    </div>
    </body></html>"""

    components.html(LOGIN_HTML, height=850, scrolling=False)
    col_l, col_m, col_r = st.columns([1, 2, 1])
    with col_m:
        st.markdown("<style>[data-testid='stTextInput']{margin-bottom:0.4rem;}</style>", unsafe_allow_html=True)
        username = st.text_input("Username", placeholder="username")
        password = st.text_input("Password", type="password", placeholder="••••••••")
        if st.button("Sign In →"):
            users = load_users()
            u, p  = username.strip(), password.strip()
            if u in users and str(users[u]["password"]).strip() == p:
                st.session_state.logged_in = True
                st.session_state.username  = u
                st.session_state.role      = users[u]["role"]
                st.session_state.user_name = users[u]["name"]
                st.rerun()
            else:
                st.error("Invalid credentials. Please try again.")
    st.markdown('<div style="text-align:center;margin-top:1rem;font-size:0.56rem;color:#1A2530;letter-spacing:0.18em;text-transform:uppercase;font-family:monospace;">NeuroScan AI · Research Prototype · Not for Clinical Use</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN APP
# ══════════════════════════════════════════════════════════════════════════════
else:
    st.markdown("<style>.block-container{padding:2.5rem 2.2rem 4rem !important;max-width:920px !important;}</style>", unsafe_allow_html=True)

    with st.sidebar:
        role_badge = "⬡ Admin" if st.session_state.role == "admin" else "◎ Clinician"
        st.markdown(f'<span class="sidebar-badge">{role_badge} · {st.session_state.user_name}</span>', unsafe_allow_html=True)
        st.markdown("## NeuroScan AI")
        st.markdown(f"""
Welcome, **{st.session_state.user_name}**

**Capabilities**
- Single MRI + Grad-CAM XAI
- AI Radiology Report
- Treatment Recommendations
- Multi-Modal Fusion
- Scan history dashboard
- PDF report export

---
*Research use only.*
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
        if st.button("↩ Sign Out"):
            for k in ["logged_in","username","role","user_name","show_dash"]:
                st.session_state[k] = False if k == "logged_in" or k == "show_dash" else ""
            st.rerun()

    # ══════════════════════════════════════════════════════════════════════════
    #  ADMIN DASHBOARD
    # ══════════════════════════════════════════════════════════════════════════
    if st.session_state.show_dash and st.session_state.role == "admin":
        users = load_users()
        st.markdown('<div class="header-wrap"><div class="header-eyebrow">System Overview · Real-time Analytics</div><div class="header-title">Admin <span>Dashboard</span></div></div>', unsafe_allow_html=True)
        total_users  = len([u for u in users if users[u]["role"] == "user"])
        total_scans  = sum(len(users[u]["scans"]) for u in users)
        tumor_scans  = sum(1 for u in users for s in users[u]["scans"] if s["prediction"] != "notumor")
        normal_scans = total_scans - tumor_scans

        components.html(f"""<!DOCTYPE html><html><head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
        <style>
        *{{box-sizing:border-box;margin:0;padding:0;}}
        body{{background:transparent;font-family:'Space Grotesk',sans-serif;padding:0.25rem 0;}}
        .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:0.85rem;}}
        .card{{
          background:rgba(12,15,26,0.85); border:1px solid rgba(255,255,255,0.07);
          border-radius:12px; padding:1.3rem 1rem; text-align:center;
          position:relative; overflow:hidden; transition:border-color 0.2s;
        }}
        .card:hover{{border-color:rgba(255,255,255,0.14);}}
        .card::after{{
          content:''; position:absolute; bottom:0; left:0; right:0; height:2px;
          background:linear-gradient(90deg,transparent,var(--c),transparent);
        }}
        .val{{font-size:2.2rem;font-weight:700;color:var(--c);line-height:1;}}
        .lbl{{font-family:'JetBrains Mono',monospace;font-size:0.54rem;letter-spacing:0.18em;text-transform:uppercase;color:#3D4E60;margin-top:0.35rem;}}
        </style></head><body>
        <div class="grid">
          <div class="card" style="--c:#0CF2C8"><div class="val">{total_users}</div><div class="lbl">Active Users</div></div>
          <div class="card" style="--c:#7B82F5"><div class="val">{total_scans}</div><div class="lbl">Total Scans</div></div>
          <div class="card" style="--c:#FF5757"><div class="val">{tumor_scans}</div><div class="lbl">Tumor Detected</div></div>
          <div class="card" style="--c:#0CF2C8"><div class="val">{normal_scans}</div><div class="lbl">Normal Scans</div></div>
        </div></body></html>""", height=115)

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        with st.expander("＋ Add New User"):
            c1,c2,c3,c4 = st.columns(4)
            with c1: new_user = st.text_input("Username", key="nu")
            with c2: new_pass = st.text_input("Password", type="password", key="np")
            with c3: new_name = st.text_input("Full Name", key="nn")
            with c4: new_role = st.selectbox("Role", ["user","admin"], key="nr")
            if st.button("Add User"):
                if new_user and new_pass and new_name:
                    users = load_users()
                    if new_user.strip() in users:
                        st.error("Username already exists!")
                    else:
                        users[new_user.strip()] = {"password":str(new_pass).strip(),"role":new_role,"name":str(new_name).strip(),"created":datetime.now().strftime("%Y-%m-%d"),"scans":[]}
                        save_users(users)
                        st.success(f"✓ User '{new_user}' added.")
                        st.rerun()
                else:
                    st.warning("Please fill all fields.")

        st.markdown('<span class="upload-label" style="margin-top:1rem;">All Users</span>', unsafe_allow_html=True)
        users = load_users()
        for uname, udata in users.items():
            rc = "#FFAD3B" if udata["role"]=="admin" else "#0CF2C8"
            sc = len(udata["scans"])
            ls = udata["scans"][-1]["date"] if udata["scans"] else "—"
            st.markdown(f"""<div style="display:flex;align-items:center;gap:1rem;padding:0.85rem 1.2rem;
              border-radius:10px;background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.05);
              margin-bottom:0.5rem;">
              <div style="font-family:'Space Grotesk',sans-serif;font-size:0.88rem;font-weight:600;color:#E8EDF5;min-width:145px;">{udata['name']}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:#2A3A4A;min-width:100px;">@{uname}</div>
              <span style="background:{rc}18;color:{rc};font-family:'JetBrains Mono',monospace;font-size:0.55rem;
                letter-spacing:0.14em;padding:0.18rem 0.6rem;border-radius:99px;border:1px solid {rc}44;text-transform:uppercase;">{udata['role']}</span>
              <div style="font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:#2A3A4A;margin-left:auto;">
                {sc} scans &nbsp;·&nbsp; last: {ls}</div>
            </div>""", unsafe_allow_html=True)

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        st.markdown('<span class="upload-label">Recent Scan Records</span>', unsafe_allow_html=True)
        all_records = sorted([{**s,"user":users[u]["name"],"username":u} for u in users for s in users[u]["scans"]], key=lambda x:x["date"], reverse=True)
        cls_colors = {'glioma':'#FF5757','meningioma':'#FFAD3B','notumor':'#0CF2C8','pituitary':'#7B82F5'}
        if all_records:
            for rec in all_records[:50]:
                c = cls_colors.get(rec["prediction"],"#888")
                st.markdown(f"""<div style="display:flex;align-items:center;gap:1rem;padding:0.65rem 1rem;
                  border-radius:8px;background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.04);
                  margin-bottom:0.32rem;font-family:'JetBrains Mono',monospace;font-size:0.67rem;">
                  <div style="color:#2A3A4A;min-width:135px;">{rec['date']}</div>
                  <div style="color:#E8EDF5;min-width:130px;font-family:'Space Grotesk',sans-serif;font-weight:500;">{rec['user']}</div>
                  <span style="background:{c}18;color:{c};padding:0.14rem 0.55rem;border-radius:99px;
                    font-size:0.57rem;border:1px solid {c}44;text-transform:uppercase;">{rec['prediction']}</span>
                  <div style="color:#2A3A4A;">{int(rec['confidence']*100)}%</div>
                  <div style="color:#2A3A4A;margin-left:auto;">{rec['mode']}</div>
                </div>""", unsafe_allow_html=True)
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
        users    = load_users()
        udata    = users[st.session_state.username]
        my_scans = udata["scans"]
        st.markdown(f'<div class="header-wrap"><div class="header-eyebrow">Personal Analytics · Scan History</div><div class="header-title">My <span>Dashboard</span></div><div class="header-sub">Welcome back, {st.session_state.user_name}</div></div>', unsafe_allow_html=True)
        total   = len(my_scans)
        tumors  = sum(1 for s in my_scans if s["prediction"]!="notumor")
        normals = total - tumors
        avg_c   = round(sum(s["confidence"] for s in my_scans)/total*100,1) if total else 0

        components.html(f"""<!DOCTYPE html><html><head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
        <style>
        *{{box-sizing:border-box;margin:0;padding:0;}}
        body{{background:transparent;font-family:'Space Grotesk',sans-serif;padding:0.25rem 0;}}
        .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:0.85rem;}}
        .card{{background:rgba(12,15,26,0.85);border:1px solid rgba(255,255,255,0.07);
          border-radius:12px;padding:1.3rem 1rem;text-align:center;position:relative;overflow:hidden;}}
        .card::after{{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;
          background:linear-gradient(90deg,transparent,var(--c),transparent);}}
        .val{{font-size:2.2rem;font-weight:700;color:var(--c);line-height:1;}}
        .lbl{{font-family:'JetBrains Mono',monospace;font-size:0.54rem;letter-spacing:0.18em;text-transform:uppercase;color:#3D4E60;margin-top:0.35rem;}}
        </style></head><body>
        <div class="grid">
          <div class="card" style="--c:#7B82F5"><div class="val">{total}</div><div class="lbl">Total Scans</div></div>
          <div class="card" style="--c:#FF5757"><div class="val">{tumors}</div><div class="lbl">Tumor Detected</div></div>
          <div class="card" style="--c:#0CF2C8"><div class="val">{normals}</div><div class="lbl">Normal Scans</div></div>
          <div class="card" style="--c:#FFAD3B"><div class="val">{avg_c}%</div><div class="lbl">Avg Confidence</div></div>
        </div></body></html>""", height=115)

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        st.markdown('<span class="upload-label">Scan Records</span>', unsafe_allow_html=True)
        cls_colors = {'glioma':'#FF5757','meningioma':'#FFAD3B','notumor':'#0CF2C8','pituitary':'#7B82F5'}
        if my_scans:
            for rec in reversed(my_scans):
                c = cls_colors.get(rec["prediction"],"#888")
                st.markdown(f"""<div style="display:flex;align-items:center;gap:1rem;padding:0.65rem 1rem;
                  border-radius:8px;background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.04);
                  margin-bottom:0.32rem;font-family:'JetBrains Mono',monospace;font-size:0.67rem;">
                  <div style="color:#2A3A4A;min-width:135px;">{rec['date']}</div>
                  <span style="background:{c}18;color:{c};padding:0.14rem 0.55rem;border-radius:99px;
                    font-size:0.57rem;border:1px solid {c}44;text-transform:uppercase;">{rec['prediction']}</span>
                  <div style="color:#2A3A4A;">{int(rec['confidence']*100)}% confidence</div>
                  <div style="color:#2A3A4A;margin-left:auto;">{rec['mode']}</div>
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
        st.markdown("""<div class="header-wrap">
          <div class="header-eyebrow">Deep Learning · MRI Analysis · Grad-CAM XAI</div>
          <div class="header-title">Neuro<em>Scan</em> <span>AI</span></div>
          <div class="header-sub">Classification · Radiology Report · Treatment Guide · Multi-Modal Fusion</div>
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
            base = tf.keras.applications.MobileNetV2(weights='imagenet', include_top=False, input_shape=(128,128,3))
            base.trainable = False
            return tf.keras.Model(inputs=base.input, outputs=base.get_layer('out_relu').output)

        def compute_gradcam(feat_model, img_array):
            features = feat_model(img_array, training=False)
            cam = np.mean(features[0].numpy(), axis=-1)
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
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
            <style>
            *{{box-sizing:border-box;margin:0;padding:0;}}
            body{{background:transparent;font-family:'Space Grotesk',sans-serif;color:#E8EDF5;padding:0.2rem 0;}}
            .box{{border:1px solid rgba(255,255,255,0.07);border-radius:14px;background:rgba(11,14,24,0.75);
              padding:1.6rem 1.8rem;position:relative;overflow:hidden;}}
            .box::before{{content:'';position:absolute;top:0;left:15%;right:15%;height:1px;
              background:linear-gradient(90deg,transparent,{accent}88,transparent);}}
            .title{{font-size:0.86rem;font-weight:600;color:#E8EDF5;margin-bottom:1.3rem;letter-spacing:-0.01em;}}
            .title span{{color:{accent};}}
            .metrics{{display:grid;grid-template-columns:repeat(4,1fr);gap:0.65rem;margin-bottom:1.25rem;}}
            .metric{{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.055);
              border-radius:9px;padding:0.8rem 0.55rem;text-align:center;}}
            .m-val{{font-size:1rem;font-weight:600;color:{accent};line-height:1.15;}}
            .m-lbl{{font-family:'JetBrains Mono',monospace;font-size:0.5rem;letter-spacing:0.15em;
              text-transform:uppercase;color:#2A3A4A;margin-top:0.25rem;}}
            .sep{{height:1px;background:rgba(255,255,255,0.05);margin:1rem 0;}}
            .conf-row{{display:flex;align-items:center;gap:0.8rem;margin-bottom:0.9rem;}}
            .conf-badge{{font-family:'JetBrains Mono',monospace;font-size:0.57rem;letter-spacing:0.12em;
              text-transform:uppercase;background:{accent}18;color:{accent};
              border:1px solid {accent}44;padding:0.2rem 0.65rem;border-radius:99px;white-space:nowrap;}}
            .track{{flex:1;height:3px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;}}
            .fill{{height:100%;border-radius:99px;background:linear-gradient(90deg,{accent}55,{accent});
              width:0%;transition:width 1.2s cubic-bezier(.4,0,.2,1);}}
            .rows{{display:flex;flex-direction:column;gap:0.5rem;}}
            .row{{display:flex;gap:0.7rem;align-items:flex-start;font-family:'JetBrains Mono',monospace;
              font-size:0.65rem;color:#3D4E60;line-height:1.7;}}
            .dot{{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:5px;}}
            </style></head><body>
            <div class="box">
              <div class="title">🔥 Grad-CAM <span>XAI Analysis</span></div>
              <div class="metrics">
                <div class="metric"><div class="m-val">{a['activation_intensity']}%</div><div class="m-lbl">Intensity</div></div>
                <div class="metric"><div class="m-val">{a['region']}</div><div class="m-lbl">Focus Region</div></div>
                <div class="metric"><div class="m-val">{a['focus_area_pct']}%</div><div class="m-lbl">Coverage</div></div>
                <div class="metric"><div class="m-val">{a['pattern']}</div><div class="m-lbl">Pattern</div></div>
              </div>
              <div class="conf-row">
                <span class="conf-badge">{a['conf_interp']} · {a['conf_pct']}%</span>
                <div class="track"><div class="fill" id="cbar"></div></div>
              </div>
              <div class="sep"></div>
              <div class="rows">
                <div class="row"><div class="dot" style="background:#FF4444;"></div><div><strong style="color:#C8D6E5;">Red/Yellow — Primary AI attention.</strong> {a['act_desc']}</div></div>
                <div class="row"><div class="dot" style="background:#4488FF;"></div><div><strong style="color:#C8D6E5;">Blue/Green — Low attention zones.</strong> Normal tissue with no significant pathological features.</div></div>
                <div class="row"><div class="dot" style="background:{accent};"></div><div><strong style="color:#C8D6E5;">Pattern: {a['pattern']}.</strong> {a['pattern_desc']}</div></div>
                <div class="row"><div class="dot" style="background:#FFAD3B;"></div><div><strong style="color:#C8D6E5;">Region:</strong> {a['region_note']}</div></div>
                <div class="row"><div class="dot" style="background:#7B82F5;"></div><div><strong style="color:#C8D6E5;">Confidence:</strong> {a['conf_desc']}</div></div>
              </div>
            </div>
            <script>requestAnimationFrame(()=>{{setTimeout(()=>{{document.getElementById('cbar').style.width='{a["conf_pct"]}%';}},80);}});</script>
            </body></html>""", height=400, scrolling=False)

        def show_radiology_report(predicted_cls, confidence, cam_analysis, accent):
            info = TUMOR_DB[predicted_cls]
            a    = cam_analysis
            uc   = info["urgency_color"]
            components.html(f"""<!DOCTYPE html><html><head>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
            <style>
            *{{box-sizing:border-box;margin:0;padding:0;}}
            body{{background:transparent;font-family:'Space Grotesk',sans-serif;color:#E8EDF5;padding:0.2rem 0;}}
            .box{{border:1px solid rgba(255,255,255,0.07);border-radius:14px;background:rgba(11,14,24,0.75);
              padding:1.6rem 1.8rem;position:relative;overflow:hidden;}}
            .box::before{{content:'';position:absolute;top:0;left:15%;right:15%;height:1px;
              background:linear-gradient(90deg,transparent,{accent}88,transparent);}}
            .title{{font-size:0.86rem;font-weight:600;color:#E8EDF5;margin-bottom:0.55rem;letter-spacing:-0.01em;}}
            .title span{{color:{accent};}}
            .diagnosis{{font-family:'Instrument Serif',serif;font-style:italic;font-size:2.1rem;
              font-weight:300;color:{accent};line-height:1;margin-bottom:0.5rem;}}
            .urgency{{display:inline-flex;align-items:center;background:{uc}18;color:{uc};
              font-family:'JetBrains Mono',monospace;font-size:0.58rem;letter-spacing:0.13em;
              padding:0.24rem 0.7rem;border-radius:99px;border:1px solid {uc}44;
              text-transform:uppercase;margin-bottom:1.1rem;}}
            .sep{{height:1px;background:rgba(255,255,255,0.05);margin:0.9rem 0;}}
            .sec-lbl{{font-family:'JetBrains Mono',monospace;font-size:0.54rem;letter-spacing:0.22em;
              text-transform:uppercase;color:{accent};opacity:0.75;margin-bottom:0.32rem;}}
            .sec-val{{font-size:0.74rem;color:#7A8A9A;line-height:1.85;}}
            .grid2{{display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;margin:0.8rem 0;}}
            .info-box{{background:rgba(255,255,255,0.022);border:1px solid rgba(255,255,255,0.055);
              border-radius:9px;padding:0.8rem 1rem;}}
            .info-val{{font-size:0.95rem;font-weight:600;color:{accent};}}
            .info-lbl{{font-family:'JetBrains Mono',monospace;font-size:0.52rem;letter-spacing:0.12em;
              text-transform:uppercase;color:#2A3A4A;margin-top:0.2rem;}}
            .disc{{font-family:'JetBrains Mono',monospace;font-size:0.56rem;color:#1E2D3A;line-height:1.7;
              margin-top:0.85rem;padding:0.65rem 0.9rem;background:rgba(255,255,255,0.012);
              border-radius:8px;border:1px solid rgba(255,255,255,0.04);}}
            </style></head><body>
            <div class="box">
              <div class="title">📋 AI <span>Radiology Report</span></div>
              <div class="diagnosis">{info['full_name']}</div>
              <div class="urgency">{info['urgency']}</div>
              <div class="sec-lbl">Clinical Description</div>
              <div class="sec-val">{info['description']}</div>
              <div class="sep"></div>
              <div class="sec-lbl">Imaging Characteristics</div>
              <div class="sec-val">{info['characteristics']}</div>
              <div class="sep"></div>
              <div class="grid2">
                <div class="info-box"><div class="info-val">{a['conf_pct']}%</div><div class="info-lbl">Model Confidence</div></div>
                <div class="info-box"><div class="info-val">{a['act_level']}</div><div class="info-lbl">Activation Level</div></div>
                <div class="info-box"><div class="info-val">{a['region']}</div><div class="info-lbl">Focus Region</div></div>
                <div class="info-box"><div class="info-val">{a['pattern']}</div><div class="info-lbl">Attention Pattern</div></div>
              </div>
              <div class="sep"></div>
              <div class="sec-lbl">Clinical Note</div>
              <div class="sec-val">{info['clinical_note']}</div>
              <div class="sep"></div>
              <div class="sec-lbl">Recommended Follow-up</div>
              <div class="sec-val">{info['followup']}</div>
              <div class="sep"></div>
              <div class="sec-lbl">Prognosis</div>
              <div class="sec-val">{info['prognosis']}</div>
              <div class="disc">⚠ AI-generated report for research/educational purposes only. Not a clinical diagnosis. Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
            </div>
            </body></html>""", height=680, scrolling=False)

        def show_treatment_guide(predicted_cls, accent):
            info = TUMOR_DB[predicted_cls]
            if not info["treatments"]: return
            treat_colors = ["#FF5757","#FFAD3B","#7B82F5","#0CF2C8","#FF8FAB"]
            treatments_html = ""
            for i, (title, desc) in enumerate(info["treatments"]):
                tc = treat_colors[i % len(treat_colors)]
                emoji = title.split()[0]
                label = ' '.join(title.split()[1:])
                treatments_html += f"""<div style="display:flex;gap:0.9rem;align-items:flex-start;padding:0.85rem 0.95rem;
                  border-radius:9px;background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.05);
                  margin-bottom:0.5rem;">
                  <div style="width:30px;height:30px;border-radius:8px;background:{tc}18;border:1px solid {tc}44;
                    display:flex;align-items:center;justify-content:center;font-size:0.85rem;flex-shrink:0;">{emoji}</div>
                  <div>
                    <div style="font-family:'Space Grotesk',sans-serif;font-size:0.81rem;font-weight:600;
                      color:#E8EDF5;margin-bottom:0.2rem;">{label}</div>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:0.64rem;color:#3D4E60;line-height:1.75;">{desc}</div>
                  </div>
                </div>"""

            components.html(f"""<!DOCTYPE html><html><head>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
            <style>
            *{{box-sizing:border-box;margin:0;padding:0;}}
            body{{background:transparent;font-family:'Space Grotesk',sans-serif;color:#E8EDF5;padding:0.2rem 0;}}
            .box{{border:1px solid rgba(255,255,255,0.07);border-radius:14px;background:rgba(11,14,24,0.75);
              padding:1.6rem 1.8rem;position:relative;overflow:hidden;}}
            .box::before{{content:'';position:absolute;top:0;left:15%;right:15%;height:1px;
              background:linear-gradient(90deg,transparent,{accent}88,transparent);}}
            .title{{font-size:0.86rem;font-weight:600;color:#E8EDF5;margin-bottom:0.3rem;letter-spacing:-0.01em;}}
            .title span{{color:{accent};}}
            .sub{{font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:#2A3A4A;margin-bottom:1.2rem;}}
            .disc{{font-family:'JetBrains Mono',monospace;font-size:0.56rem;color:#1E2D3A;line-height:1.7;
              margin-top:0.85rem;padding:0.65rem 0.9rem;background:rgba(255,255,255,0.012);
              border-radius:8px;border:1px solid rgba(255,255,255,0.04);}}
            </style></head><body>
            <div class="box">
              <div class="title">💊 Treatment <span>Recommendations</span></div>
              <div class="sub">Standard approaches for {info['full_name']} — educational reference only</div>
              {treatments_html}
              <div class="disc">⚠ Treatment decisions must be made by qualified medical professionals. Educational purposes only.</div>
            </div>
            </body></html>""", height=len(info["treatments"]) * 108 + 175, scrolling=False)

        def result_chips(probs, predicted_idx, class_names, class_display, class_colors):
            chips_html = ""
            for i, cls in enumerate(class_names):
                active = i == predicted_idx
                p = int(probs[i]*100)
                hx = class_colors[cls][1:]
                r,g,b = int(hx[0:2],16),int(hx[2:4],16),int(hx[4:6],16)
                bg     = f"rgba({r},{g},{b},0.10)" if active else "rgba(255,255,255,0.02)"
                border = f"rgba({r},{g},{b},0.32)" if active else "rgba(255,255,255,0.05)"
                cc     = class_colors[cls] if active else "#2A3A4A"
                pc     = class_colors[cls] if active else "#7A8A9A"
                fw     = "600" if active else "400"
                chips_html += f"""<div style="background:{bg};border:1px solid {border};border-radius:9px;
                  padding:0.8rem 0.4rem;text-align:center;font-family:'JetBrains Mono',monospace;
                  font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:{cc};">
                  {class_display[cls]}
                  <div style="font-family:'Space Grotesk',sans-serif;font-size:1.1rem;
                    font-weight:{fw};color:{pc};margin-top:0.28rem;">{p}%</div>
                </div>"""
            return chips_html

        def result_card(predicted_cls, probs, predicted_idx, class_names, class_display, class_colors):
            accent = class_colors[predicted_cls]
            pct    = int(probs[predicted_idx]*100)
            chips  = result_chips(probs, predicted_idx, class_names, class_display, class_colors)
            html   = f"""<!DOCTYPE html><html><head>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
            <style>
            *{{box-sizing:border-box;margin:0;padding:0;}}
            body{{background:transparent;font-family:'Space Grotesk',sans-serif;color:#E8EDF5;}}
            .card{{border:1px solid rgba(255,255,255,0.08);border-radius:14px;
              background:rgba(11,14,24,0.8);padding:1.8rem 2rem;position:relative;overflow:hidden;
              box-shadow:0 0 60px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05);}}
            .card::before{{content:'';position:absolute;top:0;left:15%;right:15%;height:1px;
              background:linear-gradient(90deg,transparent,{accent}aa,transparent);}}
            .tag{{font-family:'JetBrains Mono',monospace;font-size:0.57rem;letter-spacing:0.26em;
              text-transform:uppercase;color:{accent};opacity:0.7;margin-bottom:0.42rem;}}
            .label{{font-family:'Instrument Serif',serif;font-style:italic;
              font-size:2.6rem;font-weight:300;color:{accent};
              letter-spacing:-0.01em;line-height:1;}}
            .conf-row{{display:flex;align-items:center;gap:1rem;margin-top:1.3rem;}}
            .conf-lbl{{font-family:'JetBrains Mono',monospace;font-size:0.58rem;
              color:#2A3A4A;letter-spacing:0.12em;text-transform:uppercase;min-width:78px;}}
            .track{{flex:1;height:3px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;}}
            .fill{{height:100%;border-radius:99px;background:linear-gradient(90deg,{accent}55,{accent});
              width:0%;transition:width 1.2s cubic-bezier(.4,0,.2,1);}}
            .conf-val{{font-family:'Space Grotesk',sans-serif;font-size:0.95rem;
              font-weight:600;color:{accent};min-width:40px;text-align:right;}}
            .sep{{height:1px;background:rgba(255,255,255,0.05);margin:1.3rem 0 0;}}
            .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:0.55rem;margin-top:1.2rem;}}
            </style></head><body>
            <div class="card">
              <div class="tag">Classification Result</div>
              <div class="label">{class_display[predicted_cls]}</div>
              <div class="conf-row">
                <span class="conf-lbl">Confidence</span>
                <div class="track"><div class="fill" id="rbar"></div></div>
                <span class="conf-val">{pct}%</span>
              </div>
              <div class="sep"></div>
              <div class="grid">{chips}</div>
            </div>
            <script>requestAnimationFrame(()=>{{setTimeout(()=>{{document.getElementById('rbar').style.width='{pct}%';}},80);}});</script>
            </body></html>"""
            return html, accent

        def generate_pdf_report(predicted_cls, confidence, mode, username, user_name, scan_history, cam_analysis=None):
            buffer = BytesIO()
            doc    = SimpleDocTemplate(buffer, pagesize=letter, topMargin=40, bottomMargin=40, leftMargin=50, rightMargin=50)
            styles = getSampleStyleSheet()
            teal   = colors.HexColor('#0CF2C8')
            elems  = []
            title_s   = ParagraphStyle('t',  parent=styles['Title'],  textColor=teal, fontSize=22, spaceAfter=4)
            sub_s     = ParagraphStyle('s',  parent=styles['Normal'], textColor=colors.HexColor('#5A7090'), fontSize=9)
            body_s    = ParagraphStyle('b',  parent=styles['Normal'], textColor=colors.HexColor('#2A3A4A'), fontSize=10, leading=16)
            label_s   = ParagraphStyle('l',  parent=styles['Normal'], textColor=teal, fontSize=8, fontName='Helvetica-Bold', spaceAfter=2)
            section_s = ParagraphStyle('sec',parent=styles['Normal'], textColor=colors.HexColor('#007A6E'), fontSize=11, fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=4)
            elems += [Paragraph("NeuroScan AI", title_s), Paragraph("MRI Brain Tumor Analysis Report", sub_s), Spacer(1,16)]
            info_t = Table([
                ["Patient / User", user_name],["Username", f"@{username}"],
                ["Analysis Mode", mode],["Generated On", datetime.now().strftime("%Y-%m-%d %H:%M:%S")]
            ], colWidths=[140,340])
            info_t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(0,-1),colors.HexColor('#EEF9F7')),
                ('TEXTCOLOR',(0,0),(0,-1),colors.HexColor('#007A6E')),
                ('TEXTCOLOR',(1,0),(1,-1),colors.HexColor('#2A3A4A')),
                ('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),
                ('FONTSIZE',(0,0),(-1,-1),9),
                ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F7FDFC'),colors.white]),
                ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#D0EDE9')),
                ('PADDING',(0,0),(-1,-1),8),
            ]))
            elems += [info_t, Spacer(1,20)]
            cls_map = {'glioma':'Glioma','meningioma':'Meningioma','notumor':'No Tumor','pituitary':'Pituitary'}
            cls_hex = {'glioma':'#FF5757','meningioma':'#FFAD3B','notumor':'#0CF2C8','pituitary':'#7B82F5'}
            res_s = ParagraphStyle('r', parent=styles['Normal'], textColor=colors.HexColor(cls_hex.get(predicted_cls,'#0CF2C8')), fontSize=18, fontName='Helvetica-Bold', spaceAfter=4)
            elems += [
                Paragraph("Prediction Result", label_s),
                Paragraph(cls_map.get(predicted_cls, predicted_cls), res_s),
                Paragraph(f"Confidence Score: <b>{int(confidence*100)}%</b>", body_s),
                Spacer(1,12)
            ]
            info = TUMOR_DB[predicted_cls]
            elems += [
                Paragraph("AI Radiology Report", section_s),
                Paragraph(f"<b>Diagnosis:</b> {info['full_name']}", body_s),
                Paragraph(f"<b>Urgency:</b> {info['urgency']}", body_s), Spacer(1,6),
                Paragraph(f"<b>Description:</b> {info['description']}", body_s), Spacer(1,6),
                Paragraph(f"<b>Imaging Characteristics:</b> {info['characteristics']}", body_s), Spacer(1,6),
                Paragraph(f"<b>Clinical Note:</b> {info['clinical_note']}", body_s), Spacer(1,6),
                Paragraph(f"<b>Recommended Follow-up:</b> {info['followup']}", body_s), Spacer(1,6),
                Paragraph(f"<b>Prognosis:</b> {info['prognosis']}", body_s), Spacer(1,10),
            ]
            if cam_analysis:
                a = cam_analysis
                elems += [
                    Paragraph("Grad-CAM XAI Analysis", section_s),
                    Paragraph(f"<b>Activation Intensity:</b> {a['activation_intensity']}%", body_s),
                    Paragraph(f"<b>Primary Focus Region:</b> {a['region']}", body_s),
                    Paragraph(f"<b>Heatmap Coverage:</b> {a['focus_area_pct']}%", body_s),
                    Paragraph(f"<b>Attention Pattern:</b> {a['pattern']} — {a['pattern_desc']}", body_s),
                    Paragraph(f"<b>Model Confidence:</b> {a['conf_interp']} ({a['conf_pct']}%) — {a['conf_desc']}", body_s),
                    Spacer(1,10),
                ]
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
                hd = [["Date","Prediction","Confidence","Mode"]] + [
                    [s["date"],cls_map.get(s["prediction"],s["prediction"]),f"{int(s['confidence']*100)}%",s["mode"]]
                    for s in reversed(scan_history[-10:])
                ]
                ht = Table(hd, colWidths=[130,130,90,130])
                ht.setStyle(TableStyle([
                    ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#0CF2C8')),
                    ('TEXTCOLOR',(0,0),(-1,0),colors.white),
                    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
                    ('FONTSIZE',(0,0),(-1,-1),8),
                    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F7FDFC'),colors.white]),
                    ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#D0EDE9')),
                    ('PADDING',(0,0),(-1,-1),7),
                ]))
                elems.append(ht)
            doc.build(elems)
            buffer.seek(0)
            return buffer

        class_names   = ['glioma','meningioma','notumor','pituitary']
        class_display = {'glioma':'Glioma','meningioma':'Meningioma','notumor':'No Tumor','pituitary':'Pituitary'}
        class_colors  = {'glioma':'#FF5757','meningioma':'#FFAD3B','notumor':'#0CF2C8','pituitary':'#7B82F5'}

        tab1, tab2 = st.tabs(["🧠  Single MRI · Grad-CAM", "🧬  Multi-Modal Fusion"])

        # ── TAB 1 ────────────────────────────────────────────────────────────
        with tab1:
            st.markdown('<span class="upload-label">Upload MRI scan</span>', unsafe_allow_html=True)
            uploaded_file = st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed", key="tab1_upload")

            if uploaded_file is not None:
                if "model" not in st.session_state:
                    with st.spinner("Loading AI model..."):
                        st.session_state.model = load_model()
                model = st.session_state.model

                img = Image.open(uploaded_file).convert("RGB")
                col1,col2,col3 = st.columns([1,8,1])
                with col2:
                    st.image(img, caption="", use_container_width=True)

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
                components.html(card_html, height=290, scrolling=False)

                st.markdown('<span class="section-label">🔥 Grad-CAM · AI Attention Heatmap</span>', unsafe_allow_html=True)
                cam_analysis = None
                with st.spinner("Generating heatmap…"):
                    try:
                        feat_model     = load_keras_model()
                        cam            = compute_gradcam(feat_model, img_array)
                        overlay_img, _ = overlay_gradcam(img, cam)
                        col_a, col_b   = st.columns(2)
                        with col_a:
                            st.markdown('<p style="font-family:\'JetBrains Mono\',monospace;font-size:0.58rem;letter-spacing:0.2em;color:#2A3A4A;text-transform:uppercase;margin-bottom:0.4rem;">Original MRI</p>', unsafe_allow_html=True)
                            st.image(img, use_container_width=True)
                        with col_b:
                            st.markdown('<p style="font-family:\'JetBrains Mono\',monospace;font-size:0.58rem;letter-spacing:0.2em;color:#2A3A4A;text-transform:uppercase;margin-bottom:0.4rem;">Grad-CAM Overlay</p>', unsafe_allow_html=True)
                            st.image(overlay_img, use_container_width=True)
                        cam_analysis = analyze_gradcam(cam, predicted_cls, float(probs[predicted_idx]))
                        show_gradcam_analysis(cam, predicted_cls, float(probs[predicted_idx]), accent, class_display)
                    except Exception as e:
                        st.info(f"Grad-CAM unavailable: {e}")

                st.markdown('<span class="section-label">📋 AI Radiology Report · Clinical Findings</span>', unsafe_allow_html=True)
                if cam_analysis is None:
                    cam_analysis = analyze_gradcam(np.zeros((4,4)), predicted_cls, float(probs[predicted_idx]))
                show_radiology_report(predicted_cls, float(probs[predicted_idx]), cam_analysis, accent)

                if predicted_cls != "notumor":
                    st.markdown('<span class="section-label">💊 Treatment Recommendations · Educational Reference</span>', unsafe_allow_html=True)
                    show_treatment_guide(predicted_cls, accent)

                users    = load_users()
                pdf_file = generate_pdf_report(
                    predicted_cls, float(probs[predicted_idx]), "Single MRI",
                    st.session_state.username, st.session_state.user_name,
                    users[st.session_state.username]["scans"], cam_analysis
                )
                st.download_button(label="📄 Download Full Clinical Report (PDF)", data=pdf_file,
                                   file_name="NeuroScan_Report.pdf", mime="application/pdf")

                if predicted_cls != "notumor":
                    st.warning("⚠  Anomaly detected. Please consult a qualified radiologist or neurologist for clinical evaluation.")
                else:
                    st.success("✓  No tumor indicators detected in this scan.")

            else:
                st.markdown("""<div style="text-align:center;padding:3.5rem 1.5rem;
                  border:1px dashed rgba(12,242,200,0.10);border-radius:14px;
                  margin-top:1rem;background:rgba(12,242,200,0.012);">
                  <div style="font-size:2rem;margin-bottom:0.8rem;opacity:0.15;">🔬</div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:0.62rem;
                    letter-spacing:0.18em;text-transform:uppercase;color:#1A2530;">
                    Upload a JPG or PNG MRI image to begin</div>
                </div>""", unsafe_allow_html=True)

        # ── TAB 2 ────────────────────────────────────────────────────────────
        with tab2:
            st.markdown("""<div style="padding:1rem 1.3rem;border-radius:10px;
              background:rgba(12,242,200,0.03);border:1px solid rgba(12,242,200,0.12);
              margin-bottom:1.5rem;">
              <span style="font-family:'Space Grotesk',sans-serif;font-size:0.82rem;font-weight:600;color:#E8EDF5;">🧬 Multi-Modal Fusion</span>
              <span style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:#3D4E60;">
                — Upload 4 MRI scans (T1, T1ce, T2, FLAIR). Fused into a 4-channel tensor for richer classification.</span><br>
              <span style="font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:#1E2D3A;margin-top:0.3rem;display:block;">
                Tip: You can upload the same image 4× to test the pipeline.</span>
            </div>""", unsafe_allow_html=True)

            col1, col2 = st.columns(2)
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
                    with prev_cols[i]:
                        st.image(pil_img, caption=name, use_container_width=True)

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

                current_scan = {"prediction":predicted_cls,"confidence":round(float(probs[predicted_idx]),2),"mode":"Multi-Modal Fusion"}
                if st.session_state.last_scan != current_scan:
                    add_scan_record(st.session_state.username, predicted_cls, float(probs[predicted_idx]), "Multi-Modal Fusion")
                    st.session_state.last_scan = current_scan

                card_html, accent = result_card(predicted_cls, probs, predicted_idx, class_names, class_display, class_colors)
                components.html(card_html, height=290, scrolling=False)

                st.markdown('<span class="section-label">🔥 Fusion Grad-CAM · AI Attention Heatmap</span>', unsafe_allow_html=True)
                cam_analysis = None
                with st.spinner("Generating fusion heatmap…"):
                    try:
                        feat_model     = load_keras_model()
                        cam            = compute_gradcam(feat_model, fused_input)
                        overlay_img, _ = overlay_gradcam(fused_pil, cam)
                        col_a,col_b    = st.columns(2)
                        with col_a:
                            st.markdown('<p style="font-family:\'JetBrains Mono\',monospace;font-size:0.58rem;letter-spacing:0.2em;color:#2A3A4A;text-transform:uppercase;margin-bottom:0.4rem;">Fused MRI</p>', unsafe_allow_html=True)
                            st.image(fused_pil, use_container_width=True)
                        with col_b:
                            st.markdown('<p style="font-family:\'JetBrains Mono\',monospace;font-size:0.58rem;letter-spacing:0.2em;color:#2A3A4A;text-transform:uppercase;margin-bottom:0.4rem;">Fusion Grad-CAM</p>', unsafe_allow_html=True)
                            st.image(overlay_img, use_container_width=True)
                        cam_analysis = analyze_gradcam(cam, predicted_cls, float(probs[predicted_idx]))
                        show_gradcam_analysis(cam, predicted_cls, float(probs[predicted_idx]), accent, class_display)
                    except Exception as e:
                        st.info(f"Grad-CAM unavailable: {e}")

                st.markdown('<span class="section-label">📋 AI Radiology Report · Fusion Findings</span>', unsafe_allow_html=True)
                if cam_analysis is None:
                    cam_analysis = analyze_gradcam(np.zeros((4,4)), predicted_cls, float(probs[predicted_idx]))
                show_radiology_report(predicted_cls, float(probs[predicted_idx]), cam_analysis, accent)

                if predicted_cls != "notumor":
                    st.markdown('<span class="section-label">💊 Treatment Recommendations · Educational Reference</span>', unsafe_allow_html=True)
                    show_treatment_guide(predicted_cls, accent)

                users    = load_users()
                pdf_file = generate_pdf_report(
                    predicted_cls, float(probs[predicted_idx]), "Multi-Modal Fusion",
                    st.session_state.username, st.session_state.user_name,
                    users[st.session_state.username]["scans"], cam_analysis
                )
                st.download_button(label="📄 Download Full Fusion Report (PDF)", data=pdf_file,
                                   file_name="NeuroScan_Fusion_Report.pdf", mime="application/pdf")

                if predicted_cls != "notumor":
                    st.warning("⚠  Anomaly detected. Please consult a qualified radiologist for clinical evaluation.")
                else:
                    st.success("✓  No tumor indicators detected across all 4 modalities.")

            else:
                missing = [n for n,c in zip(channel_names,channels) if c is None]
                if any(c is not None for c in channels):
                    st.info(f"Still waiting for: **{', '.join(missing)}**")
                else:
                    st.markdown("""<div style="text-align:center;padding:3.5rem 1.5rem;
                      border:1px dashed rgba(12,242,200,0.10);border-radius:14px;
                      margin-top:1rem;background:rgba(12,242,200,0.012);">
                      <div style="font-size:2rem;margin-bottom:0.8rem;opacity:0.15;">🧬</div>
                      <div style="font-family:'JetBrains Mono',monospace;font-size:0.62rem;
                        letter-spacing:0.18em;text-transform:uppercase;color:#1A2530;">
                        Upload all 4 MRI modalities to begin fusion analysis</div>
                    </div>""", unsafe_allow_html=True)

    st.markdown('<div class="footer">NeuroScan AI · Research prototype · Not for clinical use</div>', unsafe_allow_html=True)