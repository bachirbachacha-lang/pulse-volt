// The server. It answers requests that start with /api and, once the screens
// have been built (npm run build), it also hands out the screens themselves.
//
// There is deliberately NO address here that receives a password.
// The password checker runs only in the browser (see shared/password.js).
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getCoachTip } from './coach.js';
import { awarenessScore, weekActivity, nextStep } from './progress.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// A small helper: stop with an error message and a status code.
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// "/api/lessons/7" gives us the text "7". This makes sure it really is a whole positive number.
function readId(text) {
  if (!/^[1-9]\d{0,8}$/.test(text)) throw new ApiError(400, 'That id is not valid.');
  return Number(text);
}

export function createApp(store, { distDir = path.join(here, '..', 'dist') } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  const needTopic = (id) => {
    if (!store.topicExists(id)) throw new ApiError(404, 'Topic not found.');
    return id;
  };

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // ---- Dashboard ----------------------------------------------------------
  app.get('/api/dashboard', async (req, res) => {
    const topics = store.topics();
    const lessons = store.lessons();
    const phish = store.phishSummary();
    const lessonsDone = lessons.filter((l) => l.done).length;
    const taken = topics.filter((t) => t.bestQuiz);
    const quizFractions = topics.map((t) => (t.bestQuiz ? t.bestQuiz.score / t.bestQuiz.total : 0));

    // >>> The one call to the coach. See server/coach.js. <<<
    const tip = await getCoachTip({ topics });

    res.json({
      score: awarenessScore({ lessonsDone, lessonsTotal: lessons.length, quizFractions, phishRight: phish.right, phishTotal: phish.total }),
      lessons: { done: lessonsDone, total: lessons.length },
      // The average of the best result in each quiz you have taken, as a percentage. null = none taken yet.
      quiz: {
        taken: taken.length, total: topics.length,
        average: taken.length ? Math.round((100 * taken.reduce((sum, t) => sum + t.bestQuiz.score / t.bestQuiz.total, 0)) / taken.length) : null,
      },
      phish,
      week: weekActivity(store.activityTimes(), store.now()),
      topics,
      next: nextStep({ lessons, topics, phishAnswered: phish.answered, phishTotal: phish.total }),
      tip,
      sampleProgress: store.hasSampleProgress(),
    });
  });

  // ---- Topics and lessons -------------------------------------------------
  app.get('/api/topics', (req, res) => res.json(store.topics()));
  app.get('/api/lessons', (req, res) => res.json(store.lessons()));

  app.get('/api/lessons/:id', (req, res) => {
    const lesson = store.lesson(readId(req.params.id));
    if (!lesson) throw new ApiError(404, 'Lesson not found.');
    res.json(lesson);
  });

  // PUT marks a lesson as done, DELETE un-marks it.
  for (const [method, done] of [['put', true], ['delete', false]]) {
    app[method]('/api/lessons/:id/done', (req, res) => {
      const id = readId(req.params.id);
      if (!store.lesson(id)) throw new ApiError(404, 'Lesson not found.');
      store.setLessonDone(id, done);
      res.json({ id, done });
    });
  }

  // ---- Quizzes ------------------------------------------------------------
  app.get('/api/quizzes/:topic', (req, res) => {
    const topicId = needTopic(req.params.topic);
    const topic = store.topics().find((t) => t.id === topicId);
    res.json({ topic: { id: topic.id, name: topic.name, bestQuiz: topic.bestQuiz }, questions: store.questions(topicId) });
  });

  // Send { "answers": { "6": 3, "7": 1, ... } }: one chosen position for every question.
  app.post('/api/quizzes/:topic/attempts', (req, res) => {
    const topicId = needTopic(req.params.topic);
    const answers = req.body?.answers;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new ApiError(400, 'Send your answers, for example {"answers": {"1": 2}}.');
    }
    const questions = store.questions(topicId);
    const clean = {};
    for (const q of questions) {
      const chosen = answers[q.id];
      if (!Number.isInteger(chosen) || chosen < 0 || chosen >= q.choices.length) {
        throw new ApiError(400, 'Answer every question before checking.');
      }
      clean[q.id] = chosen;
    }
    if (Object.keys(answers).length !== questions.length) throw new ApiError(400, 'Those answers do not match this quiz.');
    res.status(201).json(store.gradeQuiz(topicId, clean));
  });

  // ---- Spot the phish -----------------------------------------------------
  app.get('/api/phish/messages', (req, res) => res.json(store.messages()));

  // Send { "verdict": "phish" } or { "verdict": "safe" }.
  app.post('/api/phish/messages/:id/answer', (req, res) => {
    const id = readId(req.params.id);
    const verdict = req.body?.verdict;
    if (verdict !== 'phish' && verdict !== 'safe') throw new ApiError(400, 'Send {"verdict": "phish"} or {"verdict": "safe"}.');
    const result = store.answerMessage(id, verdict);
    if (!result) throw new ApiError(404, 'Message not found.');
    res.status(201).json(result);
  });

  // ---- Start fresh --------------------------------------------------------
  app.delete('/api/progress', (req, res) => {
    store.resetProgress();
    res.status(204).end();
  });

  // Any other /api address does not exist.
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  // ---- The screens --------------------------------------------------------
  // After "npm run build" the finished screens are in the dist folder.
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir));
    // Any other address (like /lessons/3) gets the app, which then shows the right screen.
    app.get(/.*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  // ---- Errors -------------------------------------------------------------
  // Every error ends up here and is sent back as { "error": "..." }.
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request was not valid JSON.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'The request was too large.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}
