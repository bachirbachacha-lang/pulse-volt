# UI/UX: Latchlight

Mockups: open `design/mockups/index.html` in a browser to see the four main screens. A picture of them, at laptop and phone width, is in `design/mockups-preview.png`. They are static HTML with sample content and use the same stylesheet (`latchlight.css`) that the real app uses, so the app looks like the mockups.

Note: the mockups show fallback fonts (Trebuchet or Arial, and Verdana) because they are plain files with nothing installed. The real app installs Bricolage Grotesque and Atkinson Hyperlegible.

## Who it is for

A student, or a few people in a club or small office, who want to stop falling for fake messages and weak passwords. They are not technical. They have ten minutes, on a laptop or a phone.

## Screen list

| # | Screen | What it is for | Mockup |
|---|---|---|---|
| 1 | Dashboard | Start here. Awareness score, what you have done, this week, progress by topic, next lesson, coach tip. | `dashboard.html` |
| 2 | Lessons | The 8 lessons grouped into 4 topics, each with a Done tag and a link to the topic quiz. | `lessons.html` |
| 3 | Lesson | One lesson: short sections, key points, something to try, **Mark as done**. | uses the Lessons styles |
| 4 | Quizzes | The 4 topic quizzes with your best score. | uses the Lessons card grid |
| 5 | Quiz | 5 questions on one page. Check answers, then see each answer explained. | not drawn |
| 6 | Spot the phish | One invented message at a time. Choose **Phish** or **Looks safe**, then see the numbered clues. | `spot.html` |
| 7 | Password checker | Type a password, see strength and reasons. Make a random passphrase. | `password.html` |
| 8 | About | What is sample, what is private, **Start fresh**. | not drawn |

The menu is on every screen: down the left side on a laptop, tabs along the bottom on a phone. Six items: Dashboard, Lessons, Quizzes, Spot the phish, Password checker, About.

## User flows

### 1. Learn a topic (the main flow)

```
Dashboard -> "Next up" card -> Lesson -> read -> "Mark as done"
   -> second lesson in the topic -> "Take the quiz"
   -> answer 5 questions -> "Check my answers" -> score + every answer explained
   -> Dashboard score goes up
```

### 2. Spot the phish

```
Spot the phish -> read message 1 -> "Phish" or "Looks safe"
   -> right or wrong, with numbered clues that point at the sender, the link, the wording
   -> "Next message" ... -> after message 10: your score and "Try again"
```

The buttons are hidden once you answer, so you cannot change your answer after seeing the clues.

### 3. Check a password

```
Password checker -> type -> strength bar, a word (Very weak to Very strong), and a list of reasons
   -> "Make a passphrase" -> four random words -> "Check this one"
```

Nothing is sent or saved. The box is emptied when you leave the screen.

### 4. Start again

```
About -> "Start fresh" -> confirm -> all progress removed -> Dashboard shows 0%
```

## Design rules used

- **One main action per screen.** Pine is kept for that action. Clay red is only for "Phish", wrong answers and weak passwords.
- **Tell the truth.** Sample progress and the coach tip carry a "sample" tag. The password screen says what a checker cannot know.
- **Kind feedback.** A wrong answer shows the clues you missed, not a red screen. No timers, no streaks to lose.
- **Never a dead end.** Loading, server errors, a finished exercise and a fresh empty dashboard each have a short message and a next step.
- **Readable.** All text colour pairs pass WCAG AA contrast (table in BRAND.md). Focus outlines are visible. Tap targets are at least 44 px. Motion is tiny and off when the device asks for reduced motion.
- **Not colour alone.** Right and wrong carry a tick or cross and words. The strength bar has a word under it.
- **Careful reading is the lesson.** Sender addresses and links are shown in a monospace font, in full, never hidden behind a hover.

## What differs from the reference picture

Direction kept: a dashboard with a side menu, a couple of simple charts, and training cards with progress. Changed: name, logo (keyhole and rays, not a shield), colours (pine, marigold and warm paper, not pale blue), fonts, no photos of people, no "users with overdue training" list (this is for one learner, not for a manager watching staff), no points to buy things with, plus three things the reference does not show: the spot-the-phish exercise, the password checker, and honest "sample" labels.
