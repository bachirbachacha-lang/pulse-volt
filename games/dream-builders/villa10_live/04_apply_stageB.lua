-- 04_apply_stageB.lua
-- WRITES TO THE OPEN PLACE. Run only after the owner's approval, after Stage A has passed its checks.
-- Stage B: the pool water. Writes exactly the 80 cells x 324..364, y 0..8, z -1048..-1032:
--   inner 16 columns (x 328..360, z -1044..-1036): bottom Water 86/256, top Water 91/256  (same as the approved fill)
--   outer ring 24 columns:                         bottom Air,          top Water 3/256    (the revised pool edge)
-- Nothing is written unless Stage A is exactly in place, every cell is in its expected state and CONFIRM is set.
local CONFIRM = "" -- set to "APPLY STAGE B" to run
if CONFIRM ~= "APPLY STAGE B" then return "NOT RUN: set CONFIRM = \"APPLY STAGE B\"" end
local PLACE = "DreamBuilders.rbxl" -- the live place. Only for the Step 0 rehearsal: "DreamBuilders_TEST_villa10_pool_edge.rbxl"
assert(game.Name == PLACE, "wrong place: " .. game.Name)
local RunService = game:GetService("RunService")
assert(RunService:IsEdit() and not RunService:IsRunning(), "not in Edit mode")

local DY = -7.57825
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
local BOX = Region3.new(Vector3.new(324, 0, -1048), Vector3.new(364, 16, -1032))
local LOWER = Region3.new(Vector3.new(324, 0, -1048), Vector3.new(364, 8, -1032))
local function isRing(x, z) return x == 1 or x == 10 or z == 1 or z == 4 end
-- expected values per layer (y index in BOX: 1 = y0..4, 2 = y4..8, 3 = y8..12, 4 = y12..16)
local function afterA(x, y, z)
	if y == 1 then return Enum.Material.Ground, 30 end
	return Enum.Material.Air, 0
end
local function afterB(x, y, z)
	if y == 1 then if isRing(x, z) then return Enum.Material.Air, 0 else return Enum.Material.Water, 86 end end
	if y == 2 then if isRing(x, z) then return Enum.Material.Water, 3 else return Enum.Material.Water, 91 end end
	return Enum.Material.Air, 0
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
if math.abs(v10.WorldPivot.Position.Y - 0.50001) > 1e-4 then bad("pivot not at y 0.50001 (Stage A missing?)") end
local dune = db.Mountains:GetChildren()[43]
if not (dune and (dune.Position - Vector3.new(385, -15, -1148)).Magnitude < 0.001) then bad("dune #43 not at its Stage A position") end
local pb = game:GetService("ServerStorage"):FindFirstChild("Phase1Backups")
if not (pb and pb:FindFirstChild("Fix8Nov_Villa10")) then bad("copy folder Fix8Nov_Villa10 missing") end
local m0, o0 = workspace.Terrain:ReadVoxels(BOX, 4)
for x = 1, 10 do for y = 1, 4 do for z = 1, 4 do
	local wm, wq = afterA(x, y, z)
	if m0[x][y][z] ~= wm or math.floor(o0[x][y][z] * 256 + 0.5) ~= wq then bad(string.format("cell x%d y%d z%d not in its Stage A state", x, y, z)) end
end end end
local SHELL = Region3.new(Vector3.new(320, -4, -1052), Vector3.new(368, 20, -1028))
local sm0, so0 = workspace.Terrain:ReadVoxels(SHELL, 4)
if #problems > 0 then return "STOP - nothing written. " .. #problems .. " problem(s):\n" .. table.concat(problems, "\n", 1, math.min(#problems, 20)) end

-- ===== write: only the 80 cells of the lower box (y 0..8) =====
local mats, occs = {}, {}
for x = 1, 10 do
	mats[x], occs[x] = {}, {}
	for y = 1, 2 do
		mats[x][y], occs[x][y] = {}, {}
		for z = 1, 4 do
			local wm, wq = afterB(x, y, z)
			mats[x][y][z] = wm
			occs[x][y][z] = wq / 256
		end
	end
end
workspace.Terrain:WriteVoxels(LOWER, 4, mats, occs)
task.wait(1)

-- ===== post-checks =====
local post, changed = {}, 0
local m1, o1 = workspace.Terrain:ReadVoxels(BOX, 4)
for x = 1, 10 do for y = 1, 4 do for z = 1, 4 do
	local wm, wq = afterB(x, y, z)
	local q = math.floor(o1[x][y][z] * 256 + 0.5)
	if m1[x][y][z] ~= wm or q ~= wq then table.insert(post, string.format("cell x%d y%d z%d is %s %d/256, expected %s %d/256", x, y, z, m1[x][y][z].Name, q, wm.Name, wq)) end
	if m1[x][y][z] ~= m0[x][y][z] or q ~= math.floor(o0[x][y][z] * 256 + 0.5) then changed += 1 end
end end end
local sm1, so1 = workspace.Terrain:ReadVoxels(SHELL, 4)
local shellChanged = 0
for x = 1, sm1.Size.X do for y = 1, sm1.Size.Y do for z = 1, sm1.Size.Z do
	local wx, wy, wz = 320 + (x - 1) * 4, -4 + (y - 1) * 4, -1052 + (z - 1) * 4
	local inBox = wx >= 324 and wx < 364 and wy >= 0 and wy < 16 and wz >= -1048 and wz < -1032
	if not inBox and (sm1[x][y][z] ~= sm0[x][y][z] or so1[x][y][z] ~= so0[x][y][z]) then shellChanged += 1 end
end end end
if shellChanged > 0 then table.insert(post, shellChanged .. " cells outside the box changed") end
return string.format("STAGE B %s: %d Stage A parts confirmed, %d terrain cells changed (expected 80: 16 Ground->Water 86, 24 Ground->Air, 16 Air->Water 91, 24 Air->Water 3), shell changed %d.%s",
	#post == 0 and "DONE" or "PROBLEM", nParts, changed, shellChanged, #post == 0 and "" or ("\n" .. table.concat(post, "\n", 1, math.min(#post, 20))))
