-- 09_rollback_guarded.lua  (Revision 3; rollback R1 of the procedure; replaces the old unguarded _G.V10_RESTORE)
-- Use ONLY before saving, and only when rollback R0 (close the place without saving and reopen the file) cannot be used.
-- It restores ONLY the planned targets, from the in-place copies made by 03 (exact original CFrames) and the measured
-- original terrain values in ALL THREE voxel channels. It does not depend on anything kept in _G.
--   MODE = "ALL"      undo Stage A and Stage B: 47 house parts, pivot, dune #43, all 160 pool cells; then removes the copy folder
--   MODE = "STAGE_B"  undo Stage B only: the 80 lower pool cells (y 0..8). The house, dune and copy folder stay.
--   DRY_RUN = true    checks everything and reports what it would do, writes nothing (always run this first)
-- Every target must be either in its planned after-state or already in its before-state. If ANY target or the copy folder is
-- in an unexpected state, it stops and writes nothing.
local MODE = "ALL"
local DRY_RUN = true
local CONFIRM = "" -- for a real run (DRY_RUN = false) set to "ROLL BACK VILLA 10"
local SESSION_TOKEN = "" -- for a real run: the token from 00_session_identity_readonly.lua run in this window

local PLACE = "DreamBuilders.rbxl" -- the live place. Only for the Step 0 rehearsal: "DreamBuilders_TEST_villa10_pool_edge.rbxl"
assert(game.Name == PLACE, "wrong place: " .. game.Name)
local RunService = game:GetService("RunService")
assert(RunService:IsEdit() and not RunService:IsRunning(), "not in Edit mode")
assert(MODE == "ALL" or MODE == "STAGE_B", "MODE must be ALL or STAGE_B")
if not DRY_RUN then
	assert(CONFIRM == "ROLL BACK VILLA 10", "real run needs CONFIRM = \"ROLL BACK VILLA 10\"")
	assert(_G.V10_SESSION and SESSION_TOKEN ~= "" and _G.V10_SESSION.token == SESSION_TOKEN and _G.V10_SESSION.place == game.Name,
		"session guard: run 00_session_identity_readonly.lua in this window and paste its token")
end

local DY = -7.57825
-- Villa 10 WorldPivot: the FULL CFrame (all 12 components), read on the live place 9 Nov 00:30 (read-only).
-- After Stage A only the y component may differ (PIVOT_BEFORE + (0, DY, 0)); x, z and the rotation stay bit-identical.
local PIVOT_BEFORE = CFrame.new(453.68255615234375, 8.0782604217529297, -843.9224853515625, -1, 0, -8.7422776573475858e-08, 0, 1, 0, 8.7422776573475858e-08, 0, -1)
local PIVOT_AFTER = PIVOT_BEFORE + Vector3.new(0, DY, 0)
local function cfs(cf) local t = {cf:GetComponents()} for i = 1, 12 do t[i] = string.format("%.9g", t[i]) end return "{" .. table.concat(t, ", ") .. "}" end
local SS = game:GetService("ServerStorage")
local db = workspace.DreamBuilders
local v10 = db.Homes.Villa_PalmHills_10_Pearl
local LIST = {
	{"Door_Bath",353.183,25.178,-1016.122},{"Door_Bedroom",327.083,25.178,-1016.122},{"Door_FrontL",319.433,14.378,-992.722},
	{"Door_FrontR",322.133,14.378,-992.722},{"Door_Garage",305.483,13.478,-997.942},{"Door_Study",336.983,25.178,-1016.122},
	{"Mansion_bed",343.733,17.146,-1020.622},{"Mansion_black",340.313,20.071,-1012.567},{"Mansion_boucle",341.933,11.588,-1010.628},
	{"Mansion_cream",339.683,26.528,-1010.722},{"Mansion_curtain",346.883,14.828,-993.667},{"Mansion_fabric",346.208,17.776,-1010.857},
	{"Mansion_floor",339.683,15.278,-1010.722},{"Mansion_flower",349.929,14.693,-1011.712},{"Mansion_frame",346.883,21.488,-1007.662},
	{"Mansion_glass",339.683,20.318,-1007.595},{"Mansion_gold",336.713,20.633,-1009.508},{"Mansion_grass",339.683,9.518,-1057.772},
	{"Mansion_kitchen",334.058,16.696,-1023.142},{"Mansion_leaf",340.403,32.468,-1017.922},{"Mansion_led",339.593,20.386,-1009.125},
	{"Mansion_light",345.983,20.611,-1005.772},{"Mansion_marble",340.673,16.921,-1023.097},{"Mansion_oak",331.853,16.696,-1010.812},
	{"Mansion_olive",339.537,15.080,-1011.029},{"Mansion_planter",339.458,10.958,-1011.172},{"Mansion_plaster",332.708,20.678,-1010.722},
	{"Mansion_pool",345.533,16.381,-1034.797},{"Mansion_rug",339.008,15.373,-1001.272},{"Mansion_slab",333.383,26.258,-1008.922},
	{"Mansion_stone",339.683,9.068,-1017.922},{"Mansion_tile",357.683,21.151,-1022.422},{"Mansion_travertine",339.683,20.678,-1010.137},
	{"Mansion_walnut",339.638,20.633,-1010.385},{"Mansion_wood",339.265,21.128,-1017.922},
	{"PoolRaised.Coping_E",363.713,11.768,-1040.422},{"PoolRaised.Coping_N",344.183,11.768,-1047.353},
	{"PoolRaised.Coping_S",344.183,11.768,-1033.492},{"PoolRaised.Coping_W",324.652,11.768,-1040.422},
	{"PoolRaised.PoolFloor",344.183,10.148,-1040.422},{"PoolRaised.PoolLight",331.583,10.958,-1046.587},
	{"PoolRaised.PoolLight",344.183,10.958,-1046.587},{"PoolRaised.PoolLight",356.783,10.958,-1046.587},
	{"PoolRaised.StepIn1",362.183,11.078,-1040.422},{"PoolRaised.StepIn2",360.383,10.568,-1040.422},
	{"PoolRaised.StepOut1",366.143,10.568,-1040.422},{"PoolRaised.StepOut2",364.343,11.078,-1040.422},
}
-- TERRAIN (Revision 3): all three voxel channels. Amounts are whole numbers in 1/255 steps ("bytes").
-- The pool box: x 324..364, y 0..16, z -1048..-1032 = 10 x 4 x 4 cells. Layer 1 = y 0..4, 2 = 4..8, 3 = 8..12, 4 = 12..16.
-- Inner 16 columns: x 328..360, z -1044..-1036. Ring: the other 24 columns.
-- Values measured on the test copy (= backup 6c804b23) on 9 Nov with ReadVoxelChannels. NOTE: the live file as saved at
-- 00:59 has hidden liquid 85 in the 40 layer-1 cells; the scripts refuse to run on it (owner decision D-1 first).
local CHN = {"SolidMaterial", "SolidOccupancy", "LiquidOccupancy"}
local AIR, GROUND = Enum.Material.Air, Enum.Material.Ground
local BOX = Region3.new(Vector3.new(324, 0, -1048), Vector3.new(364, 16, -1032))
local SHELL = Region3.new(Vector3.new(320, -4, -1052), Vector3.new(368, 20, -1028)) -- the box plus 272 cells around it
local function isRing(x, z) return x == 1 or x == 10 or z == 1 or z == 4 end
local function BEFORE(x, y, z)
	if y == 1 then return GROUND, 30, 0 end
	if y == 2 then return AIR, 0, 0 end
	if y == 3 then return AIR, 0, 113 end
	return AIR, 0, 63
end
local function AFTER_A(x, y, z)
	if y == 1 then return GROUND, 30, 0 end
	return AIR, 0, 0
end
local function AFTER_B(x, y, z) -- R10: solid explicitly Air (clears the ground), water as liquid
	if y == 1 then if isRing(x, z) then return AIR, 0, 0 end return AIR, 0, 86 end
	if y == 2 then if isRing(x, z) then return AIR, 0, 3 end return AIR, 0, 91 end
	return AIR, 0, 0
end
local function b255(v) return math.floor(v * 255 + 0.5) end
local function readBox()
	local ch = workspace.Terrain:ReadVoxelChannels(BOX, 4, CHN)
	assert(ch.Size == Vector3.new(10, 4, 4), "pool box is " .. tostring(ch.Size))
	return function(x, y, z) return ch.SolidMaterial[x][y][z], b255(ch.SolidOccupancy[x][y][z]), b255(ch.LiquidOccupancy[x][y][z]) end
end
-- compares the box with a state function; returns the number of differing cells and up to 5 descriptions
local function boxDiff(get, want, yFrom, yTo)
	local n, txt = 0, {}
	for x = 1, 10 do for y = yFrom or 1, yTo or 4 do for z = 1, 4 do
		local m, so, lo = get(x, y, z)
		local wm, ws, wl = want(x, y, z)
		if m ~= wm or so ~= ws or lo ~= wl then
			n += 1
			if #txt < 5 then table.insert(txt, string.format("cell (%d,%d,%d) is %s/%d/%d, expected %s/%d/%d", 324 + (x - 1) * 4, (y - 1) * 4, -1048 + (z - 1) * 4, m.Name, so, lo, wm.Name, ws, wl)) end
		end
	end end end
	return n, txt
end
-- raw copy of the 12 x 6 x 6 shell region, to prove that the 272 cells around the box do not change
local function readShell() return workspace.Terrain:ReadVoxelChannels(SHELL, 4, CHN) end
local function shellChanged(a, b)
	local n = 0
	for x = 1, 12 do for y = 1, 6 do for z = 1, 6 do
		local wx, wy, wz = 320 + (x - 1) * 4, -4 + (y - 1) * 4, -1052 + (z - 1) * 4
		local inB = wx >= 324 and wx < 364 and wy >= 0 and wy < 16 and wz >= -1048 and wz < -1032
		if not inB then
			for _, c in ipairs(CHN) do if a[c][x][y][z] ~= b[c][x][y][z] then n += 1 break end end
		end
	end end end
	return n
end
local function writeLayers(yFrom, yTo, stateFn) -- writes exactly the box layers yFrom..yTo (80 or 160 cells), all channels
	local reg = Region3.new(Vector3.new(324, (yFrom - 1) * 4, -1048), Vector3.new(364, yTo * 4, -1032))
	local SM, SO, LO = {}, {}, {}
	for x = 1, 10 do
		SM[x], SO[x], LO[x] = {}, {}, {}
		for y = yFrom, yTo do
			local j = y - yFrom + 1
			SM[x][j], SO[x][j], LO[x][j] = {}, {}, {}
			for z = 1, 4 do
				local m, so, lo = stateFn(x, y, z)
				SM[x][j][z], SO[x][j][z], LO[x][j][z] = m, so / 255, lo / 255
			end
		end
	end
	workspace.Terrain:WriteVoxelChannels(reg, 4, {SolidMaterial = SM, SolidOccupancy = SO, LiquidOccupancy = LO})
end
local problems, plan = {}, {}
local function bad(s) table.insert(problems, s) end

-- 1) the copy folder and the original copies
local pb = SS:FindFirstChild("Phase1Backups")
local folder = pb and pb:FindFirstChild("Fix8Nov_Villa10")
local copyV = folder and folder:FindFirstChild("Villa_PalmHills_10_Pearl_original")
local copyD = folder and folder:FindFirstChild("Mountains_Dune43_original")
if not (folder and copyV and copyD) then bad("copy folder ServerStorage.Phase1Backups.Fix8Nov_Villa10 with both copies is missing") end
if copyV then
	local n = 0
	for _, d in ipairs(copyV:GetDescendants()) do if d:IsA("BasePart") then n += 1 end end
	if n ~= 69 then bad("the Villa 10 copy has " .. n .. " parts, expected 69") end
	if copyV.WorldPivot ~= PIVOT_BEFORE then bad("the Villa 10 copy's WorldPivot is " .. cfs(copyV.WorldPivot) .. ", not exactly the original " .. cfs(PIVOT_BEFORE)) end
end
if copyD and (copyD.Position - Vector3.new(344.565, -15, -1060.26)).Magnitude > 0.01 then bad("the dune copy is not at the original position") end

-- 2) parts (MODE ALL): each live target must be at its after-position (or already at its before-position);
--    its copy must be at the before-position with the same name and parent path
local pairsToRestore = {}
if MODE == "ALL" and copyV then
	local usedLive, usedCopy = {}, {}
	for _, e in ipairs(LIST) do
		local path, before = e[1], Vector3.new(e[2], e[3], e[4])
		local after = before + Vector3.new(0, DY, 0)
		local parentName, childName = path:match("^(.-)%.([^%.]+)$")
		childName = childName or path
		local liveC = parentName and v10:FindFirstChild(parentName) or v10
		local copyC = parentName and copyV:FindFirstChild(parentName) or copyV
		local live, state, copy
		for _, c in ipairs(liveC:GetChildren()) do
			if c.Name == childName and c:IsA("BasePart") and not usedLive[c] then
				if (c.Position - after).Magnitude < 0.01 then live, state = c, "after" break end
				if (c.Position - before).Magnitude < 0.01 then live, state = c, "before" break end
			end
		end
		for _, c in ipairs(copyC:GetChildren()) do
			if c.Name == childName and c:IsA("BasePart") and not usedCopy[c] and (c.Position - before).Magnitude < 0.01 then copy = c break end
		end
		if not live then bad(path .. ": live part not found at its after- or before-position")
		elseif not copy then bad(path .. ": original copy not found")
		elseif live.Size ~= copy.Size then bad(path .. ": live part and copy differ in size")
		else
			usedLive[live] = true usedCopy[copy] = true
			if state == "after" then table.insert(pairsToRestore, {live, copy}) end
		end
	end
	local pv = v10.WorldPivot
	if pv ~= PIVOT_AFTER and pv ~= PIVOT_BEFORE then bad("Villa 10 WorldPivot in an unexpected state: " .. cfs(pv)) end
	local dune = db.Mountains:GetChildren()[43]
	if not dune or not copyD or dune.Size ~= copyD.Size then bad("dune #43 missing or not matching its copy")
	elseif (dune.Position - Vector3.new(385, -15, -1148)).Magnitude > 0.001 and (dune.Position - copyD.Position).Magnitude > 0.001 then
		bad("dune #43 at an unexpected position")
	end
end

-- 3) terrain (all three channels): each cell must be in a planned state or already restored. Anything else -> stop.
--    MODE ALL:     layers 1-2 BEFORE or AFTER_B; layers 3-4 BEFORE or AFTER_A (Air, no liquid)
--    MODE STAGE_B: layers 1-2 AFTER_A (= BEFORE there) or AFTER_B; layers 3-4 must be AFTER_A (else use MODE ALL)
local get0 = readBox()
local cellsToRestore = 0
local function same(a1, a2, a3, b1, b2, b3) return a1 == b1 and a2 == b2 and a3 == b3 end
for x = 1, 10 do for y = 1, 4 do for z = 1, 4 do
	local m, so, lo = get0(x, y, z)
	local tm, ts, tl = (MODE == "ALL" and BEFORE or AFTER_A)(x, y, z) -- the restore target
	local am, as_, al = (y <= 2 and AFTER_B or AFTER_A)(x, y, z)     -- the planned after-state
	if MODE == "STAGE_B" and y >= 3 then
		if not same(m, so, lo, AIR, 0, 0) then bad("Stage A upper cells are not Air without liquid: use MODE = \"ALL\"") end
	elseif same(m, so, lo, tm, ts, tl) then -- already restored
	elseif same(m, so, lo, am, as_, al) then cellsToRestore += 1
	else bad(string.format("cell (%d,%d,%d) in an unexpected state: %s/%d/%d", 324 + (x - 1) * 4, (y - 1) * 4, -1048 + (z - 1) * 4, m.Name, so, lo)) end
end end end

table.insert(plan, string.format("MODE %s: %d house parts to restore, pivot %s, dune %s, %d terrain cells to restore, copy folder %s",
	MODE, #pairsToRestore, MODE == "ALL" and ("from " .. cfs(v10.WorldPivot) .. " to " .. cfs(PIVOT_BEFORE)) or "unchanged", MODE == "ALL" and "to (344.565, -15, -1060.26)" or "unchanged",
	cellsToRestore, MODE == "ALL" and "removed after verification" or "kept"))
if #problems > 0 then return "ROLLBACK STOPPED - nothing written. " .. #problems .. " problem(s):\n" .. table.concat(problems, "\n", 1, math.min(#problems, 20)) end
if DRY_RUN then return "DRY RUN OK - nothing written. Would do: " .. table.concat(plan, "\n") end

-- ===== real run =====
local shell0 = readShell()
if MODE == "ALL" then
	for _, pr in ipairs(pairsToRestore) do pr[1].CFrame = pr[2].CFrame end
	v10.WorldPivot = copyV.WorldPivot
	db.Mountains:GetChildren()[43].CFrame = copyD.CFrame
	writeLayers(1, 4, BEFORE)  -- all 160 box cells, all three channels
else
	writeLayers(1, 2, AFTER_A) -- the 80 lower cells back to the Stage A state (= the original ground layer)
end
task.wait(1)

-- ===== verification =====
local post = {}
if MODE == "ALL" then
	for _, pr in ipairs(pairsToRestore) do if pr[1].CFrame ~= pr[2].CFrame then table.insert(post, pr[1].Name .. " not restored exactly") end end
	if v10.WorldPivot ~= copyV.WorldPivot or v10.WorldPivot ~= PIVOT_BEFORE then table.insert(post, "WorldPivot not restored exactly: " .. cfs(v10.WorldPivot)) end
	if db.Mountains:GetChildren()[43].CFrame ~= copyD.CFrame then table.insert(post, "dune not restored exactly") end
end
local nr, tr = boxDiff(readBox(), MODE == "ALL" and BEFORE or AFTER_A)
for _, t in ipairs(tr) do table.insert(post, t) end
local sc = shellChanged(shell0, readShell())
if sc > 0 then table.insert(post, sc .. " cells outside the box changed") end
if #post > 0 then return "ROLLBACK PROBLEM - do NOT save; use R0 (close without saving and reopen):\n" .. table.concat(post, "\n", 1, math.min(#post, 20)) end
if MODE == "ALL" then folder:Destroy() end
return "ROLLBACK DONE (" .. table.concat(plan, "") .. "). Do not save. Next: 01 with LABEL \"" .. (MODE == "ALL" and "AFTER_ROLLBACK" or "AFTER_B_ROLLBACK") ..
	"\" and 05 with STAGE \"" .. (MODE == "ALL" and "ROLLBACK" or "B_ROLLBACK") .. "\"."
