// Tests for the password checker and the passphrase maker (shared/password.js).
// The checker runs in the browser, but it is plain JavaScript, so it can be tested here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkPassword, findSequence, makePassphrase } from '../../shared/password.js';
import { WORDS } from '../../shared/words.js';

const score = (p) => checkPassword(p).score;
const failed = (p) => checkPassword(p).checks.filter((c) => !c.ok).map((c) => c.text).join(' | ');

test('an empty box gives no result', () => {
  assert.equal(checkPassword(''), null);
  assert.equal(checkPassword(undefined), null);
});

test('very common passwords score 0, also in capitals', () => {
  for (const p of ['123456', 'password', 'PASSWORD', 'qwerty', 'iloveyou', 'Password123']) {
    assert.equal(score(p), 0, p);
    assert.match(failed(p), /most used passwords/, p);
  }
});

test('swapping letters for symbols does not hide a common word', () => {
  assert.equal(score('P@ssw0rd!'), 0);
  assert.match(failed('P@ssw0rd!'), /common word \(password\)/);
  assert.match(failed('W3lc0me-home-again'), /common word \(welcome\)/);
});

test('anything shorter than 8 characters scores 0', () => {
  assert.equal(score('xK9$mQ2'), 0);
  assert.equal(checkPassword('a').checks[0].text, '1 character. Aim for 14 or more.');
});

test('a season plus a year plus a symbol is weak', () => {
  assert.equal(checkPassword('Summer2024!').label, 'Weak');
  assert.match(failed('Summer2024!'), /year \(2024\)/);
  assert.match(failed('Summer2024!'), /common word \(summer\)/);
});

test('keyboard and alphabet runs are found, forwards and backwards', () => {
  assert.equal(findSequence('xxqwerxx'), 'qwer');
  assert.equal(findSequence('my-ABCD-pass'), 'abcd');
  assert.equal(findSequence('code9876'), '9876');
  assert.equal(findSequence('lkjh-and-more'), 'lkjh');
  assert.equal(findSequence('abc-123-xyz'), null); // runs of 3 are allowed
  assert.equal(findSequence('copper-lantern'), null);
});

test('one letter repeated is long but not strong', () => {
  assert.ok(score('aaaaaaaaaaaaaaaaaaaaaa') <= 1);
  assert.match(failed('aaaaaaaaaaaaaaaaaaaaaa'), /Repeats/);
});

test('a four-word passphrase is very strong with nothing to fix', () => {
  const result = checkPassword('copper-lantern-orbit-meadow');
  assert.equal(result.score, 4);
  assert.equal(result.label, 'Very strong');
  assert.ok(result.checks.every((c) => c.ok));
});

test('a long random password is very strong; a medium one is in between', () => {
  assert.equal(score('xK9$mQ2!vL7@pR4z'), 4);
  assert.equal(score('G7!rm2Qx9pLw'), 3);
  assert.ok(score('Tr7#kLp9') <= 1); // 8 characters is short, however random
});

test('longer is never weaker when nothing else changes', () => {
  let last = -1;
  for (const p of ['kv', 'kvmzpwhq', 'kvmzpwhqtn', 'kvmzpwhqtnrbcy', 'kvmzpwhqtnrbcyjfdgls']) {
    assert.ok(score(p) >= last, p);
    last = score(p);
  }
  assert.equal(last, 4);
});

test('Arabic and emoji are counted as characters and do not crash', () => {
  const arabic = checkPassword('قهوة-مصباح-نهر-سحاب');
  assert.match(arabic.checks[0].text, /^19 characters/);
  assert.ok(checkPassword('🙂🙂🙂').score === 0);
});

test('every result has a label, a summary and at least 3 checks', () => {
  for (const p of ['a', 'password', 'Summer2024!', 'copper-lantern-orbit-meadow', '          ']) {
    const r = checkPassword(p);
    assert.ok(['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'].includes(r.label));
    assert.ok(r.summary.length > 10);
    assert.ok(r.checks.length >= 3);
  }
});

test('the word list has 256 different plain words that do not trip the checker', () => {
  assert.equal(WORDS.length, 256);
  assert.equal(new Set(WORDS).size, 256);
  for (const w of WORDS) {
    assert.match(w, /^[a-z]{3,8}$/, w);
    assert.equal(findSequence(w), null, w);
    assert.ok(!/common word/.test(failed(w + '-zzzzzzzzzzzzzzzz')), w);
  }
});

test('makePassphrase: 4 different words joined by hyphens, using the random function it is given', () => {
  const queue = [0, 0, 5, 255, 7]; // the second 0 is a repeat and must be skipped
  const phrase = makePassphrase(WORDS, () => queue.shift());
  assert.equal(phrase, [WORDS[0], WORDS[5], WORDS[255], WORDS[7]].join('-'));
  assert.equal(makePassphrase(WORDS, (n) => Math.floor(Math.random() * n), 6).split('-').length, 6);
});

test('the checker file never talks to a server, storage or the console', () => {
  const code = fs.readFileSync(new URL('../../shared/password.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  for (const banned of ['fetch', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'console.', 'import ', 'WebSocket', 'sendBeacon', 'document.cookie']) {
    assert.ok(!code.includes(banned), `shared/password.js must not use ${banned}`);
  }
});
