// Tests for the small pieces of logic: the score, the week chart, "what next",
// the sample coach, and the sample content itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { awarenessScore, weekActivity, nextStep, dayKey } from '../progress.js';
import { getCoachTip, topicProgress } from '../coach.js';
import { TOPICS, LESSONS, QUESTIONS, MESSAGES, SAMPLE_PROGRESS } from '../seed-data.js';

test('awarenessScore: nothing done is 0, everything done is 100', () => {
  assert.equal(awarenessScore({ lessonsDone: 0, lessonsTotal: 8, quizFractions: [0, 0, 0, 0], phishRight: 0, phishTotal: 10 }), 0);
  assert.equal(awarenessScore({ lessonsDone: 8, lessonsTotal: 8, quizFractions: [1, 1, 1, 1], phishRight: 10, phishTotal: 10 }), 100);
});

test('awarenessScore: lessons are half, quizzes a quarter, phish a quarter', () => {
  assert.equal(awarenessScore({ lessonsDone: 8, lessonsTotal: 8, quizFractions: [0, 0, 0, 0], phishRight: 0, phishTotal: 10 }), 50);
  assert.equal(awarenessScore({ lessonsDone: 0, lessonsTotal: 8, quizFractions: [1, 1, 1, 1], phishRight: 0, phishTotal: 10 }), 25);
  assert.equal(awarenessScore({ lessonsDone: 0, lessonsTotal: 8, quizFractions: [0, 0, 0, 0], phishRight: 10, phishTotal: 10 }), 25);
});

test('awarenessScore: empty content does not divide by zero', () => {
  assert.equal(awarenessScore({ lessonsDone: 0, lessonsTotal: 0, quizFractions: [], phishRight: 0, phishTotal: 0 }), 0);
});

test('weekActivity: 7 days, today last, counts land on the right day', () => {
  const now = new Date(2026, 10, 14, 15, 0, 0); // Saturday 14 Nov 2026
  const at = (day, hour) => new Date(2026, 10, day, hour).toISOString();
  const week = weekActivity([at(14, 9), at(14, 10), at(12, 23), at(8, 0), at(7, 23), at(1, 12)], now);
  assert.deepEqual(week.map((d) => d.day), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  assert.deepEqual(week.map((d) => d.count), [1, 0, 0, 0, 1, 0, 2]); // 7 Nov and 1 Nov are outside the week
  assert.deepEqual(week.map((d) => d.today), [false, false, false, false, false, false, true]);
  assert.equal(week[0].date, '2026-11-08');
});

test('weekActivity: works across a month boundary', () => {
  const week = weekActivity([], new Date(2026, 2, 2, 8));
  assert.equal(week[0].date, '2026-02-24');
  assert.equal(week[6].date, dayKey(new Date(2026, 2, 2)));
});

const topic = (id, lessonsDone, bestQuiz = null) => ({ id, name: id, lessons: 2, lessonsDone, bestQuiz });

test('nextStep: lesson first, then quiz, then phish, then done', () => {
  const lessons = [{ id: 1, title: 'A', topicName: 'T', minutes: 4, done: true }, { id: 2, title: 'B', topicName: 'T', minutes: 4, done: false }];
  const allDone = lessons.map((l) => ({ ...l, done: true }));
  const best = { score: 3, total: 5 };
  assert.equal(nextStep({ lessons, topics: [], phishAnswered: 0, phishTotal: 10 }).to, '/lessons/2');
  assert.equal(nextStep({ lessons: allDone, topics: [topic('a', 2, best), topic('b', 2)], phishAnswered: 0, phishTotal: 10 }).to, '/quiz/b');
  assert.equal(nextStep({ lessons: allDone, topics: [topic('a', 2, best)], phishAnswered: 4, phishTotal: 10 }).kind, 'phish');
  assert.equal(nextStep({ lessons: allDone, topics: [topic('a', 2, best)], phishAnswered: 10, phishTotal: 10 }).kind, 'done');
});

test('getCoachTip labels its answer as sample', async () => {
  const tip = await getCoachTip({ topics: [topic('phishing', 0)] });
  assert.equal(tip.source, 'sample');
  assert.ok(tip.text.length > 20);
});

test('getCoachTip picks the weakest topic, and the first one on a tie', async () => {
  const best = { score: 5, total: 5 };
  assert.equal((await getCoachTip({ topics: [topic('phishing', 2, best), topic('passwords', 1), topic('browsing', 2)] })).topicId, 'passwords');
  assert.equal((await getCoachTip({ topics: [topic('phishing', 0), topic('passwords', 0)] })).topicId, 'phishing');
});

test('getCoachTip has words for every situation', async () => {
  const best = { score: 5, total: 5 };
  assert.match((await getCoachTip({ topics: [topic('devices', 0)] })).text, /^You have not started/);
  assert.match((await getCoachTip({ topics: [topic('devices', 1)] })).text, /quiz is still waiting/);
  assert.match((await getCoachTip({ topics: [topic('devices', 2, { score: 2, total: 5 })] })).text, /room to grow/);
  assert.match((await getCoachTip({ topics: [topic('devices', 2, best)] })).text, /finished every topic/);
  assert.ok((await getCoachTip({ topics: [] })).text);
  assert.ok((await getCoachTip({ topics: [topic('unknown-topic', 0)] })).text);
});

test('topicProgress: lessons are half and the quiz is half', () => {
  assert.equal(topicProgress(topic('a', 0)), 0);
  assert.equal(topicProgress(topic('a', 2)), 0.5);
  assert.equal(topicProgress(topic('a', 2, { score: 5, total: 5 })), 1);
});

// ---- The sample content must stay well-formed and safe --------------------
test('content: 4 topics, 2 lessons and 5 questions for each', () => {
  assert.equal(TOPICS.length, 4);
  for (const t of TOPICS) {
    assert.equal(LESSONS.filter((l) => l.topic === t.id).length, 2, t.id);
    assert.equal(QUESTIONS.filter((q) => q.topic === t.id).length, 5, t.id);
  }
  assert.equal(LESSONS.length, 8);
  assert.equal(QUESTIONS.length, 20);
});

test('content: every question has 4 different choices and a valid answer', () => {
  for (const q of QUESTIONS) {
    assert.equal(q.choices.length, 4, q.text);
    assert.equal(new Set(q.choices).size, 4, q.text);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, q.text);
    assert.ok(q.explain.length > 20, q.text);
  }
});

test('content: the right answer is not always in the same position', () => {
  const used = new Set(QUESTIONS.map((q) => q.answer));
  assert.equal(used.size, 4);
});

test('content: 10 practice messages, a mix of phish and safe, each with clues', () => {
  assert.equal(MESSAGES.length, 10);
  assert.equal(MESSAGES.filter((m) => m.isPhish).length, 6);
  for (const m of MESSAGES) {
    assert.ok(m.clues.length >= 3, m.body);
    assert.ok(['email', 'sms'].includes(m.kind));
  }
});

test('content: every address and link in the practice messages ends in .example', () => {
  for (const m of MESSAGES) {
    if (m.fromAddress) assert.match(m.fromAddress, /^[a-z0-9.-]+@[a-z0-9.-]+\.example$/, m.fromAddress);
    if (m.linkUrl) assert.match(new URL(m.linkUrl).hostname, /\.example$/, m.linkUrl);
  }
  // Nothing anywhere in the content points at a real web address.
  const everything = JSON.stringify({ LESSONS, QUESTIONS, MESSAGES });
  for (const [found] of everything.matchAll(/https?:\/\/[^\s"\\]+/g)) {
    assert.match(new URL(found).hostname, /\.example$/, found);
  }
  assert.ok(!/\.(com|net|org|sa|io)\b/.test(everything), 'a real-looking domain ending was found');
});

test('content: the sample progress points at lessons, topics and messages that exist', () => {
  for (const p of SAMPLE_PROGRESS.lessonsDone) assert.ok(LESSONS[p.lesson - 1]);
  for (const p of SAMPLE_PROGRESS.quizAttempts) assert.ok(TOPICS.some((t) => t.id === p.topic) && p.score <= p.total);
  for (const p of SAMPLE_PROGRESS.phishAnswers) assert.ok(MESSAGES[p.message - 1]);
});
