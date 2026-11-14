# Learning notes: Latchlight

These notes explain the main ideas in this project in plain words, so that you can explain them to a lecturer. Read them next to the code. Each part ends with something to try.

## 1. The big picture: three layers

A web app like this has three parts that each do one job.

- The **frontend** is what you see. It runs in the browser. Here it is written with React.
- The **backend** (the server) holds the rules. Here it is Node.js with Express.
- The **database** remembers things after you close the app. Here it is SQLite, one file.

The frontend never touches the database. It asks the server, and the server decides. That matters in this app: the server knows the quiz answers, and it does not hand them over until you have answered.

**Try:** start the app, open `http://localhost:3311/api/quizzes/passwords` in the browser. You see questions and choices but no answers.

## 2. An API: how the screens talk to the server

An API is a list of addresses the server answers. Each address has a method (a verb):

- `GET` = give me something
- `POST` = here is something new
- `PUT` = set this
- `DELETE` = remove this

The data travels as **JSON**, which is text shaped like `{ "verdict": "phish" }`.

Look at `app/client/src/api.js`. Every screen uses this one file. For example:

```js
answerMessage: (id, verdict) => request(`/phish/messages/${id}/answer`, { method: 'POST', body: { verdict } }),
```

And the matching part of `app/server/app.js`:

```js
app.post('/api/phish/messages/:id/answer', (req, res) => {
  const id = readId(req.params.id);
  const verdict = req.body?.verdict;
  if (verdict !== 'phish' && verdict !== 'safe') throw new ApiError(400, '...');
  ...
});
```

Notice the server **checks what it receives**. It never trusts the browser. `readId` makes sure the id is a number. Anything else gets a 400, which means "your request was wrong".

**Status codes** you will meet: 200 OK, 201 created, 204 done with nothing to send back, 400 bad request, 404 not found, 500 the server broke.

**Try:** in `app.js`, find the address for marking a lesson as done. Which method does it use, and why is that a better fit than `POST`?

## 3. The database and SQL

Open `app/server/db.js`. At the top is the **schema**: the list of tables and their columns.

```sql
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id       INTEGER PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  score    INTEGER NOT NULL,
  total    INTEGER NOT NULL,
  taken_at TEXT NOT NULL
);
```

- A **primary key** is the column that names each row. No two rows share it.
- `REFERENCES topics(id)` is a **foreign key**: this attempt belongs to a topic that must exist.
- One topic has many attempts. That is a **one-to-many** relationship.

Reading uses `SELECT`, adding uses `INSERT`, removing uses `DELETE`.

The most important habit is the question mark:

```js
get('SELECT score, total FROM quiz_attempts WHERE topic_id = ? ORDER BY ... LIMIT 1', t.id);
```

The `?` is a **placeholder**. The value is passed separately and is never glued into the SQL text. This stops **SQL injection**, an attack where someone types SQL into a form. This is a cybersecurity project, so be ready to explain this one.

**Try:** install the free "DB Browser for SQLite", open `app/data/latchlight.db`, and look at the `phish_answers` table before and after you answer a message.

## 4. React: screens made of components

A **component** is a function that returns what should be on screen. `Dashboard.jsx` is a component. So is the small `Ring` inside it.

**State** is what a component remembers. When state changes, React redraws that component.

```js
const [password, setPassword] = useState('');
```

`password` is the value now. `setPassword` changes it. In `Password.jsx`, every key you press calls `setPassword`, React redraws, and `checkPassword(password)` runs again. That is why the result updates as you type.

**Props** are the values a parent gives a child: `<Ring pct={score} />`.

**Effects** (`useEffect`) run code after drawing, for example to load data. The project wraps this in `useLoad` in `hooks.js`, which gives each screen three things: `loading`, `error`, `data`. Every screen handles all three, so there is never a blank page.

**Routing**: `App.jsx` says which address shows which screen. `/lessons/3` shows the `Lesson` component with `id = 3`.

**Try:** in `Spot.jsx`, find the three pieces of state (`index`, `results`, `feedback`). Say out loud what each one is for.

## 5. Privacy by design: the password checker

This is the part of the project to be proudest of, and the idea is simple: **the safest way to handle a secret is not to have it.**

- The checker is in `app/shared/password.js`. It is ordinary JavaScript that runs in the browser.
- `Password.jsx` does not import `api.js`. There is no way for the screen to send anything.
- The server has no address that takes a password.
- The password is kept only in React state. Leave the screen and it is gone.

How do we know it is true, and not just a promise? Three tests:

1. The browser test writes down every request the page makes. It types passwords and checks that the list did not grow, and that the typed text is in no request at all.
2. The same test checks that browser storage and cookies are empty.
3. A backend test reads `password.js` as text and fails if words like `fetch` or `localStorage` ever appear in it.

That is the difference between **saying** something is private and **showing** it.

**Try:** open the app, press F12, choose the Network tab, and type in the password box. Watch that nothing appears.

## 6. How the password score works

Read `checkPassword` in `shared/password.js`. It is about 60 lines.

1. Count the characters. Longer starts with more points.
2. Look for weaknesses: a very common password, a common word, a year, a run like `abcd` or `qwer`, a repeated character.
3. Take a point off for each weakness.
4. Turn the points into a word from "Very weak" to "Very strong".

One neat detail is `unswap`: it turns `P@ssw0rd` back into `password` before looking for common words. That is why swapping letters for symbols does not help.

Be honest about the limits. This is an **estimate**. It cannot know whether a password has leaked or whether you reuse it. The screen says so.

**Try:** add your own word to `COMMON_WORDS`, run `npm test`, and see whether any test notices.

## 7. Randomness that is safe to use

`Math.random()` is fine for a game but can be predicted, so it must not be used for passwords. The passphrase maker uses `crypto.getRandomValues`, the browser's secure source.

```js
function secureRandom(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const box = new Uint32Array(1);
  do crypto.getRandomValues(box); while (box[0] >= limit);
  return box[0] % n;
}
```

The loop throws away numbers from the uneven top end so that every word is equally likely. This is called **rejection sampling**.

How strong is the result? Count the possibilities: 256 words, 4 picks, is 256 x 256 x 256 x 256, about 4 billion. That sounds large but a computer can try it quickly. Real tools use lists of thousands of words. The screen tells the user this.

**Try:** how many possibilities would 5 words from a list of 7,776 give? (Multiply 7,776 by itself 5 times.)

## 8. Pure functions and why they are easy to test

Open `app/server/progress.js`. `awarenessScore` takes numbers and returns a number. It does not read the database or the clock. That is a **pure function**: same input, same output, every time.

Because of that, its test is one line:

```js
assert.equal(awarenessScore({ lessonsDone: 8, lessonsTotal: 8, quizFractions: [1,1,1,1], phishRight: 10, phishTotal: 10 }), 100);
```

Even "today" is passed in as a value (`now`), so a test can pretend it is any date.

**Try:** change the weights in `awarenessScore` and run `npm test`. Read which tests fail and why. Then change it back.

## 9. The "smart" part, and being honest about it

`app/server/coach.js` has one function, `getCoachTip`. It finds your weakest topic and picks a tip written by hand. That is rules, not AI, and the screen says "Sample tip, not AI".

It is built as a **replaceable part**: one function, a fixed input, a fixed output. To use a real AI model later, you change the inside of that function only.

**Try:** add a third tip for one topic. Which input makes the function choose it?

## 10. Testing

Two kinds of test are in the project.

- **Backend tests** (`app/server/test/`) use Node's built-in test runner. Each API test starts a real server with a database kept in memory, so nothing is left behind.
- **Browser tests** (`app/e2e/e2e.mjs`) use Playwright. It opens a real browser and clicks like a person.

A test has three steps: set something up, do something, check the result (`assert`).

A test that cannot fail is worthless. TEST_RESULTS.md records two bugs put in on purpose and the tests that caught them.

**Try:** run `npm test`. Then break something small on purpose, run it again, and read the message.

## 11. Accessibility in small steps

- Every colour pair for text was checked for contrast (BRAND.md).
- Right and wrong are shown with a tick or cross and a word, not colour alone.
- Buttons are real `<button>` elements, links are real links, so the keyboard works.
- Text that only screen readers need uses the `sr-only` class.

A real bug from this project: on a phone the menu links had no name for screen readers, because the full name was removed with `display: none`. The fix was to hide it visually instead. The lesson: `display: none` hides things from everyone, including screen readers.

## 12. Exercises to make the project yours

Do some of these and write about them in PORTFOLIO.md. They are ordered from easy to hard.

1. Change the brand colour `--pine` in `styles.css` and see the whole app change.
2. Add an eleventh practice message to `seed-data.js`. Delete the database file and restart. Which tests need new numbers?
3. Add a lesson of your own to an existing topic.
4. Add a check to `checkPassword`: a problem when the password contains the word "latchlight". Write a test for it first, watch it fail, then make it pass.
5. Show the date of your best quiz attempt on the Quizzes screen (you need the server and the screen).
6. Add a fifth topic, for example "Social media privacy", with two lessons and five questions.
7. Translate one lesson into Arabic and find out what `dir="rtl"` does to the layout.
8. Replace the inside of `getCoachTip` with a call to a local AI model (ask your dad first).
