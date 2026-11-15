import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import RecipeCard from '../components/RecipeCard.jsx';
import Mascot from '../components/Mascot.jsx';
import { HERO_PHOTO } from '../components/RecipeArt.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

const CAT_ICONS = { breakfast: 'sun', lunch: 'bowl', dinner: 'moon', snacks: 'cookie', desserts: 'cake' };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  useTitle('');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const categories = useLoad(() => api.categories(), []);
  const popular = useLoad(() => api.recipes({ popular: '1' }), []);

  function search(event) {
    event.preventDefault(); // stop the browser from reloading the page
    navigate('/explore' + (query.trim() ? '?q=' + encodeURIComponent(query.trim()) : ''));
  }

  return (
    <main className="screen">
      <div className="topbar">
        <div>
          <p className="hello">{greeting()}</p>
          <h1>What would you like to cook?</h1>
        </div>
        <div className="brand" aria-label="Potwise"><Logo /></div>
      </div>

      <form className="search" role="search" onSubmit={search}>
        <Icon name="search" />
        <label className="sr-only" htmlFor="home-search">Search recipes or ingredients</label>
        <input id="home-search" type="search" placeholder="Search recipes or ingredients" value={query}
          onChange={(e) => setQuery(e.target.value)} maxLength={60} />
      </form>

      <section className="chef-card">
        <img className="chef-photo" src={HERO_PHOTO} alt="" />
        <div className="chef-copy">
          <span className="pill-label">Chef</span>
          <h2>Cook what you already have</h2>
          <p>Tell the chef what is in your kitchen and get meal ideas.</p>
          <Link className="btn" to="/chef">Ask the chef<Icon name="send" /></Link>
        </div>
        <Mascot size={54} />
      </section>
      <div className="section-head"><h2>Categories</h2></div>
      {categories.error && <ErrorNote message={categories.error} onRetry={categories.reload} />}
      {categories.data && (
        <div className="cat-tiles">
          {categories.data.map((c) => (
            <Link key={c.id} className={`cat-tile cat-${c.id}`} to={`/explore?category=${c.id}`}>
              <span className="cat-icon"><Icon name={CAT_ICONS[c.id] ?? 'bowl'} /></span>{c.label}
            </Link>
          ))}
        </div>
      )}

      <div className="section-head">
        <h2>Popular recipes</h2>
        <Link to="/explore">See all</Link>
      </div>
      {popular.loading && <Loading />}
      {popular.error && <ErrorNote message={popular.error} onRetry={popular.reload} />}
      {popular.data && (
        <div className="cards">
          {popular.data.map((r) => <RecipeCard key={r.id} recipe={r} />)}
        </div>
      )}
    </main>
  );
}
