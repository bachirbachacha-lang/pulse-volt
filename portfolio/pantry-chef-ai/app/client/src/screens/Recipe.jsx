import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import PlateArt from '../components/PlateArt.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

const TAG_COLOURS = { Vegetarian: 'green', Vegan: 'green', 'High protein': 'red', Quick: 'yellow', Lighter: 'yellow' };

export default function Recipe() {
  const { id } = useParams(); // the number in the address, e.g. /recipe/8
  const navigate = useNavigate();
  const { data: recipe, loading, error, reload, setData } = useLoad(() => api.recipe(id), [id]);
  const [done, setDone] = useState(() => new Set()); // steps the cook has ticked off
  const [saveError, setSaveError] = useState('');
  useTitle(recipe?.title ?? 'Recipe');

  async function toggleSaved() {
    const next = !recipe.saved;
    setSaveError('');
    setData((r) => ({ ...r, saved: next })); // show the change straight away...
    try {
      await api.setSaved(recipe.id, next);
    } catch (err) {
      setData((r) => ({ ...r, saved: !next })); // ...and undo it if the server said no
      setSaveError(err.message);
    }
  }

  function toggleStep(index) {
    setDone((old) => {
      const copy = new Set(old);
      if (copy.has(index)) copy.delete(index);
      else copy.add(index);
      return copy;
    });
  }

  if (loading || error) {
    return (
      <main className="screen no-tabs">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back"><Icon name="back" /></button>
        <div style={{ marginTop: 16 }}>
          {loading ? <Loading /> : <ErrorNote message={error} onRetry={reload} />}
        </div>
      </main>
    );
  }

  const haveCount = recipe.ingredients.filter((i) => i.have).length;

  return (
    <main>
      <div className="hero">
        <span className="art"><PlateArt colors={recipe.colors} seed={recipe.id} /></span>
        <div className="hero-bar">
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back"><Icon name="back" /></button>
          <button className={`icon-btn${recipe.saved ? ' on' : ''}`} onClick={toggleSaved} aria-pressed={recipe.saved}
            aria-label="Save recipe">
            <Icon name="heart" filled={recipe.saved} />
          </button>
        </div>
      </div>

      <div className="sheet">
        <div className="tags">
          <span className="tag">{recipe.category[0].toUpperCase() + recipe.category.slice(1)}</span>
          {recipe.tags.map((t) => <span key={t} className={`tag ${TAG_COLOURS[t] ?? ''}`}>{t}</span>)}
        </div>
        <h1 style={{ marginTop: 10 }}>{recipe.title}</h1>
        <p className="muted" style={{ marginTop: 6 }}>{recipe.description}</p>
        {saveError && <p className="error" role="alert" style={{ marginTop: 12 }}>{saveError}</p>}

        <div className="stats">
          <div className="stat"><b>{recipe.minutes}</b><span>minutes</span></div>
          <div className="stat"><b>{recipe.difficulty}</b><span>level</span></div>
          <div className="stat"><b>{recipe.servings}</b><span>serving{recipe.servings === 1 ? '' : 's'}</span></div>
          <div className="stat"><b>{recipe.kcal}</b><span>kcal est.</span></div>
        </div>

        <div className="section-head">
          <h2>Ingredients</h2>
          <span className="small muted">You have {haveCount} of {recipe.ingredients.length}</span>
        </div>
        <ul className="ing-list">
          {recipe.ingredients.map((i) => (
            <li key={i.name}>
              <span className={`have${i.have ? ' yes' : ''}`}>{i.have && <Icon name="check" />}</span>
              <span>{i.name}<span className="sr-only">{i.have ? ' (you have this)' : ' (not in your pantry)'}</span></span>
              <span className="qty">{i.quantity}</span>
            </li>
          ))}
        </ul>

        <div className="section-head">
          <h2>Steps</h2>
          <span className="small muted">Tap a step when it is done</span>
        </div>
        <ol className="steps">
          {recipe.steps.map((text, index) => (
            <li key={index}>
              <button className={`step${done.has(index) ? ' done' : ''}`} aria-pressed={done.has(index)} onClick={() => toggleStep(index)}>
                <span className="n">{done.has(index) ? <Icon name="check" /> : index + 1}</span>
                <span>{text}</span>
              </button>
            </li>
          ))}
        </ol>

        <p className="note" style={{ marginTop: 14 }}>
          Sample recipe. Calories ({recipe.kcal} kcal) and protein ({recipe.protein} g) are rough estimates for one serving.
        </p>
      </div>
    </main>
  );
}
