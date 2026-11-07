-- Builds modern houses out of parts (designed in Studio). Each house is a "Villa_" model so the
-- property system can sell it, lock its doors, give it a garage and a name sign.
local K = {}
local FH = 12 -- storey height
local function P(par, name, size, cf, color, mat, col, tr, shape)
	local p = Instance.new("Part"); p.Name = name; p.Anchored = true; p.Size = size; p.CFrame = cf
	p.Color = color; p.Material = mat or Enum.Material.SmoothPlastic; p.CanCollide = col ~= false; p.Transparency = tr or 0
	if shape then p.Shape = shape end
	p.TopSurface = Enum.SurfaceType.Smooth; p.BottomSurface = Enum.SurfaceType.Smooth; p.Parent = par; return p
end
K.P = P
local GLASS = Color3.fromRGB(150, 200, 220)
local FRAME = Color3.fromRGB(30, 31, 35)
-- wall between two local points (a,b on the XZ plane) with optional openings {from,to,bottom,top} along its length
local function wall(par, O, ax, az, bx, bz, y0, h, color, mat, openings, glassFill)
	local a, b = Vector3.new(ax, 0, az), Vector3.new(bx, 0, bz)
	local len = (b - a).Magnitude
	local dir = (b - a).Unit
	local function seg(t1, t2, yb, yt, glass)
		if t2 - t1 < 0.05 or yt - yb < 0.05 then return end
		local mid = a + dir * ((t1 + t2) / 2)
		local cf = O * CFrame.lookAt(Vector3.new(mid.X, y0 + (yb + yt) / 2, mid.Z), Vector3.new(mid.X, y0 + (yb + yt) / 2, mid.Z) + dir:Cross(Vector3.yAxis))
		if glass then P(par, "Window", Vector3.new(t2 - t1, yt - yb, 0.3), cf, GLASS, Enum.Material.Glass, true, 0.45)
		else P(par, "Wall", Vector3.new(t2 - t1, yt - yb, 0.8), cf, color, mat) end
	end
	openings = openings or {}
	table.sort(openings, function(p, q) return p[1] < q[1] end)
	local t = 0
	for _, o in ipairs(openings) do
		seg(t, o[1], 0, h)                       -- solid before the opening
		seg(o[1], o[2], 0, o[3])                 -- below the opening
		seg(o[1], o[2], o[4], h)                 -- above the opening
		if o[5] then seg(o[1], o[2], o[3], o[4], true) end -- glass in the opening
		t = o[2]
	end
	seg(t, len, 0, h)
	return len
end
K.wall = wall
-- stairs that really work: visible steps + invisible ramp
function K.stairs(par, O, x, z0, z1, y0, y1, width, color)
	local n = math.max(6, math.floor((y1 - y0) / 0.9))
	for i = 1, n do
		local h = (y1 - y0) * i / n
		local za = z0 + (z1 - z0) * (i - 1) / n
		local zb = z0 + (z1 - z0) * i / n
		P(par, "Step", Vector3.new(width, 0.4, math.abs(zb - za) + 0.05), O * CFrame.new(x, y0 + h - 0.2, (za + zb) / 2), color, Enum.Material.WoodPlanks, false)
	end
	local a, b = Vector3.new(x, y0, z0), Vector3.new(x, y1, z1)
	local ramp = P(par, "StairRamp", Vector3.new(width, 0.4, (b - a).Magnitude), O * CFrame.lookAt((a + b) / 2, b) * CFrame.new(0, -0.2, 0), color, nil, true, 1)
	P(par, "StairRail", Vector3.new(0.25, 0.25, (b - a).Magnitude), O * CFrame.lookAt((a + b) / 2, b) * CFrame.new(-width / 2, 3, 0), FRAME, Enum.Material.Metal, false)
	return ramp
end
-- a box storey: x1..x2, z1..z2 local, front = z1 (road side)
function K.storey(par, O, s)
	local y0 = s.y
	local col, mat = s.color, s.mat
	-- floor (with optional hole for stairs)
	if s.hole then
		local h = s.hole -- {x1,x2,z1,z2}
		local function slab(ax, bx, az, bz) if bx - ax > 0.1 and bz - az > 0.1 then P(par, "Floor", Vector3.new(bx - ax, 0.6, bz - az), O * CFrame.new((ax + bx) / 2, y0 + 0.3, (az + bz) / 2), s.floor or Color3.fromRGB(230, 226, 218), Enum.Material.Marble) end end
		slab(s.x1, h[1], s.z1, s.z2); slab(h[2], s.x2, s.z1, s.z2); slab(h[1], h[2], s.z1, h[3]); slab(h[1], h[2], h[4], s.z2)
	else
		P(par, "Floor", Vector3.new(s.x2 - s.x1, 0.6, s.z2 - s.z1), O * CFrame.new((s.x1 + s.x2) / 2, y0 + 0.3, (s.z1 + s.z2) / 2), s.floor or Color3.fromRGB(230, 226, 218), Enum.Material.Marble)
	end
	local W, D = s.x2 - s.x1, s.z2 - s.z1
	local y = y0 + 0.6
	local h = FH - 0.6
	-- front wall: door (ground floor) + windows
	local front = s.front or {}
	wall(par, O, s.x1, s.z1, s.x2, s.z1, y, h, col, mat, front, true)
	-- back wall: mostly glass
	wall(par, O, s.x2, s.z2, s.x1, s.z2, y, h, col, mat, s.back or {{1.5, W - 1.5, 0.6, h - 0.8, true}}, true)
	wall(par, O, s.x1, s.z2, s.x1, s.z1, y, h, col, mat, s.left or {{D * 0.3, D * 0.7, 3, 9, true}}, true)
	wall(par, O, s.x2, s.z1, s.x2, s.z2, y, h, col, mat, s.right or {{D * 0.3, D * 0.7, 3, 9, true}}, true)
	-- ceiling light
	local l = P(par, "CeilingLight", Vector3.new(4, 0.2, 4), O * CFrame.new((s.x1 + s.x2) / 2, y0 + FH - 0.3, (s.z1 + s.z2) / 2), Color3.fromRGB(255, 245, 225), Enum.Material.Neon, false)
	local pl = Instance.new("PointLight"); pl.Range = 22; pl.Brightness = 0.9; pl.Color = Color3.fromRGB(255, 232, 200); pl.Parent = l
end
function K.roof(par, O, x1, x2, z1, z2, y, color, overhang, thick)
	overhang = overhang or 1.5
	return P(par, "Roof", Vector3.new(x2 - x1 + overhang * 2, thick or 1, z2 - z1 + overhang * 2), O * CFrame.new((x1 + x2) / 2, y + (thick or 1) / 2, (z1 + z2) / 2), color or Color3.fromRGB(40, 40, 44), Enum.Material.Concrete)
end
function K.railing(par, O, ax, az, bx, bz, y)
	local a, b = Vector3.new(ax, y + 1.8, az), Vector3.new(bx, y + 1.8, bz)
	P(par, "GlassRail", Vector3.new(0.3, 3.6, (b - a).Magnitude), O * CFrame.lookAt((a + b) / 2, b), GLASS, Enum.Material.Glass, true, 0.55)
	P(par, "RailTop", Vector3.new(0.35, 0.3, (b - a).Magnitude), O * CFrame.lookAt((a + b) / 2, b) * CFrame.new(0, 1.9, 0), FRAME, Enum.Material.Metal, false)
end
-- simple furniture
function K.sofa(par, O, x, y, z, rot, color)
	local cf = O * CFrame.new(x, y, z) * CFrame.Angles(0, rot or 0, 0)
	P(par, "SofaSeat", Vector3.new(8, 1.4, 3), cf * CFrame.new(0, 1, 0), color, Enum.Material.Fabric)
	P(par, "SofaBack", Vector3.new(8, 2.4, 0.8), cf * CFrame.new(0, 2.2, 1.3), color, Enum.Material.Fabric)
	for _, k in ipairs({-2.2, 0, 2.2}) do local s = Instance.new("Seat"); s.Name = "SofaSpot"; s.Anchored = true; s.Transparency = 1; s.Size = Vector3.new(2, 0.2, 2); s.CFrame = cf * CFrame.new(k, 1.8, 0) * CFrame.Angles(0, math.pi, 0); s.Parent = par end
end
function K.tv(par, O, x, y, z, rot)
	local cf = O * CFrame.new(x, y, z) * CFrame.Angles(0, rot or 0, 0)
	P(par, "TVUnit", Vector3.new(9, 1.6, 1.6), cf * CFrame.new(0, 0.8, 0), Color3.fromRGB(60, 45, 35), Enum.Material.Wood)
	P(par, "TVScreen", Vector3.new(7, 4, 0.3), cf * CFrame.new(0, 4.4, 0.2), Color3.fromRGB(15, 18, 24), Enum.Material.Glass)
end
function K.kitchen(par, O, x, y, z, rot)
	local cf = O * CFrame.new(x, y, z) * CFrame.Angles(0, rot or 0, 0)
	P(par, "KitchenCounter", Vector3.new(12, 3.6, 2.6), cf * CFrame.new(0, 1.8, 0), Color3.fromRGB(245, 244, 240), Enum.Material.SmoothPlastic)
	P(par, "Worktop", Vector3.new(12.2, 0.3, 2.8), cf * CFrame.new(0, 3.75, 0), Color3.fromRGB(40, 40, 42), Enum.Material.Granite)
	P(par, "Island", Vector3.new(7, 3.6, 3), cf * CFrame.new(0, 1.8, -5), Color3.fromRGB(110, 80, 55), Enum.Material.WoodPlanks)
	P(par, "IslandTop", Vector3.new(7.4, 0.3, 3.4), cf * CFrame.new(0, 3.75, -5), Color3.fromRGB(240, 238, 232), Enum.Material.Marble)
end
function K.bed(par, O, x, y, z, rot, color)
	local cf = O * CFrame.new(x, y, z) * CFrame.Angles(0, rot or 0, 0)
	P(par, "BedBase", Vector3.new(7, 1.6, 8.5), cf * CFrame.new(0, 0.8, 0), Color3.fromRGB(70, 55, 45), Enum.Material.Wood)
	P(par, "Mattress", Vector3.new(6.6, 1, 8), cf * CFrame.new(0, 2, 0), Color3.fromRGB(245, 245, 242), Enum.Material.Fabric)
	P(par, "Blanket", Vector3.new(6.8, 0.3, 5), cf * CFrame.new(0, 2.6, -1.4), color, Enum.Material.Fabric)
	P(par, "Headboard", Vector3.new(7.4, 4, 0.6), cf * CFrame.new(0, 2.6, 4.3), Color3.fromRGB(70, 55, 45), Enum.Material.Fabric)
end
function K.dining(par, O, x, y, z)
	local cf = O * CFrame.new(x, y, z)
	P(par, "DiningTable", Vector3.new(7, 0.3, 3.5), cf * CFrame.new(0, 3, 0), Color3.fromRGB(110, 80, 55), Enum.Material.WoodPlanks)
	P(par, "TableLeg", Vector3.new(0.5, 2.8, 2.5), cf * CFrame.new(-2.8, 1.4, 0), FRAME, Enum.Material.Metal)
	P(par, "TableLeg", Vector3.new(0.5, 2.8, 2.5), cf * CFrame.new(2.8, 1.4, 0), FRAME, Enum.Material.Metal)
	for _, sx in ipairs({-2, 0, 2}) do
		for _, sz in ipairs({-1, 1}) do
			local s = Instance.new("Seat"); s.Name = "DiningChair"; s.Anchored = true; s.Size = Vector3.new(1.6, 0.4, 1.6); s.Color = Color3.fromRGB(230, 225, 215); s.Material = Enum.Material.Fabric
			s.CFrame = cf * CFrame.new(sx, 1.8, sz * 2.8) * CFrame.Angles(0, sz > 0 and 0 or math.pi, 0); s.Parent = par
		end
	end
end
function K.plant(par, O, x, y, z)
	P(par, "Pot", Vector3.new(2, 2.2, 2), O * CFrame.new(x, y + 1.1, z), Color3.fromRGB(50, 50, 54), Enum.Material.Concrete)
	P(par, "Leaves", Vector3.new(3.2, 3.6, 3.2), O * CFrame.new(x, y + 3.8, z), Color3.fromRGB(60, 120, 60), Enum.Material.LeafyGrass, false, 0, Enum.PartType.Ball)
end
-- front door pair (MansionDoors gives them locks + swing)
function K.frontDoor(par, O, x, z, y, color)
	for _, side in ipairs({{"Door_FrontL", -1.5}, {"Door_FrontR", 1.5}}) do
		P(par, side[1], Vector3.new(3, 8.4, 0.4), O * CFrame.new(x + side[2], y + 4.2, z), color or Color3.fromRGB(70, 50, 35), Enum.Material.Wood)
	end
end
-- garage that works with GarageServer / MansionDoors (owner-only, auto-opens)
function K.garage(villa, O, x, z, y, color)
	local g = Instance.new("Model"); g.Name = "Garage"; g.Parent = villa
	local W, D, H = 14, 22, 10
	P(g, "Floor", Vector3.new(W, 0.4, D), O * CFrame.new(x, y + 0.2, z + D / 2), Color3.fromRGB(150, 150, 152), Enum.Material.Concrete)
	P(g, "BackWall", Vector3.new(W, H, 0.8), O * CFrame.new(x, y + H / 2, z + D), color, Enum.Material.Plaster)
	P(g, "SideWallL", Vector3.new(0.8, H, D), O * CFrame.new(x - W / 2, y + H / 2, z + D / 2), color, Enum.Material.Plaster)
	P(g, "SideWallR", Vector3.new(0.8, H, D), O * CFrame.new(x + W / 2, y + H / 2, z + D / 2), color, Enum.Material.Plaster)
	P(g, "Roof", Vector3.new(W + 1, 0.8, D + 1), O * CFrame.new(x, y + H + 0.4, z + D / 2), Color3.fromRGB(40, 40, 44), Enum.Material.Concrete)
	P(g, "Header", Vector3.new(W, 1.6, 0.8), O * CFrame.new(x, y + H - 0.8, z), color, Enum.Material.Plaster)
	local door = P(g, "Door_Garage", Vector3.new(W - 1.2, H - 1.6, 0.4), O * CFrame.new(x, y + (H - 1.6) / 2, z), Color3.fromRGB(225, 226, 228), Enum.Material.Metal)
	door:SetAttribute("Roll", true)
	local spot = P(g, "CarSpot", Vector3.new(4, 1, 4), O * CFrame.new(x, y + 1.9, z + D / 2 + 1) * CFrame.Angles(0, math.pi, 0), Color3.new(), nil, false, 1)
	P(g, "Driveway", Vector3.new(W - 2, 0.3, 14), O * CFrame.new(x, y + 0.15, z - 7), Color3.fromRGB(120, 120, 124), Enum.Material.Concrete)
	return g
end
function K.pool(par, O, x1, x2, z1, z2, y)
	P(par, "PoolDeck", Vector3.new(x2 - x1 + 8, 0.5, z2 - z1 + 8), O * CFrame.new((x1 + x2) / 2, y + 0.25, (z1 + z2) / 2), Color3.fromRGB(205, 190, 165), Enum.Material.WoodPlanks)
	P(par, "PoolWater", Vector3.new(x2 - x1, 0.3, z2 - z1), O * CFrame.new((x1 + x2) / 2, y + 0.55, (z1 + z2) / 2), Color3.fromRGB(60, 190, 220), Enum.Material.Glass, false, 0.2)
	for _, k in ipairs({-1, 1}) do
		local lc = O * CFrame.new(x1 - 2.5, y + 0.5, (z1 + z2) / 2 + k * 3)
		P(par, "Lounger", Vector3.new(2.2, 0.6, 6), lc * CFrame.new(0, 0.6, 0), Color3.fromRGB(245, 245, 240), Enum.Material.Fabric)
	end
end
return K
