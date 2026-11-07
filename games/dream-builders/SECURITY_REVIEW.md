# Security review – every player → server channel (7 Nov 2026, Claude)

**Rule used:** the client asks, and the server decides. Money, ownership, prices and teleports are only ever changed by server scripts.

**Scope:** this was a code read plus targeted Play tests. It is **not** a professional penetration test.

| Remote / input | Handler | Checks in place | Fixed in this pass |
|---|---|---|---|
| ChooseJob (RemoteEvent) | JobChoice | Job must be in the allowed list; 1 s cooldown | – |
| ElevatorGo | TowerServer | Floor must exist; player must stand near that tower's elevator | – |
| VehicleRequest | VehicleServer | Car must exist; can't take a car someone is driving; 1 s cooldown | – |
| PlotTeleport (city map) | TeleportServer | Fixed place list; 3 s cooldown | **Blocked while seated** (moving a seated player dragged the seat/car) |
| BusinessEvent | BusinessServer | Unit must be free; one shop per player; type checked; brand filtered with TextService; rent checked | **1 s cooldown + type check on the action** |
| PhoneRequest (RemoteFunction) | PhoneServer | Fast travel: fixed list, 8 s cooldown, not while seated. Transfers: real player only, $1–$100,000, balance checked | **Transfers: 5 s cooldown; both players get a Dream Bank message** |
| PhoneApps | PhoneAppsServer | Posts: TextService-filtered, 80 chars, 30 s cooldown. Messages: presets only (no free text between players). Food orders: menu prices, balance checked, 20 s cooldown | **Like / follow / message rate limits** |
| PhoneExtra | PhoneExtrasServer | Pallet: price, plot state, 15 s cooldown. Tier: only your own shop, fixed tiers. Decor: price, once | – |
| TaxiRequest | TravelServer | Destination from the server's own list; fare checked; 12 s cooldown; not while seated | – |
| DailySpin / ShopRequest (Codex UI pack) | DreamUIServer | Spin: server-side cooldown stored as a server attribute. Shop: **no purchase happens** (placeholder only, no Robux) | – |
| All ProximityPrompts (jobs, cargo, garage, doors, staff, flights…) | various | The server checks job, owner and contract stage on every trigger | – |

## Known risks still open
- **Money transfers between players** can be used to pressure younger players into giving money away. Options: limit transfers to friends, or remove them. **This is the owner's decision.**
- Fast travel is free, so it competes with the taxi. That's a game-balance question, not a security one.
- There's no server-side check for walk speed or flying. Roblox's default protections only.
- DataStore saving is untested until the place is published.
