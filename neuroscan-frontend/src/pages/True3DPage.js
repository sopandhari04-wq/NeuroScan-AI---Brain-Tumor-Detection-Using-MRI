import True3DViewer from './True3DViewer'
import volumeData from '../data/brats_3d_volume.json'

export default function True3DPage() {
  return (
    <div style={{ paddingTop: 'calc(var(--nav-h) + 2.5rem)', padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.2)', borderRadius: '99px', padding: '0.2rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FF5757', marginBottom: '0.75rem' }}>
          🧠 True 3D · Research Validation
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
          Volumetric <span style={{ color: '#FF5757' }}>3D Segmentation</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.6rem', lineHeight: 1.7, maxWidth: 680 }}>
          Unlike the single-slice 2D Grad-CAM analysis used in routine scans, this demo uses a pretrained
          MONAI SegResNet model run against a real, properly co-registered 4-modality BraTS case
          (T1, T1ce, T2, FLAIR) to produce a genuine volumetric reconstruction — validated against
          expert ground-truth annotation with real Dice coefficients.
        </p>
      </div>

      <True3DViewer volumeData={volumeData} />

      <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.2rem 1.4rem', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.6rem' }}>
          Why This Differs From Routine Scans
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.8 }}>
          Your everyday scan through NeuroScan's Scanner page uses a single 2D MRI slice and Grad-CAM-based
          attention mapping — fast, lightweight, and clinically useful for classification, but inherently
          an approximation of tumor extent. True volumetric segmentation requires a complete multi-modal
          DICOM series (4 co-registered sequences per patient) and a 3D convolutional model, which is
          significantly heavier to run. This page demonstrates that pipeline working end-to-end on real,
          publicly available BraTS research data as a proof of concept for what full deployment would
          require in a production clinical setting.
        </p>
      </div>
    </div>
  )
}