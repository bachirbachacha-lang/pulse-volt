# Reels Editor log
Read owner.md first. Videos in ads/video/, source in ads/reels-src/ (HTML + record.js).

## Rules I follow
Hook in first 2 s; Arabic then English text; label 3D/AI ("3D RENDER", "AI SAMPLE"); no growth/medical claims, no before/after; never ads/photos/purc-real*.jpg; no other brands' logos/designs/music; silent videos.

## Watch-outs found
- ads/video/scalp-elixir-3d-purc.mp4 ends with the banned black-table PURC photo. Don't post it.
- pixel-co/samples/scalp-elixir/img/bottle-real.jpg is a crop of the same banned photo, so don't use the Scalp Elixir sample site's phone video in reels.
- LUSTRE detailing sample shows a BMW (M badge visible), so keep it out of public reels.
- Store product photos 1-3 of the oil show "HAIR GROWTH" / hair-loss text on the label or graphic: avoid close-ups of them in reels. Massager photos are fine.

## 26 Oct: weekend set (Fri 30 / Sat 31 Oct)
- Fri: scalp-elixir-ar-friday-ritual.mp4 (15 s): "عندك ٥ دقايق؟" 4-step Friday ritual over the 3D bottle (labelled 3D RENDER), ends "Coming soon".
- Sat: scalp-elixir-ar-brush-nails.mp4 (14 s): "تحك فروة راسك بأظافرك؟" then massage brush, 3 points from the store copy, ends "Coming soon".
- Pixel & Co. (either day): pixelco-ar-no-website.mp4 (15 s): "عندك انستقرام… بس ما عندك موقع؟", SAMRA / TORQ / SUKKAR samples (AI SAMPLE tags), ends "free sample first · DM us".
- Covers: same names + -cover.jpg. Captions were given in chat.

## 26 Oct: Pixel & Co. "menu every day?" ad
- pixelco-ar-menu-whatsapp.mp4 (15 s, silent) + -cover.jpg. Hook «زبائنك يسألونك عن المنيو كل يوم؟» → generic profile (no website, no Instagram UI/logo) → real SUKKAR sample recording (scroll menu, add, order, "send on WhatsApp") → chat screen with the site's real order message → «نموذج مجاني لمشروعك، راسلنا» + @pixelandco.design. Corner label «نموذج تصميم · Design sample» throughout.
- Source: ads/reels-src (cut=order) + record-sukkar-order.js (frames to frames/sukkar-order). Chat screen is a generic look with no WhatsApp logo; the word "WhatsApp" is only text.

## 27 Oct: Scalp Elixir motion set (owner picks one or more)
Owner sent a reference (dark room, glowing app screen, kinetic type) + scroll-cinematic prompts (Three.js + GSAP + ScrollTrigger, depth/parallax, lighting/shadows). Built in ads/motion/:
- scalp-elixir-motion-glow.mp4 (14 s): glowing screen concept (routine checklist, 3D bottle card), kinetic «قطرات. مساج. نوم.», logo reveal. Labelled CONCEPT · 3D RENDER.
- scalp-elixir-motion-flythrough.mp4 (14 s): camera flies through rosemary + light beams to the bottle, orbit with ingredient tags, drop + ripple, crane up to end card. 3D RENDER.
- scalp-elixir-motion-wave.mp4 (13 s): glowing wave surface, ingredient words, 50 ml ring, bottle rises. 3D RENDER.
- Did not copy the reference's Spotify/TikTok branding or its "This took Claude 30 minutes" text.
- Waiting on: owner's "Timeless Edit" material + extra prompts.

## 27 Oct: Crew Up app concept ads (owner: "make ads for the app Crew Up", no brief yet)
No notes existed on Crew Up, so I invented a placeholder concept: social app to plan hangouts with your crew (suggest places, vote, see who's in, reminders). Orange #ff6a3d on near-black, logo = 3 people + up arrow. Every video labelled «فكرة تطبيق · APP CONCEPT», ends «قريبًا · Coming soon», no fake downloads/ratings/reviews, no app-store logos. Names in UI are made up.
- crewup-glow.mp4 (14 s): reference style, glowing screen with crew poll + who's-in, kinetic «اجمع شلّتك. صوّتوا. واطلعوا.», logo reveal.
- crewup-depth.mp4 (14 s): CSS 3D layered depth: phone + floating cards/avatars, camera swings to 4 features, parallax background.
- crewup-type.mp4 (13 s): kinetic type: «مين فاضي الخميس؟», group-chat pile-up blown away, crew network draws itself, logo.
- Source: ads/motion/crewup-*.html. Waiting on the real Crew Up brief (what it does, name/logo/colours) to redo properly.

## 27 Oct: CrewUp brief received (real brief replaces my 27 Oct orange "Crew Up" guess)
CrewUp = fitness app (coming soon), friends do gym challenges; @getcrewup; blue #1F6BFF on #090B10. Rules: no launch date, no real-money betting, no fake user numbers/reviews; CTA "Join the waitlist, link on our Instagram" or "Would you use this?".
Made the 6 brief ideas (ads/crewup/index.html, cuts below), all silent, EN + Saudi AR text, labelled "APP PREVIEW · CONCEPT" (mockup screens, not real app footage):
crewup-01-day1 (15 s), crewup-02-nudge (13 s), crewup-03-lost (13 s), crewup-04-fake (13 s), crewup-05-excuses (17 s), crewup-06-showcase (16 s).
- The orange crewup-glow/depth/type.mp4 from earlier are OFF-BRAND now (wrong colours/app idea). Don't post them.
- Couldn't open the "New game project" chat / crewup repo from this chat (access blocked). Ask owner to share designs or allow the repo.
- Next: swap mockups for owner's real screen recordings; live-action skit versions need the owner to film.
- 27 Oct: owner sent the real logo (blue rounded square, white angular C + arrow) -> ads/crewup/img/crewup-logo.png. All 6 videos re-rendered with it.
- 27 Oct: owner asked for the CrewUp ads WITHOUT Arabic. All 6 re-rendered English-only (same file names). Arabic lines are hidden by default in ads/crewup/index.html; add &ar=1 to the URL to bring them back. CrewUp captions should be English too.
- 27 Oct: owner asked "more realistic" and chose: stock photos + phone, own clips, real app recordings, real app look. Built crewup-real-01..06 (ads/crewup/real.html): look like real iPhone screen recordings + TikTok text boxes, English only. Stock sites (unsplash.com, images.unsplash.com, pexels.com) are blocked by the environment network; owner can allow them in environment settings, or send photos/clips. Still waiting on owner's own clips + real app recordings.
- 27 Oct: owner wanted the phone seen from outside again + notification/buzz sounds ("ba-bum"). Built crewup-phone-01..06 (real.html ?frame=1) WITH sound effects. All sounds are synthesized by ads/crewup/sfx.py (no Apple/other-brand sounds, no music). Owner can still add a trending song on top in TikTok/CapCut. Captions: ads/crewup/captions.md (same 6).
- 27 Oct: owner liked the full-screen "screen recording" style (crewup-real-05). My advice: full-screen is the most native/realistic for TikTok; phone-from-outside looks more like an ad. Made crewup-real-sound-01..06 = full-screen versions + the same synthesized sound effects. Recommended set to post.
- 27 Oct: owner: "no whoosh sounds" + wants the same motion-design quality as the Scalp Elixir/Pixel & Co. motion ads. sfx.py now mutes swoosh/swipe (all earlier CrewUp sound versions remuxed). Made crewup-motion-01 glow, 02 3d (trophy + rank badges fly-through), 03 type (group-chat excuses -> crew), 04 depth (3D phone + cards), all with sound (ding/buzz/tap/pop/win/logo, no whoosh).
- 28 Oct: owner sent a clean "keynote" motion reference (kinetic letters, glossy widgets, photo mosaic, glass over landscape). Made crewup-keynote-01 light / 02 dark / 03 blue (ads/crewup/k.html), 16 s, own CrewUp widgets, sound (no whoosh). To make it closer to the reference: owner's real gym photos/clips for the mosaic + landscape, real app screenshots; or allow unsplash/pexels in the environment network for stock.
