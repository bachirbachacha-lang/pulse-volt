-- 05_compare_readonly.lua
-- READ-ONLY. Contains no write calls. Compares two fingerprints made by 01_fingerprint_readonly.lua and checks that the
-- ONLY differences are the planned ones for the given stage. Prints PASS or FAIL with every unexpected difference.
--   STAGE = "A"            after Stage A   (47 house parts + dune moved, 80 upper pool cells -> Air, copy folder added)
--   STAGE = "B"            after Stage B   (the same, plus the 80 lower pool cells with the revised fill)
--   STAGE = "ROLLBACK"     after a full rollback (NO differences at all)
--   STAGE = "B_ROLLBACK"   after rolling back Stage B only (must equal Stage A)
local BASE, NEW, STAGE = "BEFORE", "AFTER_A", "A"

local PLACE = "DreamBuilders.rbxl" -- the live place. Only for the Step 0 rehearsal: "DreamBuilders_TEST_villa10_pool_edge.rbxl"
assert(game.Name == PLACE, "wrong place: " .. game.Name)
assert(game:GetService("RunService"):IsEdit(), "not in Edit mode")
local A, B = _G.V10L and _G.V10L[BASE], _G.V10L and _G.V10L[NEW]
assert(A and B, "fingerprints " .. BASE .. " and " .. NEW .. " must both exist (run 01 first)")

local DY = -7.57825
local fails, notes = {}, {}
local function fail(s) table.insert(fails, s) end
local stageMovesParts = (STAGE == "A" or STAGE == "B" or STAGE == "B_ROLLBACK")

-- the 47 house parts' before-positions, to recognise their keys in the BEFORE fingerprint
local POS = {
	Vector3.new(353.183,25.178,-1016.122),Vector3.new(327.083,25.178,-1016.122),Vector3.new(319.433,14.378,-992.722),
	Vector3.new(322.133,14.378,-992.722),Vector3.new(305.483,13.478,-997.942),Vector3.new(336.983,25.178,-1016.122),
	Vector3.new(343.733,17.146,-1020.622),Vector3.new(340.313,20.071,-1012.567),Vector3.new(341.933,11.588,-1010.628),
	Vector3.new(339.683,26.528,-1010.722),Vector3.new(346.883,14.828,-993.667),Vector3.new(346.208,17.776,-1010.857),
	Vector3.new(339.683,15.278,-1010.722),Vector3.new(349.929,14.693,-1011.712),Vector3.new(346.883,21.488,-1007.662),
	Vector3.new(339.683,20.318,-1007.595),Vector3.new(336.713,20.633,-1009.508),Vector3.new(339.683,9.518,-1057.772),
	Vector3.new(334.058,16.696,-1023.142),Vector3.new(340.403,32.468,-1017.922),Vector3.new(339.593,20.386,-1009.125),
	Vector3.new(345.983,20.611,-1005.772),Vector3.new(340.673,16.921,-1023.097),Vector3.new(331.853,16.696,-1010.812),
	Vector3.new(339.537,15.080,-1011.029),Vector3.new(339.458,10.958,-1011.172),Vector3.new(332.708,20.678,-1010.722),
	Vector3.new(345.533,16.381,-1034.797),Vector3.new(339.008,15.373,-1001.272),Vector3.new(333.383,26.258,-1008.922),
	Vector3.new(339.683,9.068,-1017.922),Vector3.new(357.683,21.151,-1022.422),Vector3.new(339.683,20.678,-1010.137),
	Vector3.new(339.638,20.633,-1010.385),Vector3.new(339.265,21.128,-1017.922),
	Vector3.new(363.713,11.768,-1040.422),Vector3.new(344.183,11.768,-1047.353),Vector3.new(344.183,11.768,-1033.492),
	Vector3.new(324.652,11.768,-1040.422),Vector3.new(344.183,10.148,-1040.422),Vector3.new(331.583,10.958,-1046.587),
	Vector3.new(344.183,10.958,-1046.587),Vector3.new(356.783,10.958,-1046.587),Vector3.new(362.183,11.078,-1040.422),
	Vector3.new(360.383,10.568,-1040.422),Vector3.new(366.143,10.568,-1040.422),Vector3.new(364.343,11.078,-1040.422),
}
local houseKeys, duneKey = {}, nil
for key, r in pairs(A.parts) do
	if key:find("/Villa_PalmHills_10_Pearl[1]/", 1, true) and key:find("/Homes[1]/", 1, true) then
		for _, p in ipairs(POS) do
			if (r.cf.Position - p).Magnitude < 0.01 then houseKeys[key] = true break end
		end
	elseif key:find("/Mountains[1]/", 1, true) and (r.cf.Position - Vector3.new(344.565, -15, -1060.26)).Magnitude < 0.01 then
		duneKey = key
	end
end
local nHouse = 0
for _ in pairs(houseKeys) do nHouse += 1 end
if nHouse ~= 47 then fail("found " .. nHouse .. " house-part keys in " .. BASE .. ", expected 47") end
if not duneKey then fail("dune #43 key not found in " .. BASE) end

-- 1) parts
local function sameRot(c1, c2)
	local a = {c1:GetComponents()}
	local b = {c2:GetComponents()}
	for i = 4, 12 do if a[i] ~= b[i] then return false end end
	return true
end
local nChanged, nExpectedOk, nAdded, nRemoved = 0, 0, 0, 0
for key, ra in pairs(A.parts) do
	local rb = B.parts[key]
	if not rb then
		nRemoved += 1
		if nRemoved <= 5 then fail("part removed: " .. key) end
	else
		local differs = ra.cf ~= rb.cf or ra.size ~= rb.size or ra.anchored ~= rb.anchored or ra.collide ~= rb.collide
			or ra.transp ~= rb.transp or ra.mat ~= rb.mat or ra.color ~= rb.color
		local expected = stageMovesParts and (houseKeys[key] or key == duneKey)
		if differs then nChanged += 1 end
		if expected then
			local ok
			if key == duneKey then
				ok = (rb.cf.Position - Vector3.new(385, -15, -1148)).Magnitude < 0.001 and sameRot(ra.cf, rb.cf)
			else
				local d = rb.cf.Position - ra.cf.Position
				ok = math.abs(d.X) < 1e-4 and math.abs(d.Z) < 1e-4 and math.abs(d.Y - DY) < 1e-4 and sameRot(ra.cf, rb.cf)
			end
			ok = ok and ra.size == rb.size and ra.anchored == rb.anchored and ra.collide == rb.collide and ra.transp == rb.transp
				and ra.mat == rb.mat and ra.color == rb.color
			if ok then nExpectedOk += 1 else fail("planned part not exactly as planned: " .. key) end
		elseif differs then
			fail("UNPLANNED part change: " .. key)
		end
	end
end
local copyPrefix = "/ServerStorage[1]/Phase1Backups[1]/Fix8Nov_Villa10[1]/"
for key in pairs(B.parts) do
	if not A.parts[key] then
		nAdded += 1
		if not (stageMovesParts and key:find(copyPrefix, 1, true)) then fail("UNPLANNED new part: " .. key) end
	end
end
local wantMoved = stageMovesParts and 48 or 0
if nExpectedOk ~= wantMoved then fail(string.format("%d planned parts in place, expected %d", nExpectedOk, wantMoved)) end

-- 2) group digests (summary for the report)
local changedGroups = {}
for g, Ga in pairs(A.groups) do
	local Gb = B.groups[g]
	if not Gb then table.insert(changedGroups, g .. " (gone)") elseif Gb.digest ~= Ga.digest or Gb.n ~= Ga.n then table.insert(changedGroups, g) end
end
for g in pairs(B.groups) do if not A.groups[g] then table.insert(changedGroups, g .. " (new)") end end
table.sort(changedGroups)
local allowedGroups = {["Homes/Villa_PalmHills_10_Pearl"] = true, ["DreamBuilders/Mountains"] = true, ["ServerStorage/Phase1Backups/Fix8Nov_Villa10 (new)"] = true}
for _, g in ipairs(changedGroups) do
	if not (stageMovesParts and allowedGroups[g]) then fail("UNPLANNED group change: " .. g) end
end

-- 3) terrain, cell by cell
local function isRing(xi, zi) return xi == 1 or xi == 10 or zi == 1 or zi == 4 end
local function plannedAfter(wx, wy, wz) -- returns material, q (1/256) or nil if the cell is not planned to change at this stage
	if wx < 324 or wx >= 364 or wz < -1048 or wz >= -1032 or wy < 0 or wy >= 16 then return nil end
	local xi, zi = (wx - 324) / 4 + 1, (wz + 1048) / 4 + 1
	if wy >= 8 then if STAGE ~= "ROLLBACK" then return Enum.Material.Air, 0 end return nil end
	if STAGE ~= "B" then return nil end
	if wy < 4 then if isRing(xi, zi) then return Enum.Material.Air, 0 end return Enum.Material.Water, 86 end
	if isRing(xi, zi) then return Enum.Material.Water, 3 end
	return Enum.Material.Water, 91
end
local terrainReport = {}
for name, Ta in pairs(A.terrain) do
	local Tb = B.terrain[name]
	if not Tb then fail("terrain region missing in " .. NEW .. ": " .. name)
	else
		local diff, planned, bad = 0, 0, 0
		for x = 1, Ta.size.X do for y = 1, Ta.size.Y do for z = 1, Ta.size.Z do
			local ma, mb = Ta.mats[x][y][z], Tb.mats[x][y][z]
			local qa, qb = math.floor(Ta.occ[x][y][z] * 256 + 0.5), math.floor(Tb.occ[x][y][z] * 256 + 0.5)
			local wx, wy, wz = Ta.lo.X + (x - 1) * 4, Ta.lo.Y + (y - 1) * 4, Ta.lo.Z + (z - 1) * 4
			local pm, pq = nil, nil
			if name == "Villa10_work_area" then pm, pq = plannedAfter(wx, wy, wz) end
			if pm then
				planned += 1
				if mb ~= pm or qb ~= pq then bad += 1 if bad <= 5 then fail(string.format("planned cell (%d,%d,%d) is %s %d/256, expected %s %d/256", wx, wy, wz, mb.Name, qb, pm.Name, pq)) end end
			elseif ma ~= mb or qa ~= qb then
				diff += 1
				if diff <= 5 then fail(string.format("UNPLANNED terrain change in %s at (%d,%d,%d): %s %d -> %s %d", name, wx, wy, wz, ma.Name, qa, mb.Name, qb)) end
			end
		end end end
		table.insert(terrainReport, string.format("%s: %d planned cells, %d wrong, %d unplanned changes", name, planned, bad, diff))
	end
end
table.sort(terrainReport)
local wantCellDelta = ({A = -80, B = -64, ROLLBACK = 0, B_ROLLBACK = -80})[STAGE]
if B.cells - A.cells ~= wantCellDelta then fail(string.format("CountCells changed by %d, expected %d", B.cells - A.cells, wantCellDelta)) end

-- 4) scripts and object counts
if B.scripts.digest ~= A.scripts.digest or B.scripts.n ~= A.scripts.n or B.scripts.chars ~= A.scripts.chars then fail("SCRIPTS CHANGED") end
local folder = game:GetService("ServerStorage"):FindFirstChild("Phase1Backups") and game:GetService("ServerStorage").Phase1Backups:FindFirstChild("Fix8Nov_Villa10")
for svc, na in pairs(A.counts) do
	local want = na
	if svc == "ServerStorage" and stageMovesParts then want = na + (folder and (1 + #folder:GetDescendants()) or 0) end
	if B.counts[svc] ~= want then fail(string.format("object count %s: %d, expected %d", svc, B.counts[svc] or -1, want)) end
end
if stageMovesParts and not folder then fail("copy folder missing") end
if not stageMovesParts and folder then fail("copy folder still present") end

return string.format("COMPARE %s -> %s (stage %s): %s\n  parts: %d changed (%d planned and exact), %d added, %d removed\n  groups changed: %s\n  terrain: %s\n  CountCells %d -> %d (delta %d)\n  scripts %s\n%s",
	BASE, NEW, STAGE, #fails == 0 and "PASS - only the planned changes" or ("FAIL - " .. #fails .. " problem(s)"),
	nChanged, nExpectedOk, nAdded, nRemoved, #changedGroups > 0 and table.concat(changedGroups, ", ") or "none",
	table.concat(terrainReport, "; "), A.cells, B.cells, B.cells - A.cells, B.scripts.digest == A.scripts.digest and "identical" or "DIFFERENT",
	#fails == 0 and "" or table.concat(fails, "\n", 1, math.min(#fails, 30)))
