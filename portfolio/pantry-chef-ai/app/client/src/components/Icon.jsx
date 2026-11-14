// Line icons drawn for this project. Each one is a single SVG path.
const PATHS = {
  home: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z',
  explore: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M15.5 8.5l-2 5-5 2 2-5z',
  chef: 'M5 12h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z M3 12h18 M12 2.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1L9 6.400l2.100-.9z',
  heart: 'M12 20s-7-4.400-7-10a4 4 0 0 1 7-2.600A4 4 0 0 1 19 10c0 5.600-7 10-7 10z',
  pantry: 'M8 3h8v3H8z M7 6h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M5 12h14',
  search: 'M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M20 20l-4.500-4.500',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M12 8v4l3 2',
  level: 'M5 19v-4 M12 19V10 M19 19V5',
  back: 'M15 5l-7 7 7 7',
  send: 'M5 12h13 M13 6l6 6-6 6',
  shuffle: 'M4 7h3c5 0 5 10 10 10h3 M4 17h3c1.500 0 2.600-.9 3.500-2.200 M20 7h-3c-1.500 0-2.600.9-3.500 2.200 M17 4l3 3-3 3 M17 14l3 3-3 3',
  calendar: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M4 10h16 M8 3v4 M16 3v4',
  check: 'M5 12.500l4.500 4.500L19 7.500',
  x: 'M6 6l12 12 M18 6L6 18',
  plus: 'M12 5v14 M5 12h14',
};

// aria-hidden: screen readers skip the icon, because the words next to it already say what it is.
export default function Icon({ name, filled = false }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
