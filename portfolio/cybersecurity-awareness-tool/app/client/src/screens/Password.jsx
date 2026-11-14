import { useState } from 'react';
import { useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import { PageHead } from '../components/Status.jsx';
// The checker lives in shared/password.js. Notice that this screen does NOT import api.js:
// what you type stays in this page. It is never sent, and never saved.
import { checkPassword, makePassphrase } from '../../../shared/password.js';
import { WORDS } from '../../../shared/words.js';

// A fair random whole number from 0 to n-1, using the browser's secure random source.
// (Math.random is fine for games but should not be used for passwords.)
function secureRandom(n) {
  const limit = Math.floor(0x100000000 / n) * n; // throw away the uneven top end so every number is equally likely
  const box = new Uint32Array(1);
  do crypto.getRandomValues(box); while (box[0] >= limit);
  return box[0] % n;
}

export default function Password() {
  useTitle('Password checker');
  const [password, setPassword] = useState(''); // kept only in memory, and gone when you leave this screen
  const [visible, setVisible] = useState(false);
  const [phrase, setPhrase] = useState(() => makePassphrase(WORDS, secureRandom));
  const result = checkPassword(password);

  return (
    <>
      <PageHead title="Password checker">See how strong a password is and why. Try made-up examples rather than your real passwords.</PageHead>
      <div className="dash">
        <section className="card span-4" aria-labelledby="h-check">
          <p className="notice good" style={{ marginBottom: 16 }}>
            <strong>Private by design.</strong> The check runs inside this page. What you type is never sent to the server and never saved.
          </p>
          <h2 id="h-check" className="sr-only">Check a password</h2>
          <label htmlFor="pw"><strong>Password to check</strong></label>
          <div className="pw-row" style={{ marginTop: 6 }}>
            <input id="pw" className="input mono" type={visible ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} maxLength={200}
              autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} data-lpignore="true" />
            <button className="btn ghost" type="button" onClick={() => setVisible((v) => !v)} aria-pressed={visible}>{visible ? 'Hide' : 'Show'}</button>
            {password && <button className="btn ghost" type="button" onClick={() => setPassword('')}>Clear</button>}
          </div>

          {/* aria-live makes screen readers read the new result out when it changes */}
          <div aria-live="polite">
            {!result && <p className="muted" style={{ marginTop: 14 }}>Start typing to see the result. Examples to try: <span className="mono">P@ssw0rd!</span> and <span className="mono">Summer2024!</span></p>}
            {result && (
              <>
                <div className={`segs s${result.score}`} role="img" aria-label={`Strength ${result.score} of 4`}><span /><span /><span /><span /></div>
                <p className="pw-label">{result.label}</p>
                <p className="muted">{result.summary}</p>
                <ul className="checks" style={{ marginTop: 12 }}>
                  {result.checks.map((c) => (
                    <li key={c.text} className={c.ok ? 'yes' : 'no'}>
                      <Icon name={c.ok ? 'check' : 'cross'} /><span><span className="sr-only">{c.ok ? 'Good: ' : 'Problem: '}</span>{c.text}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <p className="small muted" style={{ marginTop: 16 }}>
            This is an estimate. A checker cannot know whether a password has leaked, or whether you use it on more than one account. Either of those makes even a "very strong" password unsafe.
          </p>
        </section>

        <section className="card span-2" aria-labelledby="h-phrase">
          <h2 id="h-phrase">Need a better one?</h2>
          <p className="muted">Four random words are long, hard to guess and easier to remember.</p>
          <p className="phrase" style={{ margin: '12px 0' }} data-testid="phrase">{phrase}</p>
          <div className="row">
            <button className="btn" type="button" onClick={() => setPhrase(makePassphrase(WORDS, secureRandom))}>Make another</button>
            <button className="btn ghost" type="button" onClick={() => { setPassword(phrase); setVisible(true); }}>Check this one</button>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            Made in your browser from a list of only {WORDS.length} words, to show the idea. For real accounts, let a password manager make and keep your passwords: it picks from far more possibilities.
          </p>
        </section>
      </div>
    </>
  );
}
