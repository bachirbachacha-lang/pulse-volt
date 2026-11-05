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
- [ ] Save data (DataStore) so money and levels stay
- [ ] Job levels + tool upgrades
- [ ] NPC buyers + house rating + sale price
- [ ] Daily wheel + quality prizes
- [ ] Player-owned houses: buy, renovate, list, sell (market board)
- [ ] Own real estate business: offices, staff, cars, expenses
- [ ] **Cars (owner loves cars – top priority later):** detailed drivable cars made in Blender from the owner's own car photos (interior, rims, lights, sounds), a dealership (Dream Motors downtown), plus AI traffic on the roads
- [ ] Real 3D mansion/car models (Blender / roblox-3d-model skill), textures, sounds, UI polish
- [ ] Robux cosmetics + passes (after Dad approves), then publish (owner publishes)
