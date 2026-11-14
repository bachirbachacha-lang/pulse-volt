import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import { Failed, Loading } from '../components/Status.jsx';

export default function Lesson() {
  const { id } = useParams();
  const { loading, error, data: lesson, reload, setData } = useLoad(() => api.lesson(id), [id]);
  const [saveError, setSaveError] = useState(null);
  useTitle(lesson?.title ?? 'Lesson');

  if (loading) return <Loading />;
  if (error) return <Failed message={error} onRetry={reload} />;

  async function toggleDone() {
    setSaveError(null);
    try {
      const result = await api.setLessonDone(lesson.id, !lesson.done);
      setData((l) => ({ ...l, done: result.done }));
    } catch (err) {
      setSaveError(err.message);
    }
  }

  return (
    <article className="lesson-body">
      <Link className="back" to="/lessons"><Icon name="back" />All lessons</Link>
      <div className="page-head">
        <p className="row small muted" style={{ marginBottom: 6 }}>
          <span>{lesson.topicName}</span><span>·</span><span>{lesson.minutes} min read</span>
          {lesson.done && <span className="tag done"><Icon name="check" />Done</span>}
        </p>
        <h1>{lesson.title}</h1>
        <p>{lesson.summary}</p>
      </div>

      {lesson.sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          {s.text.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </section>
      ))}

      <h2>Remember</h2>
      <ul className="points">
        {lesson.points.map((p) => <li key={p}><Icon name="check" />{p}</li>)}
      </ul>

      <p className="try"><strong>Try it</strong>{lesson.tryIt}</p>

      <div className="row" style={{ marginTop: 24 }}>
        <button className={lesson.done ? 'btn ghost' : 'btn'} type="button" onClick={toggleDone} aria-pressed={lesson.done}>
          {lesson.done ? 'Mark as not done' : 'Mark as done'}
        </button>
        {lesson.done && lesson.next && <Link className="btn" to={`/lessons/${lesson.next.id}`}>Next lesson: {lesson.next.title}</Link>}
        <Link className="btn ghost" to={`/quiz/${lesson.topicId}`}>Take the {lesson.topicName} quiz</Link>
      </div>
      {saveError && <p className="notice bad" role="alert" style={{ marginTop: 12 }}>{saveError}</p>}
    </article>
  );
}
