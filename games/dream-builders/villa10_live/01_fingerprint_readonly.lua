-- 01_fingerprint_readonly.lua  (Revision 3: terrain in all three voxel channels, whole map)
-- READ-ONLY. Contains no write calls (no CFrame/Property assignment, no terrain writes, no Parent changes).
-- Records a fingerprint of the open place under a label and prints a summary. Run in Edit mode.
-- Set LABEL before running: "BEFORE" (after the fresh reopen), "AFTER_A" (after Stage A), "AFTER_B" (after Stage B),
-- "AFTER_ROLLBACK" (after a rollback). Results are kept in _G.V10L[LABEL] for 05_compare_readonly.lua.
-- The printed digests are order-independent, so the outputs of two different sessions (for example the step-1 BEFORE
-- and the AFTER_R0 run after a close-and-reopen) can be compared line by line (tools/compare_fingerprints.py).
local LABEL = "BEFORE"

local PLACE = "DreamBuilders.rbxl" -- the live place. Only for the Step 0 rehearsal: "DreamBuilders_TEST_villa10_pool_edge.rbxl"
assert(game.Name == PLACE, "wrong place: " .. game.Name)
assert(game:GetService("RunService"):IsEdit(), "not in Edit mode")

local SS = game:GetService("ServerStorage")
local db = workspace:FindFirstChild("DreamBuilders")
assert(db and db:FindFirstChild("Homes"), "DreamBuilders.Homes missing")

local P1, M1, P2, M2 = 31, 1000000007, 131, 998244353
local function hashStr(h1, h2, s)
	for i = 1, #s do
		local b = string.byte(s, i)
		h1 = (h1 * P1 + b) % M1
		h2 = (h2 * P2 + b) % M2
	end
	return h1, h2
end

-- stable key for an instance: Name[index among same-named siblings] for every level
local idxCache, keyCache = {}, {}
local function sibIndex(inst)
	local parent = inst.Parent
	local map = idxCache[parent]
	if not map then
		map = {}
		local seen = {}
		for _, ch in ipairs(parent:GetChildren()) do
			seen[ch.Name] = (seen[ch.Name] or 0) + 1
			map[ch] = seen[ch.Name]
		end
		idxCache[parent] = map
	end
	return map[inst] or 0
end
local function keyOf(inst)
	if inst == game then return "" end
	local k = keyCache[inst]
	if k then return k end
	k = keyOf(inst.Parent) .. "/" .. inst.Name .. "[" .. sibIndex(inst) .. "]"
	keyCache[inst] = k
	return k
end

-- path WITHOUT sibling indexes: used for the group and script digests, so that the digests do not depend on the
-- order of same-named siblings (that order can differ between a long-running session and a fresh open of the same file)
local function pathOf(inst)
	if inst == game then return "" end
	return pathOf(inst.Parent) .. "/" .. inst.Name
end

local function groupOf(p)
	if p:IsDescendantOf(SS) then
		local top = p
		while top.Parent ~= SS do top = top.Parent end
		if top.Name == "Phase1Backups" then
			local sub = p
			while sub.Parent ~= top do sub = sub.Parent end
			return "ServerStorage/Phase1Backups/" .. sub.Name
		end
		return "ServerStorage/" .. top.Name
	end
	if p:IsDescendantOf(db.Homes) then
		local m = p
		while m.Parent ~= db.Homes do m = m.Parent end
		return "Homes/" .. m.Name
	end
	if p:IsDescendantOf(db) then
		local t = p
		while t.Parent ~= db do t = t.Parent end
		return "DreamBuilders/" .. t.Name
	end
	local t = p
	while t.Parent ~= workspace do t = t.Parent end
	return "Workspace/" .. t.Name
end

local R = {label = LABEL, parts = {}, groups = {}, terrain = {}}

-- 1) every BasePart in Workspace and ServerStorage
local n = 0
for _, root in ipairs({workspace, SS}) do
	for _, d in ipairs(root:GetDescendants()) do
		if d:IsA("BasePart") and d ~= workspace.Terrain then
			n += 1
			local key = keyOf(d)
			R.parts[key] = {cf = d.CFrame, size = d.Size, anchored = d.Anchored, collide = d.CanCollide,
				transp = d.Transparency, mat = d.Material, color = d.Color}
			local g = groupOf(d)
			local G = R.groups[g]
			if not G then G = {n = 0, list = {}} R.groups[g] = G end
			G.n += 1
			local c = {d.CFrame:GetComponents()}
			for i = 1, 12 do c[i] = string.format("%.5f", c[i]) end
			table.insert(G.list, pathOf(d) .. "|" .. table.concat(c, ",") .. "|" ..
				string.format("%.4f,%.4f,%.4f|%s%s%.3f%s%s", d.Size.X, d.Size.Y, d.Size.Z, tostring(d.Anchored),
					tostring(d.CanCollide), d.Transparency, d.Material.Name, d.Color:ToHex()))
			if n % 3000 == 0 then task.wait() end
		end
	end
end
R.nParts = n
-- 1b) the FULL WorldPivot CFrame of every villa model (Homes) and of any model inside the copy folder
R.pivots = {}
local function cfs(cf) local t = {cf:GetComponents()} for i = 1, 12 do t[i] = string.format("%.9g", t[i]) end return "{" .. table.concat(t, ", ") .. "}" end
local nPiv = 0
for _, m in ipairs(db.Homes:GetChildren()) do
	if m:IsA("Model") then R.pivots[keyOf(m)] = m.WorldPivot nPiv += 1 end
end
local pbk = SS:FindFirstChild("Phase1Backups")
local fk = pbk and pbk:FindFirstChild("Fix8Nov_Villa10")
if fk then for _, m in ipairs(fk:GetChildren()) do if m:IsA("Model") then R.pivots[keyOf(m)] = m.WorldPivot nPiv += 1 end end end
R.nPivots = nPiv
local hashed = 0
for _, G in pairs(R.groups) do
	table.sort(G.list)
	local h1, h2 = 0, 0
	for _, s in ipairs(G.list) do
		h1, h2 = hashStr(h1, h2, s)
		hashed += 1
		if hashed % 2000 == 0 then task.wait() end
	end
	G.digest = string.format("%09d-%09d", h1, h2)
	G.list = nil
end
task.wait()

-- 2) terrain, ALL THREE voxel channels (SolidMaterial, SolidOccupancy, LiquidOccupancy). Roblox stores the two
--    amounts in steps of 1/255, so they are kept as whole numbers 0..255 ("bytes"). ReadVoxels is NOT used: it cannot
--    see water inside a solid cell (rehearsal defect D4).
local CHN = {"SolidMaterial", "SolidOccupancy", "LiquidOccupancy"}
local function b255(v) return math.floor(v * 255 + 0.5) end
-- the 160-cell pool box (the only terrain the repair may change): x 324..364, y 0..16, z -1048..-1032
local function inBox(wx, wy, wz) return wx >= 324 and wx < 364 and wy >= 0 and wy < 16 and wz >= -1048 and wz < -1032 end
-- 2a) named regions, cell by cell (kept for 05)
local function aabb(cf, size)
	local mn = Vector3.new(math.huge, math.huge, math.huge)
	local mx = -mn
	for _, sx in ipairs({-0.5, 0.5}) do for _, sy in ipairs({-0.5, 0.5}) do for _, sz in ipairs({-0.5, 0.5}) do
		local w = cf:PointToWorldSpace(Vector3.new(size.X * sx, size.Y * sy, size.Z * sz))
		mn = mn:Min(w) mx = mx:Max(w)
	end end end
	return mn, mx
end
local function snap(name, mn, mx)
	local reg = Region3.new(mn, mx):ExpandToGrid(4)
	local ch = workspace.Terrain:ReadVoxelChannels(reg, 4, CHN)
	local size = ch.Size
	local cells = {}
	local h1, h2, liquid, solid = 0, 0, 0, 0
	for x = 1, size.X do for y = 1, size.Y do for z = 1, size.Z do
		local m, so, lo = ch.SolidMaterial[x][y][z], b255(ch.SolidOccupancy[x][y][z]), b255(ch.LiquidOccupancy[x][y][z])
		local v = (m.Value * 256 + so) * 256 + lo
		cells[(x - 1) * size.Y * size.Z + (y - 1) * size.Z + z] = v
		h1 = (h1 * P1 + v) % M1
		h2 = (h2 * P2 + v) % M2
		if lo > 0 then liquid += 1 end
		if m ~= Enum.Material.Air then solid += 1 end
	end end end
	local lo3 = reg.CFrame.Position - reg.Size / 2
	R.terrain[name] = {lo = lo3, size = size, cells = cells, liquid = liquid, solid = solid, sum = string.format("%09d-%09d", h1, h2)}
	task.wait()
end
snap("Villa10_work_area", Vector3.new(280, -16, -1200), Vector3.new(520, 40, -940))
for _, villa in ipairs({"Villa_PalmHills_1_Classic", "Villa_PalmHills_6_Classic", "Villa_PalmHills_15_Pearl",
	"Villa_PalmHills_8_Charcoal", "Villa_PalmHills_16_Classic", "Villa_PalmHills_4_Charcoal"}) do
	local m = db.Homes:FindFirstChild(villa)
	assert(m, "missing " .. villa)
	local cf, size = m:GetBoundingBox()
	local mn, mx = aabb(cf, size)
	snap(villa, Vector3.new(mn.X - 12, -16, mn.Z - 12), Vector3.new(mx.X + 12, math.max(40, mx.Y + 8), mx.Z + 12))
end
-- 2b) the whole map, all three channels, in 256-stud tiles, with the 160 pool-box cells left out (they are recorded
--     separately in R.box). Extent: x -4000..2464, y -96..32, z -2400..4000 (all terrain lies inside; measured 9 Nov).
local tiles, outSolid, outLiquid, nCells = {}, 0, 0, 0
local box = {}
for tx = -4000, 2463, 256 do for tz = -2400, 3999, 256 do
	local ch = workspace.Terrain:ReadVoxelChannels(Region3.new(Vector3.new(tx, -96, tz), Vector3.new(tx + 256, 32, tz + 256)), 4, CHN)
	local SM, SO, LO, size = ch.SolidMaterial, ch.SolidOccupancy, ch.LiquidOccupancy, ch.Size
	local h1, h2, cs, cl = 0, 0, 0, 0
	for x = 1, size.X do local wx = tx + (x - 1) * 4 local a, b, c = SM[x], SO[x], LO[x]
		for y = 1, size.Y do local wy = -96 + (y - 1) * 4 local a2, b2, c2 = a[y], b[y], c[y]
			for z = 1, size.Z do
				local wz = tz + (z - 1) * 4
				local m, so, lo = a2[z], b255(b2[z]), b255(c2[z])
				if inBox(wx, wy, wz) then
					box[((wx - 324) / 4) * 16 + ((wy - 0) / 4) * 4 + ((wz + 1048) / 4) + 1] = {m, so, lo}
				else
					local v = (m.Value * 256 + so) * 256 + lo
					h1 = (h1 * P1 + v) % M1
					h2 = (h2 * P2 + v) % M2
					if m ~= Enum.Material.Air then cs += 1 end
					if lo > 0 then cl += 1 end
				end
			end
		end
	end
	nCells += size.X * size.Y * size.Z
	outSolid += cs outLiquid += cl
	tiles[tx .. "," .. tz] = string.format("%09d-%09d", h1, h2)
	task.wait()
end end
local tkeys = {}
for k in pairs(tiles) do table.insert(tkeys, k) end
table.sort(tkeys)
local g1, g2 = 0, 0
for _, k in ipairs(tkeys) do g1, g2 = hashStr(g1, g2, k .. ":" .. tiles[k] .. ";") end
local boxCount, boxSum = {}, {}
for i = 1, 160 do
	local c = box[i]
	local key = string.format("y%d:%s/%d/%d", math.floor(((i - 1) % 16) / 4), c[1].Name, c[2], c[3])
	boxCount[key] = (boxCount[key] or 0) + 1
end
for k, v in pairs(boxCount) do table.insert(boxSum, k .. " x" .. v) end
table.sort(boxSum)
R.map = {tiles = tiles, digest = string.format("%09d-%09d", g1, g2), cells = nCells, solid = outSolid, liquid = outLiquid}
R.box = box
R.boxSummary = table.concat(boxSum, ", ")
R.cells = workspace.Terrain:CountCells() -- information only (not a check; rehearsal defect D2)

-- 3) scripts and object counts
local srcList, nScripts, chars = {}, 0, 0
for _, svc in ipairs({workspace, game:GetService("ServerScriptService"), SS, game:GetService("ReplicatedStorage"),
	game:GetService("ReplicatedFirst"), game:GetService("StarterPlayer"), game:GetService("StarterGui"),
	game:GetService("StarterPack"), game:GetService("Lighting")}) do
	for _, d in ipairs(svc:GetDescendants()) do
		if d:IsA("LuaSourceContainer") then
			nScripts += 1
			chars += #d.Source
			table.insert(srcList, pathOf(d) .. "\0" .. d.Source)
		end
	end
end
table.sort(srcList)
local s1, s2 = 0, 0
for _, s in ipairs(srcList) do s1, s2 = hashStr(s1, s2, s) end
R.scripts = {n = nScripts, chars = chars, digest = string.format("%09d-%09d", s1, s2)}
R.counts = {}
for _, svc in ipairs({workspace, game:GetService("ServerScriptService"), SS, game:GetService("ReplicatedStorage"),
	game:GetService("StarterPlayer"), game:GetService("StarterGui"), game:GetService("Lighting")}) do
	R.counts[svc.Name] = #svc:GetDescendants()
end

_G.V10L = _G.V10L or {}
_G.V10L[LABEL] = R

-- 4) summary
local out = {string.format("FINGERPRINT %s  place=%s  parts=%d  CountCells(info only)=%d  scripts=%d (%d chars, %s)",
	LABEL, game.Name, R.nParts, R.cells, nScripts, chars, R.scripts.digest)}
local v10m = db.Homes:FindFirstChild("Villa_PalmHills_10_Pearl")
table.insert(out, string.format("  pivots recorded for %d models; Villa 10 WorldPivot %s", nPiv, v10m and cfs(v10m.WorldPivot) or "MISSING"))
for _, nm in ipairs({"Villa_PalmHills_1_Classic", "Villa_PalmHills_6_Classic", "Villa_PalmHills_15_Pearl", "Villa_PalmHills_8_Charcoal", "Villa_PalmHills_16_Classic", "Villa_PalmHills_4_Charcoal"}) do
	local m = db.Homes:FindFirstChild(nm)
	table.insert(out, string.format("  pivot %-28s %s", nm, m and cfs(m.WorldPivot) or "MISSING"))
end
local gnames = {}
for g in pairs(R.groups) do table.insert(gnames, g) end
table.sort(gnames)
for _, g in ipairs(gnames) do
	table.insert(out, string.format("  group %-48s %5d parts  %s", g, R.groups[g].n, R.groups[g].digest))
end
local tnames = {}
for t in pairs(R.terrain) do table.insert(tnames, t) end
table.sort(tnames)
for _, t in ipairs(tnames) do
	local T = R.terrain[t]
	table.insert(out, string.format("  terrain %-28s %dx%dx%d cells from (%d,%d,%d)  with liquid %d  with solid %d  %s", t, T.size.X, T.size.Y,
		T.size.Z, T.lo.X, T.lo.Y, T.lo.Z, T.liquid, T.solid, T.sum))
end
table.insert(out, string.format("  terrain WHOLE MAP outside the pool box: %d cells, with solid %d, with liquid %d, digest %s", R.map.cells - 160, R.map.solid, R.map.liquid, R.map.digest))
table.insert(out, "  terrain POOL BOX (layer: SolidMaterial/SolidOccupancy/LiquidOccupancy in 1/255): " .. R.boxSummary)
local cn = {}
for k, v in pairs(R.counts) do table.insert(cn, k .. "=" .. v) end
table.sort(cn)
table.insert(out, "  counts " .. table.concat(cn, ", "))
return table.concat(out, "\n")
