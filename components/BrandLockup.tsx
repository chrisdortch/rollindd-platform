import Image from 'next/image';
import Link from 'next/link';

export function BrandLockup({ href = '/' }: { href?: string }) {
  return (
    <Link className="brand-lockup" href={href} aria-label="RollinDD home">
      <Image className="brand-eye" src="/brand/rollindd-eye.svg" alt="" width={64} height={64} priority unoptimized />
      <span className="wordmark" aria-hidden="true">RollinD<span>D</span></span>
    </Link>
  );
}
