// SAMPLE DATA. These 16 recipes were written for this project.
// Calories and protein are rough estimates per serving, not measured values.
//
// Each ingredient is [key, name shown on screen, amount].
// The "key" is the simple word the app uses to compare with your pantry,
// so "Red lentils" and "lentils" count as the same thing.
//
// colors = [tile background, food base, topping 1, topping 2] for the drawn plate.

export const CATEGORIES = [
  { id: 'breakfast', label: 'Breakfast', color: '#F2B441' },
  { id: 'lunch', label: 'Lunch', color: '#2E7D4F' },
  { id: 'dinner', label: 'Dinner', color: '#C8401F' },
  { id: 'snacks', label: 'Snacks', color: '#7A3B69' },
  { id: 'desserts', label: 'Desserts', color: '#E0792B' },
];

export const RECIPES = [
  {
    title: 'Masala Scrambled Eggs',
    description: 'Soft scrambled eggs with onion, tomato and a little green chilli. Good with warm flatbread.',
    category: 'breakfast', minutes: 10, difficulty: 'Easy', servings: 2, kcal: 290, protein: 18,
    tags: ['Vegetarian', 'Quick'], popular: false,
    colors: ['#FCEFD2', '#F6D56B', '#C8401F', '#2E7D4F'],
    ingredients: [
      ['egg', 'Eggs', '4'], ['onion', 'Onion', '1 small'], ['tomato', 'Tomato', '1'],
      ['green chilli', 'Green chilli', '1'], ['butter', 'Butter', '15 g'], ['salt', 'Salt', 'to taste'],
    ],
    steps: [
      'Chop the onion, tomato and chilli into small pieces.',
      'Melt the butter in a pan on medium heat. Cook the onion and chilli for 2 minutes until soft.',
      'Add the tomato and a pinch of salt. Cook for 1 minute.',
      'Beat the eggs, pour them in and stir slowly until just set. Take off the heat while still soft.',
    ],
  },
  {
    title: 'Banana Oat Pancakes',
    description: 'Blender pancakes made from oats and banana. No flour and no added sugar.',
    category: 'breakfast', minutes: 15, difficulty: 'Easy', servings: 2, kcal: 340, protein: 13,
    tags: ['Vegetarian', 'Quick'], popular: true,
    colors: ['#F4E9DA', '#E2B36B', '#F6D56B', '#7A3B69'],
    ingredients: [
      ['banana', 'Banana', '2 ripe'], ['oats', 'Rolled oats', '100 g'], ['egg', 'Eggs', '2'],
      ['milk', 'Milk', '80 ml'], ['cinnamon', 'Cinnamon', '1/2 tsp'], ['butter', 'Butter', 'for the pan'],
    ],
    steps: [
      'Blend the oats until they look like flour.',
      'Add the banana, eggs, milk and cinnamon. Blend to a smooth batter and rest it for 2 minutes.',
      'Melt a little butter in a pan on medium-low heat. Pour small rounds of batter.',
      'Cook for 2 minutes, flip when bubbles appear, and cook 1 minute more.',
    ],
  },
  {
    title: 'Overnight Oats with Dates',
    description: 'Mix it at night, eat it in the morning. Creamy oats sweetened only with dates.',
    category: 'breakfast', minutes: 5, difficulty: 'Easy', servings: 1, kcal: 380, protein: 15,
    tags: ['Vegetarian', 'Quick'], popular: false,
    colors: ['#F4E9DA', '#E9D3B0', '#7A4A2A', '#F2B441'],
    ingredients: [
      ['oats', 'Rolled oats', '50 g'], ['milk', 'Milk', '120 ml'], ['yogurt', 'Plain yogurt', '2 tbsp'],
      ['dates', 'Dates', '3, chopped'], ['cinnamon', 'Cinnamon', 'a pinch'], ['almonds', 'Almonds', 'small handful'],
    ],
    steps: [
      'Stir the oats, milk, yogurt and cinnamon together in a jar.',
      'Mix in the chopped dates.',
      'Cover and leave in the fridge overnight, or at least 4 hours.',
      'Top with chopped almonds before eating.',
    ],
  },
  {
    title: 'Crunchy Garden Salad',
    description: 'A crisp everyday salad with a sharp lemon and olive oil dressing.',
    category: 'lunch', minutes: 10, difficulty: 'Easy', servings: 2, kcal: 180, protein: 4,
    tags: ['Vegan', 'Quick', 'Lighter'], popular: true,
    colors: ['#E3F1E7', '#9CCB7A', '#C8401F', '#F2B441'],
    ingredients: [
      ['lettuce', 'Lettuce', '1 small head'], ['cucumber', 'Cucumber', '1'], ['tomato', 'Tomatoes', '2'],
      ['carrot', 'Carrot', '1'], ['lemon', 'Lemon', '1/2'], ['olive oil', 'Olive oil', '2 tbsp'], ['salt', 'Salt', 'to taste'],
    ],
    steps: [
      'Wash and dry the lettuce, then tear it into a bowl.',
      'Slice the cucumber and tomatoes. Grate the carrot.',
      'Shake the lemon juice, olive oil and salt together in a small jar.',
      'Pour the dressing over the salad and toss just before serving.',
    ],
  },
  {
    title: 'Egg Fried Rice',
    description: 'The best use for yesterday\'s rice. Ready in one pan in fifteen minutes.',
    category: 'lunch', minutes: 15, difficulty: 'Easy', servings: 2, kcal: 430, protein: 15,
    tags: ['Vegetarian', 'Quick'], popular: true,
    colors: ['#FBE4DC', '#F0C987', '#2E7D4F', '#F6D56B'],
    ingredients: [
      ['rice', 'Cooked rice', '2 cups, cold'], ['egg', 'Eggs', '2'], ['spring onion', 'Spring onions', '3'],
      ['garlic', 'Garlic', '2 cloves'], ['soy sauce', 'Soy sauce', '1 tbsp'], ['vegetable oil', 'Vegetable oil', '1 tbsp'],
    ],
    steps: [
      'Slice the spring onions and chop the garlic.',
      'Heat the oil in a wide pan on high heat. Scramble the eggs quickly, then push them to one side.',
      'Add the garlic and the cold rice. Break up any lumps and fry for 3 minutes.',
      'Stir in the soy sauce and spring onions. Fry 1 minute more and serve.',
    ],
  },
  {
    title: 'Red Lentil Soup',
    description: 'A warm, thick soup with cumin and lemon. It costs very little and fills you up.',
    category: 'lunch', minutes: 30, difficulty: 'Easy', servings: 4, kcal: 310, protein: 18,
    tags: ['Vegan', 'Lighter'], popular: false,
    colors: ['#FCEFD2', '#E0892B', '#F6E3B4', '#2E7D4F'],
    ingredients: [
      ['lentils', 'Red lentils', '250 g'], ['onion', 'Onion', '1'], ['carrot', 'Carrot', '1'],
      ['garlic', 'Garlic', '2 cloves'], ['cumin', 'Ground cumin', '1 tsp'], ['lemon', 'Lemon', '1/2'],
      ['olive oil', 'Olive oil', '1 tbsp'], ['water', 'Water', '1.2 litres'], ['salt', 'Salt', 'to taste'],
    ],
    steps: [
      'Chop the onion, carrot and garlic.',
      'Warm the oil in a pot. Cook the onion and carrot for 5 minutes, then add the garlic and cumin.',
      'Rinse the lentils and add them with the water. Simmer for 20 minutes until soft.',
      'Blend until smooth, or leave it chunky. Season with salt and lemon juice.',
    ],
  },
  {
    title: 'Garlic Yogurt Chicken Wrap',
    description: 'Pan-seared chicken, crisp salad and a cool garlic yogurt sauce rolled in flatbread.',
    category: 'lunch', minutes: 20, difficulty: 'Easy', servings: 2, kcal: 480, protein: 35,
    tags: ['High protein'], popular: false,
    colors: ['#F4E9DA', '#E8D2A6', '#9CCB7A', '#C8401F'],
    ingredients: [
      ['chicken', 'Chicken breast', '300 g'], ['flatbread', 'Flatbreads', '2'], ['lettuce', 'Lettuce', 'a few leaves'],
      ['tomato', 'Tomato', '1'], ['yogurt', 'Plain yogurt', '4 tbsp'], ['garlic', 'Garlic', '1 clove'],
      ['lemon', 'Lemon', '1/2'], ['salt', 'Salt', 'to taste'],
    ],
    steps: [
      'Slice the chicken into thin strips and season with salt and half the lemon juice.',
      'Cook the chicken in a hot pan for 6 to 8 minutes until golden and cooked through.',
      'Crush the garlic into the yogurt with the rest of the lemon juice.',
      'Warm the flatbreads, fill with lettuce, sliced tomato, chicken and sauce, then roll up.',
    ],
  },
  {
    title: 'Garlic Butter Pasta',
    description: 'Silky pasta with slow-cooked garlic, butter and a squeeze of lemon. Ready before the table is set.',
    category: 'dinner', minutes: 20, difficulty: 'Easy', servings: 2, kcal: 520, protein: 14,
    tags: ['Vegetarian'], popular: true,
    colors: ['#FCEFD2', '#F3D9A0', '#2E7D4F', '#C8401F'],
    ingredients: [
      ['pasta', 'Spaghetti', '200 g'], ['garlic', 'Garlic', '4 cloves'], ['butter', 'Butter', '40 g'],
      ['olive oil', 'Olive oil', '1 tbsp'], ['lemon', 'Lemon', '1/2'], ['parsley', 'Parsley', 'small handful'],
      ['salt', 'Salt', 'to taste'],
    ],
    steps: [
      'Boil the pasta in salted water until just tender. Keep a cup of the cooking water.',
      'Melt the butter with the oil on low heat. Add sliced garlic and cook gently until soft and golden.',
      'Toss the pasta in the garlic butter with a splash of the cooking water until glossy.',
      'Finish with lemon juice and chopped parsley. Serve straight away.',
    ],
  },
  {
    title: 'Chickpea Tomato Curry',
    description: 'A gentle, tomato-rich curry from tins and jars you probably already own.',
    category: 'dinner', minutes: 30, difficulty: 'Medium', servings: 3, kcal: 460, protein: 17,
    tags: ['Vegan'], popular: true,
    colors: ['#FCEFD2', '#E0792B', '#F6E3B4', '#2E7D4F'],
    ingredients: [
      ['chickpeas', 'Chickpeas', '1 tin (400 g)'], ['tomato', 'Chopped tomatoes', '1 tin (400 g)'], ['onion', 'Onion', '1'],
      ['garlic', 'Garlic', '3 cloves'], ['ginger', 'Fresh ginger', 'thumb-size piece'], ['cumin', 'Ground cumin', '2 tsp'],
      ['rice', 'Rice', '200 g'], ['olive oil', 'Olive oil', '1 tbsp'], ['salt', 'Salt', 'to taste'],
    ],
    steps: [
      'Start the rice cooking according to the packet.',
      'Chop the onion and cook it in the oil for 6 minutes. Add grated garlic and ginger and the cumin.',
      'Add the tomatoes and the drained chickpeas. Simmer for 15 minutes until thick.',
      'Season with salt and serve over the rice.',
    ],
  },
  {
    title: 'One-Pan Chicken and Rice',
    description: 'Chicken and rice cooked together in one pan so the rice soaks up all the flavour.',
    category: 'dinner', minutes: 40, difficulty: 'Medium', servings: 4, kcal: 540, protein: 38,
    tags: ['High protein'], popular: false,
    colors: ['#FBE4DC', '#F0C987', '#B5652B', '#C8401F'],
    ingredients: [
      ['chicken', 'Chicken thighs', '600 g'], ['rice', 'Rice', '300 g'], ['onion', 'Onion', '1'],
      ['garlic', 'Garlic', '3 cloves'], ['tomato', 'Tomatoes', '2'], ['cumin', 'Ground cumin', '1 tsp'],
      ['olive oil', 'Olive oil', '1 tbsp'], ['water', 'Water', '600 ml'], ['salt', 'Salt', 'to taste'],
    ],
    steps: [
      'Season the chicken with salt and cumin. Brown it in the oil in a wide pan, then lift it out.',
      'Cook the chopped onion and garlic in the same pan for 4 minutes. Add the chopped tomatoes.',
      'Stir in the rice, pour in the water and bring to a simmer.',
      'Put the chicken back on top, cover and cook on low heat for 20 minutes. Rest 5 minutes before serving.',
    ],
  },
  {
    title: 'Veggie Stir-Fry',
    description: 'Bright, crunchy vegetables in a quick garlic and soy sauce, served with rice.',
    category: 'dinner', minutes: 20, difficulty: 'Easy', servings: 2, kcal: 390, protein: 11,
    tags: ['Vegan'], popular: false,
    colors: ['#E3F1E7', '#F0C987', '#2E7D4F', '#C8401F'],
    ingredients: [
      ['bell pepper', 'Bell pepper', '1'], ['carrot', 'Carrot', '1'], ['broccoli', 'Broccoli', '1 small head'],
      ['spring onion', 'Spring onions', '2'], ['garlic', 'Garlic', '2 cloves'], ['soy sauce', 'Soy sauce', '2 tbsp'],
      ['rice', 'Rice', '150 g'], ['vegetable oil', 'Vegetable oil', '1 tbsp'],
    ],
    steps: [
      'Start the rice cooking according to the packet.',
      'Cut the vegetables into thin, even pieces so they cook at the same speed.',
      'Heat the oil in a wide pan until very hot. Fry the carrot and broccoli for 3 minutes, then add the pepper and garlic.',
      'Add the soy sauce and spring onions, toss for 1 minute and serve over the rice.',
    ],
  },
  {
    title: 'Tomato Egg Skillet',
    description: 'Eggs gently cooked in a spiced tomato and pepper sauce. Scoop it up with bread.',
    category: 'dinner', minutes: 25, difficulty: 'Easy', servings: 2, kcal: 330, protein: 19,
    tags: ['Vegetarian', 'Lighter'], popular: false,
    colors: ['#FBE4DC', '#D9472B', '#FFFDF5', '#F6D56B'],
    ingredients: [
      ['egg', 'Eggs', '4'], ['tomato', 'Chopped tomatoes', '1 tin (400 g)'], ['onion', 'Onion', '1'],
      ['bell pepper', 'Bell pepper', '1'], ['garlic', 'Garlic', '2 cloves'], ['cumin', 'Ground cumin', '1 tsp'],
      ['olive oil', 'Olive oil', '1 tbsp'], ['salt', 'Salt', 'to taste'],
    ],
    steps: [
      'Cook the sliced onion and pepper in the oil for 6 minutes until soft.',
      'Add the garlic and cumin, then the tomatoes. Simmer for 8 minutes.',
      'Make four small wells in the sauce and crack an egg into each one.',
      'Cover and cook for 5 minutes until the whites are set. Season and serve from the pan.',
    ],
  },
  {
    title: 'Cucumber Yogurt Dip',
    description: 'A cool, garlicky dip for warm flatbread or raw vegetables.',
    category: 'snacks', minutes: 10, difficulty: 'Easy', servings: 3, kcal: 210, protein: 9,
    tags: ['Vegetarian', 'Quick'], popular: false,
    colors: ['#E3F1E7', '#FFFDF5', '#9CCB7A', '#2E7D4F'],
    ingredients: [
      ['yogurt', 'Plain yogurt', '250 g'], ['cucumber', 'Cucumber', '1/2'], ['garlic', 'Garlic', '1 small clove'],
      ['lemon', 'Lemon', 'a squeeze'], ['olive oil', 'Olive oil', '1 tbsp'], ['flatbread', 'Flatbreads', '3'],
      ['salt', 'Salt', 'to taste'],
    ],
    steps: [
      'Grate the cucumber and squeeze out the water with your hands.',
      'Stir the cucumber, crushed garlic, lemon juice and salt into the yogurt.',
      'Pour the olive oil over the top.',
      'Warm the flatbreads, cut them into triangles and serve with the dip.',
    ],
  },
  {
    title: 'Spiced Roasted Chickpeas',
    description: 'Crunchy oven-roasted chickpeas with cumin and paprika. A snack that keeps you going.',
    category: 'snacks', minutes: 30, difficulty: 'Easy', servings: 3, kcal: 190, protein: 8,
    tags: ['Vegan', 'Lighter'], popular: false,
    colors: ['#FCEFD2', '#F4E9DA', '#C98A3B', '#B5652B'],
    ingredients: [
      ['chickpeas', 'Chickpeas', '1 tin (400 g)'], ['olive oil', 'Olive oil', '1 tbsp'], ['cumin', 'Ground cumin', '1 tsp'],
      ['paprika', 'Paprika', '1 tsp'], ['salt', 'Salt', 'to taste'],
    ],
    steps: [
      'Heat the oven to 200 C. Drain the chickpeas and dry them well with a clean towel.',
      'Toss them with the oil, cumin, paprika and salt on a baking tray.',
      'Roast for 20 to 25 minutes, shaking the tray once, until crisp.',
      'Let them cool for 5 minutes. They get crunchier as they cool.',
    ],
  },
  {
    title: 'Date and Almond Bites',
    description: 'Soft, chocolatey bites made in a blender. No baking.',
    category: 'desserts', minutes: 15, difficulty: 'Easy', servings: 6, kcal: 150, protein: 4,
    tags: ['Vegan', 'Quick'], popular: true,
    colors: ['#F4E9DA', '#FFFDF5', '#5A3420', '#7A4A2A'],
    ingredients: [
      ['dates', 'Soft dates', '200 g, stones out'], ['almonds', 'Almonds', '100 g'], ['oats', 'Rolled oats', '40 g'],
      ['cocoa', 'Cocoa powder', '2 tbsp'], ['salt', 'Salt', 'a pinch'],
    ],
    steps: [
      'Blend the almonds and oats until they look like coarse crumbs.',
      'Add the dates, cocoa and salt. Blend until the mix sticks together when pressed.',
      'Roll into 12 small balls with damp hands.',
      'Chill for 10 minutes to firm up. Keep in the fridge for up to a week.',
    ],
  },
  {
    title: 'Honey Banana Yogurt Cups',
    description: 'Layers of yogurt, banana and crunchy almonds with a little honey. Dessert in five minutes.',
    category: 'desserts', minutes: 5, difficulty: 'Easy', servings: 2, kcal: 220, protein: 10,
    tags: ['Vegetarian', 'Quick', 'Lighter'], popular: false,
    colors: ['#FCEFD2', '#FFFDF5', '#F6D56B', '#B5652B'],
    ingredients: [
      ['yogurt', 'Plain yogurt', '300 g'], ['banana', 'Banana', '1'], ['honey', 'Honey', '2 tsp'],
      ['almonds', 'Almonds', 'small handful'], ['cinnamon', 'Cinnamon', 'a pinch'],
    ],
    steps: [
      'Slice the banana and roughly chop the almonds.',
      'Spoon half the yogurt into two glasses. Add a layer of banana.',
      'Add the rest of the yogurt, then the remaining banana and the almonds.',
      'Finish with the honey and a pinch of cinnamon.',
    ],
  },
];

// Starter pantry so the app is not empty the first time it opens.
export const STARTER_PANTRY = ['Eggs', 'Rice', 'Garlic', 'Onion', 'Tomato', 'Olive oil', 'Butter'];
