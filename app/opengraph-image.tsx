import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';

export const runtime = 'edge';
export const alt = 'RollinDD Playlist Premiere';
export const size = {
  width: 1200,
  height: 630
};
export const contentType = 'image/png';

const firstProductionCover = 'https://cdn2.suno.ai/5ee44892-74e9-4df9-af0f-84423051331c_1169a304.jpeg';

export default async function Image() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || 'rollindd-platform.vercel.app';
  const protocol = host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const logoUrl = `${protocol}://${host}/brand/rollindd-eye.svg`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#050608',
          color: '#f7f1e3',
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}
      >
        <img
          src={firstProductionCover}
          alt=""
          width="1200"
          height="630"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: .74
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'linear-gradient(90deg, rgba(5,6,8,.94) 0%, rgba(5,6,8,.72) 39%, rgba(5,6,8,.16) 100%), linear-gradient(180deg, rgba(5,6,8,.18), rgba(5,6,8,.82))'
          }}
        />
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 58
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: 610 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <img
                src={logoUrl}
                alt=""
                width="96"
                height="96"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  objectFit: 'cover',
                  background: '#050608',
                  boxShadow: '0 0 0 2px rgba(255,255,255,.48), 0 20px 50px rgba(0,0,0,.48)'
                }}
              />
              <div style={{ display: 'flex', fontSize: 62, fontWeight: 900, letterSpacing: 0 }}>
                <span>RollinD</span>
                <span style={{ color: '#ffd875' }}>D</span>
              </div>
            </div>
            <div style={{ color: '#ffd875', fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
              Playlist Premiere
            </div>
            <div style={{ fontSize: 56, lineHeight: 1.02, fontWeight: 900 }}>
              I. The Essence of Fearlessness
            </div>
            <div style={{ color: 'rgba(247,241,227,.82)', fontSize: 28, lineHeight: 1.18 }}>
              Fearlessness, love, wisdom, patience, collaboration, and luminous resilience.
            </div>
          </div>
          <div
            style={{
              width: 322,
              height: 500,
              display: 'flex',
              overflow: 'hidden',
              borderRadius: 24,
              border: '2px solid rgba(255,255,255,.34)',
              boxShadow: '0 35px 95px rgba(0,0,0,.58)'
            }}
          >
            <img
              src={firstProductionCover}
              alt=""
              width="322"
              height="500"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
