'use client';

interface BrandLogoProps {
  variant?: 'hero' | 'compact';
  showText?: boolean;
}

export function BrandLogo({ variant = 'hero', showText = true }: BrandLogoProps) {
  const compact = variant === 'compact';

  return (
    <div className={`brand-logo ${compact ? 'brand-logo--compact' : 'brand-logo--hero'}`}>
      {showText ? (
        <span className="brand-logo__text">
          <small>Inventario universitario</small>
        </span>
      ) : null}
    </div>
  );
}