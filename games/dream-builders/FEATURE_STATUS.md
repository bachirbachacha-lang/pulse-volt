# Dream Builders – feature status (honest)
Updated 7 Nov 2026 by Claude.

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
| Rent a shop (any business type) | Pick a type and filtered brand name, the shop is furnished, AI customers come in, serve them, get paid |
| AI staff for your business | Hire for $150; staff serve customers by themselves; owner gets 70% (+$17 on a $25 service) |
| Buy a villa | Buy from the phone, name sign, other people's doors stay locked, My Home GPS, sell back at 80% |
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
| Construction Worker / Architect | Carry bricks, build mansions in stages (older feature) |

## Partly done
| Feature | What's missing |
|---|---|
| Delivery Driver (real player) | Written: orders go to an online player with the Delivery Driver job (pickup marker → deliver → paid). **Not tested.** Needs 2 players at once. With no driver online, the AI courier delivers (tested). |
| Saving business + villa between sessions | Code written (DataStores DreamBusiness_v1 / DreamProperty_v1). **Can't be tested until the place is published.** Publishing is the owner's/Dad's decision. |
| Money saving | Same as above: needs publishing + API Services on. |
| Hair Stylist job | No separate job loop; works through opening a Hair Salon business. |
| Taxi | No taxi car yet. Phone › Maps travel is instant fast travel. |
| Cars look | Size and driving are correct, but the bodies look toy-like. Needs pro car models (owner + Dad decision). |

## Planned (not built yet)
- Airport (terminal, runway, jet). Codex is making the Blender models (WORK_SPLIT file).
- Flights to other countries: needs separate published places (TeleportService), so it waits for publishing.
- Real taxi rides (AI car picks you up and drives you).
- Business management upgrades (shop decor, prices, more staff).
- Documentation set (PROJECT_OVERVIEW, TECHNICAL_ARCHITECTURE, etc.): assigned to Codex.

## Not started
- Construction supplies phone app
- Phone assistant app
- Shipping between countries / import-export economy
- Anti-exploit review of all remotes, as a separate QA pass (each script checks money on the server, but there's no full audit yet)
- Performance pass with many players
