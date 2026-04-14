import { type SVGProps } from 'react';

export function GooglePlayIcon({ className, ...props }: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      width="24"
      height="24"
      {...props}
    >
      <path d="M3.61 1.814c-.19.17-.31.45-.31.81v18.75c0 .36.12.64.31.81l.04.04L13.71 12.16v-.32L3.65 1.774l-.04.04z" />
      <path d="M17.07 15.52l-3.36-3.36v-.32l3.36-3.36.08.04 3.98 2.26c1.14.65 1.14 1.7 0 2.35l-3.98 2.26-.08.13z" />
      <path d="M17.15 15.39L13.71 11.94 3.61 22.04c.38.4.99.45 1.69.05l11.85-6.7z" />
      <path d="M17.15 8.56L5.3 1.87c-.7-.4-1.31-.35-1.69.05l10.1 10.1 3.44-3.46z" />
    </svg>
  );
}
