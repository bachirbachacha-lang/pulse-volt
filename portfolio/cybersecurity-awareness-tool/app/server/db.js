// The database. SQLite keeps everything in one file (data/latchlight.db).
// node:sqlite is built into Node.js, so there is nothing extra to install.
import { DatabaseSync } from 'node:sqlite';
import { TOPICS, LESSONS, QUESTIONS, MESSAGES, SAMPLE_PROGRESS } from './seed-data.js';

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  -- Content (filled once from seed-data.js) -------------------------------
  CREATE TABLE IF NOT EXISTS topics (
    id       TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    name     TEXT NOT NULL,
    blurb    TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id       INTEGER PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id),
    title    TEXT NOT NULL,
    summary  TEXT NOT NULL,
    minutes  INTEGER NOT NULL,
    sections TEXT NOT NULL,   -- a list saved as JSON text
    points   TEXT NOT NULL,   -- a list saved as JSON text
    try_it   TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS questions (
    id       INTEGER PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id),
    text     TEXT NOT NULL,
    choices  TEXT NOT NULL,   -- a list saved as JSON text
    answer   INTEGER NOT NULL, -- position of the right choice, from 0
    explain  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id           INTEGER PRIMARY KEY,
    kind         TEXT NOT NULL CHECK (kind IN ('email', 'sms')),
    from_name    TEXT NOT NULL,
    from_address TEXT,
    subject      TEXT,
    body         TEXT NOT NULL,
    link_text    TEXT,
    link_url     TEXT,
    is_phish     INTEGER NOT NULL,
    clues        TEXT NOT NULL,   -- a list saved as JSON text
    explain      TEXT NOT NULL
  );

  -- Your progress ----------------------------------------------------------
  CREATE TABLE IF NOT EXISTS lesson_progress (
    lesson_id    INTEGER PRIMARY KEY REFERENCES lessons(id),
    completed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id       INTEGER PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id),
    score    INTEGER NOT NULL,
    total    INTEGER NOT NULL,
    taken_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS phish_answers (
    id          INTEGER PRIMARY KEY,
    message_id  INTEGER NOT NULL REFERENCES messages(id),
    verdict     TEXT NOT NULL CHECK (verdict IN ('phish', 'safe')),
    correct     INTEGER NOT NULL,
    answered_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    name  TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

// Fills an empty database with the sample content.
function seed(db, { sampleProgress, now }) {
  const addTopic = db.prepare('INSERT INTO topics (id, position, name, blurb) VALUES (?, ?, ?, ?)');
  const addLesson = db.prepare('INSERT INTO lessons (topic_id, title, summary, minutes, sections, points, try_it) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const addQuestion = db.prepare('INSERT INTO questions (topic_id, text, choices, answer, explain) VALUES (?, ?, ?, ?, ?)');
  const addMessage = db.prepare(
    `INSERT INTO messages (kind, from_name, from_address, subject, body, link_text, link_url, is_phish, clues, explain)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const ago = (days) => new Date(now().getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  db.exec('BEGIN');
  try {
    TOPICS.forEach((t, i) => addTopic.run(t.id, i, t.name, t.blurb));
    for (const l of LESSONS) addLesson.run(l.topic, l.title, l.summary, l.minutes, JSON.stringify(l.sections), JSON.stringify(l.points), l.tryIt);
    for (const q of QUESTIONS) addQuestion.run(q.topic, q.text, JSON.stringify(q.choices), q.answer, q.explain);
    for (const m of MESSAGES) {
      addMessage.run(m.kind, m.fromName, m.fromAddress, m.subject, m.body, m.linkText, m.linkUrl, m.isPhish ? 1 : 0, JSON.stringify(m.clues), m.explain);
    }
    if (sampleProgress) {
      for (const p of SAMPLE_PROGRESS.lessonsDone) db.prepare('INSERT INTO lesson_progress (lesson_id, completed_at) VALUES (?, ?)').run(p.lesson, ago(p.daysAgo));
      for (const p of SAMPLE_PROGRESS.quizAttempts) db.prepare('INSERT INTO quiz_attempts (topic_id, score, total, taken_at) VALUES (?, ?, ?, ?)').run(p.topic, p.score, p.total, ago(p.daysAgo));
      for (const p of SAMPLE_PROGRESS.phishAnswers) {
        const correct = (p.verdict === 'phish') === MESSAGES[p.message - 1].isPhish;
        db.prepare('INSERT INTO phish_answers (message_id, verdict, correct, answered_at) VALUES (?, ?, ?, ?)').run(p.message, p.verdict, correct ? 1 : 0, ago(p.daysAgo));
      }
      db.prepare("INSERT INTO settings (name, value) VALUES ('sample_progress', '1')").run();
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Opens (or creates) the database and returns the "store": the only set of
// functions the rest of the server uses to read and write data.
// file: a path, or ':memory:' for a throwaway database used by the tests.
export function openStore(file, { sampleProgress = true, now = () => new Date() } = {}) {
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  if (db.prepare('SELECT COUNT(*) AS n FROM topics').get().n === 0) seed(db, { sampleProgress, now });

  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);

  const store = {
    now,

    // Topics with how far you are in each.
    topics() {
      return all(`
        SELECT t.id, t.name, t.blurb,
          (SELECT COUNT(*) FROM lessons l WHERE l.topic_id = t.id) AS lessons,
          (SELECT COUNT(*) FROM lessons l JOIN lesson_progress p ON p.lesson_id = l.id WHERE l.topic_id = t.id) AS lessonsDone,
          (SELECT COUNT(*) FROM quiz_attempts a WHERE a.topic_id = t.id) AS attempts
        FROM topics t ORDER BY t.position`).map((t) => {
        // The best attempt: highest score, and the earliest one if there is a tie.
        const best = get('SELECT score, total FROM quiz_attempts WHERE topic_id = ? ORDER BY score * 1.0 / total DESC, id LIMIT 1', t.id);
        return { ...t, bestQuiz: best ? { score: best.score, total: best.total } : null };
      });
    },
    topicExists: (id) => Boolean(get('SELECT 1 AS x FROM topics WHERE id = ?', id)),

    // Lessons: the short list, and one in full.
    lessons() {
      return all(`
        SELECT l.id, l.topic_id AS topicId, t.name AS topicName, l.title, l.summary, l.minutes,
               p.lesson_id IS NOT NULL AS done
        FROM lessons l JOIN topics t ON t.id = l.topic_id
        LEFT JOIN lesson_progress p ON p.lesson_id = l.id
        ORDER BY t.position, l.id`).map((l) => ({ ...l, done: Boolean(l.done) }));
    },
    lesson(id) {
      const row = get(`
        SELECT l.id, l.topic_id AS topicId, t.name AS topicName, l.title, l.summary, l.minutes,
               l.sections, l.points, l.try_it AS tryIt, p.lesson_id IS NOT NULL AS done
        FROM lessons l JOIN topics t ON t.id = l.topic_id
        LEFT JOIN lesson_progress p ON p.lesson_id = l.id
        WHERE l.id = ?`, id);
      if (!row) return null;
      const next = get('SELECT id, title FROM lessons WHERE id > ? ORDER BY id LIMIT 1', id);
      return { ...row, done: Boolean(row.done), sections: JSON.parse(row.sections), points: JSON.parse(row.points), next: next ?? null };
    },
    setLessonDone(id, done) {
      if (done) run('INSERT OR IGNORE INTO lesson_progress (lesson_id, completed_at) VALUES (?, ?)', id, now().toISOString());
      else run('DELETE FROM lesson_progress WHERE lesson_id = ?', id);
    },

    // Quiz questions WITHOUT the answers. The answers never leave the server until you have answered.
    questions(topicId) {
      return all('SELECT id, text, choices FROM questions WHERE topic_id = ? ORDER BY id', topicId)
        .map((q) => ({ ...q, choices: JSON.parse(q.choices) }));
    },
    // Marks a quiz and saves the attempt. answers looks like { "6": 3, "7": 1, ... } (question id -> chosen position).
    gradeQuiz(topicId, answers) {
      const questions = all('SELECT id, text, choices, answer, explain FROM questions WHERE topic_id = ? ORDER BY id', topicId);
      const review = questions.map((q) => ({
        id: q.id, text: q.text, choices: JSON.parse(q.choices),
        chosen: answers[q.id], answer: q.answer, correct: answers[q.id] === q.answer, explain: q.explain,
      }));
      const score = review.filter((r) => r.correct).length;
      run('INSERT INTO quiz_attempts (topic_id, score, total, taken_at) VALUES (?, ?, ?, ?)', topicId, score, questions.length, now().toISOString());
      const best = get('SELECT MAX(score) AS best FROM quiz_attempts WHERE topic_id = ?', topicId).best;
      return { topicId, score, total: questions.length, best, review };
    },

    // Practice messages WITHOUT the verdict and clues.
    messages() {
      return all(`SELECT id, kind, from_name AS fromName, from_address AS fromAddress, subject, body,
                         link_text AS linkText, link_url AS linkUrl FROM messages ORDER BY id`);
    },
    answerMessage(id, verdict) {
      const m = get('SELECT is_phish, clues, explain FROM messages WHERE id = ?', id);
      if (!m) return null;
      const isPhish = Boolean(m.is_phish);
      const correct = (verdict === 'phish') === isPhish;
      run('INSERT INTO phish_answers (message_id, verdict, correct, answered_at) VALUES (?, ?, ?, ?)', id, verdict, correct ? 1 : 0, now().toISOString());
      return { id, correct, isPhish, clues: JSON.parse(m.clues).map(([title, text]) => ({ title, text })), explain: m.explain };
    },
    // For each message, only your latest answer counts.
    phishSummary() {
      const total = get('SELECT COUNT(*) AS n FROM messages').n;
      const latest = all(`SELECT a.correct FROM phish_answers a
                          WHERE a.id = (SELECT MAX(b.id) FROM phish_answers b WHERE b.message_id = a.message_id)`);
      return { total, answered: latest.length, right: latest.filter((a) => a.correct).length };
    },

    // Every date-and-time at which something was done (for the "This week" chart).
    activityTimes() {
      return all(`SELECT completed_at AS t FROM lesson_progress
                  UNION ALL SELECT taken_at FROM quiz_attempts
                  UNION ALL SELECT answered_at FROM phish_answers`).map((r) => r.t);
    },

    hasSampleProgress: () => Boolean(get("SELECT 1 AS x FROM settings WHERE name = 'sample_progress'")),

    // Start fresh: removes all progress, keeps the lessons and questions.
    resetProgress() {
      db.exec('BEGIN');
      try {
        db.exec("DELETE FROM lesson_progress; DELETE FROM quiz_attempts; DELETE FROM phish_answers; DELETE FROM settings WHERE name = 'sample_progress';");
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    close: () => db.close(),
  };
  return store;
}
