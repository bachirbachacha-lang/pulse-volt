import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import TabBar from './components/TabBar.jsx';
import Home from './screens/Home.jsx';
import Explore from './screens/Explore.jsx';
import Recipe from './screens/Recipe.jsx';
import Chef, { FIRST_MESSAGE } from './screens/Chef.jsx';
import Saved from './screens/Saved.jsx';
import Pantry from './screens/Pantry.jsx';
import { Empty } from './components/Status.jsx';
import { Link } from 'react-router-dom';

// The frame of the app: which address shows which screen, plus the bottom tabs.
export default function App() {
  const location = useLocation();
  const onRecipe = location.pathname.startsWith('/recipe/');

  // The chat lives here, not inside the Chef screen, so it is still there
  // when you look at a recipe and come back.
  const [messages, setMessages] = useState([FIRST_MESSAGE]);

  // Start each new screen at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/recipe/:id" element={<Recipe />} />
        <Route path="/chef" element={<Chef messages={messages} setMessages={setMessages} />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/pantry" element={<Pantry />} />
        <Route path="*" element={
          <main className="screen">
            <Empty title="That page does not exist"><p><Link to="/" className="btn" style={{ marginTop: 12 }}>Go home</Link></p></Empty>
          </main>
        } />
      </Routes>
      {!onRecipe && <TabBar />}
    </div>
  );
}
