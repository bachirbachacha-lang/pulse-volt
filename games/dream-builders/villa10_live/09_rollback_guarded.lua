-- 09_rollback_guarded.lua  (rollback R1 of the procedure; replaces the old unguarded _G.V10_RESTORE)
-- Use ONLY before saving, and only when rollback R0 (close the place without saving and reopen the file) cannot be used.
-- It restores ONLY the planned targets, from the in-place copies made by 03 (exact original CFrames) and the measured
-- original terrain values. It does not depend on anything kept in _G.
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
local function isRing(x, z) return x == 1 or x == 10 or z == 1 or z == 4 end
local function beforeCell(x, y, z) -- measured on the live place 8 Nov 23:53 (02_check_targets_readonly.lua)
	if y == 1 then return Enum.Material.Ground, 30 end
	if y == 2 then return Enum.Material.Air, 0 end
	if y == 3 then return Enum.Material.Water, 113 end
	return Enum.Material.Water, 63
end
local function afterCell(x, y, z) -- planned values after Stage B
	if y == 1 then if isRing(x, z) then return Enum.Material.Air, 0 end return Enum.Material.Water, 86 end
	if y == 2 then if isRing(x, z) then return Enum.Material.Water, 3 end return Enum.Material.Water, 91 end
	return Enum.Material.Air, 0
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

-- 3) terrain: each cell must be in its planned after-state or already in its before-state
local yTop = (MODE == "ALL") and 4 or 2
local BOX = Region3.new(Vector3.new(324, 0, -1048), Vector3.new(364, 4 * yTop, -1032))
local m0, o0 = workspace.Terrain:ReadVoxels(BOX, 4)
local cellsToRestore = 0
for x = 1, 10 do for y = 1, yTop do for z = 1, 4 do
	local q = math.floor(o0[x][y][z] * 256 + 0.5)
	local bm, bq = beforeCell(x, y, z)
	local am, aq = afterCell(x, y, z)
	if m0[x][y][z] == bm and q == bq then -- already restored
	elseif m0[x][y][z] == am and q == aq then cellsToRestore += 1
	else bad(string.format("cell x%d y%d z%d in an unexpected state: %s %d/256", x, y, z, m0[x][y][z].Name, q)) end
end end end
if MODE == "STAGE_B" then
	-- Stage A must still be in place (upper cells Air), or this is not a Stage-B-only situation
	local mu, ou = workspace.Terrain:ReadVoxels(Region3.new(Vector3.new(324, 8, -1048), Vector3.new(364, 16, -1032)), 4)
	for x = 1, 10 do for y = 1, 2 do for z = 1, 4 do
		if mu[x][y][z] ~= Enum.Material.Air then bad("Stage A upper cells are not Air: use MODE = \"ALL\"") break end
	end end end
end

table.insert(plan, string.format("MODE %s: %d house parts to restore, pivot %s, dune %s, %d terrain cells to restore, copy folder %s",
	MODE, #pairsToRestore, MODE == "ALL" and ("from " .. cfs(v10.WorldPivot) .. " to " .. cfs(PIVOT_BEFORE)) or "unchanged", MODE == "ALL" and "to (344.565, -15, -1060.26)" or "unchanged",
	cellsToRestore, MODE == "ALL" and "removed after verification" or "kept"))
if #problems > 0 then return "ROLLBACK STOPPED - nothing written. " .. #problems .. " problem(s):\n" .. table.concat(problems, "\n", 1, math.min(#problems, 20)) end
if DRY_RUN then return "DRY RUN OK - nothing written. Would do: " .. table.concat(plan, "\n") end

-- ===== real run =====
local SHELL = Region3.new(Vector3.new(320, -4, -1052), Vector3.new(368, 20, -1028))
local sm0, so0 = workspace.Terrain:ReadVoxels(SHELL, 4)
if MODE == "ALL" then
	for _, pr in ipairs(pairsToRestore) do pr[1].CFrame = pr[2].CFrame end
	v10.WorldPivot = copyV.WorldPivot
	db.Mountains:GetChildren()[43].CFrame = copyD.CFrame
end
local mats, occs = {}, {}
for x = 1, 10 do
	mats[x], occs[x] = {}, {}
	for y = 1, yTop do
		mats[x][y], occs[x][y] = {}, {}
		for z = 1, 4 do
			local bm, bq = beforeCell(x, y, z)
			mats[x][y][z] = bm occs[x][y][z] = bq / 256
		end
	end
end
workspace.Terrain:WriteVoxels(BOX, 4, mats, occs)
task.wait(1)

-- ===== verification =====
local post = {}
if MODE == "ALL" then
	for _, pr in ipairs(pairsToRestore) do if pr[1].CFrame ~= pr[2].CFrame then table.insert(post, pr[1].Name .. " not restored exactly") end end
	if v10.WorldPivot ~= copyV.WorldPivot or v10.WorldPivot ~= PIVOT_BEFORE then table.insert(post, "WorldPivot not restored exactly: " .. cfs(v10.WorldPivot)) end
	if db.Mountains:GetChildren()[43].CFrame ~= copyD.CFrame then table.insert(post, "dune not restored exactly") end
end
local m1, o1 = workspace.Terrain:ReadVoxels(BOX, 4)
for x = 1, 10 do for y = 1, yTop do for z = 1, 4 do
	local bm, bq = beforeCell(x, y, z)
	if m1[x][y][z] ~= bm or math.floor(o1[x][y][z] * 256 + 0.5) ~= bq then table.insert(post, string.format("cell x%d y%d z%d not restored", x, y, z)) end
end end end
local sm1, so1 = workspace.Terrain:ReadVoxels(SHELL, 4)
for x = 1, sm1.Size.X do for y = 1, sm1.Size.Y do for z = 1, sm1.Size.Z do
	local wx, wy, wz = 320 + (x - 1) * 4, -4 + (y - 1) * 4, -1052 + (z - 1) * 4
	local inBox = wx >= 324 and wx < 364 and wy >= 0 and wy < 4 * yTop and wz >= -1048 and wz < -1032
	if not inBox and (sm1[x][y][z] ~= sm0[x][y][z] or so1[x][y][z] ~= so0[x][y][z]) then table.insert(post, "a cell outside the box changed") break end
end end end
if #post > 0 then return "ROLLBACK PROBLEM - do NOT save; use R0 (close without saving and reopen):\n" .. table.concat(post, "\n", 1, math.min(#post, 20)) end
if MODE == "ALL" then folder:Destroy() end
return "ROLLBACK DONE (" .. table.concat(plan, "") .. "). Do not save. Next: 01 with LABEL \"" .. (MODE == "ALL" and "AFTER_ROLLBACK" or "AFTER_B_ROLLBACK") ..
	"\" and 05 with STAGE \"" .. (MODE == "ALL" and "ROLLBACK" or "B_ROLLBACK") .. "\"."
