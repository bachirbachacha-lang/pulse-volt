// Simple line icons drawn for this project. <Icon name="mail" />
const PATHS = {
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M8 7h7M8 11h5" /></>,
  quiz: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.7M12 17h.01" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  key: <><circle cx="8" cy="14" r="4" /><path d="M11 11l8-8M16 6l3 3M14 8l2 2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  cross: <path d="M6 6l12 12M18 6L6 18" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></>,
  device: <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18h2" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
};

// Which icon and badge colour each topic uses.
export const TOPIC_LOOK = {
  phishing: { icon: 'mail', badge: '' },
  passwords: { icon: 'key', badge: 'b2' },
  browsing: { icon: 'globe', badge: 'b3' },
  devices: { icon: 'device', badge: 'b4' },
};

export default function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export function TopicBadge({ topicId }) {
  const look = TOPIC_LOOK[topicId] ?? { icon: 'book', badge: 'b4' };
  return <span className={`badge ${look.badge}`}><Icon name={look.icon} /></span>;
}
