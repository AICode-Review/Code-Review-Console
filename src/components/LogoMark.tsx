/** The Scrutinye brand mark — an eye, tying "Scrutiny" + "eye" together. Uses currentColor
 * for both the outline and pupil so it inherits whatever text color its container sets,
 * matching the favicon (console/public/favicon.svg) at a fixed size instead. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path
        d="M2 12C2 12 6.5 6 12 6C17.5 6 22 12 22 12C22 12 17.5 18 12 18C6.5 18 2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}
