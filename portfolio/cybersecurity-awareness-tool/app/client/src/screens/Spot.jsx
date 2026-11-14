import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import { Failed, Loading, PageHead } from '../components/Status.jsx';

// One practice message, drawn as an email or as a text message.
function Message({ m }) {
  return (
    <article className={`msg ${m.kind}`} aria-label={m.kind === 'sms' ? 'Text message' : 'Email'}>
      <div className="msg-head">
        <dl>
          <dt>From</dt>
          <dd><strong>{m.fromName}</strong>{m.fromAddress && <> <span className="mono">&lt;{m.fromAddress}&gt;</span></>}</dd>
          {m.kind === 'email' && <><dt>To</dt><dd>you</dd></>}
          {m.subject && <><dt>Subject</dt><dd className="subject">{m.subject}</dd></>}
          {m.kind === 'sms' && <><dt>Type</dt><dd>Text message</dd></>}
        </dl>
      </div>
      <div className="msg-body">{m.body}</div>
      {m.linkUrl && (
        // The link is shown as text on purpose. Nothing in a practice message can be clicked.
        <p className="msg-link">
          {m.kind === 'email' ? 'Button' : 'Link'}: <strong>{m.linkText}</strong><br />
          <span className="muted">Goes to:</span> <span className="mono">{m.linkUrl}</span>
        </p>
      )}
    </article>
  );
}

export default function Spot() {
  useTitle('Spot the phish');
  const { loading, error, data: messages, reload } = useLoad(() => api.messages(), []);
  const [index, setIndex] = useState(0);     // which message we are on
  const [results, setResults] = useState([]); // true/false for each message answered so far
  const [feedback, setFeedback] = useState(null); // the clues, once you have answered
  const [sendError, setSendError] = useState(null);

  if (loading) return <Loading />;
  if (error) return <Failed message={error} onRetry={reload} />;

  const total = messages.length;
  const finished = index >= total;
  const right = results.filter(Boolean).length;

  async function answer(verdict) {
    setSendError(null);
    try {
      const result = await api.answerMessage(messages[index].id, verdict);
      setFeedback(result);
      setResults((r) => [...r, result.correct]);
    } catch (err) {
      setSendError(err.message);
    }
  }
  function next() {
    setFeedback(null);
    setIndex((i) => i + 1);
    window.scrollTo(0, 0);
  }
  function restart() {
    setIndex(0);
    setResults([]);
    setFeedback(null);
  }

  const dots = (
    <ol className="dots" aria-label={finished ? 'Your answers' : `Message ${index + 1} of ${total}`} style={{ marginBottom: 16 }}>
      {messages.map((m, i) => (
        <li key={m.id} className={results[i] === true ? 'ok' : results[i] === false ? 'no' : i === index ? 'now' : undefined}>
          <span className="sr-only">{results[i] === true ? 'right' : results[i] === false ? 'wrong' : 'not answered'}</span>
        </li>
      ))}
    </ol>
  );

  if (finished) {
    return (
      <>
        <PageHead title="Spot the phish" />
        {dots}
        <section className="card" aria-live="polite">
          <p className="result-big">{right} of {total}</p>
          <p className="muted">
            {right === total ? 'Every one judged correctly.' : 'The ones you missed are the ones worth another look.'}
            {' '}Remember: when unsure, go to the service your own way instead of using the message.
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" type="button" onClick={restart}>Try again</button>
            <Link className="btn ghost" to="/">Back to dashboard</Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHead title="Spot the phish">Ten invented messages from invented senders. Some are honest, some are bait. Decide, then see the clues.</PageHead>
      {dots}
      <div className="spot">
        <Message m={messages[index]} />
        <div className="stack">
          {!feedback && (
            <section className="card" aria-labelledby="h-verdict">
              <h2 id="h-verdict">Message {index + 1} of {total}: what do you think?</h2>
              <div className="verdict">
                <button className="btn danger" type="button" onClick={() => answer('phish')}>Phish</button>
                <button className="btn" type="button" onClick={() => answer('safe')}>Looks safe</button>
              </div>
              {sendError && <p className="notice bad" role="alert" style={{ marginTop: 12 }}>{sendError}</p>}
            </section>
          )}
          {feedback && (
            <>
              <section className="card" aria-live="polite" aria-labelledby="h-feedback">
                <div className="card-head">
                  <h2 id="h-feedback">{feedback.isPhish ? 'It was a phish' : 'It was safe'}</h2>
                  <span className={feedback.correct ? 'tag done' : 'tag bad'}>
                    <Icon name={feedback.correct ? 'check' : 'cross'} />{feedback.correct ? 'You were right' : 'Not this time'}
                  </span>
                </div>
                <ol className={feedback.isPhish ? 'clues' : 'clues safe'}>
                  {feedback.clues.map((c, i) => (
                    <li key={c.title}><span className="n" aria-hidden="true">{i + 1}</span><span><strong>{c.title}.</strong> {c.text}</span></li>
                  ))}
                </ol>
                <p className="explain">{feedback.explain}</p>
              </section>
              <button className="btn" type="button" onClick={next}>{index + 1 < total ? 'Next message' : 'See my result'}</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
