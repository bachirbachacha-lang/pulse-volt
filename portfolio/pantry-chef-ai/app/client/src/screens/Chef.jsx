import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import PlateArt from '../components/PlateArt.jsx';

const GOALS = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'high-protein', label: 'High protein' },
  { id: 'lighter', label: 'Lighter' },
];

export const FIRST_MESSAGE = {
  id: 0,
  from: 'chef',
  text: 'Hello! Tell me what is in your kitchen and I will find something to cook. You can also use the buttons above.',
};

let nextId = 1; // every message gets its own number so React can tell them apart

// One suggestion card. "uses" and "missing" are only there for ingredient matches.
function Suggestion({ item }) {
  const { recipe, uses = [], missing } = item;
  return (
    <Link className="suggestion" to={`/recipe/${recipe.id}`}>
      <span className="art"><PlateArt colors={recipe.colors} seed={recipe.id} /></span>
      <div className="info">
        <h3>{recipe.title}</h3>
        <div className="meta">
          <span><Icon name="clock" />{recipe.minutes} min</span>
          {missing && (
            <span className={`tag ${missing.length === 0 ? 'green' : 'yellow'}`}>
              {missing.length === 0 ? 'You have everything' : `Missing ${missing.length}`}
            </span>
          )}
        </div>
        {uses.length > 0 && <p className="why">Uses {uses.join(', ').toLowerCase()}</p>}
        {missing?.length > 0 && <p className="why">Needs {missing.join(', ').toLowerCase()}</p>}
      </div>
    </Link>
  );
}

function Plan({ plan }) {
  return (
    <div className="stack">
      {plan.days.map((day) => (
        <div key={day.day} className="plan-day">
          <h3>Day {day.day}</h3>
          <ul>
            {day.meals.map((meal) => (
              <li key={meal.slot}>
                <span>{meal.slot}</span>
                <Link to={`/recipe/${meal.recipe.id}`}>{meal.recipe.title}</Link>
              </li>
            ))}
          </ul>
          <p className="small muted" style={{ marginTop: 6 }}>About {day.kcal} kcal and {day.protein} g protein (estimate)</p>
        </div>
      ))}
      <p className="note">{plan.note}</p>
    </div>
  );
}

export default function Chef({ messages, setMessages }) {
  useTitle('Chef');
  const location = useLocation();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef(null);
  const startedFromPantry = useRef(false);

  const say = (message) => setMessages((list) => [...list, { id: nextId++, ...message }]);

  // Shows what the person asked, waits for the server, then shows the chef's answer.
  async function ask(myWords, getAnswer) {
    if (busy) return;
    say({ from: 'me', text: myWords });
    setBusy(true);
    try {
      say({ from: 'chef', ...(await getAnswer()) });
    } catch (err) {
      say({ from: 'chef', text: err.message, isError: true });
    } finally {
      setBusy(false);
    }
  }

  const usePantry = () =>
    ask('Use what I have', async () => {
      const r = await api.suggest({ usePantry: true });
      return { text: r.reply, suggestions: r.suggestions, toPantry: r.emptyPantry };
    });

  const random = () =>
    ask('Random recipe', async () => {
      const recipe = await api.randomRecipe();
      return { text: 'How about this one?', suggestions: [{ recipe }] };
    });

  const askForGoal = () => {
    if (busy) return;
    say({ from: 'me', text: 'Diet plan' });
    say({ from: 'chef', text: 'What kind of plan would you like for the next 3 days?', goals: true });
  };

  const dietPlan = (goal) =>
    ask(goal.label, async () => {
      const plan = await api.dietPlan(goal.id);
      return { text: `Here is a ${plan.goalLabel.toLowerCase()} plan for 3 days.`, plan };
    });

  function send(event) {
    event.preventDefault();
    const words = text.trim();
    if (!words) return;
    setText('');
    ask(words, async () => {
      const r = await api.suggest({ text: words });
      return { text: r.reply, suggestions: r.suggestions };
    });
  }

  // Coming from the Pantry screen's "Cook with these" button: ask straight away, once.
  useEffect(() => {
    if (location.state?.usePantry && !startedFromPantry.current) {
      startedFromPantry.current = true;
      navigate('/chef', { replace: true, state: null }); // forget the instruction so Back does not repeat it
      usePantry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    if (messages.length > 1) bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy]);

  const lastId = messages[messages.length - 1].id;

  return (
    <>
      <main className="screen with-composer">
        <div className="topbar">
          <div><h1>Chef</h1><p className="hello">Your cooking helper</p></div>
          <span className="tag yellow">Sample answers</span>
        </div>

        <div className="quick">
          <button className="btn ghost" onClick={usePantry} disabled={busy}><Icon name="pantry" />Use what I have</button>
          <button className="btn ghost" onClick={random} disabled={busy}><Icon name="shuffle" />Random recipe</button>
          <button className="btn ghost" onClick={askForGoal} disabled={busy}><Icon name="calendar" />Diet plan</button>
        </div>

        <div className="chat" role="log" aria-live="polite" aria-label="Conversation with the chef">
          {messages.map((m) => (
            <div key={m.id} className="chat-item">
              <div className={`bubble ${m.from}${m.isError ? ' error' : ''}`}>
                {m.from === 'chef' && <span className="who">Chef</span>}
                {m.from === 'me' && <span className="sr-only">You: </span>}
                {m.text}
              </div>
              {m.toPantry && <Link className="btn" to="/pantry">Open my pantry</Link>}
              {m.goals && (
                <div className="quick" style={{ margin: 0 }}>
                  {GOALS.map((g) => (
                    <button key={g.id} className="btn ghost" onClick={() => dietPlan(g)} disabled={busy || m.id !== lastId}>{g.label}</button>
                  ))}
                </div>
              )}
              {m.suggestions?.length > 0 && (
                <div className="stack">{m.suggestions.map((s) => <Suggestion key={s.recipe.id} item={s} />)}</div>
              )}
              {m.plan && <Plan plan={m.plan} />}
            </div>
          ))}
          {busy && <div className="bubble chef"><span className="who">Chef</span>Thinking…</div>}
        </div>
        <div ref={bottom} />
      </main>

      <form className="composer" onSubmit={send}>
        <label className="sr-only" htmlFor="chef-message">Tell the chef what ingredients you have</label>
        <input id="chef-message" className="field" placeholder="e.g. chicken, rice, tomato" value={text} maxLength={500}
          onChange={(e) => setText(e.target.value)} autoComplete="off" />
        <button className="icon-btn on" aria-label="Send" disabled={busy || !text.trim()}><Icon name="send" /></button>
      </form>
    </>
  );
}
