import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import Icon, { TopicBadge } from '../components/Icon.jsx';
import { Failed, Loading, PageHead } from '../components/Status.jsx';

export default function Lessons() {
  useTitle('Lessons');
  const { loading, error, data, reload } = useLoad(async () => {
    const [topics, lessons] = await Promise.all([api.topics(), api.lessons()]);
    return { topics, lessons };
  }, []);
  if (loading) return <Loading />;
  if (error) return <Failed message={error} onRetry={reload} />;

  return (
    <>
      <PageHead title="Lessons">Eight short reads. Each takes about four minutes. Finish both lessons in a topic, then try its quiz.</PageHead>
      {data.topics.map((topic) => (
        <section className="topic-block" key={topic.id} aria-labelledby={`t-${topic.id}`}>
          <div className="topic-title">
            <TopicBadge topicId={topic.id} />
            <div className="grow">
              <h2 id={`t-${topic.id}`}>{topic.name}</h2>
              <p className="small muted">{topic.blurb}</p>
            </div>
            <Link className="btn ghost" to={`/quiz/${topic.id}`}>Take the quiz<span className="sr-only">: {topic.name}</span></Link>
          </div>
          <div className="lesson-grid">
            {data.lessons.filter((l) => l.topicId === topic.id).map((l) => (
              <Link className="lesson-card" to={`/lessons/${l.id}`} key={l.id}>
                <h3>{l.title}</h3>
                <p>{l.summary}</p>
                {l.done ? <span className="tag done"><Icon name="check" />Done</span> : <span className="tag">{l.minutes} min</span>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
