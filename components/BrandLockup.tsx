import Link from 'next/link';

export function BrandLockup({ href = '/' }: { href?: string }) {
  return (
    <Link className="brand-lockup" href={href} aria-label="RollinDD home">
      <span className="brand-eye" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/rollindd-eye.svg" alt="" width="120" height="120" />
      </span>
      <span className="wordmark" aria-hidden="true">RollinD<span>D</span></span>
    </Link>
  );
}
