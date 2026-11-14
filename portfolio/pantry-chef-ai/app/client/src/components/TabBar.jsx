import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';

const TABS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/explore', label: 'Explore', icon: 'explore' },
  { to: '/chef', label: 'Chef', icon: 'chef' },
  { to: '/saved', label: 'Saved', icon: 'heart' },
  { to: '/pantry', label: 'Pantry', icon: 'pantry' },
];

// The five buttons along the bottom. NavLink knows which screen is open
// and adds the "active" style to that tab.
export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}
          className={({ isActive }) => `tab${tab.icon === 'chef' ? ' chef-tab' : ''}${isActive ? ' active' : ''}`}>
          {tab.icon === 'chef' ? <span className="bump"><Icon name="chef" /></span> : <Icon name={tab.icon} />}
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
