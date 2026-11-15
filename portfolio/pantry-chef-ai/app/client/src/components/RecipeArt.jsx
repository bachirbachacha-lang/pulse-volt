import PlateArt from './PlateArt.jsx';
import pasta from '../photos/pasta.jpg?inline';
import pancakes from '../photos/pancakes.jpg?inline';
import salad from '../photos/salad.jpg?inline';

// Photos supplied by the owner, matched to recipes by title.
// A recipe with no photo yet falls back to the drawn plate.
const PHOTOS = {
  'Garlic Butter Pasta': pasta,
  'Banana Oat Pancakes': pancakes,
  'Crunchy Garden Salad': salad,
};

export const HERO_PHOTO = pasta;

export default function RecipeArt({ recipe }) {
  const photo = PHOTOS[recipe.title];
  if (photo) return <img className="photo" src={photo} alt="" loading="lazy" />;
  return <PlateArt colors={recipe.colors} seed={recipe.id} />;
}
