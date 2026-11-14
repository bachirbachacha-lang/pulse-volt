import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import RecipeCard from '../components/RecipeCard.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

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
        <div className="brand"><Logo />Potwise</div>
      </div>
      <p className="hello">{greeting()}</p>
      <h1>What would you like to cook?</h1>

      <form className="search" role="search" onSubmit={search}>
        <Icon name="search" />
        <label className="sr-only" htmlFor="home-search">Search recipes or ingredients</label>
        <input id="home-search" type="search" placeholder="Search recipes or ingredients" value={query}
          onChange={(e) => setQuery(e.target.value)} maxLength={60} />
      </form>

      <section className="chef-card">
        <svg className="spark" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3c.8 4.600 2.400 6.200 7 7-4.600.8-6.200 2.400-7 7-.8-4.600-2.400-6.200-7-7 4.600-.8 6.200-2.400 7-7z" fill="#F2B441" />
        </svg>
        <span className="pill-label">Chef</span>
        <h2>Cook what you already have</h2>
        <p>Tell the chef what is in your kitchen and get meal ideas.</p>
        <Link className="btn light" to="/chef">Ask the chef</Link>
      </section>

      <div className="section-head"><h2>Categories</h2></div>
      {categories.error && <ErrorNote message={categories.error} onRetry={categories.reload} />}
      {categories.data && (
        <div className="cats">
          {categories.data.map((c) => (
            <Link key={c.id} className="cat" to={`/explore?category=${c.id}`}>
              <span className="dot" style={{ background: c.color }} />{c.label}
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
