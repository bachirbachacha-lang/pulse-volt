import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import RecipeCard from '../components/RecipeCard.jsx';
import { Empty, ErrorNote, Loading } from '../components/Status.jsx';

// The search words and the chosen category are kept in the address,
// for example /explore?category=dinner&q=rice. That way the Back button
// and shared links bring you to exactly the same list.
export default function Explore() {
  useTitle('Explore');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';

  const categories = useLoad(() => api.categories(), []);
  const recipes = useLoad(() => api.recipes({ q, category }), [q, category]);

  function change(name, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  }

  return (
    <main className="screen">
      <h1>Explore</h1>
      <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <Icon name="search" />
        <label className="sr-only" htmlFor="explore-search">Search recipes or ingredients</label>
        <input id="explore-search" type="search" placeholder="Search recipes or ingredients" value={q}
          onChange={(e) => change('q', e.target.value)} maxLength={60} />
      </form>

      <div className="cats" role="group" aria-label="Category">
        <button className={`cat${category === '' ? ' active' : ''}`} aria-pressed={category === ''} onClick={() => change('category', '')}>All</button>
        {categories.data?.map((c) => (
          <button key={c.id} className={`cat${category === c.id ? ' active' : ''}`} aria-pressed={category === c.id}
            onClick={() => change('category', c.id)}>
            <span className="dot" style={{ background: c.color }} />{c.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        {recipes.loading && !recipes.data && <Loading />}
        {recipes.error && <ErrorNote message={recipes.error} onRetry={recipes.reload} />}
        {recipes.data && (
          <>
            <p className="small muted" role="status" style={{ marginBottom: 12 }}>
              {recipes.data.length} recipe{recipes.data.length === 1 ? '' : 's'}
            </p>
            {recipes.data.length === 0 ? (
              <Empty title="No recipes found"><p>Try a different word, or pick another category.</p></Empty>
            ) : (
              <div className="cards">{recipes.data.map((r) => <RecipeCard key={r.id} recipe={r} />)}</div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
