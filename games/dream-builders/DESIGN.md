# Dream Builders – game design (owner + his brother's ideas, 5 Nov)

**Core:** a business game about building and real estate. Nobody spawns rich: you grind, but it never gets so annoying that people quit.

## Loop
1. Take a job at HQ (Construction Worker / Architect). Level up: Apprentice → Builder → Foreman → Master Builder (better pay + tools: wheelbarrow → truck → crane).
2. Build mansions on plots (blueprint → foundation → floors → roof → pool & garden). Quality matters: better work = better house rating = higher sale price.
3. **Buyers:** rich NPC clients buy finished houses and pay the crew; fancier houses attract richer clients.
4. **Real estate market:** players buy houses built by others, renovate/upgrade, and **flip them for more**. Houses get **listings** (price, rating, photos).
5. **Own business:** with enough money a player opens their own real estate company: buildings, offices, staff, company cars.
6. **Life costs:** expenses (bills, upkeep, cars) so money has to keep flowing.

## Daily / reward systems
- **Daily wheel spin** with prizes.
- **Prizes for quality:** bonuses for how good the work and the house are (ratings).
- Daily login bonus, crew bonuses for working together.

## Robux (only with Dad's OK – real money)
- Cosmetics: gold hard hats, outfits, car skins, house decor.
- Game passes: VIP lounge, 2× money, personal truck. Never pay-to-win: everything important can be earned.

## Roadmap
- [x] v1 world, v2 city (16 plots, HQ, yard, lake, park) – `roblox/02_map_v2.lua`
- [x] Jobs, bricks, 6-stage mansions, money HUD, sprint – `roblox/03_gameplay.lua`
- [x] City map (press M): live plot status (for sale / building / sold), your position, click to teleport to HQ, Yard, Beach, Park or any plot – `roblox/04_city_map.lua`
- [x] Save data (DataStore) so money and levels stay – `03_gameplay.lua` (owner turns on API Services in Studio)
- [ ] Job levels + tool upgrades
- [ ] NPC buyers + house rating + sale price
- [x] Daily wheel + shop/settings UI – `07_ui_pack.lua` (quality prizes still to do)
- [ ] Player-owned houses: buy, renovate, list, sell (market board)
- [ ] Own real estate business: offices, staff, cars, expenses
- [ ] **Vehicles list (5 Nov):** hypercar, luxury sedan, luxury off-road SUV, full-size pickup, muscle car, everyday sedan, big SUV, old beat-up starter car, 1960s classic, sport + cruiser motorcycles, bicycle, flatbed materials truck, cement mixer, excavator, forklift. Made-up brand names in game (no real logos/names – Roblox IP rules). Codex makes exterior + interior references (Downloads/DreamBuilders_concepts/vehicles), owner adds Google/Insta/TikTok pics if needed, then Claude models each in the owner's Blender on screen so he can watch and give feedback.
- [ ] **Cars (owner loves cars – top priority later):** detailed drivable cars made in Blender from the owner's own car photos (interior, rims, lights, sounds), a dealership (Dream Motors downtown), plus AI traffic on the roads
- [ ] Real 3D mansion/car models (Blender / roblox-3d-model skill), textures, sounds, UI polish
- [ ] Robux cosmetics + passes (after Dad approves), then publish (owner publishes)

## The big world idea (owner, 5 Nov) – "the real dream"
You start poor and grind (that rule stays!). The goal: become the millionaire who runs everything from a phone at home.

**Phone (in game, our own app names, no real brands):** a social feed for sharing builds and following friends (text goes through Roblox's filter), a food & supply ordering app, business dashboard, property app (listings), travel bookings, messages, map.

**Airport + 3 countries:** fly between countries for jobs, shopping, vacations and building projects. Businesspeople commute, tourists visit resorts. Each country has its own look (ideas: Dubai-style desert city = home, a European old town, a tropical island resort).

**Supply chain:** cargo ships to the port, cargo planes to the airport, container and pallet boxes to warehouses, then trucks to stores, restaurants and building sites. Building materials really come from there. Players can own parts of it: a port company, a trucking company, warehouses. Delivery jobs for new players.

**Businesses:** restaurants, hotels, shops and more. Hire staff, stock supplies, design the inside, set prices, improve service. NPC customers whose demand changes.

**Smart and alive:** traffic, plane timetables, ship arrivals, workers, customers and tourists walking around.

**Build order (each step is playable before the next):**
1. Cars + drivable vehicles (now)
2. Phone v1: map, bank, property and order apps (useful straight away)
3. Industrial zone + port + delivery jobs (supply chain v1: materials come by truck from the port)
4. First business type: restaurant (stock, staff, customers, prices)
5. Airport + 2nd country (travel, vacations, cargo planes)
6. Social feed, hotels, more business types, 3rd and 4th country
7. NPC traffic, schedules, tourists everywhere

Technical note: each country is a separate place in one Roblox experience (TeleportService). It loads faster and each country can be huge.
