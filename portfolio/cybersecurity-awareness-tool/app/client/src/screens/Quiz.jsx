import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import { Failed, Loading, PageHead } from '../components/Status.jsx';

export default function Quiz() {
  const { topic } = useParams();
  const { loading, error, data, reload } = useLoad(() => api.quiz(topic), [topic]);
  const [answers, setAnswers] = useState({}); // question id -> chosen position
  const [result, setResult] = useState(null); // filled in after the server has marked it
  const [sendError, setSendError] = useState(null);
  const [sending, setSending] = useState(false);
  useTitle(data ? `${data.topic.name} quiz` : 'Quiz');

  if (loading) return <Loading />;
  if (error) return <Failed message={error} onRetry={reload} />;

  const { questions } = data;
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;

  async function submit(event) {
    event.preventDefault();
    setSendError(null);
    setSending(true);
    try {
      setResult(await api.submitQuiz(topic, answers)); // the server does the marking
      window.scrollTo(0, 0);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  function again() {
    setAnswers({});
    setResult(null);
    window.scrollTo(0, 0);
  }

  if (result) {
    return (
      <>
        <Link className="back" to="/quiz"><Icon name="back" />All quizzes</Link>
        <PageHead title={`${data.topic.name} quiz: your result`} />
        <section className="card" style={{ marginBottom: 16 }} aria-live="polite">
          <p className="result-big">{result.score} of {result.total}</p>
          <p className="muted">
            {result.score === result.total ? 'All correct. Well done.' : 'Read the explanations below, then try again whenever you like.'}
            {' '}Your best so far: {result.best} of {result.total}.
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" type="button" onClick={again}>Try again</button>
            <Link className="btn ghost" to="/">Back to dashboard</Link>
          </div>
        </section>
        <div className="stack">
          {result.review.map((r, n) => (
            <section className="card review" key={r.id}>
              <div className="card-head">
                <h2>{n + 1}. {r.text}</h2>
                <span className={r.correct ? 'tag done' : 'tag bad'}><Icon name={r.correct ? 'check' : 'cross'} />{r.correct ? 'Correct' : 'Not quite'}</span>
              </div>
              <ul>
                {r.choices.map((choice, i) => {
                  const kind = i === r.answer ? 'right' : i === r.chosen ? 'wrong' : '';
                  return (
                    <li className={`choice ${kind}`} key={i}>
                      <span>{choice}</span>
                      {i === r.answer && <span className="mark">Right answer</span>}
                      {i === r.chosen && i !== r.answer && <span className="mark">Your answer</span>}
                    </li>
                  );
                })}
              </ul>
              <p className="explain">{r.explain}</p>
            </section>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Link className="back" to="/quiz"><Icon name="back" />All quizzes</Link>
      <PageHead title={`${data.topic.name} quiz`}>Pick one answer for each question, then check them all at the end.</PageHead>
      <form className="stack" onSubmit={submit}>
        {questions.map((q, n) => (
          <div className="card" key={q.id}>
            <fieldset className="question">
              <legend>{n + 1}. {q.text}</legend>
              {q.choices.map((choice, i) => (
                <label className="choice" key={i}>
                  <input type="radio" name={`q${q.id}`} checked={answers[q.id] === i} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} />
                  <span>{choice}</span>
                </label>
              ))}
            </fieldset>
          </div>
        ))}
        {sendError && <p className="notice bad" role="alert">{sendError}</p>}
        <div className="row">
          <button className="btn" type="submit" disabled={answered < questions.length || sending}>Check my answers</button>
          <span className="muted small" role="status">{answered} of {questions.length} answered</span>
        </div>
      </form>
    </>
  );
}
