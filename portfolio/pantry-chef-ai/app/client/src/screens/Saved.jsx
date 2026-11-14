import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import RecipeCard from '../components/RecipeCard.jsx';
import { Empty, ErrorNote, Loading } from '../components/Status.jsx';

export default function Saved() {
  useTitle('Saved');
  const saved = useLoad(() => api.saved(), []);

  return (
    <main className="screen">
      <div className="topbar"><div><h1>Saved</h1><p className="hello">Recipes you want to keep</p></div></div>
      {saved.loading && <Loading />}
      {saved.error && <ErrorNote message={saved.error} onRetry={saved.reload} />}
      {saved.data && saved.data.length === 0 && (
        <Empty title="Nothing saved yet">
          <p>Tap the heart on a recipe to keep it here.</p>
          <p><Link className="btn" to="/explore" style={{ marginTop: 14 }}>Find a recipe</Link></p>
        </Empty>
      )}
      {saved.data && saved.data.length > 0 && (
        <div className="cards">{saved.data.map((r) => <RecipeCard key={r.id} recipe={r} />)}</div>
      )}
    </main>
  );
}
