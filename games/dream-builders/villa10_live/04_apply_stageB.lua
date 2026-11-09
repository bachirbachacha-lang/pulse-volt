-- 04_apply_stageB.lua  (Revision 3)
-- WRITES TO THE OPEN PLACE. Run only after the owner's approval, after Stage A has passed its checks.
-- Stage B: the pool water (R10). Writes exactly the 80 cells of box layers 1-2 (x 324..364, y 0..8, z -1048..-1032),
-- ALL THREE channels in one WriteVoxelChannels call, so the thin ground under the pool is cleared in the same write:
--   every cell: SolidMaterial = Air, SolidOccupancy = 0   (this is the ground clearing; rehearsal defect D3)
--   inner 16 columns: liquid 86/255 (layer 1, y 0..4) and 91/255 (layer 2, y 4..8)
--   outer ring 24 columns: liquid 0 (layer 1) and 3/255 (layer 2)
-- Nothing is written unless Stage A is exactly in place (terrain in all three channels).
-- SESSION GUARD: also requires SESSION_TOKEN to equal the token printed by 00_session_identity_readonly.lua in THIS Studio
-- window. Each Studio window is a separate process with its own _G, so a token issued in one window cannot work in another.
local CONFIRM = "" -- set to "APPLY STAGE B" to run
local SESSION_TOKEN = "" -- paste the token from 00_session_identity_readonly.lua run in this window
if CONFIRM ~= "APPLY STAGE B" then return "NOT RUN: set CONFIRM = \"APPLY STAGE B\"" end
assert(_G.V10_SESSION and SESSION_TOKEN ~= "" and _G.V10_SESSION.token == SESSION_TOKEN and _G.V10_SESSION.place == game.Name,
	"session guard: run 00_session_identity_readonly.lua in this window and paste its token")
local PLACE = "DreamBuilders.rbxl" -- the live place. Only for the Step 0 rehearsal: "DreamBuilders_TEST_villa10_pool_edge.rbxl"
assert(game.Name == PLACE, "wrong place: " .. game.Name)
local RunService = game:GetService("RunService")
assert(RunService:IsEdit() and not RunService:IsRunning(), "not in Edit mode")

local DY = -7.57825
-- Villa 10 WorldPivot: the FULL CFrame (all 12 components), read on the live place 9 Nov 00:30 (read-only).
-- After Stage A only the y component may differ (PIVOT_BEFORE + (0, DY, 0)); x, z and the rotation stay bit-identical.
local PIVOT_BEFORE = CFrame.new(453.68255615234375, 8.0782604217529297, -843.9224853515625, -1, 0, -8.7422776573475858e-08, 0, 1, 0, 8.7422776573475858e-08, 0, -1)
local PIVOT_AFTER = PIVOT_BEFORE + Vector3.new(0, DY, 0)
local function cfs(cf) local t = {cf:GetComponents()} for i = 1, 12 do t[i] = string.format("%.9g", t[i]) end return "{" .. table.concat(t, ", ") .. "}" end
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
local problems = {}
local function bad(s) table.insert(problems, s) end

-- ===== pre-checks (no writes): Stage A must be exactly in place =====
local used, nParts = {}, 0
for _, e in ipairs(LIST) do
	local path, pos = e[1], Vector3.new(e[2], e[3] + DY, e[4])
	local parentName, childName = path:match("^(.-)%.([^%.]+)$")
	local container = parentName and v10:FindFirstChild(parentName) or v10
	childName = childName or path
	local hits = 0
	for _, c in ipairs(container:GetChildren()) do
		if c.Name == childName and c:IsA("BasePart") and not used[c] and (c.Position - pos).Magnitude < 0.01 then hits += 1 used[c] = true break end
	end
	if hits ~= 1 then bad(path .. " is not at its Stage A position") else nParts += 1 end
end
if v10.WorldPivot ~= PIVOT_AFTER then bad("WorldPivot is " .. cfs(v10.WorldPivot) .. ", expected exactly " .. cfs(PIVOT_AFTER) .. " (Stage A missing?)") end
local dune = db.Mountains:GetChildren()[43]
if not (dune and (dune.Position - Vector3.new(385, -15, -1148)).Magnitude < 0.001) then bad("dune #43 not at its Stage A position") end
local pb = game:GetService("ServerStorage"):FindFirstChild("Phase1Backups")
if not (pb and pb:FindFirstChild("Fix8Nov_Villa10")) then bad("copy folder Fix8Nov_Villa10 missing") end
local nb, tb = boxDiff(readBox(), AFTER_A)
for _, t in ipairs(tb) do bad(t) end
if nb > 5 then bad((nb - 5) .. " more pool-box cells not in the Stage A state") end
local shell0 = readShell()
if #problems > 0 then return "STOP - nothing written. " .. #problems .. " problem(s):\n" .. table.concat(problems, "\n", 1, math.min(#problems, 20)) end

-- ===== write: only box layers 1-2 (80 cells), all three channels =====
writeLayers(1, 2, AFTER_B)
task.wait(1)

-- ===== post-checks =====
local post = {}
local get1 = readBox()
local nw, tw = boxDiff(get1, AFTER_B)
for _, t in ipairs(tw) do table.insert(post, t) end
local changed = boxDiff(get1, AFTER_A)
local sc = shellChanged(shell0, readShell())
if sc > 0 then table.insert(post, sc .. " cells outside the box changed") end
if v10.WorldPivot ~= PIVOT_AFTER then table.insert(post, "WorldPivot changed") end
return string.format("STAGE B %s: %d Stage A parts confirmed, WorldPivot unchanged at %s, %d pool-box cells changed (expected 80), %d box cells differ from the planned R10 state (3 channels), shell changed %d.%s",
	#post == 0 and "DONE" or "PROBLEM", nParts, cfs(v10.WorldPivot), changed, nw, sc, #post == 0 and "" or ("\n" .. table.concat(post, "\n", 1, math.min(#post, 20))))
