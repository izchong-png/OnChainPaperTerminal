interface OwlLogoProps {
  size?: number;
  className?: string;
}

export function OwlLogo({ size = 24, className = "" }: OwlLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
    >
      {/* Ear tufts */}
      <path d="M5 8L3.5 2.5L9 6.5Z" fill="#4ade80" />
      <path d="M19 8L20.5 2.5L15 6.5Z" fill="#4ade80" />
      {/* Body */}
      <ellipse cx="12" cy="14" rx="9" ry="9.5" fill="#4ade80" />
      {/* Belly */}
      <ellipse cx="12" cy="17" rx="5.5" ry="5" fill="#86efac" />
      {/* Left eye white */}
      <circle cx="8.5" cy="11.5" r="3.8" fill="white" />
      {/* Right eye white */}
      <circle cx="15.5" cy="11.5" r="3.8" fill="white" />
      {/* Left pupil */}
      <circle cx="9.2" cy="11.5" r="2.2" fill="#0f172a" />
      {/* Right pupil */}
      <circle cx="16.2" cy="11.5" r="2.2" fill="#0f172a" />
      {/* Eye shine left */}
      <circle cx="10" cy="10.5" r="0.9" fill="white" />
      {/* Eye shine right */}
      <circle cx="17" cy="10.5" r="0.9" fill="white" />
      {/* Beak */}
      <path d="M10.5 15L12 17.5L13.5 15Z" fill="#facc15" />
    </svg>
  );
}
