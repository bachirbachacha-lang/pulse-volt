-- 00_session_identity_readonly.lua
-- READ-ONLY for the place (it writes nothing into the game; it only stores a token in this Studio window's _G).
-- Run FIRST in the window that will be edited, after the operator has checked the Studio title bar on a screenshot.
-- Copy the full path from the title bar into TITLE_PATH. The script checks that the file name in that path is exactly
-- game.Name, that the place is an unpublished local file (PlaceId 0) and that Studio is in Edit mode, then prints a
-- random token. The write scripts (03, 04, 09 real run) refuse to run unless SESSION_TOKEN equals that token.
-- Each Studio window is a separate process with its own _G, so a token printed in one window does not exist in any
-- other window: a live payload pasted into the test window (or the other way round) stops before writing.
local TITLE_PATH = [[]] -- paste the path BETWEEN the double brackets (a raw string keeps the backslashes), e.g. [[C:\Users\PC\Downloads\DreamBuilders.rbxl]]
local RunService = game:GetService("RunService")
assert(RunService:IsEdit() and not RunService:IsRunning(), "not in Edit mode")
assert(TITLE_PATH ~= "", "set TITLE_PATH from the Studio title bar")
local base = TITLE_PATH:match("[^\\/]+$")
assert(base == game.Name, "title bar file '" .. tostring(base) .. "' is not this place '" .. game.Name .. "'")
assert(game.PlaceId == 0 and game.GameId == 0, "this is a published place (PlaceId " .. game.PlaceId .. "), not a local file")
local t = {}
for i = 1, 4 do t[i] = string.format("%04x", math.random(0, 65535)) end
local token = table.concat(t, "-")
_G.V10_SESSION = {token = token, place = game.Name, path = TITLE_PATH, at = os.date("!%Y-%m-%dT%H:%M:%SZ")}
return string.format("SESSION IDENTITY: place=%s path=%s PlaceId=%d at %s\nSESSION_TOKEN = \"%s\"  (valid only in this Studio window)",
	game.Name, TITLE_PATH, game.PlaceId, _G.V10_SESSION.at, token)
