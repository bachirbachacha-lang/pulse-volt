// Turns whatever a person types ("2 Tomatoes", "fresh ginger", "scallions")
// into one simple word the app can compare ("tomato", "ginger", "spring onion").
// We call that simple word the "key".

// Things almost every kitchen has. A recipe never counts these as "missing".
export const STAPLES = new Set(['salt', 'water', 'black pepper']);

// Words that describe an ingredient but do not change what it is.
const DESCRIBERS = new Set(['fresh', 'chopped', 'ground', 'cooked', 'plain', 'dried', 'tinned', 'canned', 'ripe', 'soft', 'some', 'a', 'an', 'the', 'of']);

// Different names for the same thing. Left side: what people type. Right side: our key.
const SAME_AS = {
  'scallion': 'spring onion', 'green onion': 'spring onion',
  'spaghetti': 'pasta', 'penne': 'pasta', 'macaroni': 'pasta',
  'chicken breast': 'chicken', 'chicken thigh': 'chicken',
  'lentil': 'lentils', 'red lentil': 'lentils',
  'chickpea': 'chickpeas', 'garbanzo bean': 'chickpeas',
  'capsicum': 'bell pepper', 'sweet pepper': 'bell pepper',
  'chilli': 'green chilli', 'chili': 'green chilli', 'green chili': 'green chilli',
  'yoghurt': 'yogurt', 'greek yogurt': 'yogurt',
  'oat': 'oats', 'rolled oat': 'oats', 'porridge oat': 'oats',
  'date': 'dates', 'almond': 'almonds',
  'oil': 'vegetable oil', 'sunflower oil': 'vegetable oil',
  'cocoa powder': 'cocoa', 'flatbread': 'flatbread', 'pita': 'flatbread', 'pitta': 'flatbread', 'tortilla': 'flatbread', 'wrap': 'flatbread',
  'pepper': 'black pepper',
};

// "tomatoes" -> "tomato", "berries" -> "berry", "eggs" -> "egg"
function singular(word) {
  if (word.length > 4 && word.endsWith('oes')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function toKey(text) {
  if (typeof text !== 'string') return '';
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s-]/gu, ' ') // drop numbers and punctuation
    .split(/\s+/)
    .filter((w) => w && !DESCRIBERS.has(w));
  if (words.length === 0) return '';
  words[words.length - 1] = singular(words[words.length - 1]);
  const key = words.join(' ');
  return SAME_AS[key] ?? key;
}

// "I have eggs, rice and 2 spring onions" -> ["eggs", "rice", "spring onions"]
export function parseIngredientText(text) {
  if (typeof text !== 'string') return [];
  const cleaned = text
    .toLowerCase()
    .replace(/^(what can i (make|cook) with|i have got|i've got|i have|we have|there is|there are|with)\s+/i, '');
  const seen = new Set();
  const out = [];
  for (const piece of cleaned.split(/,|;|\n|&|\+|\band\b/)) {
    const name = piece.replace(/[^\p{L}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
    const key = toKey(name);
    if (!key || name.length > 40 || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= 30) break;
  }
  return out;
}
