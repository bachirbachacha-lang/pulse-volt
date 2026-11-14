import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import { PageHead } from '../components/Status.jsx';

export default function About() {
  useTitle('About');
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false); // true while "Are you sure?" is showing
  const [error, setError] = useState(null);

  async function startFresh() {
    setError(null);
    try {
      await api.resetProgress();
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHead title="About Latchlight">A small trainer for everyday online safety. Look twice. Click once.</PageHead>
      <div className="stack" style={{ maxWidth: '70ch' }}>
        <section className="card">
          <h2>What is sample here</h2>
          <ul className="points">
            <li><Icon name="check" />The lessons, quiz questions and practice messages were written for this student project. They are general good practice, not professional advice.</li>
            <li><Icon name="check" />Every sender and organisation in the practice messages is invented. Their addresses end in <span className="mono">.example</span>, which cannot belong to a real company.</li>
            <li><Icon name="check" />The coach tip is picked by simple rules. It is not AI.</li>
            <li><Icon name="check" />The app starts with a little sample progress so the dashboard is not empty.</li>
          </ul>
        </section>
        <section className="card">
          <h2>What stays private</h2>
          <ul className="points">
            <li><Icon name="check" />There are no accounts. Your progress is kept in one file on the computer that runs the app.</li>
            <li><Icon name="check" />The password checker works inside the page. What you type there is never sent anywhere and never saved.</li>
            <li><Icon name="check" />The app only defends. It sends no messages and contains no attack tools.</li>
          </ul>
        </section>
        <section className="card">
          <h2>Start fresh</h2>
          <p className="muted">Removes all progress, including the sample progress: lessons marked done, quiz results and phish answers. The lessons themselves stay.</p>
          <div className="row" style={{ marginTop: 14 }}>
            {!asking && <button className="btn ghost" type="button" onClick={() => setAsking(true)}>Start fresh</button>}
            {asking && (
              <>
                <strong>Remove all progress?</strong>
                <button className="btn danger" type="button" onClick={startFresh}>Yes, remove it</button>
                <button className="btn ghost" type="button" onClick={() => setAsking(false)}>Cancel</button>
              </>
            )}
          </div>
          {error && <p className="notice bad" role="alert" style={{ marginTop: 12 }}>{error}</p>}
        </section>
      </div>
    </>
  );
}
