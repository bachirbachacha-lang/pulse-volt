// =====================================================================
//  THE COACH TIP  (the "smart" part of the app)
// =====================================================================
//  This is SAMPLE logic, not real AI. It finds your weakest topic and
//  picks one of a few tips written by hand for that topic.
//
//  It is kept in one function on purpose. To plug in real AI later,
//  replace the inside of getCoachTip() and keep what goes in and what
//  comes out the same. Nothing else in the app has to change.
//
//  In:  { topics: [{ id, name, lessons, lessonsDone, bestQuiz: { score, total } | null }] }
//  Out: { source: 'sample', topicId, topicName, text }
// =====================================================================

const TIPS = {
  phishing: [
    'Before you click a link in a message, read where it really goes. On a phone, press and hold the link.',
    'When a message makes you feel you must act right now, treat that feeling as the first warning sign.',
  ],
  passwords: [
    'Turn on two-step sign-in for your main email account first. Email can reset almost everything else.',
    'If you reuse one password anywhere, change that one today. One leak should never open two doors.',
  ],
  browsing: [
    'Before you type a password into any page, find the first single slash in the address and read backwards from it: that is who you are really talking to.',
    'A padlock means the connection is private. It does not mean the site is honest.',
  ],
  devices: [
    'Check for updates on your phone today, and restart when it asks. Many fixes only finish after a restart.',
    'Name the file you would most hate to lose, then make sure a second copy exists somewhere else.',
  ],
};

// How far along a topic is, from 0 to 1. Lessons count for half, the best quiz for half.
export function topicProgress(topic) {
  const lessons = topic.lessons ? topic.lessonsDone / topic.lessons : 0;
  const quiz = topic.bestQuiz ? topic.bestQuiz.score / topic.bestQuiz.total : 0;
  return (lessons + quiz) / 2;
}

export async function getCoachTip({ topics }) {
  if (!topics || topics.length === 0) {
    return { source: 'sample', topicId: null, topicName: null, text: 'Start with any lesson. Four minutes is enough.' };
  }
  // The weakest topic is the one with the least progress. On a tie, the first in the list wins.
  let weakest = topics[0];
  for (const t of topics) if (topicProgress(t) < topicProgress(weakest)) weakest = t;

  const progress = topicProgress(weakest);
  const tips = TIPS[weakest.id] ?? ['Take a second look before you click.'];
  const tip = tips[weakest.lessonsDone % tips.length];

  let opening;
  if (progress === 0) opening = `You have not started ${weakest.name} yet.`;
  else if (progress === 1) opening = 'You have finished every topic with full marks. One habit to keep:';
  else if (!weakest.bestQuiz) opening = `${weakest.name} is your least practised topic, and its quiz is still waiting.`;
  else opening = `${weakest.name} is the topic with the most room to grow.`;

  return { source: 'sample', topicId: weakest.id, topicName: weakest.name, text: `${opening} ${tip}` };
}
