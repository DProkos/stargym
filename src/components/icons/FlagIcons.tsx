// SVG flag components — render reliably on all platforms (Windows, macOS, Linux)

export const FlagGB = ({ className = "h-4 w-6" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 60 30"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="UK flag"
  >
    <clipPath id="fg-gb-s">
      <path d="M0,0 v30 h60 v-30 z" />
    </clipPath>
    <clipPath id="fg-gb-t">
      <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
    </clipPath>
    <g clipPath="url(#fg-gb-s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#fg-gb-t)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </g>
  </svg>
);

export const FlagGR = ({ className = "h-4 w-6" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 27 18"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Greek flag"
  >
    <rect width="27" height="18" fill="#0D5EAF" />
    <path
      d="M0,2 h27 M0,6 h27 M0,10 h27 M0,14 h27"
      stroke="#fff"
      strokeWidth="2"
    />
    <rect width="10" height="10" fill="#0D5EAF" />
    <path d="M0,4 h10 M4,0 v10" stroke="#fff" strokeWidth="2" />
  </svg>
);
