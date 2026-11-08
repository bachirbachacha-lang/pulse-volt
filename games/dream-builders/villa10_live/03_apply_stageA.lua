-- 03_apply_stageA.lua
-- WRITES TO THE OPEN PLACE. Run only after the owner's approval, in the step the procedure says.
-- Stage A: the 47 house parts down 7.57825 studs, the Villa 10 pivot, dune #43 to (385, -15, -1148), and the old
-- raised pool water removed (80 cells, y 8..16 -> Air). First it adds the in-place copies
-- ServerStorage.Phase1Backups.Fix8Nov_Villa10 (the original Villa 10 model and dune #43), used by 09_rollback_guarded.lua.
-- Nothing is written unless EVERY target is exactly in the expected before-state and CONFIRM is set.
local CONFIRM = "" -- set to "APPLY STAGE A" to run
if CONFIRM ~= "APPLY STAGE A" then return "NOT RUN: set CONFIRM = \"APPLY STAGE A\"" end
local PLACE = "DreamBuilders.rbxl" -- the live place. Only for the Step 0 rehearsal: "DreamBuilders_TEST_villa10_pool_edge.rbxl"
assert(game.Name == PLACE, "wrong place: " .. game.Name)
local RunService = game:GetService("RunService")
assert(RunService:IsEdit() and not RunService:IsRunning(), "not in Edit mode")

local DY = -7.57825
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
local BEFORE = {{Enum.Material.Ground, 30}, {Enum.Material.Air, 0}, {Enum.Material.Water, 113}, {Enum.Material.Water, 63}}
local BOX = Region3.new(Vector3.new(324, 0, -1048), Vector3.new(364, 16, -1032))
local problems = {}
local function bad(s) table.insert(problems, s) end

-- ===== pre-checks (no writes) =====
local found, used = {}, {}
for _, e in ipairs(LIST) do
	local path, pos = e[1], Vector3.new(e[2], e[3], e[4])
	local parentName, childName = path:match("^(.-)%.([^%.]+)$")
	local container = parentName and v10:FindFirstChild(parentName) or v10
	childName = childName or path
	local hits = {}
	for _, c in ipairs(container:GetChildren()) do
		if c.Name == childName and c:IsA("BasePart") and not used[c] and (c.Position - pos).Magnitude < 0.01 then table.insert(hits, c) end
	end
	if #hits ~= 1 then bad(path .. ": " .. #hits .. " matches at the before-position")
	else used[hits[1]] = true table.insert(found, {part = hits[1], pos = pos}) end
end
if math.abs(v10.WorldPivot.Position.Y - 8.07826) > 1e-4 then bad("pivot not at y 8.07826") end
local kids = db.Mountains:GetChildren()
local dune = kids[43]
if not (#kids == 43 and dune and dune:IsA("BasePart") and (dune.Position - Vector3.new(344.565, -15, -1060.26)).Magnitude < 0.01
	and (dune.Size - Vector3.new(257.28, 96.87, 269.61)).Magnitude < 0.01) then bad("dune #43 not in its before-state") end
local m0, o0 = workspace.Terrain:ReadVoxels(BOX, 4)
for x = 1, 10 do for y = 1, 4 do for z = 1, 4 do
	if m0[x][y][z] ~= BEFORE[y][1] or math.floor(o0[x][y][z] * 256 + 0.5) ~= BEFORE[y][2] then bad(string.format("cell x%d y%d z%d not in its before-state", x, y, z)) end
end end end
local pb = SS:FindFirstChild("Phase1Backups")
if not pb then bad("ServerStorage.Phase1Backups missing") elseif pb:FindFirstChild("Fix8Nov_Villa10") then bad("Fix8Nov_Villa10 already exists") end
-- the shell of 272 cells around the box, recorded to prove it is not touched
local SHELL = Region3.new(Vector3.new(320, -4, -1052), Vector3.new(368, 20, -1028))
local sm0, so0 = workspace.Terrain:ReadVoxels(SHELL, 4)
if #problems > 0 then return "STOP - nothing written. " .. #problems .. " problem(s):\n" .. table.concat(problems, "\n", 1, math.min(#problems, 20)) end

-- ===== writes =====
-- 1) in-place copies (built outside the DataModel, then parented once)
local folder = Instance.new("Folder")
folder.Name = "Fix8Nov_Villa10"
local copyV = v10:Clone()
copyV.Name = "Villa_PalmHills_10_Pearl_original"
copyV.Parent = folder
local copyD = dune:Clone()
copyD.Name = "Mountains_Dune43_original"
copyD.Parent = folder
local expectedCopy = 1 + #v10:GetDescendants() + 1 + #dune:GetDescendants()
folder.Parent = pb
if #folder:GetDescendants() ~= expectedCopy then return "STOP after the copy step: the copy has " .. #folder:GetDescendants() .. " objects, expected " .. expectedCopy .. ". Only the copy folder was added; use rollback R0." end
-- 2) house parts, pivot, dune
for _, f in ipairs(found) do f.part.CFrame = f.part.CFrame + Vector3.new(0, DY, 0) end
v10.WorldPivot = v10.WorldPivot + Vector3.new(0, DY, 0)
dune.CFrame = CFrame.new(385, -15, -1148) * dune.CFrame.Rotation
-- 3) terrain 4a: the old raised pool water -> Air. Only the 80 cells of the upper box (y 8..16) are written.
local UPPER = Region3.new(Vector3.new(324, 8, -1048), Vector3.new(364, 16, -1032))
local mats, occs = {}, {}
for x = 1, 10 do
	mats[x], occs[x] = {}, {}
	for y = 1, 2 do
		mats[x][y], occs[x][y] = {}, {}
		for z = 1, 4 do mats[x][y][z] = Enum.Material.Air occs[x][y][z] = 0 end
	end
end
workspace.Terrain:WriteVoxels(UPPER, 4, mats, occs)
task.wait(1)

-- ===== post-checks =====
local post = {}
for _, f in ipairs(found) do
	if (f.part.Position - (f.pos + Vector3.new(0, DY, 0))).Magnitude > 0.01 then table.insert(post, f.part.Name .. " not at its new position") end
end
if math.abs(v10.WorldPivot.Position.Y - 0.50001) > 1e-4 then table.insert(post, "pivot not at y 0.50001") end
if (dune.Position - Vector3.new(385, -15, -1148)).Magnitude > 0.001 then table.insert(post, "dune not at (385, -15, -1148)") end
local m1, o1 = workspace.Terrain:ReadVoxels(BOX, 4)
local cellsChanged = 0
for x = 1, 10 do for y = 1, 4 do for z = 1, 4 do
	local q = math.floor(o1[x][y][z] * 256 + 0.5)
	local want = (y >= 3) and {Enum.Material.Air, 0} or BEFORE[y]
	if m1[x][y][z] ~= want[1] or q ~= want[2] then table.insert(post, string.format("cell x%d y%d z%d wrong after Stage A", x, y, z)) end
	if m1[x][y][z] ~= m0[x][y][z] or q ~= math.floor(o0[x][y][z] * 256 + 0.5) then cellsChanged += 1 end
end end end
local sm1, so1 = workspace.Terrain:ReadVoxels(SHELL, 4)
local shellChanged = 0
for x = 1, sm1.Size.X do for y = 1, sm1.Size.Y do for z = 1, sm1.Size.Z do
	local wx, wy, wz = 320 + (x - 1) * 4, -4 + (y - 1) * 4, -1052 + (z - 1) * 4
	local inBox = wx >= 324 and wx < 364 and wy >= 0 and wy < 16 and wz >= -1048 and wz < -1032
	if not inBox and (sm1[x][y][z] ~= sm0[x][y][z] or so1[x][y][z] ~= so0[x][y][z]) then shellChanged += 1 end
end end end
if shellChanged > 0 then table.insert(post, shellChanged .. " cells outside the box changed") end
return string.format("STAGE A %s: %d parts moved, pivot y %.5f, dune at (%.3f, %.3f, %.3f), %d terrain cells changed (expected 80), shell changed %d, copy folder %d objects.%s",
	#post == 0 and "DONE" or "PROBLEM", #found, v10.WorldPivot.Position.Y, dune.Position.X, dune.Position.Y, dune.Position.Z, cellsChanged, shellChanged,
	#folder:GetDescendants(), #post == 0 and "" or ("\n" .. table.concat(post, "\n")))
