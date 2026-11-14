import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import { TopicBadge } from '../components/Icon.jsx';
import { Failed, Loading, PageHead } from '../components/Status.jsx';

export default function Quizzes() {
  useTitle('Quizzes');
  const { loading, error, data: topics, reload } = useLoad(() => api.topics(), []);
  if (loading) return <Loading />;
  if (error) return <Failed message={error} onRetry={reload} />;

  return (
    <>
      <PageHead title="Quizzes">Five questions for each topic. No timer. Every answer is explained afterwards, and only your best result counts.</PageHead>
      <div className="quiz-list">
        {topics.map((t) => (
          <section className="card" key={t.id} aria-labelledby={`q-${t.id}`}>
            <div className="card-head">
              <TopicBadge topicId={t.id} />
              {t.bestQuiz
                ? <span className={t.bestQuiz.score === t.bestQuiz.total ? 'tag done' : 'tag'}>Best: {t.bestQuiz.score} of {t.bestQuiz.total}</span>
                : <span className="tag">Not taken</span>}
            </div>
            <h2 id={`q-${t.id}`}>{t.name}</h2>
            <p className="muted small" style={{ marginBottom: 14 }}>{t.lessonsDone} of {t.lessons} lessons read</p>
            <Link className="btn" to={`/quiz/${t.id}`}>{t.bestQuiz ? 'Try again' : 'Start quiz'}<span className="sr-only">: {t.name}</span></Link>
          </section>
        ))}
      </div>
    </>
  );
}
