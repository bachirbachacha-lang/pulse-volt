// All the sample content: topics, lessons, quiz questions and practice messages.
// Everything here was written for this project. Every sender, organisation and
// address is INVENTED. Addresses end in ".example", an ending reserved for examples,
// so none of them can belong to a real company or person.
// To change the content, edit this file, delete data/latchlight.db and start the app again.

export const TOPICS = [
  { id: 'phishing', name: 'Phishing', blurb: 'Messages that pretend, so that you click.' },
  { id: 'passwords', name: 'Passwords', blurb: 'Long, different everywhere, and backed by a second step.' },
  { id: 'browsing', name: 'Safe browsing', blurb: 'Reading addresses and downloading with care.' },
  { id: 'devices', name: 'Device safety', blurb: 'Updates, screen locks and backups.' },
];

export const LESSONS = [
  {
    topic: 'phishing', title: 'What phishing is', minutes: 4,
    summary: 'Why someone would pretend to be your bank, your teacher or your friend.',
    sections: [
      { heading: 'A message wearing a costume', text: 'Phishing is a message that pretends to come from someone you trust, so that you do something that helps a criminal. Usually that means typing your password into a fake page, opening a harmful file, or sending money or codes.\n\nIt arrives by email, text message, chat app, phone call or even a QR code on a poster. The channel changes. The trick stays the same.' },
      { heading: 'Why it works', text: 'It does not work because people are foolish. It works because the message catches you while you are busy, and pushes a feeling: fear ("your account will be closed"), hurry ("in 2 hours"), reward ("you have won") or helpfulness ("can you do me a quick favour?").\n\nWhen a message makes you feel you must act right now, that feeling is the first warning sign.' },
      { heading: 'What they want', text: 'Most often: your password, a one-time code, your card details, or a click that installs something. With one email password a criminal can reset the passwords of many other accounts, which is why email accounts matter so much.' },
    ],
    points: ['Phishing pretends to be someone you trust.', 'It pushes fear, hurry, reward or helpfulness.', 'A strong feeling to act now is a reason to slow down.'],
    tryIt: 'Look at the last message that asked you to click something. Which feeling was it pushing?',
  },
  {
    topic: 'phishing', title: 'Five clues in a message', minutes: 4,
    summary: 'Sender, hurry, link, request, tone: a checklist you can run in ten seconds.',
    sections: [
      { heading: '1. The sender', text: 'The name shown can be anything. Look at the real address after it. "Campus IT Helpdesk" from support@campus-helpdesk.account-verify.example is not your campus. For texts, an unknown number claiming to be a company is a clue.' },
      { heading: '2. The hurry', text: 'Deadlines in hours, threats to close or delete, capital letters. Real organisations give you days and more than one way to reach them.' },
      { heading: '3. The link', text: 'On a computer, rest the mouse on a link without clicking and read where it goes. On a phone, press and hold. If the address is not the one you expect, do not open it.' },
      { heading: '4. The request', text: 'Passwords, one-time codes, gift cards, payment to a new account, or opening an unexpected attachment. A real service never needs you to send it your password or code.' },
      { heading: '5. The tone', text: 'A greeting like "Dear user", writing that does not sound like the sender, or a friend suddenly asking for money. Spelling mistakes are a weak clue on their own: many fake messages are now well written.' },
      { heading: 'What to do instead', text: 'Do not use the link or number in the message. Go to the service yourself: type the address you already know, use your bookmark or the official app. If the problem is real, you will see it there. Then report the message to your school or workplace if they have a way to do that.' },
    ],
    points: ['Check the real sender address, not the name.', 'Read where a link goes before you open it.', 'If unsure, go to the service your own way, not through the message.'],
    tryIt: 'Open Spot the phish and try to name at least two clues for each message before you answer.',
  },
  {
    topic: 'passwords', title: 'Passphrases beat clever tricks', minutes: 4,
    summary: 'Why four random words are stronger than P@ssw0rd!',
    sections: [
      { heading: 'Length wins', text: 'Guessing tools try billions of passwords. They start with common ones, then words with the usual swaps (a to @, o to 0), then names, years and keyboard patterns. "P@ssw0rd!" looks clever to a person and is one of the first things a tool tries.\n\nEvery extra character multiplies the work. A long password made of random words is hard for a tool and easy for you.' },
      { heading: 'Make a passphrase', text: 'Pick four or more words that have nothing to do with each other or with you: for example copper-lantern-orbit-meadow. Not a quote, not a song line, not your team and your birth year.\n\nThe words must be chosen at random. People are bad at random, so let a tool pick: a password manager can do it.' },
      { heading: 'One password, one place', text: 'When a website is broken into, its list of emails and passwords is often sold. Criminals then try those pairs on other sites. If you reuse a password, one leak opens many doors. A different password for every account stops that.' },
    ],
    points: ['Long beats complicated.', 'Random words, not personal facts.', 'Never reuse a password between accounts.'],
    tryIt: 'Open the Password checker and compare "P@ssw0rd!" with a four-word passphrase.',
  },
  {
    topic: 'passwords', title: 'Managers and the second step', minutes: 4,
    summary: 'Let a password manager remember, and turn on two-step sign-in.',
    sections: [
      { heading: 'A password manager', text: 'Nobody can remember a different long password for every account. A password manager is an app that creates and stores them for you, locked behind one strong passphrase that you do remember.\n\nA manager also helps against phishing: it offers to fill in a password only on the real site it was saved for. If it does not offer, stop and look at the address.' },
      { heading: 'Two-step sign-in', text: 'Also called two-factor or multi-factor authentication. After your password, the service asks for a second proof: a code from an app, a tap on your phone, or a small security key.\n\nWith it switched on, a stolen password alone is not enough. Turn it on first for your email, because email can reset everything else.' },
      { heading: 'Guard the second step', text: 'Nobody from a real company will ask you to read out a code. If someone calls or messages asking for the code you just received, they are trying to get into your account. And if your phone asks you to approve a sign-in that you did not start, say no and change that password.' },
    ],
    points: ['Use a password manager for everything except its own passphrase.', 'Turn on two-step sign-in, starting with email.', 'Never share a sign-in code with anyone.'],
    tryIt: 'Check whether your main email account has two-step sign-in switched on.',
  },
  {
    topic: 'browsing', title: 'Read the address bar', minutes: 4,
    summary: 'Which part of a web address tells you who you are talking to.',
    sections: [
      { heading: 'Find the real site name', text: 'Take the address https://signin.tallowmere-bank.example/help. Find the first single slash after the https:// part. Now read backwards from there: "tallowmere-bank.example" is the site you are really on. Anything before it ("signin.") is just a section of that site.\n\nSo https://tallowmere-bank.example.secure-check.example/login belongs to "secure-check.example", not the bank. The familiar name at the start is bait.' },
      { heading: 'Look-alikes', text: 'Fake addresses swap letters that look similar: a capital I for a small l, rn for m, a zero for an o, or an extra hyphen and word. Reading the address slowly, one piece at a time, is the whole skill.' },
      { heading: 'The padlock', text: 'A padlock or "https" means the connection is private between you and that site. It does not mean the site is honest. Fake sites have padlocks too. No padlock on a page that asks for a password is a reason to leave. A padlock is not a reason to trust.' },
    ],
    points: ['The real site name is just before the first single slash.', 'Watch for swapped letters and extra words.', 'A padlock means private, not trustworthy.'],
    tryIt: 'Open any site you use and point at the part of the address that names the real site.',
  },
  {
    topic: 'browsing', title: 'Downloads and public Wi-Fi', minutes: 4,
    summary: 'Where to get apps, and what to avoid on shared networks.',
    sections: [
      { heading: 'Get software from the source', text: 'Install apps from the official app store on your phone, or from the maker\'s own website on a computer. "Free" copies of paid software, game cheats and video players that a pop-up says you need are common ways harmful programs spread.' },
      { heading: 'Pop-ups that shout', text: 'A web page cannot scan your computer. A page that says "Your device is infected, call this number" or "Update your browser now" is an advert trying to scare you. Close the tab. Browsers update themselves from their own menu.' },
      { heading: 'Shared Wi-Fi', text: 'In a cafe or airport, other people share the network with you. Prefer your phone\'s own data for banking or anything sensitive. Check the network name with staff rather than joining the strongest "Free Wi-Fi". Keep to https sites, and turn off automatic joining of open networks.' },
      { heading: 'Extensions and permissions', text: 'Browser extensions can read the pages you visit. Keep only the ones you use and trust. When a site or app asks for your location, camera or notifications, say no unless you can see why it needs it.' },
    ],
    points: ['Official stores and makers\' sites only.', 'Scary pop-ups are adverts: close the tab.', 'On public Wi-Fi, avoid sensitive tasks or use mobile data.'],
    tryIt: 'Open your browser\'s extension list and remove one you no longer use.',
  },
  {
    topic: 'devices', title: 'Updates and screen locks', minutes: 4,
    summary: 'Two small habits that block the most common problems.',
    sections: [
      { heading: 'Updates close holes', text: 'Software has mistakes. When one is found that lets an attacker in, the maker sends an update that fixes it. Until you install it, the hole stays open on your device, and by then attackers know about it.\n\nTurn on automatic updates for the system, the browser and your apps. Restart when asked: many updates only finish after a restart.' },
      { heading: 'Lock the screen', text: 'Set a PIN of six digits or more, or a passphrase, and let fingerprint or face unlock make it quick. Set the screen to lock by itself after a minute or two. On a shared or library computer, lock or sign out every time you walk away.' },
      { heading: 'If it is lost', text: 'Phones and laptops have a "find my device" feature that can show where the device is, lock it, or erase it from far away. It only works if you switch it on before the device goes missing. Switch it on today.' },
    ],
    points: ['Turn on automatic updates and restart when asked.', 'Use a screen lock that starts by itself.', 'Switch on "find my device" before you need it.'],
    tryIt: 'Check for updates on your phone now, and look for how long the screen waits before locking.',
  },
  {
    topic: 'devices', title: 'Backups and plugging in', minutes: 4,
    summary: 'Keep a spare copy, and be careful what you connect.',
    sections: [
      { heading: 'A backup is a spare copy', text: 'Devices break, get stolen, or get locked by harmful software that demands payment (ransomware). If your coursework and photos exist in only one place, one bad day can remove them.\n\nA simple rule is 3-2-1: three copies, on two kinds of storage, with one kept somewhere else. For a student that can be: the laptop, an external drive, and a cloud storage account.' },
      { heading: 'Test it', text: 'A backup you have never opened is a hope, not a backup. Once in a while, try to get one file back. Unplug the external drive when the backup finishes, so that a problem on the laptop cannot spread to it.' },
      { heading: 'USB sticks and chargers', text: 'Do not plug in a USB stick that you found. It may carry harmful files. In public places, charge from your own plug and cable in a wall socket instead of a public USB port, or use a power bank.' },
      { heading: 'Before you sell or give away', text: 'Sign out of your accounts and use the device\'s "erase all content" or factory reset. Deleting files by hand is not enough.' },
    ],
    points: ['Keep three copies, one of them somewhere else.', 'Try restoring a file to check the backup works.', 'Do not plug in USB sticks you do not know.'],
    tryIt: 'Name the one file you would most hate to lose. Where is its second copy?',
  },
];

// answer = the position of the right choice, counting from 0.
export const QUESTIONS = [
  // Phishing
  { topic: 'phishing', text: 'A message says your account will be deleted in 2 hours unless you click a link. What is the strongest warning sign?', choices: ['It arrived in the morning', 'The pressure to act immediately', 'It has a subject line', 'It is written in English'], answer: 1, explain: 'Hurry is used to stop you thinking. Real services give you time and other ways to reach them.' },
  { topic: 'phishing', text: 'An email shows the name "Wrenfield College Library". How do you check who really sent it?', choices: ['Trust the name shown', 'Reply and ask whether it is real', 'Read the full address after the name', 'Check whether it has a logo'], answer: 2, explain: 'The shown name can be typed by anyone. The address after it is harder to fake, so read that. Logos are easy to copy.' },
  { topic: 'phishing', text: 'You think a message about your bank account might be real. What is the safest next step?', choices: ['Click the link but type nothing', 'Call the phone number in the message', 'Forward it to your friends to ask', 'Open the bank\'s app or type its address yourself'], answer: 3, explain: 'Go your own way to the service. The link and phone number inside a suspicious message belong to whoever sent it.' },
  { topic: 'phishing', text: 'A classmate messages: "I am stuck, can you buy two gift cards and send me the codes? I will pay you back." What should you do?', choices: ['Check with them another way, such as a call', 'Buy the cards quickly, they need help', 'Send half the amount first', 'Ask for their password to prove who they are'], answer: 0, explain: 'Accounts get taken over, and gift card requests are a classic trick. Check through a different channel before doing anything.' },
  { topic: 'phishing', text: 'Which statement about spelling mistakes in a message is most accurate?', choices: ['No mistakes means the message is safe', 'Mistakes always mean it is phishing', 'They are a weak clue; well-written messages can be fake too', 'Only text messages contain mistakes'], answer: 2, explain: 'Many fake messages are now well written. Look at the sender, the link and the request instead.' },
  // Passwords
  { topic: 'passwords', text: 'Which of these is the strongest password?', choices: ['P@ssw0rd!', 'Summer2024!', 'qwerty12345', 'copper-lantern-orbit-meadow'], answer: 3, explain: 'It is by far the longest and made of unrelated words. The others are patterns that guessing tools try early.' },
  { topic: 'passwords', text: 'Why is it risky to use the same password on several sites?', choices: ['Sites can see each other\'s passwords', 'One leaked site lets attackers try that password everywhere', 'It makes the password shorter', 'Browsers do not allow it'], answer: 1, explain: 'Leaked email and password pairs are tried on other sites. A different password for each account stops one leak from spreading.' },
  { topic: 'passwords', text: 'What does a password manager do?', choices: ['Creates and stores a different strong password for each account', 'Sends your passwords to your friends', 'Removes the need for any password at all', 'Makes every password the same'], answer: 0, explain: 'You remember one strong passphrase. The manager creates and remembers the rest.' },
  { topic: 'passwords', text: 'Someone phones, says they are from support, and asks you to read out the 6-digit code you just received. What should you do?', choices: ['Read it out, they are support', 'Read out only the first three digits', 'Refuse: nobody genuine asks for that code', 'Send it by text instead'], answer: 2, explain: 'A sign-in code is for you to type into the service yourself. Anyone asking for it is trying to sign in as you.' },
  { topic: 'passwords', text: 'On which account should you turn on two-step sign-in first?', choices: ['A game you no longer play', 'Your main email account', 'A news site', 'It does not matter'], answer: 1, explain: 'Email can reset the passwords of most other accounts, so protect it first.' },
  // Safe browsing
  { topic: 'browsing', text: 'Which site does this address really belong to?  https://tallowmere-bank.example.secure-check.example/login', choices: ['tallowmere-bank.example', 'login', 'secure-check.example', 'https'], answer: 2, explain: 'Read backwards from the first single slash: the real site is secure-check.example. The bank name at the start is bait.' },
  { topic: 'browsing', text: 'What does the padlock in the address bar tell you?', choices: ['The site is honest', 'The connection to that site is private', 'The site has been checked by the police', 'The site cannot contain harmful files'], answer: 1, explain: 'The padlock is about the connection, not the owner. Fake sites can have a padlock too.' },
  { topic: 'browsing', text: 'A web page flashes: "Your computer is infected! Call this number now." What is the best response?', choices: ['Call the number', 'Download the cleaner it offers', 'Type your password to unlock the page', 'Close the tab'], answer: 3, explain: 'A web page cannot scan your computer. It is a scare advert. Close the tab.' },
  { topic: 'browsing', text: 'Where is the safest place to get an app for your phone?', choices: ['The official app store', 'A link in a chat group', 'A pop-up advert', 'A site offering paid apps for free'], answer: 0, explain: 'Official stores check apps and can remove bad ones. Links and "free" copies are common ways harmful apps spread.' },
  { topic: 'browsing', text: 'You need to check your bank balance in a cafe. What is the safer choice?', choices: ['Join the strongest open Wi-Fi', 'Use your phone\'s mobile data', 'Ask a stranger for their hotspot', 'Turn off the screen lock to be quicker'], answer: 1, explain: 'Your own mobile data is not shared with the room. Open Wi-Fi can be set up by anyone.' },
  // Device safety
  { topic: 'devices', text: 'Why should you install updates soon after they arrive?', choices: ['They change the wallpaper', 'They make the battery bigger', 'They fix holes that attackers already know about', 'They are only for new features'], answer: 2, explain: 'Many updates fix security mistakes. Once the fix is public, so is the mistake.' },
  { topic: 'devices', text: 'You find a USB stick in the car park. What should you do?', choices: ['Plug it in to find the owner', 'Hand it in without plugging it in', 'Plug it into a friend\'s laptop instead', 'Format it and keep it'], answer: 1, explain: 'An unknown USB stick can carry harmful files. Hand it to lost property or IT staff.' },
  { topic: 'devices', text: 'What does the 3-2-1 backup rule mean?', choices: ['3 passwords, 2 emails, 1 phone', 'Back up at 3, 2 and 1 o\'clock', '3 devices, 2 chargers, 1 cable', '3 copies, on 2 kinds of storage, 1 kept somewhere else'], answer: 3, explain: 'Several copies in different places mean one accident cannot destroy everything.' },
  { topic: 'devices', text: 'When should you switch on "find my device"?', choices: ['Before the device is ever lost', 'Right after it is stolen', 'Only when travelling', 'Never, it is not useful'], answer: 0, explain: 'It has to be on beforehand. Afterwards is too late to switch it on.' },
  { topic: 'devices', text: 'You step away from a library computer for five minutes. What should you do?', choices: ['Leave it, you will be quick', 'Turn the screen brightness down', 'Lock the screen or sign out', 'Put your bag on the keyboard'], answer: 2, explain: 'An unlocked computer gives anyone walking past your accounts. Locking takes one second.' },
];

// The practice messages. isPhish says whether it is bait. clues are shown after answering.
export const MESSAGES = [
  {
    kind: 'email', fromName: 'Campus IT Helpdesk', fromAddress: 'support@campus-helpdesk.account-verify.example', subject: 'URGENT: your mailbox will be closed today',
    body: 'Dear user,\n\nYour mailbox is 98% full. If you do not confirm your account within 2 hours, all your messages will be deleted and you will lose access to your coursework.\n\nConfirm your password now to keep your account:',
    linkText: 'Keep my mailbox', linkUrl: 'http://campus-helpdesk.account-verify.example/login', isPhish: true,
    clues: [['Hurry', '"Within 2 hours" is there to stop you thinking.'], ['Sender address', 'The name says Helpdesk, but the address ends in account-verify.example, not your college.'], ['Asks for your password', 'Real support teams do not ask you to "confirm" a password through a link.'], ['Greeting', '"Dear user" instead of your name.']],
    explain: 'If you worry your mailbox is full, open your mail the normal way and look.',
  },
  {
    kind: 'email', fromName: 'Wrenfield College Library', fromAddress: 'library@wrenfield-college.example', subject: 'Your book is due on Thursday',
    body: 'Hello Sam,\n\n"Introduction to Networks" is due back on Thursday 19 November. You can renew it once from your library account, or at the desk.\n\nNo action is needed if you plan to return it on time.\n\nWrenfield College Library',
    linkText: null, linkUrl: null, isPhish: false,
    clues: [['Sender address', 'It ends in wrenfield-college.example, the college\'s own address.'], ['No hurry, no threat', 'It gives a date several days away and says no action is needed.'], ['No link, no request', 'It tells you to use your own library account or the desk. It asks for nothing.']],
    explain: 'Not every message with a deadline is bait. Look at what it asks you to do.',
  },
  {
    kind: 'sms', fromName: '+00 5550 0142', fromAddress: null, subject: null,
    body: 'Zippet Parcels: we could not deliver your parcel. A fee of 1.99 is needed to try again. Pay within 24h or it will be returned:',
    linkText: 'zippet-parcels.redelivery-fee.example/pay', linkUrl: 'http://zippet-parcels.redelivery-fee.example/pay', isPhish: true,
    clues: [['Unexpected', 'Are you waiting for a parcel from this company? Bait is sent to thousands of people at once.'], ['Small fee', 'A tiny payment is used to collect your card details.'], ['Link', 'The real site name is redelivery-fee.example. "zippet-parcels" at the front is just decoration.'], ['Hurry', '"Within 24h or it will be returned."']],
    explain: 'If you are expecting a parcel, track it in the shop\'s own app or site with the number they gave you.',
  },
  {
    kind: 'email', fromName: 'Tallowmere Bank', fromAddress: 'security@tallowmere-bank.example.secure-check.example', subject: 'Unusual sign-in to your account',
    body: 'Dear Customer,\n\nWe noticed a sign-in from a new device. For your safety we have limited your account.\n\nTo remove the limit, verify your identity. You will need your card number and the code we send to your phone.',
    linkText: 'Verify my identity', linkUrl: 'https://tallowmere-bank.example.secure-check.example/verify', isPhish: true,
    clues: [['Look-alike address', 'Read back from the first single slash: the site is secure-check.example. The bank name in front is bait.'], ['Asks for a code', 'It wants your card number and a one-time code. That is everything needed to take money.'], ['Padlock means little', 'The link starts with https. That makes it private, not honest.'], ['Greeting', '"Dear Customer" instead of your name.']],
    explain: 'Open the bank\'s own app, or call the number printed on your card.',
  },
  {
    kind: 'email', fromName: 'Dr. Hana Idris', fromAddress: 'h.idris@wrenfield-college.example', subject: 'Slides for week 9',
    body: 'Hi everyone,\n\nThe slides for week 9 are now on the course page under "Lectures", as usual. Please read section 3 before Tuesday.\n\nSee you in class,\nHana Idris',
    linkText: null, linkUrl: null, isPhish: false,
    clues: [['Expected', 'A lecturer telling the class where the slides are is normal for this sender.'], ['Sender address', 'It matches the college address used in earlier messages.'], ['No link, no attachment', 'It points you to the course page you already use.']],
    explain: 'Messages that send you to a place you already know, without a link, are low risk.',
  },
  {
    kind: 'email', fromName: 'Dr. Hana Idris', fromAddress: 'dr.hana.idris.office@fastmail-box.example', subject: 'Quick favour, are you free?',
    body: 'Hello,\n\nI am in a meeting and cannot talk. I need you to buy 3 gift cards for a colleague\'s leaving present. Send me photos of the codes and I will pay you back this afternoon.\n\nPlease keep this between us for now, it is a surprise.\n\nSent from my phone',
    linkText: null, linkUrl: null, isPhish: true,
    clues: [['Sender address', 'The name is your lecturer, but the address is not the college one. Compare it with the earlier message.'], ['Gift cards', 'Codes on gift cards are like cash and cannot be traced. A classic request.'], ['Secrecy', '"Keep this between us" stops you checking with anyone.'], ['Cannot talk', 'An excuse ready in advance for why you cannot phone to check.']],
    explain: 'There is no link at all here. Phishing does not always need one. Check with the person another way.',
  },
  {
    kind: 'sms', fromName: 'Streamhut', fromAddress: null, subject: null,
    body: 'Your Streamhut code is 481 220. It expires in 10 minutes. We will never ask you for this code by phone or message.',
    linkText: null, linkUrl: null, isPhish: false,
    clues: [['It only gives', 'It delivers a code and asks for nothing: no link, no reply.'], ['Honest warning', 'It tells you never to share the code.'], ['One question for you', 'Did you just try to sign in? If yes, this is normal. If not, someone has your password: change it, but do not share the code.']],
    explain: 'The message is genuine. The danger would be a person who then asks you to read the code to them.',
  },
  {
    kind: 'email', fromName: 'Student Finance Office', fromAddress: 'refunds@wrenfie1d-college.example', subject: 'You are owed a refund of 240.00',
    body: 'Dear Student,\n\nOur records show you overpaid your fees. A refund of 240.00 is waiting.\n\nOpen the attached form, enable editing, and enter your bank card details so we can pay you today.\n\nAttachment: Refund_Form.docm',
    linkText: null, linkUrl: null, isPhish: true,
    clues: [['Look-alike address', 'wrenfie1d has the number 1 where the letter l should be.'], ['Reward', 'Unexpected money is bait, just like a threat.'], ['Attachment', 'A file that asks you to "enable editing" or "enable content" wants permission to run code.'], ['Card details for a refund', 'A refund goes back the way you paid. Nobody needs your full card details to give you money.']],
    explain: 'Ask the finance office in person or through the college site.',
  },
  {
    kind: 'email', fromName: 'Pagewell Notes', fromAddress: 'no-reply@pagewell-notes.example', subject: 'Your password was changed',
    body: 'Hi Sam,\n\nThe password for your Pagewell Notes account was changed on 14 November at 09:12.\n\nIf this was you, you do not need to do anything.\n\nIf it was not you, open the Pagewell Notes app and go to Settings, then Security, to reset it. We have not included a link in this email on purpose.',
    linkText: null, linkUrl: null, isPhish: false,
    clues: [['No link on purpose', 'It tells you to go through the app yourself. That is what careful services do.'], ['Calm', 'No deadline and no threat.'], ['Sender address', 'It matches the service name with nothing extra added.']],
    explain: 'It is genuine. If you did not change the password, act on it, through the app.',
  },
  {
    kind: 'sms', fromName: '+00 5550 0177', fromAddress: null, subject: null,
    body: 'Hi Mum, I dropped my phone and this is my new number. Can you save it? I need to pay a bill today and my banking app is not working on this phone. Can you send it for me? I will send the details.',
    linkText: null, linkUrl: null, isPhish: true,
    clues: [['New number', 'A stranger\'s number claiming to be family. It names no one: "Mum" fits anyone.'], ['Money today', 'The story moves quickly from "new number" to "pay a bill".'], ['An excuse ready', 'The broken app explains why they cannot pay it themselves.'], ['How to check', 'Call the old number, or ask something only the real person would know.']],
    explain: 'This trick is sent to many numbers at once and works on worried parents. Tell your family about it.',
  },
];

// A little progress so the dashboard is not empty on first start.
// Numbers are positions in the lists above, counting from 1. daysAgo is how long ago it "happened".
export const SAMPLE_PROGRESS = {
  lessonsDone: [{ lesson: 1, daysAgo: 5 }, { lesson: 2, daysAgo: 5 }, { lesson: 4, daysAgo: 2 }],
  quizAttempts: [{ topic: 'phishing', score: 4, total: 5, daysAgo: 4 }],
  phishAnswers: [{ message: 1, verdict: 'phish', daysAgo: 2 }, { message: 2, verdict: 'safe', daysAgo: 2 }, { message: 3, verdict: 'safe', daysAgo: 1 }, { message: 4, verdict: 'phish', daysAgo: 1 }],
};
