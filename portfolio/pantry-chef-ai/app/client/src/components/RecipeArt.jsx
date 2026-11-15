import PlateArt from './PlateArt.jsx';
import pasta from '../photos/pasta.jpg?inline';
import pancakes from '../photos/pancakes.jpg?inline';
import salad from '../photos/salad.jpg?inline';
import burger from '../photos/burger.jpg?inline';
import pizza from '../photos/pizza.jpg?inline';
import salmon from '../photos/salmon.jpg?inline';
import tacos from '../photos/tacos.jpg?inline';
import lavaCake from '../photos/lava-cake.jpg?inline';

// Photos supplied by the owner (he says he made them with an AI image tool), matched to recipes by title.
// A recipe with no photo yet falls back to the drawn plate.
const PHOTOS = {
  'Creamy Garlic Pasta': pasta,
  'Banana Oat Pancakes': pancakes,
  'Crunchy Garden Salad': salad,
  'Classic Cheeseburger': burger,
  'Beef Pepperoni Pizza': pizza,
  'Pan-Seared Salmon with Asparagus': salmon,
  'Spiced Beef Tacos': tacos,
  'Chocolate Lava Cake': lavaCake,
};

export const HERO_PHOTO = pasta;

export default function RecipeArt({ recipe }) {
  const photo = PHOTOS[recipe.title];
  if (photo) return <img className="photo" src={photo} alt="" loading="lazy" />;
  return <PlateArt colors={recipe.colors} seed={recipe.id} />;
}
