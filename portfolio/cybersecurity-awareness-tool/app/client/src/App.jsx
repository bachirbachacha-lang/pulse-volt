import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Menu from './components/Menu.jsx';
import { Empty } from './components/Status.jsx';
import Dashboard from './screens/Dashboard.jsx';
import Lessons from './screens/Lessons.jsx';
import Lesson from './screens/Lesson.jsx';
import Quizzes from './screens/Quizzes.jsx';
import Quiz from './screens/Quiz.jsx';
import Spot from './screens/Spot.jsx';
import Password from './screens/Password.jsx';
import About from './screens/About.jsx';

// The frame of the app: the menu, plus which address shows which screen.
export default function App() {
  const location = useLocation();

  // Start each new screen at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="shell">
      <Menu />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lessons" element={<Lessons />} />
          <Route path="/lessons/:id" element={<Lesson />} />
          <Route path="/quiz" element={<Quizzes />} />
          <Route path="/quiz/:topic" element={<Quiz />} />
          <Route path="/spot" element={<Spot />} />
          <Route path="/password" element={<Password />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={
            <Empty title="That page does not exist"><p style={{ marginTop: 12 }}><Link to="/" className="btn">Go to the dashboard</Link></p></Empty>
          } />
        </Routes>
      </main>
    </div>
  );
}
