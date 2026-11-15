# Learning notes: Potwise

Written for a beginner. Read it with the code open. Each part says which file to look at. If a lecturer asks "how does this work?", the answers are here.

## 1. The big idea: three layers

Think of a restaurant.

| Restaurant | In the app | Folder |
|---|---|---|
| The dining room: what the customer sees | **Frontend** (the screens) | `app/client` |
| The kitchen: takes orders, follows the rules | **Backend** (the server) | `app/server` |
| The store room: where food is kept | **Database** | `app/data/potwise.db` |

The customer never walks into the store room. The screens never touch the database. They ask the server, and the server decides.

## 2. Words you will hear

- **Client / frontend**: code that runs in the browser.
- **Server / backend**: code that runs on a computer and answers requests.
- **API**: the list of questions the server can answer. Each one has an address, like `/api/recipes`.
- **Request / response**: the question and the answer.
- **JSON**: a simple text format for sending data. `{"name": "Eggs"}`.
- **Database**: organised storage. **SQL** is the language for talking to it.
- **Component**: one reusable piece of a screen, such as a recipe card.
- **State**: the things a screen currently remembers, such as what you typed.
- **Route**: which address shows which screen. `/pantry` shows the Pantry screen.
- **npm**: the tool that downloads the free building blocks (packages) listed in `package.json`.
- **localhost**: "this computer". `http://localhost:3001` is a website only your own computer can see.

## 3. Follow one tap from start to finish

You tap **Use what I have** on the Chef screen. Here is everything that happens.

1. `client/src/screens/Chef.jsx`: the button runs `usePantry()`. It adds your message to the chat and calls `api.suggest({ usePantry: true })`.
2. `client/src/api.js`: `suggest` sends a request with `fetch()`: "POST /api/chef/suggest" with the JSON `{"usePantry": true}`.
3. `server/app.js`: Express finds the matching route, `app.post('/api/chef/suggest', ...)`. It checks the request is valid, reads your pantry from the database, and calls `suggestMeals()`.
4. `server/chef.js`: `suggestMeals()` compares your ingredients with every recipe and returns the best five.
5. `server/app.js`: sends the answer back as JSON.
6. `Chef.jsx`: the answer arrives, gets added to the chat, React redraws the screen, and the cards appear.

That path (screen, api.js, route, logic, database, and back) is the same for every feature in the app.

## 4. React in five ideas (`client/src`)

**A component is a function that returns what to show.**

```jsx
export default function RecipeCard({ recipe }) {
  return <h3>{recipe.title}</h3>;
}
```

The HTML-looking part is called JSX. Curly brackets `{ }` mean "put a JavaScript value here". `recipe` is a **prop**: information handed to the component by whoever uses it.

**State is memory.** `const [name, setName] = useState('')` gives the component a value (`name`) and the only correct way to change it (`setName`). When state changes, React redraws that component by itself. You never change the page by hand.

**Lists use `.map()`.** `recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)` turns a list of data into a list of cards. `key` lets React tell the items apart.

**Effects are for things outside the screen.** `useEffect` runs code after drawing, for example loading data. Look at `hooks.js`: `useLoad` wraps the pattern "start loading, then show data or an error" so every screen can reuse it. A reusable function like this, whose name starts with `use`, is called a **hook**.

**State lives as high as it needs to.** The chat messages are kept in `App.jsx`, not in `Chef.jsx`. Why? When you open a recipe, the Chef screen is removed and its memory is lost. `App` is never removed, so the chat survives. This is called "lifting state up".

## 5. The server (`server/app.js`)

A **route** says: when this kind of request arrives at this address, run this function.

```js
app.get('/api/recipes/:id', (req, res) => {
  const recipe = store.getRecipe(readId(req.params.id));
  if (!recipe) throw new ApiError(404, 'Recipe not found.');
  res.json(recipe);
});
```

- `:id` is a blank that gets filled in. For `/api/recipes/8`, `req.params.id` is `"8"`.
- `res.json(...)` sends the answer.
- **Status codes** are short numbers that say how it went: 200 OK, 201 created, 204 done with nothing to send, 400 your request was wrong, 404 not found, 500 the server broke.
- **GET** reads, **POST** adds, **PUT** sets, **DELETE** removes.

**Never trust what arrives.** The server checks everything, even though the screens already do. Anyone can send a request without using your screens. See the pantry route: it checks the type, the length and the letters before saving.

## 6. The database (`server/db.js`)

A database is made of **tables**, like spreadsheets. Each row is one thing. Look at the `SCHEMA` text at the top of the file.

Why three tables for recipes instead of one? A recipe has many ingredients and many steps. A spreadsheet cell cannot hold a neat list, so ingredients get their own table, and each row points back to its recipe with `recipe_id`. That pointer is called a **foreign key**. This idea is called a **one-to-many relationship** and it is in every database course.

The four basic actions are called **CRUD**: Create (`INSERT`), Read (`SELECT`), Update (`UPDATE`), Delete (`DELETE`).

**The question marks matter.**

```js
db.prepare('DELETE FROM pantry_items WHERE id = ?').run(id);
```

The `?` is filled in safely by the database. If you glued typed text straight into the SQL, a person could type SQL of their own and damage your data. That attack is called **SQL injection**. A test in `server/test/api.test.js` tries it and checks that the recipes are still there.

**Seeding** means filling an empty database with starting data. `seed()` runs once, the first time the app starts.

## 7. The chef (`server/chef.js` and `server/ingredients.js`)

This is the heart of the project, and it is honest about being a sample.

Problem: people type "2 Tomatoes", the recipe says "Chopped tomatoes". To a computer those are different texts.

Solution: turn both into the same simple word, a **key**. `toKey("2 Tomatoes")` and `toKey("Chopped tomatoes")` both give `"tomato"`. This cleaning-up step is called **normalisation**.

Then `suggestMeals()` does this for each recipe:

1. Which of its ingredients do you have? (`uses`)
2. Which do you not have? (`missing`)
3. If you have none, skip it.

Finally it sorts: fewest missing first. If two are equal, the one that uses more of your food wins, then the quicker one.

Why is it one function? So the "brain" can be swapped. Today it is rules. Later it can call a real AI model. As long as it accepts the same input and returns the same shape of answer, nothing else in the app changes. A swappable part with a fixed shape is called an **interface**, and designing for it is called **separation of concerns**.

## 8. Tests (`server/test`, `e2e`)

A test is a small program that uses your code and checks the answer.

```js
test('toKey makes plural and singular the same', () => {
  assert.equal(toKey('Eggs'), 'egg');
});
```

Three kinds are used here:

- **Unit tests** check one function alone (`ingredients.test.js`, `chef.test.js`).
- **API tests** start the server and call its addresses (`api.test.js`).
- **End-to-end tests** drive a real browser like a person (`e2e/e2e.mjs`).

Tests use a throwaway database (`:memory:`), so they never change your real data. A good habit shown in TEST_RESULTS.md: break something on purpose and make sure a test fails. A test that can never fail proves nothing.

## 9. Design ideas worth saying out loud

- **Design tokens**: colours and sizes are named once at the top of `styles.css` (`--sun`, `--r-card`) and reused. The 15 Nov redesign to yellow was mostly done by changing these values: proof that tokens work. (Some old names such as `--paprika` were kept and now hold yellow, so no rule had to be rewritten. Renaming them is a good tidy-up exercise.) Change one line, the whole app follows.
- **Mobile first**: the layout is designed for a phone, then centred on bigger screens.
- **Accessibility**: every input has a label, icon buttons have names, colours have enough contrast, and meaning is never shown by colour alone.
- **Empty, loading and error states**: every screen has an answer for "nothing here", "wait" and "it broke". Beginners often forget these.
- **Photos with a fallback**: `components/RecipeArt.jsx` shows a photo if the recipe has one, otherwise a drawn plate. One small component decides, so every screen (cards, recipe header, chef suggestions) behaves the same. Look at how it chooses: it matches by recipe title, which is simple but fragile. If you rename a recipe, its photo disappears. Fixing that (store the photo name with the recipe) is exercise 6 below.
- **Optimistic update**: the heart turns on the moment you tap it, before the server answers, and turns back if the server says no (`Recipe.jsx`, `toggleSaved`).

## 10. Try these to learn (smallest first)

1. Change `--sun` in `client/src/styles.css` and watch the whole app change.
2. Add a recipe of your own to `server/seed-data.js`, delete `data/potwise.db`, restart. Run `npm test`: one test will tell you if an ingredient key is wrong.
3. Add "noodles" as another word for pasta in `server/ingredients.js` and write a test for it.
4. Add a new diet goal in `server/chef.js` and a button for it in `Chef.jsx`.
5. Add a "missing ingredients" shopping list screen. You will need a table, two routes, an `api.js` function and a screen: the full path from part 3.
6. Make photos survive a rename: add a `photo` field to each recipe in `seed-data.js` and a `photo` column to the `recipes` table, then make `RecipeArt.jsx` use it.

## 11. Questions a lecturer might ask

- **Why a web app and not a native app?** It runs anywhere with no store account or cost, and it can be wrapped as a phone app later.
- **Why SQLite?** One file, no setup, real SQL. Right-sized for one user. For many users online you would move to PostgreSQL.
- **Is it really AI?** Not yet, and the app says so. The matching is rule-based. The code is arranged so a model can replace one function.
- **How do you know it works?** 47 backend tests and 21 browser tests, with results and limits written down.
- **What would you do next?** See the roadmap in PLAN.md.
