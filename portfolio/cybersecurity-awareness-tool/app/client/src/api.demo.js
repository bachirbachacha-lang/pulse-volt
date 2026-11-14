// PREVIEW ONLY. This file stands in for the server so the app can run as a
// single web page with nothing installed. It keeps everything in memory,
// so progress disappears when the page is reloaded.
// It reuses the real content, score and coach code from the server folder.
// The real app uses api.js and the Express server instead.
import { TOPICS, LESSONS, QUESTIONS, MESSAGES, SAMPLE_PROGRESS } from '../../server/seed-data.js';
import { awarenessScore, weekActivity, nextStep } from '../../server/progress.js';
import { getCoachTip } from '../../server/coach.js';

const lessons = LESSONS.map((l, i) => ({ ...l, id: i + 1 }));
const questions = QUESTIONS.map((q, i) => ({ ...q, id: i + 1 }));
const messages = MESSAGES.map((m, i) => ({ ...m, id: i + 1 }));
const topicName = (id) => TOPICS.find((t) => t.id === id).name;

// Your progress, in memory only.
const ago = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
let done = new Map(SAMPLE_PROGRESS.lessonsDone.map((p) => [p.lesson, ago(p.daysAgo)]));
let attempts = SAMPLE_PROGRESS.quizAttempts.map((p) => ({ topicId: p.topic, score: p.score, total: p.total, at: ago(p.daysAgo) }));
let phish = SAMPLE_PROGRESS.phishAnswers.map((p) => ({ id: p.message, correct: (p.verdict === 'phish') === MESSAGES[p.message - 1].isPhish, at: ago(p.daysAgo) }));
let sample = true;

const fail = (message) => { throw new Error(message); };
// A tiny pause so loading states behave like the real thing.
const later = (make) => new Promise((resolve, reject) => setTimeout(() => { try { resolve(make()); } catch (e) { reject(e); } }, 120));

function topics() {
  return TOPICS.map((t) => {
    const mine = attempts.filter((a) => a.topicId === t.id);
    const best = mine.reduce((b, a) => (!b || a.score / a.total > b.score / b.total ? a : b), null);
    const own = lessons.filter((l) => l.topic === t.id);
    return { ...t, lessons: own.length, lessonsDone: own.filter((l) => done.has(l.id)).length, attempts: mine.length, bestQuiz: best ? { score: best.score, total: best.total } : null };
  });
}
const lessonSummary = (l) => ({ id: l.id, topicId: l.topic, topicName: topicName(l.topic), title: l.title, summary: l.summary, minutes: l.minutes, done: done.has(l.id) });
function phishSummary() {
  const latest = new Map(phish.map((a) => [a.id, a.correct])); // a later answer replaces an earlier one
  return { total: messages.length, answered: latest.size, right: [...latest.values()].filter(Boolean).length };
}

export const api = {
  dashboard: async () => {
    await later(() => null);
    const t = topics();
    const list = lessons.map(lessonSummary);
    const p = phishSummary();
    const taken = t.filter((x) => x.bestQuiz);
    return {
      score: awarenessScore({ lessonsDone: done.size, lessonsTotal: lessons.length, quizFractions: t.map((x) => (x.bestQuiz ? x.bestQuiz.score / x.bestQuiz.total : 0)), phishRight: p.right, phishTotal: p.total }),
      lessons: { done: done.size, total: lessons.length },
      quiz: { taken: taken.length, total: t.length, average: taken.length ? Math.round((100 * taken.reduce((s, x) => s + x.bestQuiz.score / x.bestQuiz.total, 0)) / taken.length) : null },
      phish: p,
      week: weekActivity([...done.values(), ...attempts.map((a) => a.at), ...phish.map((a) => a.at)]),
      topics: t,
      next: nextStep({ lessons: list, topics: t, phishAnswered: p.answered, phishTotal: p.total }),
      tip: await getCoachTip({ topics: t }),
      sampleProgress: sample,
    };
  },
  topics: () => later(topics),
  lessons: () => later(() => lessons.map(lessonSummary)),
  lesson: (id) => later(() => {
    const l = lessons.find((x) => x.id === Number(id)) ?? fail('Lesson not found.');
    const next = lessons.find((x) => x.id === l.id + 1);
    return { ...lessonSummary(l), sections: l.sections, points: l.points, tryIt: l.tryIt, next: next ? { id: next.id, title: next.title } : null };
  }),
  setLessonDone: (id, on) => later(() => {
    if (on) { if (!done.has(id)) done.set(id, new Date().toISOString()); } else done.delete(id);
    return { id, done: on };
  }),

  quiz: (topicId) => later(() => {
    const topic = topics().find((t) => t.id === topicId) ?? fail('Topic not found.');
    return {
      topic: { id: topic.id, name: topic.name, bestQuiz: topic.bestQuiz },
      questions: questions.filter((q) => q.topic === topicId).map(({ id, text, choices }) => ({ id, text, choices })),
    };
  }),
  submitQuiz: (topicId, answers) => later(() => {
    const own = questions.filter((q) => q.topic === topicId);
    if (own.some((q) => !Number.isInteger(answers[q.id]))) fail('Answer every question before checking.');
    const review = own.map((q) => ({ id: q.id, text: q.text, choices: q.choices, chosen: answers[q.id], answer: q.answer, correct: answers[q.id] === q.answer, explain: q.explain }));
    const score = review.filter((r) => r.correct).length;
    attempts.push({ topicId, score, total: own.length, at: new Date().toISOString() });
    return { topicId, score, total: own.length, best: Math.max(...attempts.filter((a) => a.topicId === topicId).map((a) => a.score)), review };
  }),

  messages: () => later(() => messages.map(({ isPhish, clues, explain, ...shown }) => shown)),
  answerMessage: (id, verdict) => later(() => {
    const m = messages.find((x) => x.id === id) ?? fail('Message not found.');
    const correct = (verdict === 'phish') === m.isPhish;
    phish.push({ id, correct, at: new Date().toISOString() });
    return { id, correct, isPhish: m.isPhish, clues: m.clues.map(([title, text]) => ({ title, text })), explain: m.explain };
  }),

  resetProgress: () => later(() => { done = new Map(); attempts = []; phish = []; sample = false; return null; }),
};
