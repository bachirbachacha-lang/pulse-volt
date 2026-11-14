// Tests for every server address. Each test starts its own server with a
// throwaway database kept in memory, so tests never touch your real data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../db.js';
import { createApp } from '../app.js';
import { QUESTIONS, MESSAGES } from '../seed-data.js';

// Starts a server on a free port, runs the test, then stops the server.
async function withServer(run, options) {
  const store = openStore(':memory:', options);
  const server = createApp(store, { distDir: '/nowhere' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, data: text ? JSON.parse(text) : null, text };
  };
  try {
    await run(call, store);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  }
}
const fresh = { sampleProgress: false };
// The right answers for one topic, as the server expects them.
const rightAnswers = (questions, topic) =>
  Object.fromEntries(questions.map((q) => [q.id, QUESTIONS.filter((x) => x.topic === topic).find((x) => x.text === q.text).answer]));

test('GET /api/health', () => withServer(async (call) => {
  const res = await call('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { ok: true });
}));

test('GET /api/topics gives 4 topics with 2 lessons each', () => withServer(async (call) => {
  const { data } = await call('GET', '/api/topics');
  assert.deepEqual(data.map((t) => t.id), ['phishing', 'passwords', 'browsing', 'devices']);
  assert.ok(data.every((t) => t.lessons === 2 && t.lessonsDone === 0 && t.bestQuiz === null));
}, fresh));

test('GET /api/lessons gives 8 summaries without the full text', () => withServer(async (call) => {
  const { data } = await call('GET', '/api/lessons');
  assert.equal(data.length, 8);
  assert.equal(data[0].title, 'What phishing is');
  assert.equal(data[0].done, false);
  assert.equal(data[0].sections, undefined);
}, fresh));

test('GET /api/lessons/:id gives sections, points and the next lesson', () => withServer(async (call) => {
  const { data } = await call('GET', '/api/lessons/1');
  assert.equal(data.topicName, 'Phishing');
  assert.equal(data.sections.length, 3);
  assert.equal(data.points.length, 3);
  assert.equal(data.next.id, 2);
  assert.equal((await call('GET', '/api/lessons/8')).data.next, null);
}));

test('GET /api/lessons/:id handles a missing lesson and a bad id', () => withServer(async (call) => {
  assert.equal((await call('GET', '/api/lessons/999')).status, 404);
  assert.equal((await call('GET', '/api/lessons/abc')).status, 400);
  assert.equal((await call('GET', '/api/lessons/1;DROP TABLE lessons')).status, 400);
  assert.equal((await call('GET', '/api/lessons')).data.length, 8);
}));

test('lessons: mark done, mark twice, un-mark', () => withServer(async (call) => {
  assert.deepEqual((await call('PUT', '/api/lessons/3/done')).data, { id: 3, done: true });
  assert.equal((await call('PUT', '/api/lessons/3/done')).status, 200); // twice is fine
  assert.equal((await call('GET', '/api/lessons/3')).data.done, true);
  assert.equal((await call('GET', '/api/topics')).data[1].lessonsDone, 1);
  assert.deepEqual((await call('DELETE', '/api/lessons/3/done')).data, { id: 3, done: false });
  assert.equal((await call('GET', '/api/lessons/3')).data.done, false);
  assert.equal((await call('PUT', '/api/lessons/999/done')).status, 404);
}, fresh));

test('GET /api/quizzes/:topic gives 5 questions and never the answers', () => withServer(async (call) => {
  for (const topic of ['phishing', 'passwords', 'browsing', 'devices']) {
    const res = await call('GET', '/api/quizzes/' + topic);
    assert.equal(res.data.questions.length, 5);
    assert.ok(res.data.questions.every((q) => q.choices.length === 4));
    assert.ok(!res.text.includes('"answer"'), 'the answer must not be sent');
    assert.ok(!res.text.includes('"explain"'), 'the explanation must not be sent');
  }
  assert.equal((await call('GET', '/api/quizzes/cooking')).status, 404);
}));

test('quiz: all right gives 5 of 5 and is saved as the best', () => withServer(async (call) => {
  const { data: quiz } = await call('GET', '/api/quizzes/passwords');
  const res = await call('POST', '/api/quizzes/passwords/attempts', { answers: rightAnswers(quiz.questions, 'passwords') });
  assert.equal(res.status, 201);
  assert.equal(res.data.score, 5);
  assert.equal(res.data.total, 5);
  assert.ok(res.data.review.every((r) => r.correct && r.explain.length > 10));
  assert.deepEqual((await call('GET', '/api/topics')).data[1].bestQuiz, { score: 5, total: 5 });
}, fresh));

test('quiz: wrong answers are marked wrong, and a worse second try does not lower the best', () => withServer(async (call) => {
  const { data: quiz } = await call('GET', '/api/quizzes/devices');
  const right = rightAnswers(quiz.questions, 'devices');
  const oneWrong = { ...right };
  const firstId = quiz.questions[0].id;
  oneWrong[firstId] = (right[firstId] + 1) % 4;
  const first = await call('POST', '/api/quizzes/devices/attempts', { answers: oneWrong });
  assert.equal(first.data.score, 4);
  assert.equal(first.data.review[0].correct, false);
  assert.equal(first.data.review[0].answer, right[firstId]);

  const allWrong = Object.fromEntries(Object.entries(right).map(([id, a]) => [id, (a + 1) % 4]));
  const second = await call('POST', '/api/quizzes/devices/attempts', { answers: allWrong });
  assert.equal(second.data.score, 0);
  assert.equal(second.data.best, 4);
  const topic = (await call('GET', '/api/topics')).data[3];
  assert.deepEqual(topic.bestQuiz, { score: 4, total: 5 });
  assert.equal(topic.attempts, 2);
}, fresh));

test('quiz: bad requests are refused and nothing is saved', () => withServer(async (call) => {
  const { data: quiz } = await call('GET', '/api/quizzes/browsing');
  const right = rightAnswers(quiz.questions, 'browsing');
  const ids = Object.keys(right);
  const bad = [
    undefined, {}, { answers: null }, { answers: [0, 1, 2, 3, 0] }, { answers: {} },
    { answers: { ...right, [ids[0]]: 9 } }, { answers: { ...right, [ids[0]]: '1' } }, { answers: { ...right, [ids[0]]: 1.5 } },
    { answers: { ...right, 999: 0 } }, { answers: Object.fromEntries(ids.slice(1).map((id) => [id, 0])) },
  ];
  for (const body of bad) {
    const res = await call('POST', '/api/quizzes/browsing/attempts', body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.ok(res.data.error);
  }
  assert.equal((await call('POST', '/api/quizzes/cooking/attempts', { answers: right })).status, 404);
  assert.equal((await call('POST', '/api/quizzes/browsing/attempts', '{not json')).status, 400);
  assert.equal((await call('GET', '/api/topics')).data[2].attempts, 0);
}, fresh));

test('GET /api/phish/messages gives 10 messages and never the verdict or clues', () => withServer(async (call) => {
  const res = await call('GET', '/api/phish/messages');
  assert.equal(res.data.length, 10);
  assert.ok(!res.text.includes('isPhish') && !res.text.includes('is_phish') && !res.text.includes('clues'));
  assert.equal(res.data[0].fromName, 'Campus IT Helpdesk');
}));

test('phish: a right and a wrong verdict, with clues', () => withServer(async (call) => {
  const right = await call('POST', '/api/phish/messages/1/answer', { verdict: 'phish' });
  assert.equal(right.status, 201);
  assert.equal(right.data.correct, true);
  assert.equal(right.data.isPhish, true);
  assert.equal(right.data.clues.length, 4);
  assert.ok(right.data.clues[0].title && right.data.clues[0].text);

  const wrong = await call('POST', '/api/phish/messages/2/answer', { verdict: 'phish' });
  assert.equal(wrong.data.correct, false);
  assert.equal(wrong.data.isPhish, false);
}, fresh));

test('phish: every message is marked right for the right verdict', () => withServer(async (call) => {
  for (const [i, m] of MESSAGES.entries()) {
    const res = await call('POST', `/api/phish/messages/${i + 1}/answer`, { verdict: m.isPhish ? 'phish' : 'safe' });
    assert.equal(res.data.correct, true, m.subject ?? m.body);
  }
  assert.deepEqual((await call('GET', '/api/dashboard')).data.phish, { total: 10, answered: 10, right: 10 });
}, fresh));

test('phish: only the latest answer for a message counts', () => withServer(async (call) => {
  await call('POST', '/api/phish/messages/1/answer', { verdict: 'safe' }); // wrong
  assert.deepEqual((await call('GET', '/api/dashboard')).data.phish, { total: 10, answered: 1, right: 0 });
  await call('POST', '/api/phish/messages/1/answer', { verdict: 'phish' }); // right
  assert.deepEqual((await call('GET', '/api/dashboard')).data.phish, { total: 10, answered: 1, right: 1 });
}, fresh));

test('phish: bad requests are refused', () => withServer(async (call) => {
  assert.equal((await call('POST', '/api/phish/messages/1/answer', { verdict: 'maybe' })).status, 400);
  assert.equal((await call('POST', '/api/phish/messages/1/answer', {})).status, 400);
  assert.equal((await call('POST', '/api/phish/messages/1/answer')).status, 400);
  assert.equal((await call('POST', '/api/phish/messages/999/answer', { verdict: 'safe' })).status, 404);
  assert.equal((await call('POST', '/api/phish/messages/x/answer', { verdict: 'safe' })).status, 400);
}, fresh));

test('dashboard: a fresh start is all zeros and points at lesson 1', () => withServer(async (call) => {
  const { data } = await call('GET', '/api/dashboard');
  assert.equal(data.score, 0);
  assert.deepEqual(data.lessons, { done: 0, total: 8 });
  assert.deepEqual(data.quiz, { taken: 0, total: 4, average: null });
  assert.deepEqual(data.phish, { total: 10, answered: 0, right: 0 });
  assert.equal(data.week.length, 7);
  assert.ok(data.week.every((d) => d.count === 0));
  assert.equal(data.next.to, '/lessons/1');
  assert.equal(data.sampleProgress, false);
  assert.equal(data.tip.source, 'sample');
}, fresh));

test('dashboard: the sample progress gives the numbers the documents quote', () => withServer(async (call) => {
  const { data } = await call('GET', '/api/dashboard');
  assert.equal(data.sampleProgress, true);
  assert.deepEqual(data.lessons, { done: 3, total: 8 });
  assert.deepEqual(data.quiz, { taken: 1, total: 4, average: 80 });
  assert.deepEqual(data.phish, { total: 10, answered: 4, right: 3 });
  assert.equal(data.score, 31); // 50*3/8 + 25*(0.8/4) + 25*(3/10) = 18.75 + 5 + 7.5
  assert.equal(data.week.reduce((sum, d) => sum + d.count, 0), 8);
  assert.equal(data.next.title, 'Passphrases beat clever tricks');
  assert.equal(data.tip.topicId, 'browsing');
}, { now: () => new Date(2026, 10, 14, 12, 0, 0) }));

test('dashboard: doing things moves the score and this week', () => withServer(async (call) => {
  await call('PUT', '/api/lessons/1/done');
  await call('POST', '/api/phish/messages/1/answer', { verdict: 'phish' });
  const { data } = await call('GET', '/api/dashboard');
  assert.equal(data.score, Math.round(50 / 8 + 25 / 10)); // 9
  assert.equal(data.week[6].today, true);
  assert.equal(data.week[6].count, 2);
  assert.equal(data.next.to, '/lessons/2');
}, fresh));

test('DELETE /api/progress wipes progress but keeps the content', () => withServer(async (call) => {
  assert.equal((await call('DELETE', '/api/progress')).status, 204);
  const { data } = await call('GET', '/api/dashboard');
  assert.equal(data.score, 0);
  assert.equal(data.sampleProgress, false);
  assert.equal((await call('GET', '/api/lessons')).data.length, 8);
  assert.equal((await call('GET', '/api/phish/messages')).data.length, 10);
}));

test('there is no address that accepts a password', () => withServer(async (call) => {
  for (const path of ['/api/password', '/api/password/check', '/api/passwords', '/api/check']) {
    assert.equal((await call('POST', path, { password: 'example' })).status, 404, path);
  }
}));

test('unknown /api addresses give a JSON 404, and too-large requests are refused', () => withServer(async (call) => {
  const res = await call('GET', '/api/nothing-here');
  assert.equal(res.status, 404);
  assert.deepEqual(res.data, { error: 'Not found.' });
  const big = await call('POST', '/api/phish/messages/1/answer', { verdict: 'x'.repeat(20000) });
  assert.equal(big.status, 413);
}));

test('the server does not announce which software it runs', () => withServer(async (call) => {
  assert.equal((await call('GET', '/api/health')).headers.get('x-powered-by'), null);
}));
