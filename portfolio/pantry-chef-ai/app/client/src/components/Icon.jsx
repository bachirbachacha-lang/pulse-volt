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
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.500 1.500 M17.500 17.500L19 19 M5 19l1.500-1.500 M17.500 6.500L19 5',
  bowl: 'M4 12h16a8 8 0 0 1-16 0z M9 20h6 M9 4v4 M13 3v5 M17 5v3',
  moon: 'M20 14.500A8 8 0 1 1 9.500 4a6.500 6.500 0 0 0 10.500 10.500z',
  cookie: 'M12 3a9 9 0 1 0 9 9 4 4 0 0 1-5-5 4 4 0 0 1-4-4z M9 10h.01 M8 15h.01 M13 16h.01 M14 11h.01',
  cake: 'M5 20h14v-7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z M5 16c2 1.500 3 1.500 4.700 0s3-1.500 4.600 0 2.700 1.500 4.700 0 M12 11V7 M12 4v.5',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 19a6 6 0 0 1 12 0 M16 5.500a3 3 0 0 1 0 5.500 M17 14a6 6 0 0 1 4 5',
  flame: 'M12 3c1 4 5 5.500 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .5 1.500 1 2 2 2 0-3-1-5 1-8z',
  play: 'M8 5l11 7-11 7z',
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
