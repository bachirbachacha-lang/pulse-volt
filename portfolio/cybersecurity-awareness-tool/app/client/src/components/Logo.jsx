// The Latchlight mark: a keyhole (the latch) with three rays above it (the light).
export default function Logo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#1E6B57" />
      <g stroke="#E8A33A" strokeWidth="4" strokeLinecap="round">
        <path d="M32 8v6" />
        <path d="M16.5 14.5l4 4.5" />
        <path d="M47.5 14.5l-4 4.5" />
      </g>
      <path fill="#F7F4EC" d="M32 22a10 10 0 0 1 5.6 18.3L41 54H23l3.4-13.7A10 10 0 0 1 32 22z" />
    </svg>
  );
}
