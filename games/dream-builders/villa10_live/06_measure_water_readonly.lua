-- 06_measure_water_readonly.lua
-- READ-ONLY. Contains no write calls. Measures (with physics rays, Edit mode) the water lying on the deck just
-- outside every side and every corner of the Villa 10 pool, and the water level inside next to each wall.
-- PASS rule: 0 water above the deck at every outside point. The inside levels must equal the test copy's
-- (test_results.md / water_on_deck_measurements.txt, revised fill).
local PLACE = "DreamBuilders.rbxl" -- the live place. Only for the Step 0 rehearsal: "DreamBuilders_TEST_villa10_pool_edge.rbxl"
assert(game.Name == PLACE, "wrong place: " .. game.Name)
assert(game:GetService("RunService"):IsEdit(), "not in Edit mode")

local cx, cz = 344.18, -1040.42
local rpW = RaycastParams.new() rpW.IgnoreWater = false
local rpS = RaycastParams.new() rpS.IgnoreWater = true
local function probe(x, z)
	local o = Vector3.new(x, 30, z)
	local hs = workspace:Raycast(o, Vector3.new(0, -60, 0), rpS)
	local hw = workspace:Raycast(o, Vector3.new(0, -60, 0), rpW)
	local sy = hs and hs.Position.Y or -99
	local wy = nil
	if hw and hw.Material == Enum.Material.Water and hw.Position.Y > sy + 0.001 then wy = hw.Position.Y end
	return sy, wy
end
local IN = {W = cx - 18.90, E = cx + 18.90, N = cz - 6.30, S = cz + 6.30}
local OUT = {W = cx - 20.16, E = cx + 20.16, N = cz - 7.56, S = cz + 7.56}
local lines, outsideWater = {}, 0
local sides = {
	S = function(t, d) return t, OUT.S + d end, N = function(t, d) return t, OUT.N - d end,
	W = function(t, d) return OUT.W - d, t end, E = function(t, d) return OUT.E + d, t end,
}
local inside = {
	S = function(t, d) return t, IN.S - d end, N = function(t, d) return t, IN.N + d end,
	W = function(t, d) return IN.W + d, t end, E = function(t, d) return IN.E - d, t end,
}
for _, side in ipairs({"S", "N", "W", "E"}) do
	local ts = {}
	if side == "S" or side == "N" then for k = -18, 18, 1 do table.insert(ts, cx + k) end
	else for k = -5.5, 5.5, 0.5 do table.insert(ts, cz + k) end end
	local parts = {}
	for _, d in ipairs({0.1, 0.25, 0.5, 1, 1.5, 2, 3}) do
		local mx, c = 0, 0
		for _, t in ipairs(ts) do
			local x, z = sides[side](t, d)
			local sy, wy = probe(x, z)
			if wy and wy - sy > 0.01 then c += 1 mx = math.max(mx, wy - sy) end
		end
		outsideWater += c
		table.insert(parts, string.format("out%.2f:%.2f/%d", d, mx, c))
	end
	for _, d in ipairs({0.25, 0.75, 1.5, 3}) do
		local mn, mxl, dry = 99, 0, 0
		for _, t in ipairs(ts) do
			local x, z = inside[side](t, d)
			local sy, wy = probe(x, z)
			local l = wy or sy
			if not wy then dry += 1 end
			mn = math.min(mn, l) mxl = math.max(mxl, l)
		end
		table.insert(parts, string.format("in%.2f:%.2f-%.2f%s", d, mn, mxl, dry > 0 and (" dry" .. dry) or ""))
	end
	table.insert(lines, side .. " (" .. #ts .. " pts): " .. table.concat(parts, " "))
end
-- corners: a fan of points around each outside corner, 0.1 to 3 studs out
local cornerPts, cornerWater = 0, 0
for _, sx in ipairs({-1, 1}) do for _, sz in ipairs({-1, 1}) do
	local ox, oz = sx > 0 and OUT.E or OUT.W, sz > 0 and OUT.S or OUT.N
	for _, r in ipairs({0.1, 0.25, 0.5, 1, 1.5, 2, 3}) do
		for a = 0, 90, 15 do
			local x = ox + sx * r * math.cos(math.rad(a))
			local z = oz + sz * r * math.sin(math.rad(a))
			local sy, wy = probe(x, z)
			cornerPts += 1
			if wy and wy - sy > 0.01 then cornerWater += 1 end
		end
	end
end end
outsideWater += cornerWater
table.insert(lines, string.format("corners: %d points, %d with water above the deck", cornerPts, cornerWater))
return (outsideWater == 0 and "WATER CHECK PASS: no water on the deck anywhere around the pool\n" or ("WATER CHECK FAIL: " .. outsideWater .. " outside points with water\n")) .. table.concat(lines, "\n")
