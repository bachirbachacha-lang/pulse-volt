-- Marina Row: 6 waterfront modern houses, each a different design. Run build() from the command bar / MCP.
local K = require(script.Parent.ModernHouseKit)
local P = K.P
local B = {}
local FH = 12
local Y = 0.6
local WHITE, PLASTER = Color3.fromRGB(244, 242, 236), Enum.Material.Plaster
local function backOpen(W, h) return {{1.5, W / 2 - 3, 0.6, h - 0.8, true}, {W / 2 - 3, W / 2 + 3, 0, 8.6, false}, {W / 2 + 3, W - 1.5, 0.6, h - 0.8, true}} end
local function frontWithDoor(W, xd, x1) local t = xd - x1; return {{2, t - 5, 3, 9, true}, {t - 3, t + 3, 0, 8.6, false}, {t + 5, W - 2, 3, 9, true}} end
local function frontWindows(W) return {{2, W - 2, 2.5, 9.5, true}} end
-- ground floor + upper floors as boxes; returns nothing
local function house(v, O, d)
	local h = FH - 0.6
	for i, s in ipairs(d.levels) do
		local y = Y + (i - 1) * FH
		local W = s.x2 - s.x1
		local stair = d.levels[i + 1] and {x = s.stairX or (s.x2 - 3), z0 = s.z1 + 3, z1 = s.z1 + 19}
		local hole = (i > 1) and d.levels[i - 1].stairHole or nil
		K.storey(v, O, {x1 = s.x1, x2 = s.x2, z1 = s.z1, z2 = s.z2, y = y, color = s.color or d.color, mat = s.mat or d.mat, floor = d.floor,
			hole = hole,
			front = i == 1 and frontWithDoor(W, d.doorX or (s.x1 + W / 2), s.x1) or (s.front or frontWindows(W)),
			back = s.back or (s.glassBack and {{0.5, W - 0.5, 0.6, h - 0.3, true}} or backOpen(W, h)),
			left = s.left, right = s.right})
		if i == 1 then K.frontDoor(v, O, d.doorX or (s.x1 + W / 2), s.z1, Y + 0.6, d.doorColor) end
		if stair then
			K.stairs(v, O, stair.x, stair.z0, stair.z1, y + 0.6, y + FH + 0.6, 3.6, Color3.fromRGB(200, 170, 130))
			s.stairHole = {stair.x - 2, stair.x + 2, stair.z0 - 1, stair.z1 + 1.5}
		end
	end
end
local DESIGNS = {}
-- 1. Cube: white stacked boxes, upper floor cantilevers over the garage
DESIGNS.Cube = function(v, O)
	local d = {color = WHITE, mat = PLASTER, doorColor = Color3.fromRGB(30, 30, 34), doorX = -6,
		levels = {{x1 = -16, x2 = 10, z1 = -18, z2 = 8}, {x1 = -12, x2 = 22, z1 = -14, z2 = 12}}}
	house(v, O, d)
	K.roof(v, O, -16, 10, -18, 8, Y + FH - 0.2, Color3.fromRGB(235, 233, 228), 0.6)
	K.roof(v, O, -12, 22, -14, 12, Y + 2 * FH - 0.2, Color3.fromRGB(30, 30, 34), 0.8)
	P(v, "FrameBand", Vector3.new(35, 1.2, 0.6), O * CFrame.new(5, Y + FH + 0.2, -14.5), Color3.fromRGB(30, 30, 34), Enum.Material.Metal)
	return d
end
-- 2. Timber: long low wood-clad house, deep roof overhangs
DESIGNS.Timber = function(v, O)
	local WOOD, WM = Color3.fromRGB(160, 110, 70), Enum.Material.WoodPlanks
	local d = {color = WOOD, mat = WM, doorColor = Color3.fromRGB(240, 238, 232), doorX = -8,
		levels = {{x1 = -20, x2 = 10, z1 = -16, z2 = 10, stairX = -3}, {x1 = -20, x2 = 2, z1 = -16, z2 = 10, color = Color3.fromRGB(60, 60, 64), mat = Enum.Material.Slate}}}
	house(v, O, d)
	K.roof(v, O, -20, 10, -16, 10, Y + FH - 0.2, Color3.fromRGB(45, 45, 48), 3)
	K.roof(v, O, -20, 2, -16, 10, Y + 2 * FH - 0.2, Color3.fromRGB(45, 45, 48), 3.5)
	for i = 0, 7 do P(v, "Slat", Vector3.new(0.5, FH - 1, 0.5), O * CFrame.new(-18 + i * 1.2, Y + FH + FH / 2, -16.8), WOOD, WM) end
	return d
end
-- 3. Butterfly: grey stone, V-shaped roof
DESIGNS.Butterfly = function(v, O)
	local STONE = Color3.fromRGB(150, 148, 142)
	local d = {color = STONE, mat = Enum.Material.Limestone, doorColor = Color3.fromRGB(180, 60, 40), doorX = -3,
		levels = {{x1 = -16, x2 = 10, z1 = -16, z2 = 10}, {x1 = -16, x2 = 10, z1 = -16, z2 = 10, color = WHITE, mat = PLASTER}}}
	house(v, O, d)
	K.roof(v, O, -16, 10, -16, 10, Y + FH - 0.2, Color3.fromRGB(200, 198, 192), 0.5)
	local top = Y + 2 * FH
	for _, side in ipairs({-1, 1}) do
		local r = P(v, "ButterflyRoof", Vector3.new(16, 0.8, 30), O * CFrame.new(-3 + side * 7, top + 1.8, -3) * CFrame.Angles(0, 0, math.rad(side * 14)), Color3.fromRGB(35, 36, 40), Enum.Material.Metal)
	end
	-- fill the gable gaps with glass
	for _, zz in ipairs({-16, 10}) do
		P(v, "GableGlass", Vector3.new(26, 3.4, 0.3), O * CFrame.new(-3, top + 1.4, zz), Color3.fromRGB(150, 200, 220), Enum.Material.Glass, true, 0.5)
	end
	return d
end
-- 4. Tower: three slim floors and a roof terrace
DESIGNS.Tower = function(v, O)
	local d = {color = Color3.fromRGB(35, 36, 40), mat = Enum.Material.Metal, doorColor = Color3.fromRGB(205, 168, 92), doorX = -6, floor = Color3.fromRGB(210, 205, 196),
		levels = {{x1 = -14, x2 = 6, z1 = -16, z2 = 8}, {x1 = -14, x2 = 6, z1 = -16, z2 = 8, stairX = -11}, {x1 = -14, x2 = 6, z1 = -16, z2 = 8}}}
	-- the 3rd floor gets stairs to the roof
	d.levels[3].stairX = 3
	d.levels[4] = nil
	house(v, O, d)
	local top = Y + 3 * FH
	-- roof terrace floor with a hole for the stairs from floor 3
	K.stairs(v, O, 3, -13, 3, Y + 2 * FH + 0.6, top + 0.6, 3.6, Color3.fromRGB(200, 170, 130))
	local function slab(ax, bx, az, bz) P(v, "RoofTerrace", Vector3.new(bx - ax, 0.6, bz - az), O * CFrame.new((ax + bx) / 2, top + 0.3, (az + bz) / 2), Color3.fromRGB(190, 160, 120), Enum.Material.WoodPlanks) end
	slab(-15, 1, -17, 9); slab(5, 7, -17, 9); slab(1, 5, -17, -14); slab(1, 5, 4.5, 9)
	K.railing(v, O, -15, -17, 7, -17, top + 0.6); K.railing(v, O, 7, -17, 7, 9, top + 0.6); K.railing(v, O, 7, 9, -15, 9, top + 0.6); K.railing(v, O, -15, 9, -15, -17, top + 0.6)
	K.railing(v, O, 1, -14, 1, 4.5, top + 0.6)
	for i = 1, 3 do P(v, "GoldFin", Vector3.new(0.4, 3 * FH, 0.8), O * CFrame.new(-14 + i * 5, Y + 1.5 * FH, -16.6), Color3.fromRGB(205, 168, 92), Enum.Material.Metal, false) end
	K.sofa(v, O, -8, top + 0.6, 2, 0, Color3.fromRGB(240, 236, 228))
	return d
end
-- 5. Courtyard: L-shaped single storey wrapped around the pool, with one upper box
DESIGNS.Courtyard = function(v, O)
	local SAND = Color3.fromRGB(225, 205, 170)
	local d = {color = SAND, mat = Enum.Material.Sandstone, doorColor = Color3.fromRGB(40, 70, 90), doorX = -4,
		levels = {{x1 = -20, x2 = 8, z1 = -18, z2 = 4, stairX = -5, back = {{1.5, 14, 0.6, 10.8, true}, {16, 27, 0, 8.6, false}}}, {x1 = -20, x2 = -2, z1 = -18, z2 = 4}}}
	house(v, O, d)
	-- second wing (single storey) toward the sea
	K.storey(v, O, {x1 = -20, x2 = -8, z1 = 4, z2 = 20, y = Y, color = SAND, mat = Enum.Material.Sandstone,
		front = {{0, 12, 0, 20, false}}, back = {{1, 11, 0.6, 10.6, true}}, left = {{2, 14, 3, 9, true}}, right = {{3, 9, 0, 8.6, false}}})
	K.roof(v, O, -20, 8, -18, 4, Y + FH - 0.2, Color3.fromRGB(240, 238, 232), 1.5)
	K.roof(v, O, -20, -8, 4, 20, Y + FH - 0.2, Color3.fromRGB(240, 238, 232), 1.5)
	K.roof(v, O, -20, -2, -18, 4, Y + 2 * FH - 0.2, Color3.fromRGB(240, 238, 232), 1.5)
	return d
end
-- 6. Glass Box: dark stone base with an all-glass upper floor
DESIGNS.GlassBox = function(v, O)
	local d = {color = Color3.fromRGB(55, 55, 58), mat = Enum.Material.Basalt, doorColor = Color3.fromRGB(205, 168, 92), doorX = -2,
		levels = {{x1 = -16, x2 = 12, z1 = -16, z2 = 8, stairX = 7},
			{x1 = -14, x2 = 10, z1 = -12, z2 = 12, glassBack = true, front = {{0.5, 23.5, 0.6, 11, true}}, left = {{0.5, 23.5, 0.6, 11, true}}, right = {{0.5, 23.5, 0.6, 11, true}}}}}
	house(v, O, d)
	K.roof(v, O, -16, 12, -16, 8, Y + FH - 0.2, Color3.fromRGB(70, 70, 74), 0.4)
	K.roof(v, O, -14, 10, -12, 12, Y + 2 * FH - 0.2, Color3.fromRGB(240, 238, 232), 2.5, 1.4)
	return d
end
B.ORDER = {"Cube", "Timber", "Butterfly", "Tower", "Courtyard", "GlassBox"}
function B.furnish(v, O, design)
	local y1 = Y + 0.6
	-- ground floor: living + kitchen + dining
	K.sofa(v, O, -10, y1, -6, math.pi, Color3.fromRGB(40, 60, 90))
	K.tv(v, O, design == "Timber" and -15 or -10, y1, -14, math.pi)
	K.kitchen(v, O, design == "Timber" and 3.5 or 0, y1, 4)
	K.dining(v, O, -9, y1, 2)
	K.plant(v, O, -14, y1, -15)
	-- upper floor: bedroom
	local y2 = Y + FH + 0.6
	if design == "Courtyard" then
		K.bed(v, O, -13, y2, -6, math.pi, Color3.fromRGB(180, 60, 60))
		K.bed(v, O, -14, y1, 14, 0, Color3.fromRGB(60, 120, 160))
	elseif design == "Tower" then
		K.bed(v, O, -6, y2, -6, math.pi, Color3.fromRGB(180, 60, 60))
		K.sofa(v, O, -4, Y + 2 * FH + 0.6, 5.5, math.pi, Color3.fromRGB(120, 30, 40))
	else
		K.bed(v, O, design == "Timber" and -14 or -6, y2, 2, 0, Color3.fromRGB(180, 140, 60))
		K.sofa(v, O, -8, y2, -8, math.pi, Color3.fromRGB(220, 215, 205))
	end
end
function B.cutHoles(v, O, d)
	for i, s in ipairs(d.levels) do
		local h = s.stairHole
		if h then
			local yTop = 0.6 + i * 12
			for _, p in ipairs(v:GetChildren()) do
				if p:IsA("BasePart") and p.Name == "Roof" and math.abs(p.Position.Y - yTop) < 1.6 then
					local cf = O:ToObjectSpace(p.CFrame)
					local x1, x2 = cf.X - p.Size.X / 2, cf.X + p.Size.X / 2
					local z1, z2 = cf.Z - p.Size.Z / 2, cf.Z + p.Size.Z / 2
					if h[1] < x2 and h[2] > x1 and h[3] < z2 and h[4] > z1 then
						local function slab(ax, bx, az, bz)
							if bx - ax > 0.1 and bz - az > 0.1 then
								local q = p:Clone(); q.Size = Vector3.new(bx - ax, p.Size.Y, bz - az)
								q.CFrame = O * CFrame.new((ax + bx) / 2, cf.Y, (az + bz) / 2); q.Parent = v
							end
						end
						local hx1, hx2 = math.max(h[1], x1), math.min(h[2], x2)
						local hz1, hz2 = math.max(h[3], z1), math.min(h[4], z2)
						slab(x1, hx1, z1, z2); slab(hx2, x2, z1, z2); slab(hx1, hx2, z1, hz1); slab(hx1, hx2, hz2, z2)
						p:Destroy()
					end
				end
			end
		end
	end
end
function B.build(parent, lots)
	local out = {}
	for i, lot in ipairs(lots) do
		local design = B.ORDER[(i - 1) % #B.ORDER + 1]
		local name = string.format("Villa_MarinaRow_%d_%s", i, design)
		local old = parent:FindFirstChild(name); if old then old:Destroy() end
		local v = Instance.new("Model"); v.Name = name
		v:SetAttribute("Variant", design)
		local c = lot.center
		local O = CFrame.lookAt(c, c + lot.facing)
		local d = DESIGNS[design](v, O)
		B.cutHoles(v, O, d)
		K.garage(v, O, 18, -30, Y, d.color)
		K.pool(v, O, -14, 6, 20, 30, Y)
		-- lawn + palm-free hedge between lots
		P(v, "Lawn", Vector3.new(50, 0.2, 18), O * CFrame.new(0, Y + 0.1, -26), Color3.fromRGB(90, 145, 70), Enum.Material.Grass, true)
		P(v, "Path", Vector3.new(4, 0.3, 14), O * CFrame.new(d.doorX or 0, Y + 0.15, -25), Color3.fromRGB(215, 210, 200), Enum.Material.Concrete)
		B.furnish(v, O, design)
		v.WorldPivot = O
		v.Parent = parent
		local n = 0; for _, x in ipairs(v:GetDescendants()) do if x:IsA("BasePart") then n += 1 end end
		out[#out + 1] = name .. " (" .. n .. " parts)"
		task.wait()
	end
	return out
end
return B
