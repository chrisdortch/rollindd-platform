import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RollinDD Playlist Premiere';
export const size = {
  width: 1200,
  height: 630
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(135deg, #050608 0%, #12151a 50%, #071d26 100%)',
          color: '#f7f1e3',
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div
              style={{
                width: 112,
                height: 112,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 999,
                border: '4px solid #f2c75b',
                background: 'linear-gradient(135deg, #f2b93d 0%, #f7f7f0 46%, #142b3d 48%, #050608 100%)',
                boxShadow: '0 0 0 2px rgba(255,255,255,.62), 0 24px 70px rgba(215,168,79,.32)'
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: '#050608',
                  marginLeft: 58,
                  marginTop: 20
                }}
              />
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: '#ffd875',
                  marginLeft: 28,
                  marginTop: 12
                }}
              />
            </div>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, letterSpacing: 0 }}>
              <span>RollinD</span>
              <span style={{ color: '#ffd875' }}>D</span>
            </div>
          </div>
          <div style={{ color: '#ffd875', fontSize: 30, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
            Playlist Premiere
          </div>
          <div style={{ fontSize: 58, lineHeight: 1.02, fontWeight: 900 }}>
            Fearlessness, love, wisdom, patience, collaboration, and luminous resilience.
          </div>
          <div style={{ color: 'rgba(247,241,227,.7)', fontSize: 28 }}>
            Play productions, read words, and download MP3s.
          </div>
        </div>
        <div
          style={{
            width: 310,
            height: 470,
            borderRadius: 26,
            border: '2px solid rgba(255,255,255,.22)',
            background: 'linear-gradient(180deg, rgba(255,216,117,.9), rgba(18,21,26,.88) 45%, rgba(6,7,9,.95))',
            boxShadow: '0 35px 90px rgba(0,0,0,.38)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: 28
          }}
        >
          <div style={{ fontSize: 34, lineHeight: 1.05, fontWeight: 900 }}>
            7 Productions
          </div>
        </div>
      </div>
    ),
    size
  );
}
