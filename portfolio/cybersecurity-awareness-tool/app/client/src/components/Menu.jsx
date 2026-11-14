import { Link, NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';

// The menu: down the left side on a laptop, tabs along the bottom on a phone.
// The CSS decides which; the list is the same.
const ITEMS = [
  { to: '/', icon: 'home', long: 'Dashboard', short: 'Home', end: true },
  { to: '/lessons', icon: 'book', long: 'Lessons', short: 'Lessons' },
  { to: '/quiz', icon: 'quiz', long: 'Quizzes', short: 'Quiz' },
  { to: '/spot', icon: 'mail', long: 'Spot the phish', short: 'Spot' },
  { to: '/password', icon: 'key', long: 'Password checker', short: 'Password' },
  { to: '/about', icon: 'info', long: 'About', short: 'About' },
];

export default function Menu() {
  return (
    <header className="side">
      <Link className="brand" to="/"><Logo />Latchlight</Link>
      <nav className="nav" aria-label="Main">
        <ul>
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end}>
                <Icon name={item.icon} />
                <span className="long">{item.long}</span>
                <span className="short" aria-hidden="true">{item.short}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <p className="side-note">Look twice. Click once.</p>
    </header>
  );
}
