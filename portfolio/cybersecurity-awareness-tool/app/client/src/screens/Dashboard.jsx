import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import { TopicBadge } from '../components/Icon.jsx';
import { Failed, Loading, PageHead } from '../components/Status.jsx';

// The ring chart. A circle whose outline is partly drawn: "pct" percent of the way round.
function Ring({ pct }) {
  const around = 2 * Math.PI * 50; // the length of the whole outline
  return (
    <svg className="ring" viewBox="0 0 120 120" role="img" aria-label={`Awareness score ${pct} percent`}>
      <circle className="track" cx="60" cy="60" r="50" fill="none" strokeWidth="12" />
      <circle className="value" cx="60" cy="60" r="50" fill="none" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={around} strokeDashoffset={around * (1 - pct / 100)} transform="rotate(-90 60 60)" />
      <text x="60" y="70" textAnchor="middle">{pct}%</text>
    </svg>
  );
}

// The bar chart for the last 7 days. Plain boxes whose height is set from the numbers.
function WeekBars({ week }) {
  const highest = Math.max(1, ...week.map((d) => d.count));
  return (
    <ul className="bars" aria-label="Things done on each of the last 7 days">
      {week.map((d) => (
        <li key={d.date} className={d.today ? 'today' : undefined}>
          <span className="n">{d.count}</span>
          <span className={d.count ? 'bar' : 'bar zero'} style={{ height: d.count ? `${(d.count / highest) * 100}%` : '3%' }} />
          <span>{d.day}<span className="sr-only">{d.today ? ' (today)' : ''}</span></span>
        </li>
      ))}
    </ul>
  );
}

function topicLine(t) {
  const quiz = t.bestQuiz ? `best quiz ${t.bestQuiz.score} of ${t.bestQuiz.total}` : 'quiz not taken';
  return `${t.lessonsDone} of ${t.lessons} lessons · ${quiz}`;
}

export default function Dashboard() {
  useTitle('Dashboard');
  const { loading, error, data, reload } = useLoad(() => api.dashboard(), []);
  if (loading) return <Loading />;
  if (error) return <Failed message={error} onRetry={reload} />;

  const { score, lessons, quiz, phish, week, topics, next, tip, sampleProgress } = data;
  return (
    <>
      <PageHead title="Your dashboard">
        A short look at what you have done and what to do next.{' '}
        {sampleProgress && <Link to="/about" className="tag sample">Includes sample progress</Link>}
      </PageHead>

      <div className="dash">
        <section className="card span-4" aria-labelledby="h-score">
          <h2 id="h-score">Awareness score</h2>
          <div className="score">
            <Ring pct={score} />
            <div className="stats">
              <div className="stat"><span className="num">{lessons.done} / {lessons.total}</span><span className="lbl">lessons done</span></div>
              <div className="stat"><span className="num">{quiz.average === null ? '–' : `${quiz.average}%`}</span><span className="lbl">quiz average ({quiz.taken} of {quiz.total} taken)</span></div>
              <div className="stat"><span className="num">{phish.right} / {phish.total}</span><span className="lbl">messages judged right</span></div>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>The score is half lessons, a quarter quizzes and a quarter phish spotting.</p>
        </section>

        <section className="card span-2 next" aria-labelledby="h-next">
          <p className="small">Next up</p>
          <h2 id="h-next">{next.title}</h2>
          <p>{next.detail}</p>
          <Link className="btn" to={next.to}>{next.action}</Link>
        </section>

        <section className="card span-3" aria-labelledby="h-week">
          <h2 id="h-week">This week</h2>
          <WeekBars week={week} />
          <p className="small muted" style={{ marginTop: 8 }}>Lessons finished, quizzes taken and messages judged.</p>
        </section>

        <section className="card span-3" aria-labelledby="h-topics">
          <h2 id="h-topics">Progress by topic</h2>
          <ul className="topic-rows">
            {topics.map((t) => {
              // Lessons are half of a topic, the best quiz result is the other half.
              const pct = Math.round(50 * (t.lessonsDone / t.lessons) + 50 * (t.bestQuiz ? t.bestQuiz.score / t.bestQuiz.total : 0));
              return (
                <li key={t.id}>
                  <TopicBadge topicId={t.id} />
                  <div>
                    <div className="top"><strong>{t.name}</strong><span className="small muted">{topicLine(t)}</span></div>
                    <div className="meter" role="img" aria-label={`${t.name}: ${pct} percent`}><span style={{ width: `${pct}%` }} /></div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card span-6 coach" aria-labelledby="h-coach">
          <div className="card-head"><h2 id="h-coach">Coach tip</h2><span className="tag sample">Sample tip, not AI</span></div>
          <p>{tip.text}</p>
        </section>
      </div>
    </>
  );
}
