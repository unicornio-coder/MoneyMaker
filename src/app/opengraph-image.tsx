import { ImageResponse } from 'next/og';

// Imagen que aparece al compartir el enlace. Colores de tokens.css: tinta #0B1F17, verde #16A34A y verde claro #4ADE80.
export const runtime = 'edge';
export const alt = 'MoneyMaker · Sabe cuánto te queda esta quincena';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Imagen() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B1F17', color: '#FFFFFF', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 800 }}>M</div>
          <div style={{ display: 'flex', marginLeft: 20, fontSize: 36, fontWeight: 700 }}>MoneyMaker</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>Tu dinero, claro.</div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 36, color: '#4ADE80' }}>Todas tus cuentas. Cada quincena. Sin darnos tus claves.</div>
        </div>
      </div>
    ),
    size,
  );
}
