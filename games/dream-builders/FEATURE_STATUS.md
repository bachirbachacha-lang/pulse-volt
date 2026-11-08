# Dream Builders – feature status (honest)
Updated 8 Nov 2026 by Claude (after the owner's playtest, then the Phase A smoke tests; see PHASE_A_RESULTS.md).

Four labels:
- **Fully working:** tested in Roblox Studio Play mode, and the result was checked (money changed, item arrived, and so on).
- **Partly done:** built, but one part is untested or missing. What's missing is written next to it.
- **Planned:** designed or agreed, but not built yet.
- **Not started**

## Fully working (tested in Play)
| Feature | What was tested |
|---|---|
| Intro + job picker | 9 jobs; HUD shows the job and a hint |
| City, Palm Island, port, metro, tower elevator, ship interior | Visit, ride, elevator, board the ship |
| 15 drivable cars | E to drive, brakes and parks when you get out, realistic size |
| Rent a shop (any business type) | Pick a type and filtered brand name, the shop is furnished, AI customers come in, serve them, get paid. Re-tested 8 Nov (Café: −$50 rent, +$15 per customer). Sign, rent board and Serve/Hire key fixed 8 Nov (tested). Hire staff = F |
| AI staff for your business | Up to 3 staff ($150 each); more staff = faster service; owner keeps 70%; wages $5 per staff per minute (tested: 2 staff, +$14 sales and -$10 wages); unpaid staff quit |
| Buy a villa | Buy from the phone, name sign, other people's doors stay locked, My Home GPS, sell back at 80%. Re-tested 8 Nov (buy, sell, sign, My Home, owner opens the front door). Villa_PalmHills_1_Classic un-buried 8 Nov (tested). Villas 6 and 10 still raised, see "Known bugs" |
| Garages + driveways (24 villas) | Owner-only roll-up door; F = park the car you last drove inside |
| Phone: Bank, Maps (GPS), Jobs, Property, Business | Balance, transfers, travel, switch job, listings |
| Phone: Dream Eats | Order → paid → AI courier walks to you → food in backpack → eating heals and gives speed |
| Phone: Dreamgram | Post (filtered caption + place), feed, likes, follows |
| Phone: Messages | Inbox (game, jobs, business messages) + preset quick messages |
| Chef job | Start shift → AI diners order → cook at the grill → serve → paid + tips |
| Car Dealer job | Get a buyer at the Dream Motors kiosk → pitch the right car type → commission |
| Real Estate Agent job | Get a client at Dream Realty → meet at a for-sale villa → show it → commission or showing fee |
| Fashion Designer job | Design outfits at the plaza table → open the stall → AI shoppers buy |
| Port cargo contracts | Contract at the gate house → load a container onto your truck on the quay → deliver → paid |
| City bus | Bus loops the ring road with 4 stops; board at a stop, ride, Space to get off |
| Light traffic | 4 AI cars on the ring road; they stop for people and cars in front |
| A few pedestrians | 6 people walking the downtown and avenue sidewalks (kept few on purpose) |
| Weather + time-of-day lighting, real grass | Rain and storms cycle; lighting changes by the hour |
| Hair Stylist job | Plaza salon chair: open it, AI customers sit and ask for a style, hold to cut, paid + tips (+$42 tested) |
| Taxi rides | Phone › Maps › Taxi mode: an AI taxi with a driver picks you up and **drives the real roads** (route finding over the road network) to your destination. Spawn → Palm Island took ~19 s, $18 fare. |
| Airport + flight to the Maldives | Upgraded: entrance canopy, palms, parking, jet bridge, apron markings, runway lights, baggage carts, duty free, gate screens, new airliner (swept wings, engines, Dream Air tail). Dream International Airport (north of downtown): ticket desk $150 → flight fade → Maldives resort island (water villas, beach bar, seaplane dock). "Fly home" is free. Tested both ways. |
| Phone: Supplies app | Order a 10-brick pallet ($30) to a plot under construction; Construction Workers pick bricks from it (order + delivery tested) |
| Phone: Assistant app | Rule-based tips from your money, job, shop and villa, with "Take me there" buttons. Not an AI chat. |
| Business upgrades | Price tiers (Budget / Standard / Premium change price and customer speed); decor upgrade $250 (plants + chandelier, +$3 per customer). Tested: Premium + decor + staff paid $16 on a Café sale. |
| Export cargo contracts | City → cargo ship. Full run tested: load in Downtown → unload at the quay → +$320 |
| Security pass | See SECURITY_REVIEW.md: rate limits added, transfers notify both players, no teleports while seated |
| Metro stairs | Walk up real stairs to the platform at all 3 stations (tested at each) |
| Wheels spin on every car | Own car, other players' cars, traffic and taxis (tested) |
| Garage doors open for the owner | Roll up automatically when the owner comes close (tested) |
| Tower lobbies: Dream Bank, Sky Tower + Sky Deck, Dream Café | Auto doors, tellers/ATMs, lift to the roof deck, buy drinks (tested). 8 Nov: the Sky Deck lift now shows its fade + caption both ways (it used to cause the Phone:342 error) |
| Metro full trip (re-tested 8 Nov) | Street gate → platform → board → ride Downtown to Park → get off → exit to the street |
| Drive a car (re-tested 8 Nov) | MuscleCar: drove 25 studs, stopped when W released, car anchored after getting out |
| North District front | Road-side plaza, parking, big signs for the Mart, Academy, Hospital and Airport (screenshots) |
| City life NPCs | 55 AI people sitting, waiting and strolling; 60 fps on the server (tested) |
| Marina Row (6 new modern houses) | 6 different designs by the sea, furnished, stairs to every floor, garage, pool; $45,000 in Phone › Property (tested walking every house) |
| Readable signs | All wall signs re-scaled; checked on screenshots |
| Construction Worker / Architect | Carry bricks, build mansions in stages (older feature) |

## Known bugs
Fixed 8 Nov and tested in Play (details in BUGFIX_REPORT_2026-11-08.md):
- Villa_PalmHills_1_Classic buried in a dune: house lowered to its driveway, dune moved off the lot
- Shop signs: the street side now shows FOR RENT or the business name (was the old fixed names)
- Rent board text no longer floats after renting
- Hire staff is now F (gamepad Y), so E at the counter always serves

Still open (found 8 Nov, not fixed, waiting for the owner's OK):
| Bug | Where | Suggested fix |
|---|---|---|
| **Villa_PalmHills_1_Classic pool: water left floating at y 20–28, pool empty** (side effect of the 8 Nov fix) | Terrain water above the pool | Plan 0 in VILLA_6_10_REPAIR_PLAN.md |
| Villa_PalmHills_6_Classic: the house is 31.55 studs too high (on its correct plot; the garage is on the west side on purpose, away from the Port Road) | 47 house parts + pool water | Plan 2 in VILLA_6_10_REPAIR_PLAN.md |
| Villa_PalmHills_10_Pearl: house 7.578 studs too high (10-stud step, can't walk in); 39 parts inside dune #43 | 47 house parts, dune #43, pool water | Plan 1 in VILLA_6_10_REPAIR_PLAN.md |
| Palm Hills road: lane markings continue onto the sand past the road's west end (x −490) | Roads | Trim the markings or extend the road |

## Partly done
| Feature | What's missing |
|---|---|
| Delivery Driver (real player) | Written: orders go to an online player with the Delivery Driver job (pickup marker → deliver → paid). **Not tested.** Needs 2 players at once. With no driver online, the AI courier delivers (tested). |
| Saving business + villa between sessions | Code written (DataStores DreamBusiness_v1 / DreamProperty_v1). **Can't be tested until the place is published.** Publishing is the owner's/Dad's decision. |
| Money saving | Same as above: needs publishing + API Services on. |
| Cars look | Size and driving are correct, but the bodies look toy-like. Needs pro car models (owner + Dad decision). |

## Planned (not built yet)
- Blender-made house models (blocked until the Blender link is started; Marina Row was built in Studio)
- Upper floors of towers 2, 5 and 6
- Real other-country servers (TeleportService to separate places): needs publishing. Today "Maldives" is a far island inside this same game world.
- A Blender-made jet to replace the Studio-built one, once Blender's MCP link is running again
- Documentation set (PROJECT_OVERVIEW, TECHNICAL_ARCHITECTURE, etc.): assigned to Codex.

## Not started
- Performance test with many players (needs a published test server or Studio multi-client test run by the owner)
- Professional security audit (only a code-read pass has been done; see SECURITY_REVIEW.md)
