export function Brand() {
  return (
    <div className="brand" aria-label="ALPHA">
      <span className="brand-logo" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img" focusable="false">
          <rect className="brand-logo-tile" x="1" y="1" width="46" height="46" rx="12" />
          <path className="brand-logo-symbol" d="M10.2 35.5 21.35 15.9c1.18-2.08 4.12-2.08 5.3 0L37.8 35.5a2.15 2.15 0 0 1-1.88 3.22h-3.56L24 23.96l-8.36 14.76h-3.56a2.15 2.15 0 0 1-1.88-3.22Z" />
          <path className="brand-logo-symbol brand-logo-symbol-inner" d="M20.38 35.02 24 28.66l3.62 6.36a1.42 1.42 0 0 1-1.24 2.12h-4.76a1.42 1.42 0 0 1-1.24-2.12Z" />
        </svg>
      </span>
      <span className="brand-wordmark">ALPHA</span>
    </div>
  );
}
