// The sums behind the dashboard. These are "pure" functions: they only look at
// what they are given and return an answer, which makes them easy to test.

// The awareness score, from 0 to 100.
// Half comes from lessons, a quarter from quizzes, a quarter from spotting phish.
export function awarenessScore({ lessonsDone, lessonsTotal, quizFractions, phishRight, phishTotal }) {
  const lessons = lessonsTotal ? lessonsDone / lessonsTotal : 0;
  // quizFractions has one number per topic: the best result as a part of 1 (0.8 = 4 of 5). Not taken = 0.
  const quiz = quizFractions.length ? quizFractions.reduce((a, b) => a + b, 0) / quizFractions.length : 0;
  const phish = phishTotal ? phishRight / phishTotal : 0;
  return Math.round(50 * lessons + 25 * quiz + 25 * phish);
}

// "2026-11-14" for a date, in the computer's own time zone.
export function dayKey(date) {
  const two = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Counts how many things were done on each of the last 7 days (today last).
// "times" is a list of date-and-time texts, one for each thing done.
export function weekActivity(times, now = new Date()) {
  const counts = new Map();
  for (const t of times) {
    const key = dayKey(new Date(t));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const days = [];
  for (let back = 6; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    days.push({ date: dayKey(d), day: DAY_NAMES[d.getDay()], count: counts.get(dayKey(d)) ?? 0, today: back === 0 });
  }
  return days;
}

// What should the learner do next? The first lesson not done, then the first quiz
// not taken, then the phish exercise, then nothing.
export function nextStep({ lessons, topics, phishAnswered, phishTotal }) {
  const lesson = lessons.find((l) => !l.done);
  if (lesson) {
    return { kind: 'lesson', title: lesson.title, detail: `${lesson.topicName} · ${lesson.minutes} min read`, to: `/lessons/${lesson.id}`, action: 'Start lesson' };
  }
  const topic = topics.find((t) => !t.bestQuiz);
  if (topic) {
    return { kind: 'quiz', title: `${topic.name} quiz`, detail: '5 questions', to: `/quiz/${topic.id}`, action: 'Take the quiz' };
  }
  if (phishAnswered < phishTotal) {
    return { kind: 'phish', title: 'Spot the phish', detail: `${phishTotal - phishAnswered} messages left to judge`, to: '/spot', action: 'Start' };
  }
  return { kind: 'done', title: 'You have done everything', detail: 'Come back and repeat a quiz to keep it fresh.', to: '/quiz', action: 'See quizzes' };
}
