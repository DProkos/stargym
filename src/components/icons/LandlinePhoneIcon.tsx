import { type SVGProps } from 'react';

export function LandlinePhoneIcon({ className, ...props }: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width="24"
      height="24"
      {...props}
    >
      {/* Handset */}
      <rect x="6" y="2" width="12" height="6" rx="1" />
      {/* Base */}
      <rect x="4" y="14" width="16" height="8" rx="2" />
      {/* Cord */}
      <path d="M9 8v6M15 8v6" />
      {/* Dial buttons */}
      <circle cx="8" cy="18" r="0.5" fill="currentColor" />
      <circle cx="12" cy="18" r="0.5" fill="currentColor" />
      <circle cx="16" cy="18" r="0.5" fill="currentColor" />
    </svg>
  );
}
