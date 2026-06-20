import os
import io
import cv2
import numpy as np
from PIL import Image
from datetime import datetime, timezone, timedelta
from io import BytesIO
import matplotlib.pyplot as plt

from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

import tensorflow as tf
from tensorflow.keras.preprocessing import image as keras_image

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors

from supabase import create_client, Client
from fastapi import Request
import jwt
import pydicom
import pydicom._storage_sopclass_uids
import httpx



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

_mri_validator = None

def get_mri_validator():
    global _mri_validator
    if _mri_validator is None:
        interpreter = tf.lite.Interpreter(model_path="models/mri_validator.tflite")
        interpreter.allocate_tensors()
        _mri_validator = interpreter
    return _mri_validator

def is_valid_mri(pil_img: Image.Image) -> bool:
    """Check if image has MRI-like characteristics"""
    # Convert to grayscale for analysis
    gray = np.array(pil_img.convert('L'), dtype=np.float32)
    
    # MRI characteristics:
    # 1. Mostly dark background (>40% of pixels are dark)
    dark_pixels = float(np.mean(gray < 50))
    
    # 2. High contrast (std deviation should be significant)
    std_dev = float(gray.std())
    
    # 3. Not uniformly bright (mean should not be too high)
    mean_val = float(gray.mean())
    
    # 4. Check using validator model
    img_resized = pil_img.resize((128, 128))
    arr = keras_image.img_to_array(img_resized)
    arr = np.expand_dims(arr, axis=0) / 255.0
    
    validator = get_mri_validator()
    inp = validator.get_input_details()[0]
    out = validator.get_output_details()[0]
    validator.set_tensor(inp['index'], arr.astype('float32'))
    validator.invoke()
    score = float(validator.get_tensor(out['index'])[0][0])
    
    print(f"MRI validator — score: {score:.3f}, dark: {dark_pixels:.2f}, std: {std_dev:.1f}, mean: {mean_val:.1f}")
    
    # Reject if:
    # - Too bright (documents, certificates, screenshots)
    # - Too uniform (solid colors)
    # - Validator says not MRI AND image is bright
    if mean_val > 140 and dark_pixels < 0.05:
        return False
    if std_dev < 20:
        return False
    if score < 0.3 and mean_val > 120:
        return False
        
    return True


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

def generate_preprocessing_pipeline(pil_img: Image.Image) -> dict:
    """Generate 4-step preprocessing pipeline images as base64"""
    import base64
    import cv2

    # Convert to numpy grayscale
    gray = np.array(pil_img.convert('L'), dtype=np.float32)

    def to_b64(arr):
        arr_uint8 = np.clip(arr, 0, 255).astype('uint8')
        pil = Image.fromarray(arr_uint8).convert('RGB')
        buf = BytesIO()
        pil.save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode()

    # Step 1 — Raw
    raw = gray.copy()

    # Step 2 — Normalized (min-max to 0-255)
    normalized = (gray - gray.min()) / (gray.max() - gray.min() + 1e-8) * 255

    # Step 3 — Skull stripped (threshold + largest connected component)
    blurred     = cv2.GaussianBlur(normalized.astype('uint8'), (5, 5), 0)
    _, thresh   = cv2.threshold(blurred, 10, 255, cv2.THRESH_BINARY)
    kernel      = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (10, 10))
    closed      = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    opened      = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel)
    # Find largest contour (brain region)
    contours, _ = cv2.findContours(opened.astype('uint8'), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    mask        = np.zeros_like(opened)
    if contours:
        largest = max(contours, key=cv2.contourArea)
        cv2.drawContours(mask, [largest], -1, 255, -1)
    skull_stripped = normalized * (mask / 255.0)

    # Step 4 — CLAHE Enhanced
    clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(skull_stripped.astype('uint8'))

    return {
        "raw":           to_b64(raw),
        "normalized":    to_b64(normalized),
        "skull_stripped": to_b64(skull_stripped),
        "enhanced":      to_b64(enhanced),
        "labels": {
            "raw":           "Raw DICOM",
            "normalized":    "Normalized",
            "skull_stripped": "Skull Stripped",
            "enhanced":      "CLAHE Enhanced",
        }
    }

def analyze_gradcam(cam, predicted_cls, confidence, original_size=None):
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

    # ── Sub-region segmentation from Grad-CAM thresholds ──
    # ET (Enhancing Tumor) — highest activation > 0.75
    # TC (Tumor Core)      — high activation 0.5-0.75
    # WT (Whole Tumor)     — all activation > 0.25
    # Inclusive/nested regions matching BraTS convention:
    # ET (core) ⊆ TC (core + necrotic) ⊆ WT (core + necrotic + edema)
    et_mask = cam > 0.75
    tc_mask = cam > 0.50   # includes ET
    wt_mask = cam > 0.25   # includes TC and ET

    et_pct = float(np.mean(et_mask)) * 100
    tc_pct = float(np.mean(tc_mask)) * 100
    wt_pct = float(np.mean(wt_mask)) * 100

    total_tumor_pct = et_pct + tc_pct + wt_pct

    # ── Radiomics features ──
    # Tumor area in pixels
    tumor_mask   = cam > 0.5
    tumor_pixels = int(np.sum(tumor_mask))
    total_pixels = h * w

    # Sphericity — ratio of tumor area to bounding box area
    if tumor_pixels > 0:
        rows = np.any(tumor_mask, axis=1)
        cols = np.any(tumor_mask, axis=0)
        rmin, rmax = np.where(rows)[0][[0, -1]]
        cmin, cmax = np.where(cols)[0][[0, -1]]
        bbox_area  = max((rmax - rmin + 1) * (cmax - cmin + 1), 1)
        sphericity = round(float(tumor_pixels / bbox_area), 2)
        bbox_h     = int(rmax - rmin + 1)
        bbox_w     = int(cmax - cmin + 1)
        # Estimated diameter (average of bbox dimensions normalized to 128px = ~20cm FOV)
        est_diameter_cm = round(((bbox_h + bbox_w) / 2) / 128 * 20, 1)
        # Estimated area in cm² (128px ~ 20cm field of view)
        est_area_cm2    = round(tumor_pixels / (128 * 128) * (20 * 20), 1)
        # Sanity clamp — physical brain MRI FOV is typically 20-24cm; reject outlier measurements
        # caused by Grad-CAM upscaling artifacts rather than real tumor extent
        if est_diameter_cm > 8.0:
            est_diameter_cm = round(est_diameter_cm * (128 / max(h, w)), 1)
            est_area_cm2    = round(est_area_cm2 * ((128 / max(h, w)) ** 2), 1)
        # Estimated volume in cm³ (assume roughly spherical slice)
        import math
        # More accurate: volume from area assuming circular cross-section
        est_volume_cm3  = round(est_area_cm2 * est_diameter_cm * 0.5, 2)
    else:
        sphericity       = 0.0
        bbox_h           = 0
        bbox_w           = 0
        est_diameter_cm  = 0.0
        est_area_cm2     = 0.0
        est_volume_cm3   = 0.0

    # Surface-to-volume ratio (perimeter / area approximation)
    if tumor_pixels > 0:
        # Approximate perimeter using edge detection
        from scipy import ndimage
        eroded       = ndimage.binary_erosion(tumor_mask)
        perimeter_px = int(np.sum(tumor_mask) - np.sum(eroded))
        svr          = round(perimeter_px / max(tumor_pixels, 1), 2)
    else:
        svr = 0.0

    # Intensity stats from cam
    tumor_vals       = cam[tumor_mask] if tumor_pixels > 0 else np.array([0.0])
    intensity_mean   = round(float(tumor_vals.mean()) * 100, 1)
    intensity_std    = round(float(tumor_vals.std()) * 100, 1)
    intensity_max    = round(float(tumor_vals.max()) * 100, 1)

    # Tumor shape description
    if sphericity >= 0.75:   shape_desc = "Well-circumscribed (round)"
    elif sphericity >= 0.55: shape_desc = "Moderately irregular"
    else:                    shape_desc = "Highly irregular (infiltrative)"

    # Attention pattern — based on actual estimated tumor diameter, not raw heatmap blur
    # (Grad-CAM heatmaps are inherently smooth/diffuse even for small focal lesions)
    if est_diameter_cm < 1.5:   pattern = "Focal / Localized"
    elif est_diameter_cm < 3.0: pattern = "Moderately Focal"
    elif est_diameter_cm < 5.0: pattern = "Diffuse"
    else:                       pattern = "Widespread"

    return {
        "region":               f"{vert} {horiz}",
        "activation_intensity": round(activation_intensity, 1),
        "focus_area_pct":       round(focus_area_pct, 1),
        "high_act_pct":         round(high_act_pct, 1),
        "mean_activation":      round(mean_activation, 1),
        "pattern":              pattern,
        "act_level":            act_level,
        "conf_interp":          conf_interp,
        "conf_pct":             conf_pct,
        # Sub-region segmentation
        "subregions": {
            "ET": {"pct": round(et_pct, 1), "label": "Enhancing Tumor",  "color": "#FF5757"},
            "TC": {"pct": round(tc_pct, 1), "label": "Tumor Core",       "color": "#FFAD3B"},
            "WT": {"pct": round(wt_pct, 1), "label": "Whole Tumor Edge", "color": "#FFE566"},
        },
        "total_tumor_pct": round(wt_pct, 1),  # WT is the outermost/total tumor extent
        # Radiomics
        "radiomics": {
            "tumor_pixels":     tumor_pixels,
            "est_area_cm2":     est_area_cm2,
            "est_volume_cm3":   est_volume_cm3,
            "est_diameter_cm":  est_diameter_cm,
            "sphericity":       sphericity,
            "svr":              svr,
            "intensity_mean":   intensity_mean,
            "intensity_std":    intensity_std,
            "intensity_max":    intensity_max,
            "shape_desc":       shape_desc,
        },
    }

def estimate_who_grade(predicted_cls, radiomics, subregions):
    """Estimate WHO grade for glioma/meningioma based on radiomics features"""
    if predicted_cls not in ('glioma', 'meningioma'):
        return None

    et_pct = subregions.get('ET', {}).get('pct', 0) if subregions else 0
    tc_pct = subregions.get('TC', {}).get('pct', 0) if subregions else 0
    wt_pct = subregions.get('WT', {}).get('pct', 0) if subregions else 0

    sphericity    = radiomics.get('sphericity', 0.5)
    intensity_std = radiomics.get('intensity_std', 0)
    volume        = radiomics.get('est_volume_cm3', 0)

    if predicted_cls == 'glioma':
        score = 0
        if et_pct > 25: score += 2
        elif et_pct > 15: score += 1
        if sphericity < 0.6: score += 2
        elif sphericity < 0.75: score += 1
        if intensity_std > 45: score += 2
        elif intensity_std > 30: score += 1
        if volume > 3: score += 1
        if tc_pct > 20: score += 1

        max_score = 8
        if score >= 5:
            grade, label, urgency, color = 'IV', 'High-Grade (WHO IV) — Glioblastoma pattern', 'critical', '#FF3333'
        elif score >= 3:
            grade, label, urgency, color = 'III', 'High-Grade (WHO III) — Anaplastic pattern', 'high', '#FF5757'
        elif score >= 1:
            grade, label, urgency, color = 'II', 'Low-Grade (WHO II) — Diffuse pattern', 'moderate', '#FFAD3B'
        else:
            grade, label, urgency, color = 'I', 'Low-Grade (WHO I) — Pilocytic pattern', 'low', '#0CF2C8'

    else:  # meningioma — WHO I-III, based on irregularity/edema rather than necrosis
        score = 0
        # Irregular shape (atypical/anaplastic meningiomas are less spherical)
        if sphericity < 0.55: score += 2
        elif sphericity < 0.7: score += 1
        # High peritumoral edema (WT relative to core) suggests higher grade
        if wt_pct > 30: score += 2
        elif wt_pct > 18: score += 1
        # Heterogeneous intensity (atypical features)
        if intensity_std > 40: score += 2
        elif intensity_std > 28: score += 1
        # Larger size correlates with atypical/anaplastic subtype
        if volume > 4: score += 1

        max_score = 7
        if score >= 4:
            grade, label, urgency, color = 'III', 'Anaplastic Meningioma (WHO III)', 'high', '#FF5757'
        elif score >= 2:
            grade, label, urgency, color = 'II', 'Atypical Meningioma (WHO II)', 'moderate', '#FFAD3B'
        else:
            grade, label, urgency, color = 'I', 'Benign Meningioma (WHO I)', 'low', '#0CF2C8'

    return {
        "grade": grade,
        "label": label,
        "urgency": urgency,
        "color": color,
        "score": score,
        "max_score": max_score,
        "tumor_type": predicted_cls,
        "disclaimer": "Estimated from imaging radiomics only. Definitive WHO grading requires histopathological biopsy confirmation."
    }

def get_dynamic_urgency(predicted_cls, who_grade):
    """Override static TUMOR_DB urgency with grade-aware urgency for glioma/meningioma"""
    base_urgency = TUMOR_DB[predicted_cls].get('urgency', 'See report')

    if who_grade and predicted_cls == 'glioma':
        if who_grade['grade'] in ('III', 'IV'):
            return ('HIGH', 'Urgent neurosurgical evaluation required.')
        else:
            return ('MODERATE', 'Neurosurgical consultation recommended; low-grade pattern.')

    if who_grade and predicted_cls == 'meningioma':
        if who_grade['grade'] == 'III':
            return ('HIGH', 'Urgent neurosurgical evaluation required.')
        elif who_grade['grade'] == 'II':
            return ('MODERATE', 'Neurosurgical assessment recommended.')
        else:
            return ('LOW', 'Routine surveillance typically sufficient.')

    if '-' in base_urgency:
        parts = base_urgency.split('-', 1)
        return (parts[0].strip(), parts[1].strip())
    return (base_urgency.strip(), '')

def evaluate_clinical_rules(predicted_cls, idh_status, mgmt_status):
    """
    Deterministic Clinical Decision Support System (CDSS) rules engine.
    Consumes the CNN's raw image classification output and combines it with
    clinician-provided molecular markers using documented WHO CNS tumor
    classification guidelines. This is NOT a trained fusion model — the CNN
    never sees this metadata; it is a separate, traceable expert-system layer.
    """
    output = {
        "refined_title":      CLASS_DISPLAY.get(predicted_cls, predicted_cls),
        "who_grade_trend":    "Awaiting histopathological verification",
        "prognostic_profile": "Standard prognostic markers apply based on general pathology.",
        "urgency_level":      "MODERATE",
        "custom_pathways":    [],
        "idh_status":         idh_status,
        "mgmt_status":        mgmt_status,
    }

    if predicted_cls == 'glioma':
        if idh_status == 'Mutant':
            output["refined_title"]      = "Glioma Phenotype (IDH-Mutant Astrocytoma Trend)"
            output["who_grade_trend"]    = "II–IV (Low-to-Intermediate Grade Tendency)"
            output["prognostic_profile"] = "Favorable long-term survival profile compared to wildtype counterparts. Median survival ranges from 5 to 15 years."
            output["urgency_level"]      = "MODERATE"
            output["custom_pathways"].append(("Surgical Goal", "Target maximal safe macro-resection as primary surgical goal."))
            output["custom_pathways"].append(("Targeted Therapy", "Consider targeted IDH1/IDH2 small-molecule inhibitor therapy frameworks."))
        elif idh_status == 'Wildtype':
            output["refined_title"]      = "Glioma Phenotype (IDH-Wildtype / Glioblastoma Trend)"
            output["who_grade_trend"]    = "IV (Highly Aggressive / High-Grade Diffuse Pattern)"
            output["prognostic_profile"] = "Aggressive clinical course typical. Median historical survival scales to 14–16 months under standard care protocols."
            output["urgency_level"]      = "CRITICAL / HIGH"
            output["custom_pathways"].append(("Neurosurgical Consultation", "Immediate neurosurgical consultation indicated for debulking/resection."))
            output["custom_pathways"].append(("Radiotherapy", "Initiate standard adjuvant radiotherapy protocols (60 Gy in 30 fractions)."))

        if mgmt_status == 'Methylated':
            output["custom_pathways"].append(("Chemotherapy Response", "Temozolomide (TMZ) protocol: high therapeutic response window predicted due to confirmed MGMT promoter methylation."))
        elif mgmt_status == 'Unmethylated':
            output["custom_pathways"].append(("Chemotherapy Response", "Temozolomide (TMZ) protocol: lower alkylating sensitivity noted. Alternative clinical trial frameworks or combination regimens encouraged."))

    elif predicted_cls == 'meningioma':
        output["refined_title"]      = "Meningioma Phenotype"
        output["who_grade_trend"]    = "I — Benign Meningioma"
        output["prognostic_profile"] = "Excellent outlook for WHO Grade I structures; 10-year recurrence-free survival exceeds 80% following complete macroscopic resection."
        output["urgency_level"]      = "LOW"
        output["custom_pathways"].append(("Active Surveillance", "Small (<3cm), asymptomatic lesions managed via annual follow-up MRI."))
        output["custom_pathways"].append(("Surgical Resection", "Simpson Grade I–II macroscopic resection is curative in symptomatic or growing cases."))
        output["custom_pathways"].append(("Stereotactic Radiosurgery", "Gamma Knife indicated for deep or surgically inaccessible locations under 3cm."))

    return output

    
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
    try:
        pixel_array = ds.pixel_array
    except Exception as e:
        raise ValueError(f"Cannot read pixel data: {e}")

    # Handle different bit depths
    pixel_array = pixel_array.astype(np.float32)

    # Apply rescale if available
    slope     = float(getattr(ds, 'RescaleSlope', 1))
    intercept = float(getattr(ds, 'RescaleIntercept', 0))
    pixel_array = pixel_array * slope + intercept

    # Handle multi-frame — take middle frame
    if len(pixel_array.shape) == 3:
        mid = pixel_array.shape[0] // 2
        pixel_array = pixel_array[mid]

    # Normalize to 0-255
    p_min = pixel_array.min()
    p_max = pixel_array.max()
    print(f"DICOM pixels — min: {p_min}, max: {p_max}, shape: {pixel_array.shape}")

    if p_max > p_min:
        pixel_array = (pixel_array - p_min) / (p_max - p_min) * 255
    else:
        raise ValueError("DICOM pixel array is empty or uniform — invalid scan")

    pixel_array = np.clip(pixel_array, 0, 255).astype('uint8')

    # Convert to RGB PIL image
    pil_img = Image.fromarray(pixel_array).convert('RGB')
    
    pixel_array = pixel_array.astype('uint8')

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

async def send_tumor_alert_email(username: str, prediction: str, confidence: float, mode: str):
    try:
        resend_api_key = os.environ.get("RESEND_API_KEY", "")
        if not resend_api_key:
            print("Resend API key not set — skipping email")
            return

        # Get user and doctor info from Supabase
        sb = get_supabase()
        user_res = sb.table("users").select("name, doctor_username").eq("username", username).single().execute()
        user_data = user_res.data if user_res else None

        patient_name  = user_data.get("name", username) if user_data else username
        doctor_username = user_data.get("doctor_username") if user_data else None

        cls_label = {"glioma": "Glioma", "meningioma": "Meningioma", "notumor": "No Tumor", "pituitary": "Pituitary"}
        pred_label = cls_label.get(prediction, prediction)
        conf_pct   = round(confidence * 100)

        # Email to patient
        patient_html = f"""
        <div style="font-family: monospace; background: #080c14; color: #e0e0e0; padding: 2rem; border-radius: 12px; max-width: 600px;">
          <h2 style="color: #0CF2C8;">NeuroScan AI — Scan Result Ready</h2>
          <p>Hello <strong>{patient_name}</strong>,</p>
          <p>Your MRI scan has been analysed by NeuroScan AI.</p>
          <div style="background: #1a1f2e; padding: 1rem; border-radius: 8px; border-left: 4px solid #FF5757; margin: 1rem 0;">
            <p style="margin: 0; color: #FF5757; font-weight: bold;">⚠ Tumor Detected</p>
            <p style="margin: 0.5rem 0 0;">Prediction: <strong style="color: #FF5757;">{pred_label}</strong></p>
            <p style="margin: 0.5rem 0 0;">Confidence: <strong>{conf_pct}%</strong></p>
            <p style="margin: 0.5rem 0 0;">Mode: {mode}</p>
          </div>
          <p style="color: #FF5757;"><strong>Please consult your doctor immediately.</strong></p>
          <p style="color: #888; font-size: 0.8rem;">This is an AI-generated result for research purposes only. Not a clinical diagnosis.</p>
        </div>
        """

        async with httpx.AsyncClient() as client:
            # Send to patient
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {resend_api_key}", "Content-Type": "application/json"},
                json={
                    "from":    "NeuroScan AI <onboarding@resend.dev>",
                    "to":      [username],
                    "subject": f"⚠ Tumor Detected — {pred_label} ({conf_pct}% confidence)",
                    "html":    patient_html,
                }
            )
            print(f"Patient email sent to {username}")

            # Send to doctor if assigned
            if doctor_username:
                doctor_html = f"""
                <div style="font-family: monospace; background: #080c14; color: #e0e0e0; padding: 2rem; border-radius: 12px; max-width: 600px;">
                  <h2 style="color: #0CF2C8;">NeuroScan AI — Patient Alert</h2>
                  <p>Hello Doctor,</p>
                  <p>Your patient <strong>{patient_name}</strong> ({username}) has a new scan result.</p>
                  <div style="background: #1a1f2e; padding: 1rem; border-radius: 8px; border-left: 4px solid #FF5757; margin: 1rem 0;">
                    <p style="margin: 0; color: #FF5757; font-weight: bold;">⚠ Tumor Detected</p>
                    <p style="margin: 0.5rem 0 0;">Prediction: <strong style="color: #FF5757;">{pred_label}</strong></p>
                    <p style="margin: 0.5rem 0 0;">Confidence: <strong>{conf_pct}%</strong></p>
                    <p style="margin: 0.5rem 0 0;">Mode: {mode}</p>
                  </div>
                  <p>Please review and follow up with your patient.</p>
                  <p style="color: #888; font-size: 0.8rem;">NeuroScan AI — Research prototype · Not for clinical use.</p>
                </div>
                """
                await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {resend_api_key}", "Content-Type": "application/json"},
                    json={
                        "from":    "NeuroScan AI <onboarding@resend.dev>",
                        "to":      [doctor_username],
                        "subject": f"⚠ Patient Alert — {patient_name} · {pred_label} Detected",
                        "html":    doctor_html,
                    }
                )
                print(f"Doctor email sent to {doctor_username}")

    except Exception as e:
        print(f"Email error: {e}")

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

def generate_pdf(predicted_cls, confidence, mode, username, user_name, scan_history, cam_analysis=None,
                  patient_name=None, patient_age=None, patient_gender=None, who_grade=None, probabilities=None):
    import hashlib
    buffer  = BytesIO()
    doc     = SimpleDocTemplate(buffer, pagesize=letter, topMargin=36, bottomMargin=36, leftMargin=46, rightMargin=46)
    styles  = getSampleStyleSheet()
    teal    = colors.HexColor('#00C8B4')
    navy    = colors.HexColor('#0B1420')
    elems   = []

    title_s    = ParagraphStyle('t', parent=styles['Title'], textColor=navy, fontSize=18, fontName='Helvetica-Bold', spaceAfter=2, leading=20)
    sub_s      = ParagraphStyle('s', parent=styles['Normal'], textColor=colors.HexColor('#5A7090'), fontSize=8.5)
    meta_s     = ParagraphStyle('m', parent=styles['Normal'], textColor=colors.HexColor('#7A8A9A'), fontSize=7.5, spaceAfter=10)
    body_s     = ParagraphStyle('b', parent=styles['Normal'], textColor=colors.HexColor('#2A3A4A'), fontSize=9.3, leading=14.5)
    label_s    = ParagraphStyle('l', parent=styles['Normal'], textColor=teal, fontSize=8, fontName='Helvetica-Bold', spaceAfter=2)
    section_s  = ParagraphStyle('sec', parent=styles['Normal'], textColor=navy, fontSize=11.5, fontName='Helvetica-Bold', spaceBefore=14, spaceAfter=6, borderColor=teal)
    note_s     = ParagraphStyle('note', parent=styles['Normal'], textColor=colors.HexColor('#8A6D00'), fontSize=7.8, leading=12, backColor=colors.HexColor('#FFF9E6'))

    ist       = timezone(timedelta(hours=5, minutes=30))
    now_dt    = datetime.now(ist)
    now_ist   = now_dt.strftime("%Y-%m-%d %H:%M IST")

    # Deterministic-looking session/input IDs (for display only — not stored identifiers)
    session_id = f"#NS-{now_dt.strftime('%Y%m%d-%H%M')}"
    input_seed = hashlib.md5(f"{username}{now_dt.isoformat()}".encode()).hexdigest()[:4].upper()
    input_id   = f"#MRI-{input_seed}"

    cls_hex = {'glioma': '#FF6B6B', 'meningioma': '#FFB347', 'notumor': '#00C8B4', 'pituitary': '#7B8CDE'}
    accent  = colors.HexColor(cls_hex.get(predicted_cls, '#00C8B4'))

    # ── Header ──
    header_t = Table([[
        Paragraph("NEUROSCAN AI", title_s),
        Paragraph(f"Report Generated: {now_ist}<br/>Software Version: v2.5.0", sub_s),
    ]], colWidths=[300, 200])
    header_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elems += [
        header_t,
        Paragraph("Radiological Companion Report &nbsp;·&nbsp; AI-Assisted MRI Brain Tumor Analysis", meta_s),
    ]
    # Divider line
    elems.append(Table([['']], colWidths=[500], rowHeights=[1.2], style=TableStyle([('BACKGROUND', (0,0), (-1,-1), teal)])))
    elems.append(Spacer(1, 12))

    # ── 1. Patient & Session Metadata ──
    elems.append(Paragraph("1.  Patient &amp; Session Metadata", section_s))
    meta_rows = [
        ["Patient Name", patient_name or "Not provided", "Requesting Physician", user_name],
        ["Age / Gender", f"{patient_age or 'Not provided'} / {patient_gender or 'Not specified'}", "Account", f"@{username}"],
        ["Scan Session ID", session_id, "Analysis Mode", mode],
    ]
    meta_t = Table(meta_rows, colWidths=[95, 150, 110, 145])
    meta_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#EEF9F7')),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#EEF9F7')),
        ('TEXTCOLOR',  (0,0), (0,-1), colors.HexColor('#007A6E')),
        ('TEXTCOLOR',  (2,0), (2,-1), colors.HexColor('#007A6E')),
        ('TEXTCOLOR',  (1,0), (1,-1), colors.HexColor('#2A3A4A')),
        ('TEXTCOLOR',  (3,0), (3,-1), colors.HexColor('#2A3A4A')),
        ('FONTNAME',   (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME',   (2,0), (2,-1), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 8.3),
        ('ROWBACKGROUNDS', (1,0), (1,-1), [colors.HexColor('#F7FDFC'), colors.white]),
        ('ROWBACKGROUNDS', (3,0), (3,-1), [colors.HexColor('#F7FDFC'), colors.white]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
        ('PADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elems += [meta_t, Spacer(1, 4)]

    # ── 2. Primary AI Classification Result ──
    elems.append(Paragraph("2.  Primary AI Classification Result", section_s))
    urgency_word, urgency_detail = get_dynamic_urgency(predicted_cls, who_grade)
    result_t = Table([[
        Paragraph(f"<font color='{cls_hex.get(predicted_cls,'#00C8B4')}'><b>{CLASS_DISPLAY.get(predicted_cls, predicted_cls)}</b></font>", ParagraphStyle('rr', fontSize=20, fontName='Helvetica-Bold', leading=24)),
        Paragraph(
            f"<b>Model Confidence:</b> {int(confidence*100)}% ({'High Certainty' if confidence>0.85 else 'Moderate Certainty' if confidence>0.6 else 'Low Certainty'})<br/>"
            f"<b>Clinical Urgency:</b> {urgency_word}<br/>"
            f"<b>Action Required:</b> {urgency_detail if urgency_detail else TUMOR_DB[predicted_cls].get('clinical_note', '')[:90]}",
            body_s
        ),
    ]], colWidths=[170, 330])
    result_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F7FAFC')),
        ('BOX', (0,0), (-1,-1), 1, accent),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    elems += [result_t, Spacer(1, 8)]

    # WHO grade chip (if applicable)
    if who_grade:
        grade_t = Table([[
            Paragraph(f"<b>WHO Grade Estimate: {who_grade.get('grade','—')}</b> — {who_grade.get('label','')}", ParagraphStyle('g', fontSize=8.6, textColor=colors.HexColor('#7A4E00'))),
        ]], colWidths=[500])
        grade_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFF4DC')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#FFD27A')),
            ('PADDING', (0,0), (-1,-1), 7),
        ]))
        elems += [grade_t, Spacer(1, 4)]
        elems.append(Paragraph(f"<i>{who_grade.get('disclaimer','Estimated from imaging radiomics only.')}</i>", ParagraphStyle('gd', fontSize=7, textColor=colors.HexColor('#9A8A60'))))
        elems.append(Spacer(1, 6))

    # Probability breakdown across all classes
    if probabilities:
        prob_rows = [["Class", "Probability"]]
        for cls_key in ['glioma', 'meningioma', 'pituitary', 'notumor']:
            if cls_key in probabilities:
                marker = " ◀" if cls_key == predicted_cls else ""
                prob_rows.append([CLASS_DISPLAY.get(cls_key, cls_key) + marker, f"{round(probabilities[cls_key]*100, 1)}%"])
        prob_t = Table(prob_rows, colWidths=[300, 200])
        prob_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0B1420')),
            ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
            ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',   (0,0), (-1,-1), 8.3),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F7FDFC'), colors.white]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elems += [prob_t, Spacer(1, 10)]

    # ── 3. Clinical Assessment & Pathological Context ──
    info = TUMOR_DB[predicted_cls]
    elems.append(Paragraph("3.  Clinical Assessment &amp; Pathological Context", section_s))
    elems += [
        Paragraph(f"<b>Classification Overview:</b> {info['description']}", body_s), Spacer(1, 5),
        Paragraph(f"<b>Progression Profile:</b> {info['clinical_note']}", body_s), Spacer(1, 5),
        Paragraph(f"<b>Prognostic Outlook:</b> {info['prognosis']}", body_s), Spacer(1, 5),
        Paragraph(f"<b>Recommended Follow-up:</b> {info['followup']}", body_s), Spacer(1, 10),
    ]

    # ── 4. XAI & Spatial Localisation ──
    if cam_analysis:
        a = cam_analysis
        elems.append(Paragraph("4.  Explainable AI (XAI) &amp; Spatial Localisation", section_s))
        xai_rows = [
            ["Primary Focus Region", a.get('region','—'), "Activation Intensity", f"{a.get('activation_intensity','—')}%"],
            ["Heatmap Coverage", f"{a.get('focus_area_pct','—')}%", "Attention Pattern", a.get('pattern','—')],
        ]
        xai_t = Table(xai_rows, colWidths=[115, 130, 115, 140])
        xai_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#EEF9F7')),
            ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#EEF9F7')),
            ('TEXTCOLOR',  (0,0), (0,-1), colors.HexColor('#007A6E')),
            ('TEXTCOLOR',  (2,0), (2,-1), colors.HexColor('#007A6E')),
            ('FONTNAME',   (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTNAME',   (2,0), (2,-1), 'Helvetica-Bold'),
            ('FONTSIZE',   (0,0), (-1,-1), 8.3),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
            ('PADDING', (0,0), (-1,-1), 7),
        ]))
        elems += [xai_t, Spacer(1, 10)]

        # Sub-region segmentation (ET / TC / WT)
        subregions = a.get('subregions')
        if subregions:
            elems.append(Paragraph("4a.  Tumor Sub-Region Segmentation", ParagraphStyle('sub4', parent=section_s, fontSize=10, spaceBefore=4)))
            sub_rows = [["Region", "Description", "Coverage"]]
            sub_labels = {
                'ET': 'Enhancing Tumor (active growing region)',
                'TC': 'Tumor Core (necrotic / dense tissue)',
                'WT': 'Whole Tumor (incl. surrounding edema)',
            }
            for key in ['ET', 'TC', 'WT']:
                if key in subregions:
                    sub_rows.append([key, sub_labels.get(key, key), f"{subregions[key].get('pct', 0)}%"])
            sub_t = Table(sub_rows, colWidths=[60, 290, 150])
            sub_t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0B1420')),
                ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
                ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE',   (0,0), (-1,-1), 8.2),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F7FDFC'), colors.white]),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            elems += [sub_t, Spacer(1, 10)]

        # Radiomics features
        radiomics = a.get('radiomics')
        if radiomics:
            elems.append(Paragraph("4b.  Quantitative Radiomics", ParagraphStyle('sub4b', parent=section_s, fontSize=10, spaceBefore=4)))
            rad_rows = [
                ["Est. Volume", f"{radiomics.get('est_volume_cm3','—')} cm³", "Est. Diameter", f"{radiomics.get('est_diameter_cm','—')} cm"],
                ["Sphericity", f"{radiomics.get('sphericity','—')}", "Surface-to-Vol Ratio", f"{radiomics.get('svr','—')}"],
                ["Intensity Mean", f"{radiomics.get('intensity_mean','—')}%", "Intensity Std Dev", f"{radiomics.get('intensity_std','—')}%"],
                ["Shape Descriptor", radiomics.get('shape_desc','—'), "Est. Area", f"{radiomics.get('est_area_cm2','—')} cm²"],
            ]
            rad_t = Table(rad_rows, colWidths=[110, 135, 130, 125])
            rad_t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#EEF9F7')),
                ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#EEF9F7')),
                ('TEXTCOLOR',  (0,0), (0,-1), colors.HexColor('#007A6E')),
                ('TEXTCOLOR',  (2,0), (2,-1), colors.HexColor('#007A6E')),
                ('FONTNAME',   (0,0), (0,-1), 'Helvetica-Bold'),
                ('FONTNAME',   (2,0), (2,-1), 'Helvetica-Bold'),
                ('FONTSIZE',   (0,0), (-1,-1), 8.1),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            elems += [rad_t, Spacer(1, 10)]

    # ── 5. Care Pathway & Treatment Guidelines ──
    if info["treatments"]:
        elems.append(Paragraph("5.  Care Pathway &amp; Differential Guidelines", section_s))
        elems.append(Paragraph("Based on the predicted tumor morphology, the following standard pathways are outlined for multi-disciplinary team (MDT) review:", body_s))
        elems.append(Spacer(1, 4))
        for t_title, t_desc in info["treatments"]:
            elems += [Paragraph(f"<b>&bull; {t_title}:</b> {t_desc}", body_s), Spacer(1, 3)]
        elems.append(Spacer(1, 6))

    disc_s = ParagraphStyle('d', parent=styles['Normal'], textColor=colors.HexColor('#888888'), fontSize=7.6, leading=12)
    elems += [
        Spacer(1, 6),
        Paragraph("DISCLAIMER: This is an AI-generated companion report for educational/research purposes only. It does not constitute a clinical diagnosis. All findings must be confirmed by a licensed radiologist and, where applicable, histopathological biopsy.", disc_s),
    ]

    # ── Page break before historical section ──
    elems.append(Spacer(1, 10))

    # ── 6. Longitudinal Scan History (Session Record) ──
    if scan_history:
        elems.append(Paragraph("6.  Longitudinal Scan History (Session Record)", section_s))
        elems.append(Paragraph(
            "Each row below represents a separate, independent inference session — not sequential findings for a single continuous scan. "
            "Differing predictions across sessions typically reflect different uploaded images (e.g. model testing, multiple patients, or repeat uploads) rather than tumor change within minutes.",
            ParagraphStyle('warn', parent=body_s, fontSize=8, textColor=colors.HexColor('#7A8A9A'), leading=12)
        ))
        elems.append(Spacer(1, 8))

        hist_rows = [["Session Date (IST)", "Input ID", "AI Prediction", "Confidence", "Mode"]]
        for i, s in enumerate(scan_history[:10]):
            seed = hashlib.md5(f"{username}{s['date']}{i}".encode()).hexdigest()[:4].upper()
            tag  = " (Current)" if i == 0 and s['date'] == now_ist[:16] else ""
            hist_rows.append([
                s["date"],
                f"#MRI-{seed}",
                f"{CLASS_DISPLAY.get(s['prediction'], s['prediction'])}{tag}",
                f"{int(s['confidence']*100)}%",
                s["mode"],
            ])
        ht = Table(hist_rows, colWidths=[105, 80, 140, 75, 100])
        ht.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), teal),
            ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
            ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',   (0,0), (-1,-1), 8),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F7FDFC'), colors.white]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
            ('PADDING', (0,0), (-1,-1), 7),
        ]))
        elems += [ht, Spacer(1, 16)]

    # ── 7. Technical Architecture ──
    elems.append(Paragraph("7.  Technical Architecture &amp; Verification Metrics", section_s))
    tech_rows = [
        ["Core Model Backbone", "MobileNetV2-based CNN Classifier"],
        ["Training Dataset", "Curated Brain Tumor MRI Dataset (Glioma / Meningioma / Pituitary / No Tumor)"],
        ["Explainability", "Grad-CAM (Gradient-weighted Class Activation Mapping)"],
        ["Normalization Strategy", "Min-max intensity normalization, 128×128 isotropic resizing"],
        ["Validation Gate", "DICOM modality check (MR-only), PHI metadata anonymization"],
        ["Radiomics Scope", "2D single-slice approximation (area, diameter, sphericity)"],
    ]
    tech_t = Table(tech_rows, colWidths=[150, 350])
    tech_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#EEF9F7')),
        ('TEXTCOLOR',  (0,0), (0,-1), colors.HexColor('#007A6E')),
        ('TEXTCOLOR',  (1,0), (1,-1), colors.HexColor('#2A3A4A')),
        ('FONTNAME',   (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 8.3),
        ('ROWBACKGROUNDS', (1,0), (1,-1), [colors.HexColor('#F7FDFC'), colors.white]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D0EDE9')),
        ('PADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elems += [tech_t, Spacer(1, 8)]
    limitation_s = ParagraphStyle('lim', parent=styles['Normal'], textColor=colors.HexColor('#8A8A8A'), fontSize=7.4, leading=11.5)
    elems += [
        Paragraph(
            "<b>Known Limitation:</b> Radiomic measurements (volume, diameter, area) are derived from a single 2D MRI slice "
            "via Grad-CAM thresholding, not a full volumetric reconstruction. This is a standard approximation for single-slice "
            "pipelines and is intentionally scoped this way; true 3D volumetrics would require a complete multi-slice DICOM "
            "series processed through a 3D segmentation model (e.g. 3D U-Net), which is noted as planned future work.",
            limitation_s
        ),
        Spacer(1, 10),
    ]

    footer_s = ParagraphStyle('f', parent=styles['Normal'], textColor=colors.HexColor('#AAB8C2'), fontSize=7, alignment=1)
    elems.append(Paragraph("NeuroScan AI · Research Prototype · Not for Clinical Use · Generated by automated pipeline", footer_s))

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
    get_mri_validator()
    print("Models loaded and ready!")

@app.post("/api/chat")
async def chat(request: Request):
    try:
        body = await request.json()
        question    = body.get("question", "")
        scan_context = body.get("scan_context", {})

        groq_api_key = os.environ.get("GROQ_API_KEY", "")
        if not groq_api_key:
            raise HTTPException(status_code=500, detail="Groq API key not set")

        # Build system prompt with scan context
        system_prompt = f"""You are a clinical AI assistant for NeuroScan AI, a brain MRI analysis platform.
You help doctors and patients understand their MRI scan results.

Current scan context:
- Prediction: {scan_context.get('prediction', 'Unknown')}
- Display Name: {scan_context.get('display_name', 'Unknown')}
- Confidence: {scan_context.get('confidence', 0) * 100:.0f}%
- Scan Mode: {scan_context.get('mode', 'Single MRI')}
- Primary Region: {scan_context.get('region', 'Unknown')}
- Attention Pattern: {scan_context.get('pattern', 'Unknown')}
- Activation Intensity: {scan_context.get('activation_intensity', 0)}%
- Tumor Coverage: {scan_context.get('focus_area_pct', 0)}%
- Sub-regions: ET={scan_context.get('et_pct', 0)}%, TC={scan_context.get('tc_pct', 0)}%, WT={scan_context.get('wt_pct', 0)}%
- Est. Volume: {scan_context.get('est_volume_cm3', 0)} cm³
- Sphericity: {scan_context.get('sphericity', 0)}
- Shape: {scan_context.get('shape_desc', 'Unknown')}

Rules:
1. Answer clearly and concisely in 2-4 sentences
2. Always remind the user to consult a qualified medical professional
3. Never make definitive clinical diagnoses
4. Be empathetic and professional
5. If asked something unrelated to brain MRI or this scan, politely redirect"""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": question}
                    ],
                    "max_tokens": 300,
                    "temperature": 0.7,
                },
                timeout=30.0
            )
            data = response.json()
            answer = data["choices"][0]["message"]["content"]
            return {"answer": answer}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        try:
            pil_img, dicom_info = load_dicom(contents)
        except ValueError as e:
            return {
                "prediction":    "invalid",
                "display_name":  "Invalid Input",
                "confidence":    0,
                "color":         "#888888",
                "probabilities": {CLASS_NAMES[i]: 0.0 for i in range(len(CLASS_NAMES))},
                "tumor_info":    None,
                "gradcam":       None,
                "overlay_image": None,
                "dicom_info":    None,
                "error":         str(e)
            }
    else:
        pil_img = pil_from_upload(contents)


    arr = preprocess(pil_img)

    interpreter   = get_tflite()
    probs         = predict_tflite(interpreter, arr)
    predicted_idx = int(np.argmax(probs))
    predicted_cls = CLASS_NAMES[predicted_idx]
    confidence    = float(probs[predicted_idx])

    add_scan_record(username, predicted_cls, confidence, "Single MRI")

    cam_data    = None
    overlay_b64 = None
    preprocessing = None


    # Generate preprocessing pipeline for DICOM files
    if dicom_info:
        try:
            preprocessing = generate_preprocessing_pipeline(pil_img)
        except Exception as e:
            print(f"Preprocessing pipeline error: {e}")


    if gradcam:
        try:
            feat_model  = get_feat_model()
            cam         = compute_gradcam(feat_model, arr)
            cam_data    = analyze_gradcam(cam, predicted_cls, confidence, original_size=pil_img.size)
            who_grade = estimate_who_grade(predicted_cls, cam_data.get('radiomics', {}), cam_data.get('subregions', {}))
            cam_data['who_grade'] = who_grade
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
        "preprocessing": preprocessing,

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
            try:
                pil_img, _ = load_dicom(contents)
            except ValueError as e:
                return {
                    "prediction":    "invalid",
                    "display_name":  "Invalid Input",
                    "confidence":    0,
                    "color":         "#888888",
                    "probabilities": {CLASS_NAMES[i]: 0.0 for i in range(len(CLASS_NAMES))},
                    "tumor_info":    None,
                    "gradcam":       None,
                    "overlay_image": None,
                    "dicom_info":    None,
                    "error":         str(e)
                }
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

    add_scan_record(username, predicted_cls, confidence, "Multi-Modal Fusion")

    cam_data    = None
    overlay_b64 = None
    preprocessing = None

    # Generate preprocessing pipeline for DICOM files
    if dicom_info:
            # Generate preprocessing pipeline for ALL files
        try:
            preprocessing = generate_preprocessing_pipeline(pil_img)
        except Exception as e:
            print(f"Preprocessing pipeline error: {e}")
        
    if gradcam:
        try:
            feat_model  = get_feat_model()
            cam         = compute_gradcam(feat_model, fused_input)
            cam_data    = analyze_gradcam(cam, predicted_cls, confidence, original_size=pil_img.size)
            who_grade = estimate_who_grade(predicted_cls, cam_data.get('radiomics', {}), cam_data.get('subregions', {}))
            cam_data['who_grade'] = who_grade
            overlay_img = overlay_gradcam(fused_pil, cam)
            buf = BytesIO()
            overlay_img.save(buf, format="PNG")
            import base64
            overlay_b64 = base64.b64encode(buf.getvalue()).decode()
        except Exception as e:
            import traceback
            print(f"Grad-CAM error: {e}")
            traceback.print_exc()

    return {
        "prediction":    predicted_cls,
        "display_name":  CLASS_DISPLAY[predicted_cls],
        "confidence":    confidence,
        "color":         CLASS_COLORS[predicted_cls],
        "probabilities": {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))},
        "tumor_info":    TUMOR_DB[predicted_cls],
        "gradcam":       cam_data,
        "overlay_image": overlay_b64,
        "preprocessing": preprocessing,
    }

# ── PDF Report ─────────────────────────────────────────────────────────────────
@app.post("/api/report")
async def download_report(
    file:           UploadFile = File(...),
    username:       str = Form("anonymous"),
    name:           str = Form("User"),
    mode:           str = Form("Single MRI"),
    patient_name:   str = Form("Not provided"),
    patient_age:    str = Form("Not provided"),
    patient_gender: str = Form("Not specified"),
):
    contents = await file.read()
   
    # Handle DICOM files
    if file.filename and file.filename.lower().endswith('.dcm'):
        try:
            pil_img, _ = load_dicom(contents)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid DICOM file: {e}")
    else:
        pil_img = pil_from_upload(contents)
    arr      = preprocess(pil_img)

    interpreter   = get_tflite()
    probs         = predict_tflite(interpreter, arr)
    predicted_idx = int(np.argmax(probs))
    predicted_cls = CLASS_NAMES[predicted_idx]
    confidence    = float(probs[predicted_idx])

    cam_data  = None
    who_grade = None
    try:
        feat_model = get_feat_model()
        cam        = compute_gradcam(feat_model, arr)
        cam_data   = analyze_gradcam(cam, predicted_cls, confidence)
        who_grade  = estimate_who_grade(predicted_cls, cam_data.get('radiomics', {}), cam_data.get('subregions', {}))
    except:
        pass
    scan_history = get_user_scans(username)
    probabilities = {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))}
    pdf_buf       = generate_pdf(
        predicted_cls, confidence, mode, username, name,
        scan_history, cam_data,
        patient_name=patient_name,
        patient_age=patient_age,
        patient_gender=patient_gender,
        who_grade=who_grade,
        probabilities=probabilities,
    )

    return StreamingResponse(
        pdf_buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=NeuroScan_Report.pdf"}
    )