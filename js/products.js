// Every flavor, price and nutrition value lives here, so the site can be
// updated in one place. Nutrition figures are the working launch recipe;
// swap in the final lab values before going live.

export const CURRENCY = 'USD';
export const LOCALE = 'en-US';
export const FREE_SHIPPING_OVER = 40;

export const money = (n) => new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(n);

const ENERGY_PACKS = [
  { id: 'single', label: 'Single', count: 1, price: 2.99 },
  { id: 'four', label: '4-pack', count: 4, price: 10.99 },
  { id: 'twelve', label: '12-pack', count: 12, price: 29.99 },
];

const SPARKLING_PACKS = [
  { id: 'single', label: 'Single', count: 1, price: 1.79 },
  { id: 'six', label: '6-pack', count: 6, price: 9.49 },
  { id: 'twelve', label: '12-pack', count: 12, price: 17.99 },
];

const energyNutrition = (extra = {}) => ({
  per: '500 mL can',
  rows: [
    ['Energy', '10 kcal'],
    ['Fat', '0 g'],
    ['Carbohydrate', '2.5 g'],
    ['of which sugars', '0 g', true],
    ['Protein', '0 g'],
    ['Salt', '0.2 g'],
    ['Caffeine', extra.caffeine || '160 mg'],
    ['Taurine', '1000 mg'],
    ['L-theanine', '100 mg'],
    ['Vitamin B3', '16 mg · 100%'],
    ['Vitamin B6', '1.4 mg · 100%'],
    ['Vitamin B12', '2.5 µg · 100%'],
    ['Sodium · Potassium · Magnesium', '80 · 60 · 40 mg'],
  ],
});

const energyIngredients = (fruit, colour) =>
  `Carbonated water, acid (citric acid), taurine, ${fruit}, electrolytes (sodium citrate, potassium citrate, magnesium lactate), ` +
  `natural flavourings, caffeine (160 mg), L-theanine, sweeteners (sucralose, acesulfame K), preservative (potassium sorbate), ` +
  `vitamins (niacin, B6, B12)${colour ? `, colour (${colour})` : ''}.`;

export const ENERGY = [
  {
    id: 'arctic',
    name: 'Arctic Rush',
    tag: 'Ice / Extreme',
    notes: 'Icy blue raspberry',
    desc: 'An ice-cold charge built to keep you moving. Frosted blue raspberry with a hit of cool mint on the finish.',
    bg1: ['#2a78c9', '#040a14'],
    bg2: ['#e8f4ff', '#8fb7de'],
    ink2: 'dark',
    rim: '#9ad9ff',
    accent: '#6cc0ff',
    accent2: '#1d6fc0',
    crystal: '#d8efff',
    ingredients: energyIngredients('natural raspberry and mint flavourings', 'spirulina extract'),
    nutrition: energyNutrition(),
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    tag: 'Heat / Tropical',
    notes: 'Mango & passion fruit',
    desc: 'Sun-blasted mango and sharp passion fruit. It tastes like the hottest day of summer, with zero sugar.',
    bg1: ['#ff6a1a', '#1c0402'],
    bg2: ['#ffb347', '#5e1204'],
    ink2: 'light',
    rim: '#ffb35c',
    accent: '#ffb347',
    accent2: '#ffb347',
    crystal: '#ffc27a',
    ingredients: energyIngredients('mango and passion fruit juice from concentrate (2%)', 'paprika extract'),
    nutrition: energyNutrition(),
  },
  {
    id: 'venom',
    name: 'Venom',
    tag: 'Toxic / Sour',
    notes: 'Sour lime & green apple',
    desc: 'A sour lime and green apple bite that hits first and asks questions later. Handle with care.',
    bg1: ['#45c21a', '#020803'],
    bg2: ['#2d6b0e', '#010401'],
    ink2: 'light',
    rim: '#b6ff00',
    accent: '#b6ff00',
    accent2: '#b6ff00',
    crystal: '#c8ff5a',
    ingredients: energyIngredients('lime and apple juice from concentrate (2%)', 'safflower and spirulina extract'),
    nutrition: energyNutrition(),
  },
  {
    id: 'cherry',
    name: 'Cherry Bomb',
    tag: 'Blast / Bold',
    notes: 'Black cherry & pomegranate',
    desc: 'Dark, juicy black cherry with a pomegranate snap. Bold enough to wake up the whole room.',
    bg1: ['#e0162b', '#170205'],
    bg2: ['#ff4d5e', '#4d000d'],
    ink2: 'light',
    rim: '#ff5d6e',
    accent: '#ff8a96',
    accent2: '#ff8a96',
    crystal: '#ff9aa6',
    ingredients: energyIngredients('black cherry and pomegranate juice from concentrate (3%)', 'black carrot concentrate'),
    nutrition: energyNutrition(),
  },
  {
    id: 'night',
    name: 'Night Drive',
    tag: 'Neon / Synth',
    notes: 'Grape & blackcurrant',
    desc: 'Neon grape and blackcurrant for late sessions and long roads. Turn the music up.',
    bg1: ['#8a2cff', '#06021a'],
    bg2: ['#ff3fbf', '#170538'],
    ink2: 'light',
    rim: '#ff5fd0',
    accent: '#ff7fd8',
    accent2: '#ff7fd8',
    crystal: '#e2a6ff',
    ingredients: energyIngredients('grape and blackcurrant juice from concentrate (3%)', 'anthocyanins'),
    nutrition: energyNutrition(),
  },
];

const sparklingNutrition = (kcal, sugars) => ({
  per: '330 mL can',
  rows: [
    ['Energy', `${kcal} kcal`],
    ['Fat', '0 g'],
    ['Carbohydrate', `${sugars} g`],
    ['of which sugars*', `${sugars} g`, true],
    ['Protein', '0 g'],
    ['Salt', '0.02 g'],
    ['Caffeine', '0 mg'],
  ],
  note: '*Naturally occurring sugars from fruit juice. No added sugar.',
});

export const SPARKLING = [
  {
    id: 'citrus',
    name: 'Citrus',
    notes: 'Zesty & bright',
    ingredients: 'Carbonated water, lemon and lime juice from concentrate (5%), natural lemon flavouring with other natural flavourings, acid (citric acid).',
    nutrition: sparklingNutrition(9, 2.1),
  },
  {
    id: 'mango',
    name: 'Mango',
    notes: 'Tropical & smooth',
    ingredients: 'Carbonated water, mango purée from concentrate (5%), natural mango flavouring, acid (citric acid), colour (carrot concentrate).',
    nutrition: sparklingNutrition(14, 3.2),
  },
  {
    id: 'berry',
    name: 'Berry',
    notes: 'Juicy & fresh',
    ingredients: 'Carbonated water, strawberry and raspberry juice from concentrate (5%), natural berry flavourings, acid (citric acid), colour (black carrot concentrate).',
    nutrition: sparklingNutrition(12, 2.8),
  },
  {
    id: 'watermelon',
    name: 'Watermelon',
    notes: 'Crisp & cool',
    ingredients: 'Carbonated water, watermelon juice from concentrate (5%), natural watermelon flavouring, acid (citric acid), colour (radish concentrate).',
    nutrition: sparklingNutrition(11, 2.6),
  },
];

export const PRODUCTS = [
  ...ENERGY.map((f) => ({ ...f, line: 'energy', size: '500 mL', packs: ENERGY_PACKS })),
  ...SPARKLING.map((f) => ({ ...f, line: 'sparkling', size: '330 mL', packs: SPARKLING_PACKS })),
];

export const productById = (id) => PRODUCTS.find((p) => p.id === id);
