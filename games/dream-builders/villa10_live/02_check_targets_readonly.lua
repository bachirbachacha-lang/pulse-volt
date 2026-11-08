-- 02_check_targets_readonly.lua
-- READ-ONLY. Contains no write calls. Finds every object and terrain cell the repair would change and checks that
-- each one is EXACTLY in the expected "before" state. Prints OK or the list of mismatches. Run in Edit mode.
-- The same target definitions are repeated in 03, 04 and 09 (each script must stand alone).
local PLACE = "DreamBuilders.rbxl" -- the live place. Only for the Step 0 rehearsal: "DreamBuilders_TEST_villa10_pool_edge.rbxl"
assert(game.Name == PLACE, "wrong place: " .. game.Name)
assert(game:GetService("RunService"):IsEdit(), "not in Edit mode")

local DY = -7.57825
local db = workspace.DreamBuilders
local v10 = db.Homes.Villa_PalmHills_10_Pearl
-- the 47 house parts: path inside the Villa 10 model and position BEFORE the repair (plan section 7)
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
local problems = {}
local function bad(s) table.insert(problems, s) end

-- 1) parts, matched by exact path and position (0.01 stud); each must match exactly one part
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
	if #hits ~= 1 then bad(string.format("part %s at (%.3f,%.3f,%.3f): %d matches", path, pos.X, pos.Y, pos.Z, #hits))
	else used[hits[1]] = true table.insert(found, hits[1]) end
end
-- the other 22 Villa 10 parts (garage block) must not be in the list
local nV10 = 0
for _, d in ipairs(v10:GetDescendants()) do if d:IsA("BasePart") then nV10 += 1 end end
if nV10 ~= 69 then bad("Villa 10 has " .. nV10 .. " parts, expected 69") end

-- 2) model pivot
local pv = v10.WorldPivot
if math.abs(pv.Position.Y - 8.07826) > 1e-4 then bad(string.format("Villa 10 pivot y %.5f, expected 8.07826", pv.Position.Y)) end

-- 3) dune #43: index, position, size
local kids = db.Mountains:GetChildren()
local dune = kids[43]
if #kids ~= 43 then bad("Mountains has " .. #kids .. " children, expected 43") end
if not (dune and dune:IsA("BasePart") and (dune.Position - Vector3.new(344.565, -15, -1060.26)).Magnitude < 0.01
	and (dune.Size - Vector3.new(257.28, 96.87, 269.61)).Magnitude < 0.01) then
	bad("dune #43 not at (344.565, -15, -1060.26) with size (257.28, 96.87, 269.61)")
end

-- 4) the 160 terrain cells: x 324..364, y 0..16, z -1048..-1032, exact values (occupancy in 1/256 steps)
local BEFORE = { -- by layer (y index 1..4)
	{Enum.Material.Ground, 30}, {Enum.Material.Air, 0}, {Enum.Material.Water, 113}, {Enum.Material.Water, 63},
}
local m, o = workspace.Terrain:ReadVoxels(Region3.new(Vector3.new(324, 0, -1048), Vector3.new(364, 16, -1032)), 4)
if m.Size ~= Vector3.new(10, 4, 4) then bad("terrain box is " .. tostring(m.Size)) end
local nCells, nBad = 0, 0
for x = 1, 10 do for y = 1, 4 do for z = 1, 4 do
	nCells += 1
	local q = math.floor(o[x][y][z] * 256 + 0.5)
	if m[x][y][z] ~= BEFORE[y][1] or q ~= BEFORE[y][2] then
		nBad += 1
		if nBad <= 5 then bad(string.format("cell (%d,%d,%d) is %s %d/256", 324 + (x - 1) * 4, (y - 1) * 4, -1048 + (z - 1) * 4, m[x][y][z].Name, q)) end
	end
end end end

-- 5) no leftover copy folder from earlier attempts
local pb = game:GetService("ServerStorage"):FindFirstChild("Phase1Backups")
if pb and pb:FindFirstChild("Fix8Nov_Villa10") then bad("ServerStorage.Phase1Backups.Fix8Nov_Villa10 already exists") end

return string.format("CHECK TARGETS (read-only): %d/47 house parts found, pivot y %.5f, dune #43 %s, %d terrain cells checked, %d differ from the expected before-values.\n%s",
	#found, pv.Position.Y, dune and string.format("at (%.3f, %.3f, %.3f)", dune.Position.X, dune.Position.Y, dune.Position.Z) or "missing",
	nCells, nBad, #problems == 0 and "RESULT: OK - every target is exactly in the expected before-state." or ("RESULT: STOP - " .. #problems .. " problem(s):\n" .. table.concat(problems, "\n")))
