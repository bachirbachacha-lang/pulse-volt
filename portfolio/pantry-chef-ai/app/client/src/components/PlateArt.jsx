// Draws a plate of food from four colours. No photos are used anywhere in the app.
// The same recipe always gets the same picture, because the "random" positions
// are worked out from the recipe's id (the seed).
export default function PlateArt({ colors, seed = 1 }) {
  const [background, base, toppingA, toppingB] = colors;

  let s = seed * 9301 + 49297;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280; // a number between 0 and 1
  };

  const toppings = [];
  for (let i = 0; i < 8; i++) {
    const angle = i * 0.785 + next() * 0.6;
    const distance = 8 + next() * 18;
    toppings.push(
      <circle key={i} cx={80 + Math.cos(angle) * distance} cy={60 + Math.sin(angle) * distance}
        r={4 + next() * 5} fill={i % 2 ? toppingA : toppingB} />,
    );
  }

  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="160" height="120" fill={background} />
      <ellipse cx="80" cy="66" rx="50" ry="48" fill="rgba(42,26,46,.10)" />
      <circle cx="80" cy="60" r="47" fill="#fff" />
      <circle cx="80" cy="60" r="46" fill="none" stroke="#E6D8C6" strokeWidth="2" />
      <circle cx="80" cy="60" r="35" fill={base} />
      {toppings}
    </svg>
  );
}
