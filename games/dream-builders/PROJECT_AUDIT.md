# Project Genesis / Dream Builders – Milestone 1 audit (7 Nov 2026, Claude)

Checked live in Roblox Studio (DreamBuilders.rbxl, saved), the GitHub repo and the Blender files on the owner's PC. "Tested" below means it was run in Studio Play mode. Nothing was deleted for this audit.

## 1. The city today
| District | What exists | State |
|---|---|---|
| Downtown (financial) | 6 glass towers + 29 skyline towers with glass skins, Dream Realty Tower (lobby, sales office, trading floor, 11 office floors, elevator), Dream Motors dealership shell, 5 empty shop units (Cafe, Boutique, Jewels, Design, Gym), Dream Tower landmark (Blender) | Looks strong from a distance. Only 1 tower has an interior. The shop units are empty shells. |
| Waterfront and beach | Palm Beach, Sahil Beach Club, beach workspace cabanas, lounge sets, marina, yachts | Decorative, with seats. No gameplay yet. |
| Palm Island | Bridge road, Club Mirage (lights + music), Sahara Grill, Dream Diner, Pearl Sushi, Palm Café, 4 villas | Interiors and seats work. No staff, orders or money yet. |
| Industrial port | Own area + causeway road, 238 containers, 3 warehouses, 3 cranes, cargo ship with crew deck + bridge | Decorative. No shipping or cargo gameplay yet. |
| Residential | 24 villas (mansion design, 4 colours, pools, doors), 4 lots for sale, 16 build plots | Missing: driveways, garage access, yards, furniture choice, ownership. |
| Construction | HQ job pads, supply yard, bricks, 6-stage mansion build on plots | Working loop (Construction Worker + Architect). |
| Transport | Elevated metro, 3 stations (Blender roof + street entrances), train you ride inside; 15 drivable vehicles | Works. Metro entrance escalators clip through the wall (bug). No buses, taxis or NPC traffic. |
| Roads | 442 road parts, sidewalks, lamps | Too few roads for the map size. No crossings, markings variety, traffic lights or parking. |

## 2. Assets
- About 13,500 parts in the workspace; StreamingEnabled is on.
- Blender files in `Downloads\DreamBuilders_models`: mansion, metro station + entrance, Dream Tower, Codex's 17 authored vehicles (`vehicles_authored`), older AI cars.
- Backups in ServerStorage: car backups (two generations), house backups, port backup, core backups, build templates (`DB_Tools`: CarRig, BuildKit, metro templates, palm mesh).

## 3. Visual quality
- Good: glass towers, the metro station, palms, the club, the villas.
- Weak:
  - Empty streets: no traffic, no people.
  - Repeated tower shapes.
  - Shop units look unfinished.
  - The ground is flat sand between districts.
  - No weather.
  - Lighting has no time-of-day presets.

## 4. Vehicles – the biggest gap
- The in-game cars come from Roblox's AI mesh generator. Size, proportions and driving are now correct (all 15 tested), but the bodies look soft and toy-like up close.
- Codex's 17 Blender cars (procedural, scripted) were checked from their renders. They look worse than the in-game ones: bubble glass tops, no real sedan or SUV shapes. Do not import them as they are.
- Realistic cars need hand-modelled, professional-quality meshes. No AI agent produces these by code today.
- Options:
  - (a) a 3D artist / pro model pack bought through Dad, with no real brands;
  - (b) high-quality original car models on the Creator Store, checked for brand/IP issues first;
  - (c) slow manual Blender modelling, one hero car at a time, with the owner's reference photos.

## 5. Technical architecture
- Logic is spread across about 12 server scripts and about 12 client scripts.
- No shared modules or services yet. Money and jobs live in GameServer.
- The vehicle client sets velocity directly (arcade). Ownership and anchoring are server-side.
- Remotes: ChooseJob, ElevatorGo, plus the UI pack's remotes.
- Risks:
  - The money save (DataStore) needs API Services turned on.
  - There is no economy service yet. Every new job will add its own money code, which is a risk of exploits and duplicated code.

## 6. Gameplay systems
- Working (tested):
  - intro + job picker
  - construction jobs and mansion building
  - money HUD
  - daily wheel
  - city map
  - vehicles (E to drive, auto-brake, drift, sounds)
  - metro ride
  - elevator
  - ship interior
  - club music
- Missing:
  - features for 7 of the 9 jobs
  - businesses / companies
  - property ownership and buying
  - phone
  - bank
  - NPCs
  - deliveries
  - shipping
  - airport
  - other countries

## 7. Skills and integrations (verified)
- Connected and working:
  - Roblox Studio MCP (code, mesh/texture generation, asset search, play test)
  - Blender MCP (Claude's own Blender window; Codex uses a separate one)
  - computer use (Studio, Blender, Codex window)
  - GitHub (branch `claude/shopify-product-website-mrj6f2`)
- Not available here:
  - Sketchfab and similar accounts (the owner is under the age limit)
  - paid asset stores (need Dad)
- Codex's chat attachments (the owner's videos) are not visible to Claude. They need to be sent in this chat or saved to a folder on the PC.

## 8. Highest-impact improvements
1. Business system in the Downtown shops: pick a type, the interior is furnished, your name goes on the sign, customers pay you. This gives jobs real gameplay.
2. EconomyService (one secure place for money, salaries and purchases), before more money features are added.
3. Living streets: more roads and intersections, NPC traffic cars, pedestrians, parking.
4. Houses: driveways, garages, yards, buying a villa, furniture.
5. Smartphone v1: bank, map, jobs, property listings.
6. Cars: decide route (a/b/c above).
7. Lighting presets + weather.

## 9. Roadmap
Follows the 12 milestones in the Project Genesis prompt. Milestone 1 (this audit) is done. Milestones 2, 3 and 9 are partly done: glass, metro, port, island, real-size cars.

## 10. Risks
- Car realism: an asset problem, not a code problem.
- Two agents editing the same Studio file. Rule: only one agent edits Studio at a time, and changes are noted in STATUS.md.
- Studio not saved after big edits: the owner presses Ctrl+S.
- Usage limits stop work mid-task.
- Performance once NPCs and traffic are added: keep counts low and stream by distance.

## Proposed first implementation milestone
**EconomyService + Business v1.** One server module for all money, plus the Downtown shop units becoming businesses: Hair Salon, Clothing Brand, Gym, Café, Jewellery, Design Studio. Each has a furnished interior, an owner sign and NPC customers that pay. Tests: buy a shop, earn money, money saved, another player can't take it.
