// The Potwise chef: a friendly cooking pot wearing a chef's hat. Drawn for this project.
export default function Mascot({ size = 56 }) {
  return (
    <svg className="mascot" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 22c-5 0-8-3.500-8-7.500S15.500 7 20 8c1.500-3.500 5-6 12-6s10.500 2.500 12 6c4.500-1 8 2.500 8 6.500S49 22 44 22z" fill="#fff" stroke="#16181D" strokeWidth="2.500" strokeLinejoin="round" />
      <rect x="19" y="20" width="26" height="6" rx="2" fill="#fff" stroke="#16181D" strokeWidth="2.500" />
      <path d="M12 32h40v12c0 8-6 14-14 14H26c-8 0-14-6-14-14z" fill="#FFC629" stroke="#16181D" strokeWidth="2.500" strokeLinejoin="round" />
      <path d="M6 34h6M52 34h6" stroke="#16181D" strokeWidth="2.500" strokeLinecap="round" />
      <circle cx="25" cy="42" r="2.600" fill="#16181D" />
      <circle cx="39" cy="42" r="2.600" fill="#16181D" />
      <path d="M27 49c3 3 7 3 10 0" fill="none" stroke="#16181D" strokeWidth="2.500" strokeLinecap="round" />
    </svg>
  );
}
