import cv2
import matplotlib.cm as cm
import streamlit as st
import streamlit.components.v1 as components
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
from PIL import Image
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
from io import BytesIO
from datetime import datetime
import matplotlib.pyplot as plt

# ── Must be FIRST Streamlit call ───────────────────────────────────────────────
st.set_page_config(page_title="NeuroScan AI", page_icon="🧠", layout="centered")

# ── Session state ──────────────────────────────────────────────────────────────
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

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
    border-radius: 10px !important;
    color: #EEF4FF !important;
    font-family: 'DM Mono', monospace !important;
    font-size: 0.85rem !important;
    padding: 0.65rem 1rem !important;
    transition: border-color 0.3s, box-shadow 0.3s !important;
}
[data-testid="stTextInput"] input:focus {
    border-color: #00C8B4 !important;
    box-shadow: 0 0 0 3px rgba(0,200,180,0.12) !important;
    outline: none !important;
}
[data-testid="stTextInput"] label {
    color: #3A6070 !important;
    font-family: 'DM Mono', monospace !important;
    font-size: 0.68rem !important;
    letter-spacing: 0.2em !important;
    text-transform: uppercase !important;
}

[data-testid="stButton"] > button {
    background: linear-gradient(135deg, #00C8B4 0%, #0097A7 100%) !important;
    color: #07090F !important;
    font-family: 'Syne', sans-serif !important;
    font-weight: 700 !important;
    font-size: 0.85rem !important;
    letter-spacing: 0.08em !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 0.65rem 2rem !important;
    width: 100% !important;
    transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s !important;
    box-shadow: 0 4px 24px rgba(0,200,180,0.25) !important;
    cursor: pointer !important;
}
[data-testid="stButton"] > button:hover {
    opacity: 0.92 !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 32px rgba(0,200,180,0.38) !important;
}
[data-testid="stButton"] > button:active { transform: translateY(0) !important; }

[data-testid="stDownloadButton"] > button {
    background: rgba(0,200,180,0.08) !important;
    color: #00C8B4 !important;
    font-family: 'DM Mono', monospace !important;
    font-size: 0.78rem !important;
    border: 1px solid rgba(0,200,180,0.3) !important;
    border-radius: 10px !important;
    padding: 0.55rem 1.4rem !important;
    transition: background 0.2s, border-color 0.2s !important;
}
[data-testid="stDownloadButton"] > button:hover {
    background: rgba(0,200,180,0.14) !important;
    border-color: rgba(0,200,180,0.55) !important;
}

[data-testid="stAlert"] {
    border-radius: 10px !important;
    font-family: 'DM Mono', monospace !important;
    font-size: 0.78rem !important;
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
    box-shadow: 0 0 40px rgba(0,200,180,0.08);
    position: relative; z-index: 1;
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

.footer {
    margin-top: 3.5rem; text-align: center; font-size: 0.6rem;
    letter-spacing: 0.18em; color: #1E3040; text-transform: uppercase;
    position: relative; z-index: 1;
}
.sidebar-badge {
    display: inline-block; background: rgba(0,200,180,0.1); color: #00C8B4;
    font-size: 0.6rem; letter-spacing: 0.2em; padding: 0.25rem 0.7rem;
    border-radius: 99px; border: 1px solid rgba(0,200,180,0.25);
    margin-bottom: 1rem; text-transform: uppercase;
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
</style>
"""
st.markdown(SHARED_CSS, unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  LOGIN PAGE
# ══════════════════════════════════════════════════════════════════════════════
if not st.session_state.logged_in:

    st.markdown("""
    <style>
    .block-container { padding: 0 !important; max-width: 100% !important; }
    </style>
    """, unsafe_allow_html=True)

    LOGIN_HTML = """
    <!DOCTYPE html><html>
    <head>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:transparent;font-family:'DM Mono',monospace;color:#C8D6E5;}
    .hero {
        display:flex; flex-direction:column; align-items:center;
        padding: 3.5rem 1.5rem 2rem; text-align:center; position:relative;
    }
    .badge {
        display:inline-flex; align-items:center; gap:0.4rem;
        background:rgba(0,200,180,0.10); color:#00C8B4;
        font-size:0.62rem; letter-spacing:0.28em; text-transform:uppercase;
        padding:0.3rem 0.9rem; border-radius:99px;
        border:1px solid rgba(0,200,180,0.28); margin-bottom:1.6rem;
    }
    .dot { width:6px;height:6px;border-radius:50%;background:#00C8B4;
           animation:pulse 2s ease-in-out infinite; }
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(0.7);}}
    .logo {
        font-family:'Syne',sans-serif; font-size:clamp(2.6rem,7vw,3.8rem);
        font-weight:800; letter-spacing:-0.03em; line-height:1;
        color:#EEF4FF; margin-bottom:0.6rem;
    }
    .logo span{color:#00C8B4;}
    .tagline { font-size:0.78rem; color:#3A5A70; letter-spacing:0.08em; margin-bottom:2.2rem; }
    .stats { display:flex; gap:1rem; margin-bottom:2.4rem; justify-content:center; flex-wrap:wrap; }
    .stat {
        background:rgba(0,200,180,0.05); border:1px solid rgba(0,200,180,0.14);
        border-radius:10px; padding:0.55rem 1.1rem; text-align:center;
    }
    .stat-val { font-family:'Syne',sans-serif; font-size:1.15rem; font-weight:700; color:#00C8B4; }
    .stat-lbl { font-size:0.58rem; letter-spacing:0.18em; color:#3A5A70; text-transform:uppercase; margin-top:0.1rem; }
    .card {
        width:100%; max-width:420px;
        background:rgba(10,14,22,0.85);
        border:1px solid rgba(0,200,180,0.16);
        border-radius:20px; padding:2.2rem 2rem 2rem;
        position:relative; overflow:hidden;
        backdrop-filter:blur(12px);
        box-shadow: 0 0 0 1px rgba(0,200,180,0.04),
                    0 20px 60px rgba(0,0,0,0.5),
                    0 0 80px rgba(0,200,180,0.04);
    }
    .card::before {
        content:''; position:absolute; top:0; left:0; right:0; height:2px;
        background:linear-gradient(90deg,transparent,#00C8B4,transparent);
    }
    .card-title { font-family:'Syne',sans-serif; font-size:1.15rem; font-weight:700; color:#EEF4FF; margin-bottom:0.3rem; }
    .card-sub { font-size:0.68rem; color:#3A5060; letter-spacing:0.06em; margin-bottom:1.8rem; }
    .features { display:flex; flex-direction:column; gap:0.55rem; margin-bottom:2rem; }
    .feat {
        display:flex; align-items:center; gap:0.65rem;
        background:rgba(0,200,180,0.04); border:1px solid rgba(0,200,180,0.10);
        border-radius:9px; padding:0.55rem 0.85rem;
        font-size:0.7rem; color:#4A7080; letter-spacing:0.04em;
    }
    .feat-icon { font-size:0.9rem; }
    .feat strong { color:#8ABFC8; font-weight:500; }
    .sep { height:1px; background:linear-gradient(90deg,transparent,rgba(0,200,180,0.18),transparent); margin:1.5rem 0; }
    .signin-lbl { font-size:0.6rem; letter-spacing:0.28em; color:#3A5060; text-transform:uppercase; margin-bottom:1.2rem; }
    .disclaimer { margin-top:1.6rem; font-size:0.6rem; color:#1E3040; letter-spacing:0.06em; text-align:center; line-height:1.6; }
    </style>
    </head>
    <body>
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
                <div class="feat"><span class="feat-icon">📄</span><span>One-click <strong>PDF report</strong> generation</span></div>
            </div>
            <div class="sep"></div>
            <div class="signin-lbl">Sign in to continue</div>
        </div>
        <div class="disclaimer">
            NeuroScan AI · Research prototype · Not for clinical use<br>
            © 2025 · For educational and research purposes only
        </div>
    </div>
    </body></html>
    """

    components.html(LOGIN_HTML, height=680, scrolling=False)

    col_l, col_m, col_r = st.columns([1, 2, 1])
    with col_m:
        st.markdown("""
        <style>[data-testid="stTextInput"] { margin-bottom: 0.4rem; }</style>
        """, unsafe_allow_html=True)

        username = st.text_input("Username", placeholder="Enter username")
        password = st.text_input("Password", type="password", placeholder="Enter password")

        if st.button("Sign In →"):
            if username == "admin" and password == "brain123":
                st.session_state.logged_in = True
                st.rerun()
            else:
                st.error("Invalid credentials. Please try again.")

    st.markdown("""
    <div style="text-align:center;margin-top:1rem;font-size:0.6rem;
                color:#1E3040;letter-spacing:0.15em;text-transform:uppercase;
                position:relative;z-index:1;">
        NeuroScan AI · Research Prototype · Not for Clinical Use
    </div>""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN APP
# ══════════════════════════════════════════════════════════════════════════════
else:

    st.markdown("""
    <style>
    .block-container { padding: 2.5rem 2rem 4rem !important; max-width: 780px !important; }
    </style>
    """, unsafe_allow_html=True)

    # ── Sidebar ────────────────────────────────────────────────────────────────
    with st.sidebar:
        st.markdown('<span class="sidebar-badge">v2.1 · CNN + Grad-CAM</span>', unsafe_allow_html=True)
        st.markdown("## NeuroScan AI")
        st.markdown("""
A deep learning classifier trained on contrast-enhanced MRI scans to identify four neurological conditions.

**Detectable classes**
- Glioma
- Meningioma
- Pituitary adenoma
- No tumor

**Input spec**
JPG / PNG · 128 × 128 px internal

**Architecture**
CNN trained on 3,000+ labelled MRI samples.

**New · Grad-CAM**
Highlights the exact brain region the AI focused on.

---
*For research and educational use only. Not a clinical diagnostic tool.*
""")
        st.markdown("---")
        if st.button("🚪 Sign Out"):
            st.session_state.logged_in = False
            st.rerun()

    # ── Header ─────────────────────────────────────────────────────────────────
    st.markdown("""
    <div class="header-wrap">
        <div class="header-eyebrow">Deep Learning · MRI Analysis · Grad-CAM XAI</div>
        <div class="header-title">Neuro<span>Scan</span> AI</div>
        <div class="header-sub">Upload a brain MRI scan — get an instant classification + heatmap</div>
    </div>
    <div class="divider"></div>
    """, unsafe_allow_html=True)

    # ── TFLite model (for fast prediction) ────────────────────────────────────
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

    # ── Keras model (for Grad-CAM only) ───────────────────────────────────────
    @st.cache_resource
    def load_keras_model():
        base_model = tf.keras.applications.MobileNetV2(
            weights='imagenet', include_top=False, input_shape=(128, 128, 3)
        )
        base_model.trainable = False
        model = tf.keras.Sequential([
            base_model,
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dense(4, activation='softmax')
        ])
        model.load_weights("models/brain_tumor_model.h5", by_name=False, skip_mismatch=True)
        return model

    # ── Grad-CAM function ──────────────────────────────────────────────────────
    def compute_gradcam(keras_model, img_array, pred_idx):
        # Target last conv layer of MobileNetV2
        last_conv_layer = keras_model.get_layer('mobilenetv2_1.00_128')
        last_conv_output = last_conv_layer.get_layer('out_relu').output

        grad_model = tf.keras.models.Model(
            inputs=keras_model.input,
            outputs=[last_conv_output, keras_model.output]
        )

        with tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(img_array, training=False)
            class_score = predictions[:, pred_idx]

        grads   = tape.gradient(class_score, conv_outputs)
        weights = tf.reduce_mean(grads, axis=(0, 1, 2))
        cam     = tf.reduce_sum(tf.multiply(weights, conv_outputs[0]), axis=-1)
        cam     = tf.nn.relu(cam).numpy()
        cam     = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam

    def overlay_gradcam(pil_img, cam):
        # Resize CAM to image size
        cam_resized = cv2.resize(cam, (pil_img.width, pil_img.height))
        cam_uint8   = np.uint8(255 * cam_resized)

        # Apply jet colormap
        colormap  = plt.get_cmap('jet')
        heatmap   = np.uint8(colormap(cam_uint8 / 255.0) * 255)[..., :3]

        # Overlay on original
        original  = np.array(pil_img.convert("RGB"), dtype=np.float32)
        overlay   = (0.45 * heatmap + 0.55 * original).astype(np.uint8)
        return Image.fromarray(overlay), Image.fromarray(heatmap)

    # ── PDF ────────────────────────────────────────────────────────────────────
    def generate_pdf_report(predicted_cls, confidence):
        buffer = BytesIO()
        doc    = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elems  = []
        elems.append(Paragraph("<b>NeuroScan AI - MRI Analysis Report</b>", styles['Title']))
        elems.append(Spacer(1, 20))
        elems.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['BodyText']))
        elems.append(Spacer(1, 20))
        elems.append(Paragraph(f"<b>Prediction:</b> {predicted_cls}", styles['Heading2']))
        elems.append(Paragraph(f"<b>Confidence Score:</b> {confidence:.2f}", styles['BodyText']))
        elems.append(Spacer(1, 20))
        elems.append(Paragraph(
            "This AI-generated result is for educational and research purposes only. "
            "Please consult a qualified medical professional for clinical diagnosis.",
            styles['BodyText']
        ))
        doc.build(elems)
        buffer.seek(0)
        return buffer

    # ── Labels ─────────────────────────────────────────────────────────────────
    class_names   = ['glioma', 'meningioma', 'notumor', 'pituitary']
    class_display = {'glioma':'Glioma','meningioma':'Meningioma','notumor':'No Tumor','pituitary':'Pituitary'}
    class_colors  = {'glioma':'#FF6B6B','meningioma':'#FFB347','notumor':'#00C8B4','pituitary':'#7B8CDE'}

    # ── Upload ─────────────────────────────────────────────────────────────────
    st.markdown('<span class="upload-label">MRI scan image</span>', unsafe_allow_html=True)
    uploaded_file = st.file_uploader("", type=["jpg","jpeg","png"], label_visibility="collapsed")

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
            prediction = [predict(model, img_array)]

        probs         = prediction[0]
        predicted_idx = int(np.argmax(probs))
        predicted_cls = class_names[predicted_idx]
        pct           = int(probs[predicted_idx] * 100)
        accent        = class_colors[predicted_cls]

        # ── Chips ──────────────────────────────────────────────────────────────
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

        card_html = f"""<!DOCTYPE html><html>
        <head>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
        *{{box-sizing:border-box;margin:0;padding:0;}}
        body{{background:transparent;font-family:'DM Mono',monospace;color:#C8D6E5;}}
        .card{{border:1px solid {accent}33;border-radius:16px;background:{accent}08;
               padding:1.8rem 2rem;position:relative;overflow:hidden;}}
        .card::before{{content:'';position:absolute;top:0;left:0;right:0;height:2px;
                       background:linear-gradient(90deg,transparent,{accent},transparent);}}
        .tag{{font-size:0.6rem;letter-spacing:0.3em;text-transform:uppercase;color:{accent};margin-bottom:0.5rem;}}
        .label{{font-family:'Syne',sans-serif;font-size:2.2rem;font-weight:800;color:{accent};letter-spacing:-0.02em;}}
        .conf-row{{display:flex;align-items:center;gap:1rem;margin-top:1.4rem;}}
        .conf-lbl{{font-size:0.65rem;color:#3A5060;letter-spacing:0.12em;min-width:80px;text-transform:uppercase;}}
        .track{{flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;}}
        .fill{{height:100%;border-radius:99px;background:linear-gradient(90deg,{accent}88,{accent});
               width:0%;transition:width 1.2s cubic-bezier(.4,0,.2,1);}}
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

        components.html(card_html, height=300, scrolling=False)

        # ── Grad-CAM Section ───────────────────────────────────────────────────
        st.markdown("""
        <div style="margin-top:2rem;margin-bottom:0.8rem;">
            <span style="font-size:0.68rem;letter-spacing:0.25em;text-transform:uppercase;
                         color:#3A5A70;">🔥 Grad-CAM · AI Attention Heatmap</span>
        </div>
        """, unsafe_allow_html=True)

        with st.spinner("Generating Grad-CAM heatmap…"):
            try:
                keras_model = load_keras_model()
                cam         = compute_gradcam(keras_model, img_array, predicted_idx)
                overlay_img, heatmap_img = overlay_gradcam(img, cam)

                col_a, col_b = st.columns(2)
                with col_a:
                    st.markdown('<p style="font-size:0.65rem;letter-spacing:0.2em;color:#3A5060;text-transform:uppercase;margin-bottom:0.4rem;">Original MRI</p>', unsafe_allow_html=True)
                    st.image(img, use_container_width=True)
                with col_b:
                    st.markdown('<p style="font-size:0.65rem;letter-spacing:0.2em;color:#3A5060;text-transform:uppercase;margin-bottom:0.4rem;">Grad-CAM Overlay</p>', unsafe_allow_html=True)
                    st.image(overlay_img, use_container_width=True)

                # Explanation card
                st.markdown(f"""
                <div style="padding:1rem 1.4rem;border-radius:12px;
                            background:rgba(0,200,180,0.04);
                            border:1px solid rgba(0,200,180,0.15);
                            margin-top:0.8rem;font-size:0.72rem;color:#4A7080;line-height:1.8;">
                    🔴 <strong style="color:#EEF4FF;">Red/Yellow regions</strong> — areas the AI focused on most<br>
                    🔵 <strong style="color:#EEF4FF;">Blue/Green regions</strong> — less relevant areas<br>
                    <span style="color:#3A5060;font-size:0.65rem;">
                        Grad-CAM uses gradients from the last convolutional layer to show which pixels
                        most influenced the <strong style="color:{accent};">{class_display[predicted_cls]}</strong> prediction.
                    </span>
                </div>
                """, unsafe_allow_html=True)

            except Exception as e:
                st.info(f"Grad-CAM unavailable: {e}")

        # ── PDF ───────────────────────────────────────────────────────────────
        pdf_file = generate_pdf_report(predicted_cls, float(probs[predicted_idx]))
        st.download_button(
            label="📄 Download MRI Report",
            data=pdf_file,
            file_name="NeuroScan_Report.pdf",
            mime="application/pdf"
        )

        if predicted_cls != "notumor":
            st.warning("⚠  Anomaly detected. This result is for informational purposes only — "
                       "please consult a qualified radiologist or neurologist for clinical evaluation.")
        else:
            st.success("✓  No tumor indicators detected in this scan.")

    else:
        st.markdown("""
        <div style="text-align:center;padding:3rem 1.5rem;
                    border:1px dashed rgba(0,200,180,0.12);border-radius:16px;
                    margin-top:1rem;position:relative;z-index:1;
                    background:rgba(0,200,180,0.02);">
            <div style="font-size:2.5rem;margin-bottom:0.8rem;opacity:0.25;">🔬</div>
            <div style="font-family:'Syne',sans-serif;font-size:0.95rem;font-weight:700;
                        color:#1E4050;letter-spacing:0.04em;margin-bottom:0.4rem;">
                No scan uploaded
            </div>
            <div style="font-size:0.68rem;letter-spacing:0.18em;text-transform:uppercase;color:#1A3040;">
                Drop a JPG or PNG MRI image above to begin
            </div>
        </div>""", unsafe_allow_html=True)

    st.markdown('<div class="footer">NeuroScan AI · Research prototype · Not for clinical use</div>',
                unsafe_allow_html=True)