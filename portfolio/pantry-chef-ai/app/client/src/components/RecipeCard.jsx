import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import PlateArt from './PlateArt.jsx';

// One recipe in a grid. Tapping it opens the recipe.
export default function RecipeCard({ recipe }) {
  return (
    <Link className="recipe-card" to={`/recipe/${recipe.id}`}>
      <span className="art"><PlateArt colors={recipe.colors} seed={recipe.id} /></span>
      <div className="body">
        <h3>{recipe.title}</h3>
        <div className="meta">
          <span><Icon name="clock" />{recipe.minutes} min</span>
          <span><Icon name="level" />{recipe.difficulty}</span>
        </div>
      </div>
    </Link>
  );
}
