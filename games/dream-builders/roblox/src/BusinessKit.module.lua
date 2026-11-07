-- Furnishes a Downtown shop unit for a business type. Local frame: origin = floor centre, -Z = street/door.
local K = {}
K.TYPES = {
	["Hair Salon"]     = {price = 25, color = Color3.fromRGB(230, 150, 190), icon = "💇", serve = "Cut hair"},
	["Clothing Brand"] = {price = 30, color = Color3.fromRGB(120, 160, 230), icon = "👗", serve = "Ring up clothes"},
	["Gym"]            = {price = 20, color = Color3.fromRGB(240, 120, 60),  icon = "🏋️", serve = "Sign up member"},
	["Café"]           = {price = 15, color = Color3.fromRGB(170, 120, 80),  icon = "☕", serve = "Serve coffee"},
	["Jewellery"]      = {price = 60, color = Color3.fromRGB(212, 170, 90),  icon = "💎", serve = "Sell jewellery"},
	["Design Studio"]  = {price = 40, color = Color3.fromRGB(120, 210, 190), icon = "📐", serve = "Present a design"},
	["Electronics"]    = {price = 35, color = Color3.fromRGB(90, 120, 255),  icon = "📱", serve = "Sell a phone"},
}
local function mk(par, o)
	return function(name, size, lp, color, mat, tr, rot, shape)
		local p = Instance.new("Part"); p.Name = name; p.Anchored = true; p.Size = size
		p.CFrame = o * CFrame.new(lp) * (rot or CFrame.new()); p.Color = color or Color3.fromRGB(240, 240, 238)
		p.Material = mat or Enum.Material.SmoothPlastic; p.Transparency = tr or 0; p.TopSurface = 0; p.BottomSurface = 0
		if shape then p.Shape = shape end
		p.Parent = par; return p
	end
end
local function seat(par, o, lp, faceLp, color)
	local s = Instance.new("Seat"); s.Anchored = true; s.Size = Vector3.new(1.8, 0.5, 1.8); s.Color = color or Color3.fromRGB(40, 40, 46); s.Material = Enum.Material.Leather
	local a, f = (o * CFrame.new(lp)).Position, (o * CFrame.new(faceLp)).Position
	s.CFrame = CFrame.lookAt(a, Vector3.new(f.X, a.Y, f.Z)); s.Parent = par; return s
end
local WOOD, DARK, WHITE, CHROME = Color3.fromRGB(150, 108, 72), Color3.fromRGB(30, 32, 38), Color3.fromRGB(246, 245, 240), Color3.fromRGB(205, 208, 214)
local function counter(P, accent)
	P("Counter", Vector3.new(12, 3.6, 3), Vector3.new(0, 1.8, 14), WHITE, Enum.Material.Marble)
	P("CounterTop", Vector3.new(12.4, 0.3, 3.4), Vector3.new(0, 3.75, 14), DARK)
	P("CounterStripe", Vector3.new(12.1, 0.3, 0.1), Vector3.new(0, 1.2, 12.45), accent, Enum.Material.Neon)
	P("Register", Vector3.new(1.4, 1, 1.2), Vector3.new(3.5, 4.4, 14), DARK)
	P("BackShelf", Vector3.new(30, 8, 1.2), Vector3.new(0, 4.6, 20.6), WOOD, Enum.Material.Wood)
end
local BUILD = {}
BUILD["Hair Salon"] = function(P, par, o, c)
	for i, x in ipairs({-12, -4, 4, 12}) do
		P("Mirror", Vector3.new(5, 7, 0.2), Vector3.new(x, 5.5, -2.6) , CHROME, Enum.Material.Glass, 0, nil)
		P("MirrorFrame", Vector3.new(5.4, 7.4, 0.15), Vector3.new(x, 5.5, -2.45), c, Enum.Material.Neon)
		P("Station", Vector3.new(5, 3, 1.6), Vector3.new(x, 1.5, -3.4), WHITE, Enum.Material.Marble)
		local s = seat(par, o, Vector3.new(x, 1.6, -7), Vector3.new(x, 1.6, -2), Color3.fromRGB(20, 20, 24)); s.Name = "SalonChair"
		P("ChairBase", Vector3.new(1.2, 1.4, 1.2), Vector3.new(x, 0.7, -7), CHROME, Enum.Material.Metal)
	end
	P("WashSink", Vector3.new(4, 3, 3), Vector3.new(-14, 1.5, 8), DARK); P("WashSink", Vector3.new(4, 3, 3), Vector3.new(-9, 1.5, 8), DARK)
	for _, z in ipairs({-16, -13}) do seat(par, o, Vector3.new(14, 1.6, z), Vector3.new(0, 1.6, z), c) end
	P("Plant", Vector3.new(3, 5, 3), Vector3.new(15, 2.5, -19), Color3.fromRGB(60, 120, 60), Enum.Material.LeafyGrass, 0, nil, Enum.PartType.Ball)
end
BUILD["Clothing Brand"] = function(P, par, o, c)
	local shirts = {Color3.fromRGB(240, 240, 240), Color3.fromRGB(30, 30, 30), c, Color3.fromRGB(200, 60, 60), Color3.fromRGB(80, 120, 90)}
	for r, x in ipairs({-11, 0, 11}) do
		P("Rail", Vector3.new(8, 0.2, 0.2), Vector3.new(x, 6, -4), CHROME, Enum.Material.Metal)
		for _, dx in ipairs({-3.6, 3.6}) do P("RailPost", Vector3.new(0.2, 6, 0.2), Vector3.new(x + dx, 3, -4), CHROME, Enum.Material.Metal) end
		for k = 0, 6 do P("Shirt", Vector3.new(0.3, 2.6, 2), Vector3.new(x - 3 + k, 4.6, -4), shirts[(k + r) % #shirts + 1], Enum.Material.Fabric) end
	end
	for _, x in ipairs({-8, 8}) do
		P("MannequinBody", Vector3.new(1.6, 3, 0.9), Vector3.new(x, 4.2, -15), c, Enum.Material.Fabric)
		P("MannequinLegs", Vector3.new(1.4, 2.6, 0.8), Vector3.new(x, 1.5, -15), DARK, Enum.Material.Fabric)
		P("MannequinHead", Vector3.new(1, 1.1, 1), Vector3.new(x, 6.3, -15), WHITE, Enum.Material.SmoothPlastic, 0, nil, Enum.PartType.Ball)
		P("Plinth", Vector3.new(3, 0.4, 3), Vector3.new(x, 0.2, -15), WHITE, Enum.Material.Marble)
	end
	for k = 0, 2 do P("FittingRoom", Vector3.new(4, 8, 0.2), Vector3.new(-17.5, 4, 2 + k * 4.5), c, Enum.Material.Fabric, 0, CFrame.Angles(0, math.rad(90), 0)) end
	for k = 0, 3 do P("FoldedStack", Vector3.new(2, 1, 1.4), Vector3.new(-9 + k * 6, 6, 20.2), shirts[k + 1], Enum.Material.Fabric) end
end
BUILD["Gym"] = function(P, par, o, c)
	for _, x in ipairs({-12, -6, 0}) do
		P("TreadmillBase", Vector3.new(2.6, 0.8, 6), Vector3.new(x, 0.4, -12), DARK)
		P("TreadmillBelt", Vector3.new(2, 0.1, 5), Vector3.new(x, 0.85, -12.2), Color3.fromRGB(50, 50, 50), Enum.Material.Rubber)
		P("TreadmillRail", Vector3.new(2.6, 3.6, 0.3), Vector3.new(x, 2.2, -15), CHROME, Enum.Material.Metal)
		P("TreadmillScreen", Vector3.new(1.6, 1, 0.1), Vector3.new(x, 4, -15.2), c, Enum.Material.Neon)
	end
	P("Bench", Vector3.new(1.6, 1.8, 5), Vector3.new(10, 0.9, -8), DARK, Enum.Material.Leather)
	P("BarbellRack", Vector3.new(4, 5, 0.4), Vector3.new(10, 2.5, -11), CHROME, Enum.Material.Metal)
	P("Barbell", Vector3.new(7, 0.3, 0.3), Vector3.new(10, 4.5, -10.8), CHROME, Enum.Material.Metal)
	for _, s in ipairs({-1, 1}) do P("Plate", Vector3.new(0.4, 2.2, 2.2), Vector3.new(10 + s * 3.2, 4.5, -10.8), DARK, Enum.Material.Metal, 0, nil, Enum.PartType.Cylinder) end
	P("DumbbellRack", Vector3.new(12, 2.4, 2), Vector3.new(4, 1.2, 4), DARK)
	for k = 0, 5 do P("Dumbbell", Vector3.new(1.6, 0.6, 0.6), Vector3.new(-1 + k * 2, 2.7, 4), c, Enum.Material.Metal) end
	P("Mat", Vector3.new(10, 0.1, 8), Vector3.new(-10, 0.05, 2), c, Enum.Material.Rubber)
	P("MirrorWall", Vector3.new(0.2, 9, 22), Vector3.new(18, 5, -6), CHROME, Enum.Material.Glass)
end
BUILD["Café"] = function(P, par, o, c)
	P("CoffeeMachine", Vector3.new(3, 2.4, 2), Vector3.new(-3, 5.1, 14), CHROME, Enum.Material.Metal)
	P("PastryCase", Vector3.new(5, 1.8, 2.4), Vector3.new(3, 4.8, 13), Color3.fromRGB(200, 230, 240), Enum.Material.Glass, 0.4)
	for k = -2, 2 do P("Pastry", Vector3.new(0.8, 0.5, 0.8), Vector3.new(3 + k, 4.4, 13), Color3.fromRGB(220, 170, 100)) end
	for _, x in ipairs({-11, 0, 11}) do for _, z in ipairs({-14, -4}) do
		P("Table", Vector3.new(3, 0.3, 3), Vector3.new(x, 3.1, z), WHITE, Enum.Material.Marble)
		P("TableLeg", Vector3.new(0.4, 2.5, 0.4), Vector3.new(x, 1.85, z), DARK, Enum.Material.Metal)
		for _, s in ipairs({-1, 1}) do seat(par, o, Vector3.new(x + s * 2.4, 2.2, z), Vector3.new(x, 2.2, z), c) end
	end end
end
BUILD["Jewellery"] = function(P, par, o, c)
	for _, x in ipairs({-11, 0, 11}) do
		P("DisplayBase", Vector3.new(7, 3.4, 3), Vector3.new(x, 1.7, -6), WHITE, Enum.Material.Marble)
		P("DisplayGlass", Vector3.new(7, 1.6, 3), Vector3.new(x, 4.2, -6), Color3.fromRGB(210, 230, 240), Enum.Material.Glass, 0.6)
		for k = -2, 2 do P("Gem", Vector3.new(0.5, 0.5, 0.5), Vector3.new(x + k * 1.2, 3.65, -6), (k % 2 == 0) and Color3.fromRGB(120, 200, 255) or Color3.fromRGB(255, 80, 120), Enum.Material.Neon, 0, nil, Enum.PartType.Ball) end
		P("GoldRing", Vector3.new(0.2, 0.7, 0.7), Vector3.new(x, 3.7, -5.2), c, Enum.Material.Foil, 0, nil, Enum.PartType.Cylinder)
	end
	local ch = P("Chandelier", Vector3.new(4, 2, 4), Vector3.new(0, 12, -4), c, Enum.Material.Metal)
	local l = Instance.new("PointLight"); l.Range = 20; l.Color = Color3.fromRGB(255, 230, 180); l.Parent = ch
	P("VelvetRug", Vector3.new(12, 0.05, 16), Vector3.new(0, 0.03, -12), Color3.fromRGB(110, 20, 40), Enum.Material.Fabric)
end
BUILD["Design Studio"] = function(P, par, o, c)
	for _, x in ipairs({-10, 0, 10}) do
		P("Desk", Vector3.new(6, 0.3, 3), Vector3.new(x, 3, -6), WHITE)
		P("DeskLeg", Vector3.new(5.6, 2.8, 0.3), Vector3.new(x, 1.5, -6), DARK, Enum.Material.Metal)
		P("Monitor", Vector3.new(3.4, 2.2, 0.15), Vector3.new(x, 4.6, -5), DARK)
		P("Screen", Vector3.new(3.1, 1.9, 0.05), Vector3.new(x, 4.6, -5.1), c, Enum.Material.Neon, 0.2)
		seat(par, o, Vector3.new(x, 1.6, -8.5), Vector3.new(x, 1.6, -5), DARK)
	end
	P("DraftingTable", Vector3.new(6, 0.3, 4), Vector3.new(-12, 3.8, 6), WOOD, Enum.Material.Wood, 0, CFrame.Angles(math.rad(-20), 0, 0))
	for k = 0, 3 do P("SampleBoard", Vector3.new(3, 4, 0.1), Vector3.new(-9 + k * 4, 6, 20.1), ({c, WOOD, DARK, Color3.fromRGB(200, 190, 170)})[k + 1], Enum.Material.SmoothPlastic) end
	P("Sofa", Vector3.new(8, 1.8, 3), Vector3.new(12, 0.9, -16), DARK, Enum.Material.Fabric)
end
BUILD["Electronics"] = function(P, par, o, c)
	for _, x in ipairs({-10, 0, 10}) do
		P("DemoTable", Vector3.new(7, 3.2, 4), Vector3.new(x, 1.6, -7), WHITE, Enum.Material.Wood)
		for k = -1, 1 do
			P("Phone", Vector3.new(0.8, 0.08, 1.6), Vector3.new(x + k * 2, 3.25, -7.5), DARK)
			P("PhoneScreen", Vector3.new(0.7, 0.02, 1.45), Vector3.new(x + k * 2, 3.3, -7.5), c, Enum.Material.Neon)
		end
		P("Laptop", Vector3.new(2.4, 0.1, 1.6), Vector3.new(x, 3.25, -5.8), CHROME, Enum.Material.Metal)
		P("LaptopScreen", Vector3.new(2.4, 1.6, 0.08), Vector3.new(x, 4, -5), DARK, Enum.Material.SmoothPlastic, 0, CFrame.Angles(math.rad(-10), 0, 0))
	end
	P("WallScreen", Vector3.new(14, 6, 0.2), Vector3.new(0, 9, 20.1), c, Enum.Material.Neon, 0.3)
end
function K.clear(unit)
	local i = unit:FindFirstChild("Interior"); if i then i:Destroy() end
end
function K.furnish(unit, kind, ownerName, brand)
	K.clear(unit)
	local t = K.TYPES[kind]; if not t then return end
	local o = unit.Origin.CFrame
	local par = Instance.new("Model"); par.Name = "Interior"
	local P = mk(par, o)
	counter(P, t.color)
	BUILD[kind](P, par, o, t.color)
	-- wall logo
	local logo = P("Logo", Vector3.new(16, 3, 0.2), Vector3.new(0, 11, 19.9), Color3.fromRGB(20, 22, 28))
	local g = Instance.new("SurfaceGui"); g.Face = Enum.NormalId.Front; g.PixelsPerStud = 25; g.Parent = logo
	local l = Instance.new("TextLabel"); l.Size = UDim2.fromScale(1, 1); l.BackgroundTransparency = 1; l.TextScaled = true; l.Font = Enum.Font.GothamBlack; l.TextColor3 = t.color; l.Text = brand; l.Parent = g
	-- customer spot in front of the counter
	local spot = P("CustomerSpot", Vector3.new(1, 1, 1), Vector3.new(0, 0.5, 10.5), nil, nil, 1); spot.CanCollide = false
	par.Parent = unit
end
return K
