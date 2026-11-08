-- 01_fingerprint_readonly.lua
-- READ-ONLY. Contains no write calls (no CFrame/Property assignment, no terrain writes, no Parent changes).
-- Records a fingerprint of the open place under a label and prints a summary. Run in Edit mode.
-- Set LABEL before running: "BEFORE" (after the fresh reopen), "AFTER_A" (after Stage A), "AFTER_B" (after Stage B),
-- "AFTER_ROLLBACK" (after a rollback). Results are kept in _G.V10L[LABEL] for 05_compare_readonly.lua.
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
			table.insert(G.list, key .. "|" .. table.concat(c, ",") .. "|" ..
				string.format("%.4f,%.4f,%.4f|%s%s%.3f%s%s", d.Size.X, d.Size.Y, d.Size.Z, tostring(d.Anchored),
					tostring(d.CanCollide), d.Transparency, d.Material.Name, d.Color:ToHex()))
			if n % 3000 == 0 then task.wait() end
		end
	end
end
R.nParts = n
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

-- 2) terrain: exact snapshots of protected regions
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
	local m, o = workspace.Terrain:ReadVoxels(reg, 4)
	local h1, h2, water, solid = 0, 0, 0, 0
	for x = 1, m.Size.X do for y = 1, m.Size.Y do for z = 1, m.Size.Z do
		local mat = m[x][y][z]
		local q = math.floor(o[x][y][z] * 256 + 0.5)
		local v = mat.Value * 300 + q
		h1 = (h1 * P1 + v) % M1
		h2 = (h2 * P2 + v) % M2
		if mat == Enum.Material.Water then water += 1 elseif mat ~= Enum.Material.Air then solid += 1 end
	end end end
	local lo = reg.CFrame.Position - reg.Size / 2
	R.terrain[name] = {region = reg, lo = lo, mats = m, occ = o, size = m.Size, water = water, solid = solid,
		sum = string.format("%09d-%09d", h1, h2)}
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
R.cells = workspace.Terrain:CountCells()

-- 3) scripts and object counts
local srcList, nScripts, chars = {}, 0, 0
for _, svc in ipairs({workspace, game:GetService("ServerScriptService"), SS, game:GetService("ReplicatedStorage"),
	game:GetService("ReplicatedFirst"), game:GetService("StarterPlayer"), game:GetService("StarterGui"),
	game:GetService("StarterPack"), game:GetService("Lighting")}) do
	for _, d in ipairs(svc:GetDescendants()) do
		if d:IsA("LuaSourceContainer") then
			nScripts += 1
			chars += #d.Source
			table.insert(srcList, keyOf(d) .. "\0" .. d.Source)
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
local out = {string.format("FINGERPRINT %s  place=%s  parts=%d  terrain cells=%d  scripts=%d (%d chars, %s)",
	LABEL, game.Name, R.nParts, R.cells, nScripts, chars, R.scripts.digest)}
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
	table.insert(out, string.format("  terrain %-28s %dx%dx%d cells from (%d,%d,%d)  water %d  solid %d  %s", t, T.size.X, T.size.Y,
		T.size.Z, T.lo.X, T.lo.Y, T.lo.Z, T.water, T.solid, T.sum))
end
local cn = {}
for k, v in pairs(R.counts) do table.insert(cn, k .. "=" .. v) end
table.sort(cn)
table.insert(out, "  counts " .. table.concat(cn, ", "))
return table.concat(out, "\n")
