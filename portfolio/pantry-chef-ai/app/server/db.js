// The database. SQLite keeps everything in one file (data/potwise.db).
// node:sqlite is built into Node.js, so there is nothing extra to install.
import { DatabaseSync } from 'node:sqlite';
import { CATEGORIES, RECIPES, STARTER_PANTRY } from './seed-data.js';
import { STAPLES, toKey } from './ingredients.js';

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS recipes (
    id          INTEGER PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    category    TEXT NOT NULL,
    minutes     INTEGER NOT NULL,
    difficulty  TEXT NOT NULL,
    servings    INTEGER NOT NULL,
    kcal        INTEGER NOT NULL,
    protein     INTEGER NOT NULL,
    tags        TEXT NOT NULL,   -- a list saved as JSON text
    colors      TEXT NOT NULL,   -- a list saved as JSON text
    popular     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id        INTEGER PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position  INTEGER NOT NULL,
    key       TEXT NOT NULL,     -- simple word used for matching, e.g. "tomato"
    name      TEXT NOT NULL,     -- what the screen shows, e.g. "Chopped tomatoes"
    quantity  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recipe_steps (
    id        INTEGER PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position  INTEGER NOT NULL,
    text      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pantry_items (
    id       INTEGER PRIMARY KEY,
    name     TEXT NOT NULL,
    key      TEXT NOT NULL UNIQUE,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS saved_recipes (
    recipe_id INTEGER PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
    saved_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

// Fills an empty database with the sample recipes.
function seed(db) {
  const addRecipe = db.prepare(
    `INSERT INTO recipes (title, description, category, minutes, difficulty, servings, kcal, protein, tags, colors, popular)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const addIngredient = db.prepare(
    'INSERT INTO recipe_ingredients (recipe_id, position, key, name, quantity) VALUES (?, ?, ?, ?, ?)',
  );
  const addStep = db.prepare('INSERT INTO recipe_steps (recipe_id, position, text) VALUES (?, ?, ?)');
  const addPantry = db.prepare('INSERT INTO pantry_items (name, key) VALUES (?, ?)');

  db.exec('BEGIN');
  try {
    for (const r of RECIPES) {
      const { lastInsertRowid: id } = addRecipe.run(
        r.title, r.description, r.category, r.minutes, r.difficulty, r.servings, r.kcal, r.protein,
        JSON.stringify(r.tags), JSON.stringify(r.colors), r.popular ? 1 : 0,
      );
      r.ingredients.forEach(([key, name, quantity], i) => addIngredient.run(id, i, key, name, quantity));
      r.steps.forEach((text, i) => addStep.run(id, i, text));
    }
    for (const name of STARTER_PANTRY) addPantry.run(name, toKey(name));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Turns a database row into the object the screens use.
function toRecipe(row) {
  const { is_saved, ...rest } = row;
  return {
    ...rest,
    tags: JSON.parse(row.tags),
    colors: JSON.parse(row.colors),
    popular: row.popular === 1,
    saved: is_saved === 1,
  };
}

const RECIPE_COLUMNS = `r.*, EXISTS (SELECT 1 FROM saved_recipes s WHERE s.recipe_id = r.id) AS is_saved`;

// Opens (or creates) the database and returns the small set of things the server can do with it.
// Pass ':memory:' to get a throwaway database, which is what the tests do.
export function openStore(file) {
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  if (db.prepare('SELECT COUNT(*) AS n FROM recipes').get().n === 0) seed(db);

  return {
    close: () => db.close(),

    categories() {
      const counts = Object.fromEntries(
        db.prepare('SELECT category, COUNT(*) AS n FROM recipes GROUP BY category').all().map((r) => [r.category, r.n]),
      );
      return CATEGORIES.map((c) => ({ ...c, count: counts[c.id] ?? 0 }));
    },

    // The ? marks are filled in by SQLite itself. Text typed by a person is
    // never glued into the SQL, which is what stops "SQL injection".
    listRecipes({ category, q, popular } = {}) {
      const where = [];
      const values = [];
      if (category) { where.push('r.category = ?'); values.push(category); }
      if (popular) where.push('r.popular = 1');
      if (q) {
        where.push(`(r.title LIKE ? ESCAPE '\\' OR r.id IN (SELECT recipe_id FROM recipe_ingredients WHERE name LIKE ? ESCAPE '\\' OR key LIKE ? ESCAPE '\\'))`);
        const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
        values.push(like, like, like);
      }
      const sql = `SELECT ${RECIPE_COLUMNS} FROM recipes r ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY r.id`;
      return db.prepare(sql).all(...values).map(toRecipe);
    },

    getRecipe(id) {
      const row = db.prepare(`SELECT ${RECIPE_COLUMNS} FROM recipes r WHERE r.id = ?`).get(id);
      if (!row) return null;
      const pantry = new Set(this.pantry().map((p) => p.key));
      const ingredients = db
        .prepare('SELECT key, name, quantity FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position')
        .all(id)
        .map((i) => ({ ...i, have: pantry.has(i.key) || STAPLES.has(i.key) })); // salt and water count as "have"
      const steps = db.prepare('SELECT text FROM recipe_steps WHERE recipe_id = ? ORDER BY position').all(id).map((s) => s.text);
      return { ...toRecipe(row), ingredients, steps };
    },

    // Every recipe with its ingredient list. This is what the chef reads.
    recipesWithIngredients() {
      const byRecipe = new Map();
      for (const i of db.prepare('SELECT recipe_id, key, name FROM recipe_ingredients ORDER BY recipe_id, position').all()) {
        if (!byRecipe.has(i.recipe_id)) byRecipe.set(i.recipe_id, []);
        byRecipe.get(i.recipe_id).push({ key: i.key, name: i.name });
      }
      return this.listRecipes().map((r) => ({ ...r, ingredients: byRecipe.get(r.id) ?? [] }));
    },

    randomRecipe() {
      return toRecipe(db.prepare(`SELECT ${RECIPE_COLUMNS} FROM recipes r ORDER BY RANDOM() LIMIT 1`).get());
    },

    pantry() {
      return db.prepare('SELECT id, name, key FROM pantry_items ORDER BY id').all().map((p) => ({ ...p }));
    },
    pantryByKey(key) {
      const row = db.prepare('SELECT id, name, key FROM pantry_items WHERE key = ?').get(key);
      return row ? { ...row } : null;
    },
    addPantry(name, key) {
      const { lastInsertRowid } = db.prepare('INSERT INTO pantry_items (name, key) VALUES (?, ?)').run(name, key);
      return { id: Number(lastInsertRowid), name, key };
    },
    removePantry(id) {
      return db.prepare('DELETE FROM pantry_items WHERE id = ?').run(id).changes > 0;
    },

    saved() {
      return db
        .prepare(`SELECT ${RECIPE_COLUMNS} FROM recipes r JOIN saved_recipes s ON s.recipe_id = r.id ORDER BY s.saved_at DESC, r.id`)
        .all()
        .map(toRecipe);
    },
    recipeExists(id) {
      return db.prepare('SELECT 1 AS ok FROM recipes WHERE id = ?').get(id) !== undefined;
    },
    save(id) {
      db.prepare('INSERT OR IGNORE INTO saved_recipes (recipe_id) VALUES (?)').run(id);
    },
    unsave(id) {
      db.prepare('DELETE FROM saved_recipes WHERE recipe_id = ?').run(id);
    },
  };
}
