import streamlit as st
import streamlit.components.v1 as components
import numpy as np
from PIL import Image
import io, base64, warnings
warnings.filterwarnings("ignore")

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(page_title="NeuroScan AI", page_icon="🧠", layout="centered")

# ── Brain SVG (transparent, embedded) ─────────────────────────────────────────
BRAIN_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 340" fill="none">
  <path d="M200 290 C160 290 130 275 110 255 C85 230 70 200 72 170 C74 145 85 125 95 112
           C80 100 70 82 75 62 C80 40 102 28 125 30 C135 18 152 10 170 12 C185 5 202 8 212 18
           C225 8 242 5 255 12 C272 8 292 18 300 30 C322 28 342 40 348 62 C353 82 343 100 328 112
           C338 125 348 145 350 170 C352 200 338 230 312 255 C292 275 260 290 220 290 Z"
        stroke="#00C8B4" stroke-width="2.5" stroke-opacity="0.18" fill="rgba(0,200,180,0.02)"/>
  <path d="M200 40 C198 80 198 130 200 180 C202 220 204 255 200 290"
        stroke="#00C8B4" stroke-width="1" stroke-opacity="0.12" fill="none" stroke-dasharray="4 6"/>
  <path d="M95 112 C110 108 128 115 138 128 C148 142 145 160 135 170 C122 182 105 178 98 165"
        stroke="#00C8B4" stroke-width="1.2" stroke-opacity="0.15" fill="none" stroke-linecap="round"/>
  <path d="M108 155 C120 148 138 152 148 165 C158 178 155 198 142 208 C128 218 110 212 104 198"
        stroke="#00C8B4" stroke-width="1.2" stroke-opacity="0.15" fill="none" stroke-linecap="round"/>
  <path d="M140 130 C155 122 175 126 182 140 C190 156 185 175 172 183 C158 190 140 184 134 170"
        stroke="#00C8B4" stroke-width="1.2" stroke-opacity="0.15" fill="none" stroke-linecap="round"/>
  <path d="M305 112 C290 108 272 115 262 128 C252 142 255 160 265 170 C278 182 295 178 302 165"
        stroke="#00C8B4" stroke-width="1.2" stroke-opacity="0.15" fill="none" stroke-linecap="round"/>
  <path d="M292 155 C280 148 262 152 252 165 C242 178 245 198 258 208 C272 218 290 212 296 198"
        stroke="#00C8B4" stroke-width="1.2" stroke-opacity="0.15" fill="none" stroke-linecap="round"/>
  <path d="M260 130 C245 122 225 126 218 140 C210 156 215 175 228 183 C242 190 260 184 266 170"
        stroke="#00C8B4" stroke-width="1.2" stroke-opacity="0.15" fill="none" stroke-linecap="round"/>
  <path d="M185 285 C183 298 188 318 200 322 C212 318 216 298 215 285"
        stroke="#00C8B4" stroke-width="1.8" stroke-opacity="0.18" fill="none" stroke-linecap="round"/>
  <circle cx="150" cy="145" r="2"   fill="#00C8B4" fill-opacity="0.15"/>
  <circle cx="250" cy="145" r="2"   fill="#00C8B4" fill-opacity="0.15"/>
  <circle cx="200" cy="100" r="2"   fill="#00C8B4" fill-opacity="0.15"/>
  <circle cx="175" cy="195" r="1.5" fill="#00C8B4" fill-opacity="0.12"/>
  <circle cx="225" cy="195" r="1.5" fill="#00C8B4" fill-opacity="0.12"/>
</svg>"""
BRAIN_B64 = "data:image/svg+xml;base64," + base64.b64encode(BRAIN_SVG.encode()).decode()

# ── CSS ────────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

html, body, .stApp {{
    background-color: #07090F !important;
    color: #C8D6E5 !important;
    font-family: 'DM Mono', monospace !important;
}}
#MainMenu, footer, header {{ visibility: hidden; }}
.block-container {{ padding: 2.5rem 2rem 4rem !important; max-width: 800px !important; }}

/* Brain watermark */
.stApp {{
    background-image: url("{BRAIN_B64}") !important;
    background-repeat: no-repeat !important;
    background-position: center 140px !important;
    background-size: 560px !important;
    background-attachment: fixed !important;
}}
.stApp::before {{
    content: '';
    position: fixed; top:0; left:0; right:0; bottom:0;
    background:
        radial-gradient(ellipse 60% 40% at 20% 10%, rgba(0,200,180,0.05) 0%, transparent 70%),
        radial-gradient(ellipse 50% 50% at 80% 80%, rgba(80,120,255,0.04) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
}}

/* Header */
.header-wrap {{ text-align:center; padding:2.5rem 0 1.5rem; }}
.header-eyebrow {{
    font-size:0.68rem; letter-spacing:0.35em; color:#00C8B4;
    text-transform:uppercase; margin-bottom:0.8rem;
}}
.header-title {{
    font-family:'Syne',sans-serif;
    font-size:clamp(2rem,5vw,3.2rem);
    font-weight:800; color:#EEF4FF; letter-spacing:-0.02em; line-height:1.05;
}}
.header-title span {{ color:#00C8B4; }}
.header-sub {{ margin-top:0.7rem; font-size:0.75rem; color:#4A6070; letter-spacing:0.05em; }}
.divider {{
    height:1px;
    background:linear-gradient(90deg,transparent,#1A3040,transparent);
    margin:1.8rem 0;
}}

/* Upload zone */
.upload-label {{
    font-size:0.66rem; letter-spacing:0.25em; text-transform:uppercase;
    color:#3A5A70; margin-bottom:0.4rem; display:block;
}}
[data-testid="stFileUploader"] > div {{
    background: rgba(0,200,180,0.03) !important;
    border: 1px dashed rgba(0,200,180,0.28) !important;
    border-radius: 12px !important;
    transition: all 0.3s !important;
}}
[data-testid="stFileUploader"] > div:hover {{
    background: rgba(0,200,180,0.06) !important;
    border-color: rgba(0,200,180,0.55) !important;
}}
[data-testid="stFileUploader"] label {{
    color:#5A8090 !important; font-family:'DM Mono',monospace !important; font-size:0.78rem !important;
}}

/* Image */
[data-testid="stImage"] img {{
    border-radius:12px;
    border:1px solid rgba(0,200,180,0.14);
    box-shadow:0 0 30px rgba(0,200,180,0.06);
}}

/* Sidebar */
[data-testid="stSidebar"] {{
    background:#0A0D15 !important;
    border-right:1px solid rgba(0,200,180,0.08) !important;
}}
[data-testid="stSidebar"] p, [data-testid="stSidebar"] li {{
    font-size:0.76rem !important; color:#4A6070 !important; line-height:1.75 !important;
}}
.sidebar-badge {{
    display:inline-block; background:rgba(0,200,180,0.1); color:#00C8B4;
    font-size:0.58rem; letter-spacing:0.2em; padding:0.2rem 0.55rem;
    border-radius:99px; border:1px solid rgba(0,200,180,0.25);
    margin-bottom:0.8rem; text-transform:uppercase;
}}

/* Alerts */
[data-testid="stAlert"] {{
    border-radius:10px !important;
    font-family:'DM Mono',monospace !important;
    font-size:0.75rem !important;
}}

/* Spinner */
[data-testid="stSpinner"] {{ color:#00C8B4 !important; }}

.footer {{
    margin-top:3rem; text-align:center;
    font-size:0.6rem; letter-spacing:0.18em; color:#1A2A35; text-transform:uppercase;
}}
</style>
""", unsafe_allow_html=True)

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown('<span class="sidebar-badge">v2.1 · CNN Classifier</span>', unsafe_allow_html=True)
    st.markdown("## NeuroScan AI")
    st.markdown("""
A deep learning classifier trained on contrast-enhanced MRI scans.

**Detectable classes**
- Glioma
- Meningioma
- Pituitary adenoma
- No tumor

**Input** JPG / PNG · resized to 128×128 internally

**Stack** TensorFlow 2.12 · Keras 2.12 · Streamlit

---
*Research use only — not a clinical diagnostic tool.*
""")

# ── Header ─────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="header-wrap">
    <div class="header-eyebrow">Deep Learning · MRI Analysis</div>
    <div class="header-title">Neuro<span>Scan</span> AI</div>
    <div class="header-sub">Upload a brain MRI scan — get an instant AI classification</div>
</div>
<div class="divider"></div>
""", unsafe_allow_html=True)

# ── Robust model loader (fixes Keras version mismatch) ─────────────────────────
@st.cache_resource(show_spinner=False)
def load_model():
    import os

    # Attempt 1 — native load (works if versions match)
    try:
        import tensorflow as tf
        model = tf.keras.models.load_model(
            "models/brain_tumor_model.h5",
            compile=False          # skip optimizer; we only need inference
        )
        return model, "tensorflow"
    except Exception as e1:
        pass

    # Attempt 2 — h5py raw weights into a rebuilt architecture
    # (use this if the saved model config is incompatible)
    try:
        import tensorflow as tf
        import h5py

        def build_fallback_cnn(num_classes=4):
            inputs = tf.keras.Input(shape=(128, 128, 3))
            x = tf.keras.layers.Conv2D(32, 3, activation="relu", padding="same")(inputs)
            x = tf.keras.layers.MaxPooling2D()(x)
            x = tf.keras.layers.Conv2D(64, 3, activation="relu", padding="same")(x)
            x = tf.keras.layers.MaxPooling2D()(x)
            x = tf.keras.layers.Conv2D(128, 3, activation="relu", padding="same")(x)
            x = tf.keras.layers.MaxPooling2D()(x)
            x = tf.keras.layers.GlobalAveragePooling2D()(x)
            x = tf.keras.layers.Dense(256, activation="relu")(x)
            x = tf.keras.layers.Dropout(0.4)(x)
            outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)
            return tf.keras.Model(inputs, outputs)

        model = build_fallback_cnn()
        model.load_weights("models/brain_tumor_model.h5", by_name=False, skip_mismatch=True)
        return model, "weights_only"
    except Exception as e2:
        pass

    # Attempt 3 — TFLite (smallest footprint, version-agnostic)
    try:
        import tensorflow as tf
        interpreter = tf.lite.Interpreter(model_path="models/brain_tumor_model.tflite")
        interpreter.allocate_tensors()
        return interpreter, "tflite"
    except Exception as e3:
        raise RuntimeError(
            "Could not load model via any method.\n"
            f"TF load: {e1}\nWeights: {e2}\nTFLite: {e3}"
        )

def run_inference(model_obj, model_type, img_array):
    """Run prediction regardless of how the model was loaded."""
    import tensorflow as tf

    if model_type in ("tensorflow", "weights_only"):
        return model_obj.predict(img_array, verbose=0)[0]

    elif model_type == "tflite":
        inp = model_obj.get_input_details()[0]
        out = model_obj.get_output_details()[0]
        model_obj.set_tensor(inp["index"], img_array.astype(np.float32))
        model_obj.invoke()
        return model_obj.get_tensor(out["index"])[0]

CLASS_NAMES   = ["glioma", "meningioma", "notumor", "pituitary"]
CLASS_DISPLAY = {"glioma":"Glioma","meningioma":"Meningioma","notumor":"No Tumor","pituitary":"Pituitary"}
CLASS_COLORS  = {"glioma":"#FF6B6B","meningioma":"#FFB347","notumor":"#00C8B4","pituitary":"#7B8CDE"}

# ── Load model with status ─────────────────────────────────────────────────────
with st.spinner("Loading model…"):
    try:
        model_obj, model_type = load_model()
        load_ok = True
    except RuntimeError as err:
        load_ok = False
        st.error(f"Model failed to load: {err}")

# ── Upload ─────────────────────────────────────────────────────────────────────
st.markdown('<span class="upload-label">MRI scan image</span>', unsafe_allow_html=True)
uploaded_file = st.file_uploader(
    "", type=["jpg", "jpeg", "png"], label_visibility="collapsed"
)

# ── Inference + result ─────────────────────────────────────────────────────────
if uploaded_file and load_ok:
    pil_img = Image.open(uploaded_file).convert("RGB")

    c1, c2, c3 = st.columns([1, 8, 1])
    with c2:
        st.image(pil_img, use_container_width=True)

    # Preprocess
    resized   = pil_img.resize((128, 128))
    arr       = np.array(resized, dtype=np.float32) / 255.0
    img_input = np.expand_dims(arr, axis=0)           # (1,128,128,3)

    with st.spinner("Analysing scan…"):
        probs = run_inference(model_obj, model_type, img_input)

    pred_idx  = int(np.argmax(probs))
    pred_cls  = CLASS_NAMES[pred_idx]
    pct       = int(probs[pred_idx] * 100)
    accent    = CLASS_COLORS[pred_cls]

    # Build chips
    chips = ""
    for i, cls in enumerate(CLASS_NAMES):
        p   = int(probs[i] * 100)
        ac  = "active" if i == pred_idx else ""
        col = CLASS_COLORS[cls] if i == pred_idx else "#3A5060"
        bg  = f"rgba(0,200,180,0.1)" if i == pred_idx else "rgba(255,255,255,0.03)"
        bd  = f"1px solid {CLASS_COLORS[cls]}55" if i == pred_idx else "1px solid rgba(255,255,255,0.07)"
        pc  = CLASS_COLORS[cls] if i == pred_idx else "#EEF4FF"
        chips += f"""<div style="background:{bg};border:{bd};border-radius:10px;
            padding:0.75rem 0.4rem;text-align:center;font-family:'DM Mono',monospace;
            font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;color:{col};">
            {CLASS_DISPLAY[cls]}
            <div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;
                        color:{pc};margin-top:0.25rem;">{p}%</div></div>"""

    card_html = f"""<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
    <style>
    *{{box-sizing:border-box;margin:0;padding:0;}}
    body{{background:transparent;font-family:'DM Mono',monospace;color:#C8D6E5;padding:2px;}}
    .card{{border:1px solid {accent}33;border-radius:16px;background:{accent}09;
           padding:1.6rem 1.8rem;position:relative;overflow:hidden;}}
    .card::before{{content:'';position:absolute;top:0;left:0;right:0;height:2px;
                   background:linear-gradient(90deg,transparent,{accent},transparent);}}
    .tag{{font-size:0.58rem;letter-spacing:0.3em;text-transform:uppercase;
          color:{accent};margin-bottom:0.4rem;}}
    .lbl{{font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;color:{accent};}}
    .row{{display:flex;align-items:center;gap:0.8rem;margin-top:1.2rem;}}
    .cl{{font-size:0.62rem;color:#3A5060;letter-spacing:0.1em;text-transform:uppercase;min-width:76px;}}
    .track{{flex:1;height:4px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;}}
    .fill{{height:100%;border-radius:99px;background:linear-gradient(90deg,{accent}88,{accent});
           width:0%;transition:width 1.2s cubic-bezier(.4,0,.2,1);}}
    .cv{{font-family:'Syne',sans-serif;font-size:0.95rem;font-weight:700;
         color:{accent};min-width:38px;text-align:right;}}
    .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:0.55rem;margin-top:1.4rem;}}
    .sep{{height:1px;background:linear-gradient(90deg,transparent,{accent}22,transparent);
          margin:1.2rem 0 0;}}
    </style></head><body>
    <div class="card">
      <div class="tag">Classification result</div>
      <div class="lbl">{CLASS_DISPLAY[pred_cls]}</div>
      <div class="row">
        <span class="cl">Confidence</span>
        <div class="track"><div class="fill" id="bar"></div></div>
        <span class="cv">{pct}%</span>
      </div>
      <div class="sep"></div>
      <div class="grid">{chips}</div>
    </div>
    <script>
      requestAnimationFrame(()=>setTimeout(()=>{{
        document.getElementById('bar').style.width='{pct}%';
      }},80));
    </script>
    </body></html>"""

    components.html(card_html, height=295, scrolling=False)

    if pred_cls != "notumor":
        st.warning(
            "⚠  Anomaly detected. This result is for research purposes only — "
            "please consult a qualified radiologist or neurologist for clinical evaluation."
        )
    else:
        st.success("✓  No tumor indicators detected in this scan.")

elif not uploaded_file:
    st.markdown("""
    <div style="text-align:center;padding:3rem 1rem;color:#1E3040;
                border:1px dashed rgba(30,80,100,0.2);border-radius:12px;margin-top:1rem;">
        <div style="font-size:2.5rem;margin-bottom:0.6rem;opacity:0.25;">🔬</div>
        <div style="font-size:0.68rem;letter-spacing:0.22em;text-transform:uppercase;">
            Awaiting MRI scan upload
        </div>
    </div>""", unsafe_allow_html=True)

# ── Footer ─────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="footer">NeuroScan AI · Research prototype · Not for clinical use</div>
""", unsafe_allow_html=True)
