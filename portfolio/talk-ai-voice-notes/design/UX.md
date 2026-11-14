# UX: Sayback

Who it is for: a student who records their own voice notes, lecture recaps and group meetings, and later wants to find "that thing someone said".

Three promises the design has to keep:

1. Starting a recording takes two taps after the consent tick.
2. Anything said can be found again (search, folders, assistant).
3. The app never pretends. Sample things say "Sample".

## Screens

| # | Screen | Address | What is on it |
|---|---|---|---|
| 1 | Dashboard | `/` | Greeting by time of day, three totals (all recordings, last 7 days, total time), 6 most recent recordings, link to the library |
| 2 | New recording | `/record` | Step 1 consent, step 2 recorder (timer, level meter, record/stop), step 3 save form (listen back, title, folder, type) |
| 3 | Library | `/recordings` | All recordings. Filters in the address: `?folder=3`, `?view=recent`, `?view=favourites`, `?type=meeting`, `?q=word`. Folder pages add Rename and Delete folder. |
| 4 | Recording page | `/recordings/:id` | Title, type, length, date, folder, favourite star, Edit, Delete. Blocks: Audio, Summary, Action items, Transcript. |
| 5 | Assistant | Right-hand panel on wide screens; `/assistant` on smaller ones | Four ready-made questions, chat, links to the recordings each answer used, Clear chat |
| 6 | Settings | `/settings` | What is sample, what is private, where files are kept, Start fresh, Delete everything |

Always there: side menu (wide) or bottom tabs (phone), and the search box at the top.

## Layout by screen width

| Width | Layout |
|---|---|
| Under 900px (phone) | One column. Five tabs at the bottom: Home, Library, Record (round, coral), Assistant, Settings. Folders are chips at the top of the Library. |
| 900 to 1239px (small laptop) | Side menu and main area. Assistant is a menu item. |
| 1240px and wider | Side menu, main area, assistant panel always open on the right. |

## User flows

### 1. Record a voice note

```
Any screen -> "New recording"
  -> Step 1: read the reminder, tick "Everyone who will be recorded knows and agrees" -> Continue
  -> Step 2: press the round button (the browser asks for the microphone the first time)
       -> timer counts, bars move with your voice -> press again to stop
  -> Step 3: listen back, fix the title, pick folder and type -> Save recording
  -> Recording page of the new recording
```

- Continue stays switched off until the box is ticked.
- If the microphone is refused or missing, the screen says so in plain words and how to fix it. Nothing is lost.
- Discard asks "Discard this recording?" first.
- Leaving step 2 while recording stops the microphone.

### 2. Find something that was said

```
Type in the search box -> Enter
  -> Library shows recordings whose title or transcript has the words, with the matching sentence highlighted
  -> open one -> read the transcript
```

Or ask the assistant "find recordings about deadline" and follow the link under the answer.

### 3. Organise

```
Side menu "+" next to Folders -> type a name -> Create
Recording page -> Edit -> choose folder -> Save
Folder page -> Rename, or Delete folder (recordings are kept and move to "No folder")
Star on a recording -> appears under Favourites
```

### 4. Transcribe a new recording

```
Recording page (your own recording) -> "Transcribe"
  -> transcript, summary and action items appear, each marked "Sample"
```

The sample transcript is not what was said. The screen says so in a yellow notice right above it.

### 5. Ask the assistant

```
Tap a ready-made question, or type one -> answer appears with links to the recordings used
```

If it cannot answer, it says what it can do instead of guessing.

### 6. Start again

```
Settings -> Start fresh (removes the sample recordings and folders, keeps yours)
Settings -> Delete everything (asks first; removes all recordings, audio files, folders and chat)
```

## Words on the screen

- Buttons say what happens: "Save recording", "Delete folder", "Start fresh". Not "OK" or "Submit".
- Errors say what went wrong and what to do: "The microphone is blocked. Allow it in the address bar, then press the button again."
- Times: "2 hours ago", "Yesterday", "3 days ago", then a date. Lengths: "6 min 20 s".

## Accessibility

- Every control can be reached and used with the keyboard; the focus ring is always visible.
- Text contrast is at least 4.5 to 1 (measured, see BRAND.md).
- Touch targets are at least 40px, the main ones 44px or more.
- Recording state is shown three ways: colour, the word "Recording", and the running timer. It is also announced to screen readers.
- Icons that are the only content of a button have a spoken label.
- Reduced-motion setting is respected.
- Not yet checked with a real screen reader (see STATUS.md).

## Mockups

`design/mockups/index.html` links to four static screens that share `sayback.css`:

| File | Shows |
|---|---|
| `dashboard.html` | Dashboard with the assistant panel |
| `record.html` | The three steps of a new recording, shown together on one page |
| `library.html` | A folder in the library |
| `recording.html` | A recording page, with an assistant answer in the panel |

`design/mockups-preview.png` is a picture of the dashboard mockup at 1440px.

The mockups are pictures: buttons do nothing. They load the fonts from Google Fonts when online and fall back to a system font when offline. The working app carries its own fonts.

I opened each one in a browser at phone, laptop and wide sizes in this session: no errors, no sideways scrolling.
