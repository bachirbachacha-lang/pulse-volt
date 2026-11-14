import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import { Empty, ErrorNote, Loading } from '../components/Status.jsx';

export default function Pantry() {
  useTitle('Pantry');
  const navigate = useNavigate();
  const pantry = useLoad(() => api.pantry(), []);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState(''); // a short message under the form
  const [busy, setBusy] = useState(false);

  async function add(event) {
    event.preventDefault();
    const text = name.trim();
    if (!text || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const item = await api.addPantry(text);
      if (item.alreadyThere) {
        setNotice(`${item.name} is already in your pantry.`);
      } else {
        pantry.setData((list) => [...list, item]);
        setNotice(`Added ${item.name}.`);
      }
      setName('');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    try {
      await api.removePantry(item.id);
      pantry.setData((list) => list.filter((p) => p.id !== item.id));
      setNotice(`Removed ${item.name}.`);
    } catch (err) {
      setNotice(err.message);
    }
  }

  const items = pantry.data ?? [];

  return (
    <main className="screen">
      <div className="topbar"><div><h1>Pantry</h1><p className="hello">What you have at home</p></div></div>

      <form className="add-row" onSubmit={add}>
        <label className="sr-only" htmlFor="pantry-add">Add an ingredient</label>
        <input id="pantry-add" className="field" placeholder="Add an ingredient" value={name} maxLength={40}
          onChange={(e) => setName(e.target.value)} autoComplete="off" />
        <button className="btn" disabled={busy || !name.trim()}><Icon name="plus" />Add</button>
      </form>
      <p className="small muted" role="status" style={{ minHeight: 20, marginBottom: 10 }}>{notice}</p>

      {pantry.loading && <Loading />}
      {pantry.error && <ErrorNote message={pantry.error} onRetry={pantry.reload} />}
      {pantry.data && items.length === 0 && (
        <Empty title="Your pantry is empty"><p>Add what you have at home, one ingredient at a time.</p></Empty>
      )}
      {items.length > 0 && (
        <>
          <p className="small muted" style={{ marginBottom: 12 }}>{items.length} ingredient{items.length === 1 ? '' : 's'}</p>
          <ul className="chips">
            {items.map((item) => (
              <li key={item.id} className="chip">
                {item.name}
                <button onClick={() => remove(item)} aria-label={`Remove ${item.name}`}><Icon name="x" /></button>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 28 }}>
            <button className="btn block" onClick={() => navigate('/chef', { state: { usePantry: true } })}>
              <Icon name="chef" />Cook with these
            </button>
          </div>
        </>
      )}
    </main>
  );
}
