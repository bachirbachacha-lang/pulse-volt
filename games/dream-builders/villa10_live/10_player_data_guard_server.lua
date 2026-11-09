-- 10_player_data_guard_server.lua
-- READ-ONLY. Run on the SERVER of a Studio Play session, BEFORE the villa purchase test (H2) and again AFTER it.
-- Purpose: prove that the purchase test cannot read or write any real player data and cannot spend Robux.
--   * The place must be an unpublished local file: game.PlaceId == 0 and game.GameId == 0. Then Roblox refuses
--     every DataStore request, so PropertyServer / GameServer / ResidenceServer keep their "store" as nil and skip
--     every GetAsync / SetAsync (they all check "if not store then return end" or wrap the call in pcall).
--   * A probe GetDataStore call (no read, no write) must FAIL with Roblox's "publish" error.
--   * No script may use MarketplaceService (Robux) other than a comment; checked with script_grep before the run.
-- If any check fails: do NOT run the purchase test. Stop Play and ask the owner.
local RunService = game:GetService("RunService")
assert(RunService:IsServer() and RunService:IsRunning(), "run this on the Play server")
local out, ok = {}, true
local function chk(cond, msg) table.insert(out, (cond and "PASS  " or "FAIL  ") .. msg) if not cond then ok = false end end

chk(game.PlaceId == 0, "game.PlaceId == 0 (unpublished local file); it is " .. game.PlaceId)
chk(game.GameId == 0, "game.GameId == 0; it is " .. game.GameId)
local probeOk, probeErr = pcall(function() return game:GetService("DataStoreService"):GetDataStore("V10_ACCESS_PROBE_NO_WRITE") end)
chk(not probeOk, "DataStoreService refuses access (probe GetDataStore, no read or write): " .. tostring(probeErr))
local players = game:GetService("Players"):GetPlayers()
chk(#players == 1, "exactly 1 player in the test session (the owner's Studio test player); found " .. #players)
for _, p in ipairs(players) do
	local ls = p:FindFirstChild("leaderstats")
	local money = ls and ls:FindFirstChild("Money")
	table.insert(out, string.format("INFO  player %s (UserId %d), in-game Money %s (game currency only, not Robux)", p.Name, p.UserId, money and tostring(money.Value) or "?"))
end
return (ok and "PLAYER-DATA GUARD: PASS - no real player data can be read or written in this session\n"
	or "PLAYER-DATA GUARD: FAIL - do NOT run the purchase test\n") .. table.concat(out, "\n")
