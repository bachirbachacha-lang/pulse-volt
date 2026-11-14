// The password checker. It runs ONLY in the browser.
// Nothing in this file talks to the server, saves anything, or writes to the console.
// It is in the "shared" folder so the backend tests can test it too.
//
// It gives an ESTIMATE. It cannot know whether a password has leaked or is reused.

// A short list of passwords that appear at the top of every "most used" list.
const VERY_COMMON = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890', '111111', '000000', '123123', '654321', '112233',
  'password', 'password1', 'password123', 'passw0rd', 'qwerty', 'qwerty123', 'qwertyuiop', 'abc123', 'abcd1234', '1q2w3e4r',
  'letmein', 'welcome', 'welcome1', 'admin', 'admin123', 'iloveyou', 'monkey', 'dragon', 'football', 'sunshine',
  'princess', 'secret', 'login', 'master', 'hello123', 'changeme', 'default', 'guest', 'asdfghjkl', 'zxcvbnm',
]);

// Ordinary words that show up inside weak passwords.
const COMMON_WORDS = [
  'password', 'welcome', 'qwerty', 'admin', 'login', 'letmein', 'iloveyou', 'summer', 'winter', 'spring', 'autumn',
  'monday', 'friday', 'january', 'football', 'student', 'school', 'college', 'secret', 'hello', 'love',
];

const ROWS = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

// Undo the usual letter swaps so that "P@ssw0rd" is seen as "password".
function unswap(text) {
  const swaps = { '@': 'a', '4': 'a', '0': 'o', '1': 'l', '!': 'i', '3': 'e', '$': 's', '5': 's', '7': 't' };
  return text.toLowerCase().replace(/[@40!13$57]/g, (c) => swaps[c]);
}

// Finds runs like "abcd", "4321" or "qwer": 4 or more neighbours in a row, forwards or backwards.
export function findSequence(password) {
  const lower = password.toLowerCase();
  for (const row of ROWS) {
    const back = [...row].reverse().join('');
    for (let i = 0; i + 4 <= lower.length; i++) {
      const piece = lower.slice(i, i + 4);
      if (row.includes(piece) || back.includes(piece)) return piece;
    }
  }
  return null;
}

// How many different kinds of character are used: small letters, capitals, digits, anything else.
function kinds(password) {
  return [/\p{Ll}/u, /\p{Lu}/u, /\d/, /[^\p{L}\d]/u].filter((re) => re.test(password)).length;
}

// The main function.
// In:  the password as text
// Out: null for an empty box, or
//      { score: 0-4, label, summary, checks: [{ ok: true/false, text }] }
export function checkPassword(password) {
  if (typeof password !== 'string' || password.length === 0) return null;
  const length = [...password].length; // counts characters, also for Arabic or emoji
  const plain = unswap(password);
  const checks = [];

  // 1. Length
  if (length >= 14) checks.push({ ok: true, text: `${length} characters. Long is good.` });
  else checks.push({ ok: false, text: `${length} character${length === 1 ? '' : 's'}. Aim for 14 or more.` });

  // 2. Very common passwords (also after undoing letter swaps)
  const veryCommon = VERY_COMMON.has(password.toLowerCase()) || VERY_COMMON.has(plain);
  checks.push(veryCommon
    ? { ok: false, text: 'This is one of the most used passwords in the world.' }
    : { ok: true, text: 'Not in the list of very common passwords.' });

  // 3. Common words, including with swapped letters
  const word = COMMON_WORDS.find((w) => plain.includes(w));
  if (word && !veryCommon) checks.push({ ok: false, text: `Contains a common word (${word}). Swapping letters for symbols does not hide it.` });

  // 4. Years
  const year = password.match(/(19|20)\d\d/);
  if (year) checks.push({ ok: false, text: `Contains a year (${year[0]}).` });

  // 5. Runs on the keyboard or in the alphabet
  const sequence = findSequence(password);
  if (sequence) checks.push({ ok: false, text: `Contains a run of neighbours (${sequence}).` });

  // 6. The same character again and again
  const repeat = /(.)\1\1/u.test(password);
  if (repeat) checks.push({ ok: false, text: 'Repeats the same character three or more times.' });

  // 7. Variety
  const variety = kinds(password);
  const different = new Set(password).size;
  if (length >= 20 && different >= 8) checks.push({ ok: true, text: 'Long enough that mixing character types matters less.' });
  else if (variety >= 3) checks.push({ ok: true, text: 'Mixes several kinds of character.' });
  else checks.push({ ok: false, text: 'Uses only one or two kinds of character. Add length first, then variety.' });

  // ---- Turn the findings into a score from 0 to 4 -------------------------
  // Start from length, then take points away for each weakness found.
  let points = length >= 20 ? 4 : length >= 14 ? 3 : length >= 10 ? 2 : length >= 8 ? 1 : 0;
  if (variety >= 3 && length >= 10 && points < 4) points += 1;
  if (word) points -= 1;
  if (year) points -= 1;
  if (sequence) points -= 1;
  if (repeat) points -= 1;
  if (different <= 4) points -= 2; // "aaaaaaaaaaaaaaaaaaaa" is long but not strong
  if (veryCommon || length < 8) points = 0;
  const score = Math.max(0, Math.min(4, points));

  let summary;
  if (veryCommon) summary = 'Guessing tools try this one first.';
  else if (length < 8) summary = 'Too short. A tool can try every possibility quickly.';
  else if (score <= 1) summary = 'Built from patterns that guessing tools try early.';
  else if (score === 2) summary = 'Better than most, but more length would help.';
  else if (score === 3) summary = 'Good. Make sure it is used for one account only.';
  else summary = 'Long and hard to guess. Use it for one account only.';

  return { score, label: LABELS[score], summary, checks };
}

// Makes a passphrase from random words. "random(n)" must return a fair whole number from 0 to n-1.
// The browser passes in a function built on crypto.getRandomValues (see client/src/screens/Password.jsx).
export function makePassphrase(words, random, count = 4) {
  const picked = [];
  while (picked.length < count) {
    const word = words[random(words.length)];
    if (!picked.includes(word)) picked.push(word);
  }
  return picked.join('-');
}
