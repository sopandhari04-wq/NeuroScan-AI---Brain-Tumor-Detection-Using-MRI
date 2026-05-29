import os
import io
import cv2
import numpy as np
from PIL import Image
from datetime import datetime, timezone, timedelta
from io import BytesIO
import matplotlib.pyplot as plt

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

import tensorflow as tf
from tensorflow.keras.preprocessing import image as keras_image

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors

from supabase import create_client, Client
from fastapi import Request
import jwt
import pydicom
import pydicom._storage_sopclass_uids


# ══════════════════════════════════════════════════════════════════════════════
#  APP INIT
# ══════════════════════════════════════════════════════════════════════════════
app = FastAPI(title="NeuroScan AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update to your React URL in production
    allow_origin_regex=".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════════════
#  SUPABASE
# ══════════════════════════════════════════════════════════════════════════════
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase credentials not set")
    return create_client(url, key)

def get_ist_time():
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).strftime("%Y-%m-%d %H:%M")

# ══════════════════════════════════════════════════════════════════════════════
#  MODELS
# ══════════════════════════════════════════════════════════════════════════════
_tflite_interpreter = None
_keras_feat_model   = None

def get_tflite():
    global _tflite_interpreter
    if _tflite_interpreter is None:
        interpreter = tf.lite.Interpreter(model_path="models/model.tflite")
        interpreter.allocate_tensors()
        _tflite_interpreter = interpreter
    return _tflite_interpreter

def get_feat_model():
    global _keras_feat_model
    if _keras_feat_model is None:
        base = tf.keras.applications.MobileNetV2(
            weights='imagenet', include_top=False, input_shape=(128, 128, 3)
        )
        base.trainable = False
        _keras_feat_model = tf.keras.Model(
            inputs=base.input,
            outputs=base.get_layer('out_relu').output
        )
    return _keras_feat_model

# ══════════════════════════════════════════════════════════════════════════════
#  CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════
CLASS_NAMES   = ['glioma', 'meningioma', 'notumor', 'pituitary']
CLASS_DISPLAY = {'glioma': 'Glioma', 'meningioma': 'Meningioma', 'notumor': 'No Tumor', 'pituitary': 'Pituitary'}
CLASS_COLORS  = {'glioma': '#FF6B6B', 'meningioma': '#FFB347', 'notumor': '#00C8B4', 'pituitary': '#7B8CDE'}

TUMOR_DB = {
    "glioma": {
        "full_name":   "Glioma",
        "description": "Gliomas are primary brain tumors arising from glial cells. They range from low-grade (WHO Grade I–II, slow-growing) to high-grade (WHO Grade III–IV, aggressive), with Glioblastoma Multiforme (GBM) being the most aggressive form.",
        "characteristics": "Irregular, infiltrative borders with heterogeneous signal intensity. May show surrounding edema, mass effect, and ring-enhancing pattern on contrast MRI.",
        "clinical_note": "Gliomas require histopathological grading for definitive diagnosis. High-grade gliomas (Grade III–IV) are associated with significantly poorer prognosis and require urgent neurosurgical evaluation.",
        "urgency": "HIGH — Prompt neurosurgical referral recommended.",
        "urgency_color": "#FF6B6B",
        "treatments": [
            ("Surgical Resection", "Maximal safe resection is the primary treatment. Gross total resection improves survival in high-grade gliomas."),
            ("Radiation Therapy", "Standard of care for high-grade gliomas: 60 Gy in 30 fractions (Stupp protocol)."),
            ("Chemotherapy", "Temozolomide (TMZ) is the first-line chemotherapy agent."),
            ("Targeted Therapy", "IDH1/IDH2 inhibitors for IDH-mutant gliomas."),
            ("Tumor Treating Fields", "TTFields (Optune device) — FDA-approved for GBM."),
        ],
        "followup": "MRI with contrast every 2–3 months post-treatment.",
        "prognosis": "Low-grade gliomas: median survival 5–15 years. GBM: median survival 14–16 months."
    },
    "meningioma": {
        "full_name":   "Meningioma",
        "description": "Meningiomas are typically benign tumors (WHO Grade I) arising from the arachnoid cap cells of the meninges. Most common primary intracranial tumor in adults.",
        "characteristics": "Well-defined extra-axial mass with homogeneous enhancement. Dural tail sign often present.",
        "clinical_note": "Most meningiomas are benign and slow-growing. Small asymptomatic meningiomas may be managed conservatively.",
        "urgency": "MODERATE — Neurosurgical assessment recommended.",
        "urgency_color": "#FFB347",
        "treatments": [
            ("Active Surveillance", "Small (<3cm), asymptomatic meningiomas are monitored with annual MRI."),
            ("Surgical Resection", "Simpson Grade I–II resection is curative in most cases."),
            ("Stereotactic Radiosurgery", "Gamma Knife for tumors <3cm or surgically inaccessible locations."),
        ],
        "followup": "MRI every 6–12 months for 5 years post-treatment, then annually.",
        "prognosis": "Excellent for WHO Grade I: 10-year recurrence-free survival >80% after complete resection."
    },
    "pituitary": {
        "full_name":   "Pituitary Adenoma",
        "description": "Pituitary adenomas are benign tumors of the anterior pituitary gland. Classified by size (microadenoma <10mm, macroadenoma ≥10mm).",
        "characteristics": "Sellar/suprasellar mass. Macroadenomas may compress optic chiasm causing visual field defects.",
        "clinical_note": "Functional adenomas cause distinct hormonal syndromes. Urgent intervention needed for pituitary apoplexy.",
        "urgency": "MODERATE — Endocrinological and ophthalmological evaluation needed.",
        "urgency_color": "#FFB347",
        "treatments": [
            ("Medical Therapy", "Dopamine agonists (Cabergoline) first-line for prolactinomas."),
            ("Transsphenoidal Surgery", "Minimally invasive surgery through the nose/sphenoid sinus."),
            ("Stereotactic Radiosurgery", "Gamma Knife for residual or recurrent adenomas."),
        ],
        "followup": "MRI every 6 months initially, then annually.",
        "prognosis": "Excellent for most adenomas. Microadenoma surgical remission rate: 80–90%."
    },
    "notumor": {
        "full_name":   "No Tumor Detected",
        "description": "No significant intracranial mass lesion identified on the submitted MRI scan.",
        "characteristics": "No focal signal abnormality, mass effect, or pathological enhancement pattern identified.",
        "clinical_note": "A negative AI screening result does not exclude subtle or early-stage pathology.",
        "urgency": "LOW — Routine clinical follow-up as indicated.",
        "urgency_color": "#00C8B4",
        "treatments": [],
        "followup": "Routine clinical follow-up as clinically indicated by symptoms.",
        "prognosis": "No pathological findings detected. Continue routine health monitoring."
    }
}

# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════
def predict_tflite(interpreter, img_array):
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]
    interpreter.set_tensor(inp['index'], img_array.astype('float32'))
    interpreter.invoke()
    return interpreter.get_tensor(out['index'])[0]

def compute_gradcam(feat_model, img_array):
    features = feat_model(img_array, training=False)
    cam = np.mean(features[0].numpy(), axis=-1)
    cam = np.maximum(cam, 0)
    if cam.max() > 0:
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
    return cam

def overlay_gradcam(pil_img, cam):
    cam_r = cv2.resize(cam, (pil_img.width, pil_img.height))
    hmap  = np.uint8(plt.get_cmap('jet')(np.uint8(255 * cam_r) / 255.0) * 255)[..., :3]
    orig  = np.array(pil_img.convert("RGB"), dtype=np.float32)
    overlay = Image.fromarray((0.45 * hmap + 0.55 * orig).astype(np.uint8))
    return overlay

def analyze_gradcam(cam, predicted_cls, confidence):
    h, w = cam.shape
    peak_y, peak_x = np.unravel_index(cam.argmax(), cam.shape)
    vert  = "Superior" if peak_y < h//3 else "Middle" if peak_y < 2*h//3 else "Inferior"
    horiz = "Left" if peak_x < w//2 else "Right"
    activation_intensity = float(cam.max()) * 100
    focus_area_pct       = float(np.mean(cam > 0.5)) * 100
    high_act_pct         = float(np.mean(cam > 0.75)) * 100
    mean_activation      = float(cam.mean()) * 100

    if focus_area_pct < 10:   pattern = "Highly focal"
    elif focus_area_pct < 25: pattern = "Moderately focal"
    elif focus_area_pct < 50: pattern = "Diffuse focal"
    else:                     pattern = "Widespread"

    if activation_intensity >= 80:   act_level = "Very High"
    elif activation_intensity >= 60: act_level = "High"
    elif activation_intensity >= 40: act_level = "Moderate"
    else:                            act_level = "Low"

    conf_pct = int(confidence * 100)
    if conf_pct >= 90:   conf_interp = "Very High Certainty"
    elif conf_pct >= 75: conf_interp = "High Certainty"
    elif conf_pct >= 60: conf_interp = "Moderate Certainty"
    else:                conf_interp = "Low Certainty"

    return {
        "region": f"{vert} {horiz}",
        "activation_intensity": round(activation_intensity, 1),
        "focus_area_pct": round(focus_area_pct, 1),
        "high_act_pct": round(high_act_pct, 1),
        "mean_activation": round(mean_activation, 1),
        "pattern": pattern,
        "act_level": act_level,
        "conf_interp": conf_interp,
        "conf_pct": conf_pct,
    }

def pil_from_upload(file_bytes: bytes) -> Image.Image:
    return Image.open(BytesIO(file_bytes)).convert("RGB")

def load_dicom(file_bytes: bytes):
    ds = pydicom.dcmread(io.BytesIO(file_bytes))

    # Extract metadata before stripping
    dicom_info = {
        "patient_name":    str(getattr(ds, 'PatientName',        'ANONYMIZED')),
        "patient_id":      str(getattr(ds, 'PatientID',          'ANONYMIZED')),
        "study_date":      str(getattr(ds, 'StudyDate',          'Unknown')),
        "modality":        str(getattr(ds, 'Modality',           'Unknown')),
        "manufacturer":    str(getattr(ds, 'Manufacturer',       'Unknown')),
        "study_desc":      str(getattr(ds, 'StudyDescription',   'Unknown')),
        "slice_thickness": str(getattr(ds, 'SliceThickness',     'Unknown')),
    }

    # Strip all patient metadata (HIPAA)
    for tag in ['PatientName','PatientID','PatientBirthDate','PatientSex',
                'PatientAge','PatientAddress','PatientTelephoneNumbers',
                'ReferringPhysicianName','InstitutionName']:
        if hasattr(ds, tag):
            delattr(ds, tag)

    # Convert pixel array to PIL image
    pixel_array = ds.pixel_array.astype(float)
    if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
        pixel_array = pixel_array * float(ds.RescaleSlope) + float(ds.RescaleIntercept)

    # Normalize to 0-255
    pixel_array -= pixel_array.min()
    if pixel_array.max() > 0:
        pixel_array /= pixel_array.max()
    pixel_array = (pixel_array * 255).astype('uint8')

    # Handle different array shapes
    if len(pixel_array.shape) == 2:
        pil_img = Image.fromarray(pixel_array).convert('RGB')
    else:
        pil_img = Image.fromarray(pixel_array[:,:,0]).convert('RGB')

    return pil_img, dicom_info

def preprocess(pil_img: Image.Image) -> np.ndarray:
    img_resized = pil_img.resize((128, 128))
    arr = keras_image.img_to_array(img_resized)
    return np.expand_dims(arr, axis=0) / 255.0

def add_scan_record(username, predicted_cls, confidence, mode):
    try:
        sb = get_supabase()
        sb.table("scans").insert({
            "username":   username,
            "prediction": predicted_cls,
            "confidence": round(float(confidence), 2),
            "mode":       mode
        }).execute()
    except Exception as e:
        print(f"Could not save scan: {e}")

def get_user_scans(username):
    try:
        sb  = get_supabase()
        res = sb.table("scans").select("*").eq("username", username).order("date", desc=True).execute()
        ist = timezone(timedelta(hours=5, minutes=30))
        scans = []
        for s in res.data:
            try:
                dt_utc   = datetime.fromisoformat(s["date"].replace("Z", "+00:00"))
                date_str = dt_utc.astimezone(ist).strftime("%Y-%m-%d %H:%M")
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

def generate_pdf(predicted_cls, confidence, mode, username, user_name, scan_history, cam_analysis=None, patient_name=None, patient_age=None, patient_gender=None):
    buffer  = BytesIO()
    doc     = SimpleDocTemplate(buffer, pagesize=letter, topMargin=40, bottomMargin=40, leftMargin=50, rightMargin=50)
    styles  = getSampleStyleSheet()
    teal    = colors.HexColor('#00C8B4')
    elems   = []
    title_s   = ParagraphStyle('t', parent=styles['Title'], textColor=teal, fontSize=22, spaceAfter=4)
    sub_s     = ParagraphStyle('s', parent=styles['Normal'], textColor=colors.HexColor('#5A7090'), fontSize=9)
    body_s    = ParagraphStyle('b', parent=styles['Normal'], textColor=colors.HexColor('#2A3A4A'), fontSize=10, leading=16)
    label_s   = ParagraphStyle('l', parent=styles['Normal'], textColor=teal, fontSize=8, fontName='Helvetica-Bold', spaceAfter=2)
    section_s = ParagraphStyle('sec', parent=styles['Normal'], textColor=colors.HexColor('#007A6E'), fontSize=11, fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=4)
    ist     = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist).strftime("%Y-%m-%d %H:%M IST")
    elems  += [Paragraph("NeuroScan AI", title_s), Paragraph("MRI Brain Tumor Analysis Report", sub_s), Spacer(1, 16)]
    # Build info table with patient details
    info_rows = [
        ["Requesting Physician", user_name],
        ["Username", f"@{username}"],
        ["Patient Name", patient_name or "Not provided"],
        ["Patient Age", patient_age or "Not provided"],
        ["Patient Gender", patient_gender or "Not specified"],
        ["Analysis Mode", mode],
        ["Generated On", now_ist],
    ]
    info_t  = Table(info_rows, colWidths=[140, 340])
    info_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#EEF9F7')),
        ('TEXTCOLOR',  (0,0), (0,-1), colors.HexColor('#007A6E')),
        ('TEXTCOLOR',  (1,0), (1,-1), colors.HexColor('#2A3A4A')),
        ('FONTNAME',   (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.HexColor('#F7FDFC'), colors.white]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    elems += [info_t, Spacer(1, 20)]
    cls_hex = {'glioma': '#FF6B6B', 'meningioma': '#FFB347', 'notumor': '#00C8B4', 'pituitary': '#7B8CDE'}
    res_s   = ParagraphStyle('r', parent=styles['Normal'], textColor=colors.HexColor(cls_hex.get(predicted_cls, '#00C8B4')), fontSize=18, fontName='Helvetica-Bold', spaceAfter=4)
    elems  += [
        Paragraph("Prediction Result", label_s),
        Paragraph(CLASS_DISPLAY.get(predicted_cls, predicted_cls), res_s),
        Paragraph(f"Confidence Score: <b>{int(confidence*100)}%</b>", body_s),
        Spacer(1, 12)
    ]
    info = TUMOR_DB[predicted_cls]
    elems += [
        Paragraph("AI Radiology Report", section_s),
        Paragraph(f"<b>Diagnosis:</b> {info['full_name']}", body_s),
        Paragraph(f"<b>Urgency:</b> {info['urgency']}", body_s), Spacer(1, 6),
        Paragraph(f"<b>Description:</b> {info['description']}", body_s), Spacer(1, 6),
        Paragraph(f"<b>Clinical Note:</b> {info['clinical_note']}", body_s), Spacer(1, 6),
        Paragraph(f"<b>Follow-up:</b> {info['followup']}", body_s), Spacer(1, 6),
        Paragraph(f"<b>Prognosis:</b> {info['prognosis']}", body_s), Spacer(1, 10),
    ]
    if cam_analysis:
        a = cam_analysis
        elems += [
            Paragraph("Grad-CAM XAI Analysis", section_s),
            Paragraph(f"<b>Activation Intensity:</b> {a['activation_intensity']}%", body_s),
            Paragraph(f"<b>Primary Focus Region:</b> {a['region']}", body_s),
            Paragraph(f"<b>Heatmap Coverage:</b> {a['focus_area_pct']}%", body_s),
            Paragraph(f"<b>Attention Pattern:</b> {a['pattern']}", body_s),
            Paragraph(f"<b>Model Confidence:</b> {a['conf_interp']} ({a['conf_pct']}%)", body_s),
            Spacer(1, 10),
        ]
    if info["treatments"]:
        elems.append(Paragraph("Treatment Recommendations", section_s))
        for title, desc in info["treatments"]:
            elems += [Paragraph(f"<b>{title}</b>", body_s), Paragraph(desc, body_s), Spacer(1, 4)]
        elems.append(Spacer(1, 8))
    disc_s = ParagraphStyle('d', parent=styles['Normal'], textColor=colors.HexColor('#888888'), fontSize=8, leading=13)
    elems += [Paragraph("DISCLAIMER: AI-generated result for educational purposes only. Not a clinical diagnosis.", disc_s), Spacer(1, 20)]
    if scan_history:
        elems.append(Paragraph("Scan History", label_s))
        elems.append(Spacer(1, 6))
        hd = [["Date (IST)", "Prediction", "Confidence", "Mode"]] + [
            [s["date"], CLASS_DISPLAY.get(s["prediction"], s["prediction"]), f"{int(s['confidence']*100)}%", s["mode"]]
            for s in scan_history[:10]
        ]
        ht = Table(hd, colWidths=[130, 130, 90, 130])
        ht.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#00C8B4')),
            ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
            ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',   (0,0), (-1,-1), 8),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F7FDFC'), colors.white]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
            ('PADDING', (0,0), (-1,-1), 7),
        ]))
        elems.append(ht)
    doc.build(elems)
    buffer.seek(0)
    return buffer

# ══════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════
class LoginRequest(BaseModel):
    username: str
    password: str

class AddUserRequest(BaseModel):
    username: str
    password: str
    name: str
    role: str = "user"

# ══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup_event():
    print("Pre-loading models...")
    get_tflite()
    get_feat_model()
    print("Models loaded and ready!")

@app.get("/")
def root():
    return {"status": "NeuroScan AI API running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ── Auth ───────────────────────────────────────────────────────────────────────
@app.post("/api/login")
def login(req: LoginRequest):
    try:
        sb  = get_supabase()
        res = sb.table("users").select("*").eq("username", req.username.strip()).execute()
        if res.data and res.data[0]["password"] == req.password.strip():
            u = res.data[0]
            return {
                "success":   True,
                "username":  u["username"],
                "name":      u["name"],
                "role":      u["role"],
            }
        return {"success": False, "message": "Invalid credentials"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Users ──────────────────────────────────────────────────────────────────────
@app.post("/api/users")
def add_user(req: AddUserRequest):
    try:
        sb = get_supabase()
        sb.table("users").insert({
            "username": req.username,
            "password": req.password,
            "name":     req.name,
            "role":     req.role,
            "created":  datetime.now().strftime("%Y-%m-%d")
        }).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/users")
def get_users():
    try:
        sb  = get_supabase()
        res = sb.table("users").select("*").execute()
        return {"users": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Scans ──────────────────────────────────────────────────────────────────────
@app.get("/api/scans/{username}")
def scans(username: str):
    return {"scans": get_user_scans(username)}

@app.get("/api/scans")
def all_scans():
    try:
        sb  = get_supabase()
        res = sb.table("scans").select("*, users(name)").order("date", desc=True).limit(50).execute()
        ist = timezone(timedelta(hours=5, minutes=30))
        records = []
        for s in res.data:
            try:
                dt_utc   = datetime.fromisoformat(s["date"].replace("Z", "+00:00"))
                date_str = dt_utc.astimezone(ist).strftime("%Y-%m-%d %H:%M")
            except:
                date_str = s["date"][:16]
            records.append({
                "date":       date_str,
                "prediction": s["prediction"],
                "confidence": s["confidence"],
                "mode":       s["mode"],
                "username":   s["username"],
                "user":       s["users"]["name"] if s.get("users") else s["username"]
            })
        return {"scans": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def stats():
    try:
        sb         = get_supabase()
        users_res  = sb.table("users").select("username, role").execute()
        scans_res  = sb.table("scans").select("prediction").execute()
        total_users  = len([u for u in users_res.data if u["role"] == "user"])
        total_scans  = len(scans_res.data)
        tumor_scans  = len([s for s in scans_res.data if s["prediction"] != "notumor"])
        normal_scans = total_scans - tumor_scans
        return {
            "total_users":  total_users,
            "total_scans":  total_scans,
            "tumor_scans":  tumor_scans,
            "normal_scans": normal_scans,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Predict ────────────────────────────────────────────────────────────────────
@app.post("/api/predict")
async def predict_single(
    request:  Request,
    file:     UploadFile = File(...),
    username: str = "",
    gradcam:  bool = True,
):
    # Extract email from JWT token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            import jwt
            token   = auth_header.split(" ")[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            email   = payload.get("email", "")
            if email:
                username = email
        except:
            pass

    if not username:
        username = "unknown"

    print(f"Predict called with username: {username}")

    contents   = await file.read()
    dicom_info = None
    if file.filename and file.filename.lower().endswith('.dcm'):
        pil_img, dicom_info = load_dicom(contents)
    else:
        pil_img = pil_from_upload(contents)
    arr = preprocess(pil_img)

    interpreter   = get_tflite()
    probs         = predict_tflite(interpreter, arr)
    predicted_idx = int(np.argmax(probs))
    predicted_cls = CLASS_NAMES[predicted_idx]
    confidence    = float(probs[predicted_idx])



    if confidence < 0.60:
        return {
            "prediction":    "invalid",
            "display_name":  "Invalid Input",
            "confidence":    confidence,
            "color":         "#888888",
            "probabilities": {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))},
            "tumor_info":    None,
            "gradcam":       None,
            "overlay_image": None,
            "error":         "This image does not appear to be a valid MRI scan. Please upload a proper brain MRI."
        }

    add_scan_record(username, predicted_cls, confidence, "Single MRI")

    cam_data    = None
    overlay_b64 = None

    if gradcam:
        try:
            feat_model  = get_feat_model()
            cam         = compute_gradcam(feat_model, arr)
            cam_data    = analyze_gradcam(cam, predicted_cls, confidence)
            overlay_img = overlay_gradcam(pil_img, cam)
            buf = BytesIO()
            overlay_img.save(buf, format="PNG")
            import base64
            overlay_b64 = base64.b64encode(buf.getvalue()).decode()
        except Exception as e:
            print(f"Grad-CAM error: {e}")

    return {
        "prediction":    predicted_cls,
        "display_name":  CLASS_DISPLAY[predicted_cls],
        "confidence":    confidence,
        "color":         CLASS_COLORS[predicted_cls],
        "probabilities": {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))},
        "tumor_info":    TUMOR_DB[predicted_cls],
        "gradcam":       cam_data,
        "overlay_image": overlay_b64,
        "dicom_info":    dicom_info,
    }


@app.post("/api/predict/fusion")
async def predict_fusion(
    request:  Request,
    t1:       UploadFile = File(...),
    t1ce:     UploadFile = File(...),
    t2:       UploadFile = File(...),
    flair:    UploadFile = File(...),
    
    username: str = "",
    gradcam:  bool = True,
):  
     # Extract email from JWT token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            import jwt
            token   = auth_header.split(" ")[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            email   = payload.get("email", "")
            if email:
                username = email
        except:
            pass

    if not username:
        username = "unknown"

    print(f"Fusion predict called with username: {username}")

    imgs = []
    for f in [t1, t1ce, t2, flair]:
        contents = await f.read()
        if f.filename and f.filename.lower().endswith('.dcm'):
            pil_img, _ = load_dicom(contents)
        else:
            pil_img = Image.open(BytesIO(contents)).convert("RGB")
        imgs.append(pil_img)
    dicom_info = None

    gray_arrays = [np.array(p.convert("L").resize((128,128)), dtype=np.float32)/255.0 for p in imgs]
    fused_4ch   = np.stack(gray_arrays, axis=-1)
    r = fused_4ch[:,:,0]*0.5 + fused_4ch[:,:,1]*0.5
    g = fused_4ch[:,:,1]*0.5 + fused_4ch[:,:,2]*0.5
    b = fused_4ch[:,:,2]*0.5 + fused_4ch[:,:,3]*0.5
    fused_rgb   = np.stack([r, g, b], axis=-1)
    fused_input = np.expand_dims(fused_rgb, axis=0)
    fused_pil   = Image.fromarray(np.uint8(fused_rgb * 255))

    interpreter   = get_tflite()
    probs         = predict_tflite(interpreter, fused_input)
    predicted_idx = int(np.argmax(probs))
    predicted_cls = CLASS_NAMES[predicted_idx]
    confidence    = float(probs[predicted_idx])

    if confidence < 0.60:
        return {
            "prediction":    "invalid",
            "display_name":  "Invalid Input",
            "confidence":    confidence,
            "color":         "#888888",
            "probabilities": {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))},
            "tumor_info":    None,
            "gradcam":       None,
            "overlay_image": None,
            "dicom_info":    dicom_info,
            "error":         "This image does not appear to be a valid MRI scan. Please upload a proper brain MRI."
        }

    add_scan_record(username, predicted_cls, confidence, "Multi-Modal Fusion")

    cam_data    = None
    overlay_b64 = None

    if gradcam:
        try:
            feat_model  = get_feat_model()
            cam         = compute_gradcam(feat_model, fused_input)
            cam_data    = analyze_gradcam(cam, predicted_cls, confidence)
            overlay_img = overlay_gradcam(fused_pil, cam)
            buf = BytesIO()
            overlay_img.save(buf, format="PNG")
            import base64
            overlay_b64 = base64.b64encode(buf.getvalue()).decode()
        except Exception as e:
            print(f"Grad-CAM error: {e}")

    return {
        "prediction":    predicted_cls,
        "display_name":  CLASS_DISPLAY[predicted_cls],
        "confidence":    confidence,
        "color":         CLASS_COLORS[predicted_cls],
        "probabilities": {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))},
        "tumor_info":    TUMOR_DB[predicted_cls],
        "gradcam":       cam_data,
        "overlay_image": overlay_b64,
    }

# ── PDF Report ─────────────────────────────────────────────────────────────────
@app.post("/api/report")
async def download_report(
    file:           UploadFile = File(...),
    username:       str = "anonymous",
    name:           str = "User",
    mode:           str = "Single MRI",
    patient_name:   str = "Not provided",
    patient_age:    str = "Not provided",
    patient_gender: str = "Not specified",
):
    contents = await file.read()
    pil_img  = pil_from_upload(contents)
    arr      = preprocess(pil_img)

    interpreter   = get_tflite()
    probs         = predict_tflite(interpreter, arr)
    predicted_idx = int(np.argmax(probs))
    predicted_cls = CLASS_NAMES[predicted_idx]
    confidence    = float(probs[predicted_idx])

    cam_data = None
    try:
        feat_model = get_feat_model()
        cam        = compute_gradcam(feat_model, arr)
        cam_data   = analyze_gradcam(cam, predicted_cls, confidence)
    except:
        pass

    scan_history = get_user_scans(username)
    pdf_buf      = generate_pdf(
        predicted_cls, confidence, mode, username, name,
        scan_history, cam_data,
        patient_name=patient_name,
        patient_age=patient_age,
        patient_gender=patient_gender
    )

    return StreamingResponse(
        pdf_buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=NeuroScan_Report.pdf"}
    )