import Link from 'next/link';

export function BrandLockup({ href = '/' }: { href?: string }) {
  return (
    <Link className="brand-lockup" href={href} aria-label="RollinDD home">
      <span className="brand-eye" aria-hidden="true" />
      <span className="wordmark" aria-hidden="true">RollinD<span>D</span></span>
    </Link>
  );
}
