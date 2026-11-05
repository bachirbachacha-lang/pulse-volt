-- Dream Builders: step 4, city map + teleports (press M). Run in the Studio command bar (edit mode, not while playing).
local SSS = game:GetService("ServerScriptService")
local SPS = game:GetService("StarterPlayer"):WaitForChild("StarterPlayerScripts")
local o = SSS:FindFirstChild("TeleportServer"); if o then o:Destroy() end
o = SPS:FindFirstChild("CityMap"); if o then o:Destroy() end
local s = Instance.new("Script"); s.Name = "TeleportServer"; s.Source = [==[-- Dream Builders: map data + teleports (ServerScriptService/TeleportServer).
-- Publishes every plot (position, size, price, live stage) to ReplicatedStorage.MapData so the map works even when
-- far-away parts aren't streamed to the client. The client asks for a place by key; the server decides where that is.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local ev = RS:FindFirstChild("MapTeleport") or Instance.new("RemoteEvent"); ev.Name = "MapTeleport"; ev.Parent = RS
local root = workspace:WaitForChild("DreamBuilders")
local data = RS:FindFirstChild("MapData"); if data then data:Destroy() end
data = Instance.new("Folder"); data.Name = "MapData"; data.Parent = RS
local function find(path) local o = root; for _, n in ipairs(path) do o = o and o:FindFirstChild(n) end; return o end
local places = {}
local function addPlace(key, label, pos)
	if not pos then return end
	places[key] = pos
	local c = Instance.new("Configuration"); c.Name = key; c:SetAttribute("Kind", "Place"); c:SetAttribute("Label", label); c:SetAttribute("Pos", pos); c.Parent = data
end
local hqSpawn = root:FindFirstChild("HQ") and root.HQ:FindFirstChildOfClass("SpawnLocation")
addPlace("HQ", "Dream Builders HQ", hqSpawn and hqSpawn.Position + Vector3.new(0, 4, 0))
local yf = find({"Yard", "YardFloor"}); addPlace("Yard", "Supply Yard", yf and yf.Position + Vector3.new(0, 4, 40))
local bch = find({"Lake", "Beach"}); addPlace("Beach", "Beach & Pier", bch and bch.Position + Vector3.new(0, 4, 0))
local pth = find({"Park", "Path"}); addPlace("Park", "Park", pth and pth.Position + Vector3.new(0, 4, 0))
local STAGES = {"Blueprint", "Foundation", "Ground floor", "Second floor", "Roof", "Pool & garden"}
for _, plot in ipairs(root:WaitForChild("Plots"):GetChildren()) do
	local pad = plot.PrimaryPart or plot:FindFirstChild("Pad")
	if pad then
		local id = plot:GetAttribute("PlotId") or 0
		local c = Instance.new("Configuration"); c.Name = "Plot" .. id
		c:SetAttribute("Kind", "Plot"); c:SetAttribute("Id", id); c:SetAttribute("Pos", pad.Position); c:SetAttribute("Size", pad.Size.X)
		c:SetAttribute("Price", plot:GetAttribute("Price") or 25000); c:SetAttribute("Premium", plot:GetAttribute("Premium") or false)
		local function sync()
			local st = plot:GetAttribute("Stage") or 0
			c:SetAttribute("Stage", st); c:SetAttribute("Bricks", plot:GetAttribute("Bricks") or 0)
			c:SetAttribute("Status", st == 0 and "For sale" or st >= #STAGES and "Sold – Dream home" or ("Building: " .. STAGES[st]))
		end
		sync(); plot:GetAttributeChangedSignal("Stage"):Connect(sync); plot:GetAttributeChangedSignal("Bricks"):Connect(sync)
		c.Parent = data
		local dir = pad.Position.X > 0 and -1 or 1
		places["Plot" .. id] = pad.Position + Vector3.new(dir * (pad.Size.X / 2 + 10), 4, 0)
		if plot:GetAttribute("Premium") then places["Plot" .. id] = pad.Position + Vector3.new(-(pad.Size.X / 2 + 10), 4, 0) end
	end
end
local last = {}
ev.OnServerEvent:Connect(function(plr, key)
	if type(key) ~= "string" then return end
	local now = os.clock(); if last[plr] and now - last[plr] < 3 then return end
	local pos = places[key]; local char = plr.Character
	if pos and char and char.PrimaryPart then last[plr] = now; char:PivotTo(CFrame.new(pos)) end
end)
Players.PlayerRemoving:Connect(function(p) last[p] = nil end)
]==]; s.Parent = SSS
local c = Instance.new("LocalScript"); c.Name = "CityMap"; c.Source = [==[-- Dream Builders: luxury city map v2 (StarterPlayerScripts/CityMap)
-- M = full map (zoom with wheel or +/-, drag to pan), always-on minimap, live plot cards, players, Teleport and GPS.
local Players = game:GetService("Players")
local UIS = game:GetService("UserInputService")
local RS = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local plr = Players.LocalPlayer
local ev = RS:WaitForChild("MapTeleport")
local data = RS:WaitForChild("MapData")

-- world window shown on the map (studs): north (+Z) is up, east (+X) is right
local XMIN, XMAX, ZMIN, ZMAX = -620, 780, -530, 530
local WX, WZ = XMAX - XMIN, ZMAX - ZMIN
local function fpos(x, z) return UDim2.fromScale((x - XMIN) / WX, (ZMAX - z) / WZ) end
local function fsize(sx, sz) return UDim2.fromScale(sx / WX, sz / WZ) end
local C = {
	ink = Color3.fromRGB(16, 17, 22), panel = Color3.fromRGB(22, 23, 30), gold = Color3.fromRGB(226, 176, 70), goldL = Color3.fromRGB(255, 214, 120),
	sand = Color3.fromRGB(214, 190, 150), lawn = Color3.fromRGB(104, 156, 72), road = Color3.fromRGB(44, 44, 50), line = Color3.fromRGB(245, 215, 120),
	sea = Color3.fromRGB(36, 170, 190), seaD = Color3.fromRGB(20, 120, 150), beach = Color3.fromRGB(240, 226, 190), white = Color3.fromRGB(250, 248, 242),
	stone = Color3.fromRGB(232, 224, 206), yard = Color3.fromRGB(150, 140, 124), text = Color3.fromRGB(240, 238, 232), dim = Color3.fromRGB(170, 168, 160),
	sale = Color3.fromRGB(255, 205, 70), build = Color3.fromRGB(255, 140, 40), sold = Color3.fromRGB(70, 210, 130), prem = Color3.fromRGB(40, 200, 200),
}
local function new(class, props, parent)
	local o = Instance.new(class)
	for k, v in pairs(props) do o[k] = v end
	if parent then o.Parent = parent end
	return o
end
local function corner(o, r) new("UICorner", {CornerRadius = UDim.new(0, r)}, o); return o end
local function stroke(o, col, t) new("UIStroke", {Color = col, Thickness = t or 1, ApplyStrokeMode = Enum.ApplyStrokeMode.Border}, o); return o end
local function rect(parent, x, z, sx, sz, col, r, z_)
	local f = new("Frame", {AnchorPoint = Vector2.new(0.5, 0.5), Position = fpos(x, z), Size = fsize(sx, sz), BackgroundColor3 = col, BorderSizePixel = 0, ZIndex = z_ or 2}, parent)
	if r then corner(f, r) end
	return f
end
local function label(parent, text, size, col, font)
	return new("TextLabel", {BackgroundTransparency = 1, Text = text, TextSize = size, TextColor3 = col or C.text, Font = font or Enum.Font.GothamBold, TextWrapped = true}, parent)
end

-- ---------------------------------------------------------------- the drawn city (shared by the minimap and the big map)
local function drawCity(content, detail)
	new("Frame", {Size = UDim2.fromScale(1, 1), BackgroundColor3 = C.sand, BorderSizePixel = 0, ZIndex = 1}, content)
	rect(content, 815, 0, 670, 1100, C.sea, nil, 2)
	if detail then for i = 1, 5 do rect(content, 700 + i * 60, 0, 2, 1100, C.seaD, nil, 2).BackgroundTransparency = 0.6 end end
	rect(content, 442, 0, 70, 1060, C.beach, nil, 2)
	for _, s in ipairs({-1, 1}) do for _, zc in ipairs({-200, 0, 200}) do rect(content, s * 136, zc, 212, 170, C.lawn, 3, 2) end end
	rect(content, -340, 0, 150, 120, C.lawn, 3, 2); rect(content, -520, 0, 140, 560, C.lawn, 6, 2)
	rect(content, -520, 0, 8, 520, C.stone, nil, 3)
	-- roads
	rect(content, 0, 0, 44, 660, C.road, nil, 3); rect(content, 0, 0, 6, 660, C.lawn, nil, 4)
	for _, zz in ipairs({-470, -300, -100, 100, 300, 470}) do rect(content, 0, zz, 1000, 28, C.road, nil, 3) end
	for _, xx in ipairs({-260, 260}) do rect(content, xx, 0, 28, 1000, C.road, nil, 3) end
	if detail then
		for z = -320, 320, 24 do for _, x in ipairs({-13, 13}) do rect(content, x, z, 1.6, 9, C.line, nil, 5) end end
		for z = -310, 310, 22 do new("Frame", {AnchorPoint = Vector2.new(0.5, 0.5), Position = fpos(0, z), Size = UDim2.fromOffset(4, 4), BackgroundColor3 = Color3.fromRGB(60, 130, 55), BorderSizePixel = 0, ZIndex = 5}, content) end
	end
	-- pier + yachts
	rect(content, 560, 0, 230, 16, Color3.fromRGB(150, 104, 64), nil, 4); rect(content, 700, 0, 90, 40, Color3.fromRGB(150, 104, 64), 2, 4)
	for _, y in ipairs({{640, 40}, {660, -44}}) do rect(content, y[1], y[2], 46, 14, C.white, 6, 5) end
	-- show villas
	for _, z in ipairs({-230, -150, -70, 10, 90, 170, 250}) do
		rect(content, -345, z, 44, 30, C.white, 2, 4)
		if detail then rect(content, -345 + 25, z, 10, 26, C.sea, 2, 5) end
	end
	-- HQ campus
	rect(content, 0, 400, 320, 130, C.stone, 4, 3)
	local fountain = rect(content, 0, 368, 68, 68, C.sea, nil, 4); corner(fountain, 999)
	rect(content, 0, 434, 92, 52, C.gold, 3, 5); for _, s in ipairs({-1, 1}) do rect(content, s * 76, 440, 44, 40, C.white, 3, 5) end
	for _, j in ipairs({{-60, Color3.fromRGB(255, 150, 30)}, {60, Color3.fromRGB(80, 170, 255)}}) do rect(content, j[1], 380, 20, 20, j[2], 3, 6) end
	-- supply yard + crane
	rect(content, 0, -400, 360, 120, C.yard, 4, 3)
	if detail then rect(content, 66, -420, 120, 4, C.gold, nil, 6); rect(content, 110, -420, 8, 8, C.gold, 2, 6) end
end

-- ---------------------------------------------------------------- GUI shell
local gui = new("ScreenGui", {Name = "CityMap", ResetOnSpawn = false, IgnoreGuiInset = false, ZIndexBehavior = Enum.ZIndexBehavior.Sibling}, plr:WaitForChild("PlayerGui"))
-- minimap (bottom-right, above the MAP button)
local mini = new("Frame", {AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -16, 1, -66), Size = UDim2.fromOffset(230, 174), BackgroundColor3 = C.ink, ClipsDescendants = true}, gui)
corner(mini, 12); stroke(mini, C.gold, 2)
local miniContent = new("Frame", {Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1}, mini)
drawCity(miniContent, false)
local miniBtn = new("TextButton", {Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Text = "", ZIndex = 50}, mini)
local mapBtn = new("TextButton", {AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -16, 1, -16), Size = UDim2.fromOffset(230, 42), BackgroundColor3 = C.gold,
	Text = "🗺  CITY MAP  (M)", Font = Enum.Font.GothamBlack, TextSize = 17, TextColor3 = C.ink}, gui)
corner(mapBtn, 10)
-- full map
local panel = new("Frame", {Visible = false, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.new(0.86, 0, 0.84, 0), BackgroundColor3 = C.panel, ZIndex = 20}, gui)
corner(panel, 18); stroke(panel, C.gold, 2)
new("UISizeConstraint", {MaxSize = Vector2.new(1240, 820), MinSize = Vector2.new(760, 520)}, panel)
local head = label(panel, "DREAM CITY", 26, C.goldL, Enum.Font.GothamBlack)
head.Size = UDim2.new(1, -40, 0, 36); head.Position = UDim2.fromOffset(20, 10); head.TextXAlignment = Enum.TextXAlignment.Left; head.ZIndex = 21
local sub = label(panel, "Scroll to zoom · drag to move · click a plot", 14, C.dim); sub.Size = UDim2.new(1, -40, 0, 18); sub.Position = UDim2.fromOffset(22, 44)
sub.TextXAlignment = Enum.TextXAlignment.Left; sub.ZIndex = 21
local close = new("TextButton", {AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -14, 0, 12), Size = UDim2.fromOffset(36, 36), BackgroundColor3 = C.ink,
	Text = "✕", TextColor3 = C.text, Font = Enum.Font.GothamBlack, TextSize = 18, ZIndex = 22}, panel); corner(close, 10)
local view = new("Frame", {Position = UDim2.fromOffset(20, 70), Size = UDim2.new(1, -330, 1, -90), BackgroundColor3 = C.ink, ClipsDescendants = true, ZIndex = 21}, panel)
corner(view, 12)
local content = new("Frame", {AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), BackgroundTransparency = 1, ZIndex = 21}, view)
new("UIAspectRatioConstraint", {AspectRatio = WX / WZ}, content)
drawCity(content, true)
-- side info panel
local side = new("Frame", {AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -20, 0, 70), Size = UDim2.new(0, 290, 1, -90), BackgroundColor3 = C.ink, ZIndex = 21}, panel)
corner(side, 12); stroke(side, Color3.fromRGB(60, 58, 52), 1)
new("UIPadding", {PaddingLeft = UDim.new(0, 16), PaddingRight = UDim.new(0, 16), PaddingTop = UDim.new(0, 14)}, side)
new("UIListLayout", {Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder}, side)
local function sideLabel(order, size, col, font)
	local l = label(side, "", size, col, font); l.Size = UDim2.new(1, 0, 0, size + 8); l.TextXAlignment = Enum.TextXAlignment.Left; l.LayoutOrder = order; l.ZIndex = 22; return l
end
local sTitle = sideLabel(1, 24, C.goldL, Enum.Font.GothamBlack)
local sPrice = sideLabel(2, 18, C.text)
local sStatus = sideLabel(3, 16, C.text)
local sInfo = sideLabel(4, 14, C.dim, Enum.Font.Gotham); sInfo.Size = UDim2.new(1, 0, 0, 48)
local function bigBtn(order, text, col)
	local b = new("TextButton", {Size = UDim2.new(1, 0, 0, 38), BackgroundColor3 = col, Text = text, Font = Enum.Font.GothamBlack, TextSize = 17, TextColor3 = C.ink, LayoutOrder = order, ZIndex = 22}, side)
	corner(b, 10); return b
end
local tpBtn = bigBtn(5, "⚡  TELEPORT", C.gold)
local gpsBtn = bigBtn(6, "📍  SET GPS", C.white)
local clearBtn = bigBtn(7, "CLEAR GPS", Color3.fromRGB(90, 90, 96)); clearBtn.TextColor3 = C.text
local legend = sideLabel(9, 12, C.dim, Enum.Font.Gotham); legend.Size = UDim2.new(1, 0, 0, 78)
legend.Text = "🟨 For sale      🟧 Being built\n🟩 Sold            🟦 Premium waterfront\n▲ You      ● Other players\n\nPlaces: HQ · Supply Yard · Beach & Pier · Park"
-- quick places
local quick = new("Frame", {Size = UDim2.new(1, 0, 0, 74), BackgroundTransparency = 1, LayoutOrder = 8, ZIndex = 22}, side)
new("UIGridLayout", {CellSize = UDim2.new(0.5, -4, 0, 33), CellPadding = UDim2.fromOffset(8, 8)}, quick)
local selected
local function select(key, title, price, status, info)
	selected = key; sTitle.Text = title; sPrice.Text = price or ""; sStatus.Text = status or ""; sInfo.Text = info or ""
	tpBtn.Visible = true; gpsBtn.Visible = true
end
sTitle.Text = "Pick a place"; sInfo.Text = "Click a plot or a place on the map, or use the buttons below."; tpBtn.Visible = false; gpsBtn.Visible = false
for _, p in ipairs({{"HQ", "🏢 HQ"}, {"Yard", "🏗 Yard"}, {"Beach", "🏖 Beach"}, {"Park", "🌴 Park"}}) do
	local b = new("TextButton", {BackgroundColor3 = Color3.fromRGB(44, 44, 52), Text = p[2], Font = Enum.Font.GothamBold, TextSize = 15, TextColor3 = C.text, ZIndex = 23}, quick); corner(b, 8)
	b.MouseButton1Click:Connect(function()
		local c = data:FindFirstChild(p[1]); select(p[1], c and c:GetAttribute("Label") or p[1], "", "", "Teleport there or set GPS.")
	end)
end

-- ---------------------------------------------------------------- plot cards (big map + minimap) from MapData (works with streaming)
local cards = {}
local function statusColor(c)
	local st = c:GetAttribute("Stage") or 0
	if st >= 6 then return C.sold elseif st > 0 then return C.build end
	return c:GetAttribute("Premium") and C.prem or C.sale
end
local function plotCard(c)
	local pos, size, id = c:GetAttribute("Pos"), c:GetAttribute("Size"), c:GetAttribute("Id")
	local b = new("TextButton", {AnchorPoint = Vector2.new(0.5, 0.5), Position = fpos(pos.X, pos.Z), Size = fsize(size, size), BackgroundColor3 = statusColor(c), AutoButtonColor = true,
		Text = "", ZIndex = 8}, content); corner(b, 6); stroke(b, C.white, 1.5)
	local n = label(b, tostring(id), 20, C.ink, Enum.Font.GothamBlack); n.Size = UDim2.fromScale(1, 0.5); n.Position = UDim2.fromScale(0, 0.12); n.TextScaled = true; n.ZIndex = 9
	local pr = label(b, "$" .. math.floor((c:GetAttribute("Price") or 0) / 1000) .. "k", 12, C.ink, Enum.Font.GothamBold); pr.Size = UDim2.fromScale(1, 0.26); pr.Position = UDim2.fromScale(0, 0.62); pr.TextScaled = true; pr.ZIndex = 9
	local m = new("Frame", {AnchorPoint = Vector2.new(0.5, 0.5), Position = fpos(pos.X, pos.Z), Size = fsize(size, size), BackgroundColor3 = statusColor(c), BorderSizePixel = 0, ZIndex = 8}, miniContent); corner(m, 2)
	local function info()
		local st = c:GetAttribute("Stage") or 0
		local prem = c:GetAttribute("Premium") and "Premium waterfront plot" or "City plot"
		local need = ({0, 4, 5, 5, 4, 3})[st + 1]
		local extra = st == 0 and "Needs an Architect's blueprint." or st >= 6 and "Finished mansion – the client paid the crew." or ("Bricks this stage: " .. (c:GetAttribute("Bricks") or 0) .. "/" .. (need or "?"))
		select(c.Name, "PLOT " .. id, "$" .. string.format("%d", c:GetAttribute("Price") or 0):reverse():gsub("(%d%d%d)", "%1,"):reverse():gsub("^,", ""), c:GetAttribute("Status"), prem .. "\n" .. extra)
	end
	b.MouseEnter:Connect(function() if not selected or selected == c.Name or selected:sub(1, 4) ~= "Plot" then info() end end)
	b.MouseButton1Click:Connect(info)
	local function refresh() b.BackgroundColor3 = statusColor(c); m.BackgroundColor3 = statusColor(c); if selected == c.Name then info() end end
	c:GetAttributeChangedSignal("Stage"):Connect(refresh); c:GetAttributeChangedSignal("Bricks"):Connect(refresh)
	cards[c] = b
end
for _, c in ipairs(data:GetChildren()) do if c:GetAttribute("Kind") == "Plot" then plotCard(c) end end
data.ChildAdded:Connect(function(c) task.wait(); if c:GetAttribute("Kind") == "Plot" and not cards[c] then plotCard(c) end end)
for _, c in ipairs(data:GetChildren()) do
	if c:GetAttribute("Kind") == "Place" then
		local p = c:GetAttribute("Pos")
		local pin = new("TextButton", {AnchorPoint = Vector2.new(0.5, 1), Position = fpos(p.X, p.Z), Size = UDim2.fromOffset(110, 26), BackgroundColor3 = C.ink, Text = c:GetAttribute("Label"),
			Font = Enum.Font.GothamBold, TextSize = 13, TextColor3 = C.goldL, ZIndex = 12}, content); corner(pin, 8); stroke(pin, C.gold, 1)
		pin.MouseButton1Click:Connect(function() select(c.Name, c:GetAttribute("Label"), "", "", "Teleport there or set GPS.") end)
	end
end

-- ---------------------------------------------------------------- players: your arrow + other players
local function arrow(parent, z)
	local a = new("TextLabel", {AnchorPoint = Vector2.new(0.5, 0.5), Size = UDim2.fromOffset(22, 22), BackgroundTransparency = 1, Text = "▲", TextColor3 = Color3.new(1, 1, 1),
		TextStrokeTransparency = 0.2, Font = Enum.Font.GothamBlack, TextSize = 22, ZIndex = z}, parent); return a
end
local meBig, meMini = arrow(content, 30), arrow(miniContent, 30); meMini.TextSize = 16
local dots = {}
local function dotFor(p)
	if dots[p] then return dots[p] end
	local d = new("Frame", {AnchorPoint = Vector2.new(0.5, 0.5), Size = UDim2.fromOffset(12, 12), BackgroundColor3 = Color3.fromRGB(120, 200, 255), ZIndex = 28}, content); corner(d, 99)
	local n = label(d, p.DisplayName, 12, C.text); n.Size = UDim2.fromOffset(120, 16); n.Position = UDim2.fromOffset(-54, -18); n.ZIndex = 28
	dots[p] = d; return d
end
Players.PlayerRemoving:Connect(function(p) if dots[p] then dots[p]:Destroy(); dots[p] = nil end end)

-- ---------------------------------------------------------------- GPS: glowing beam from you to the target + distance
local gpsTarget, beam, a0, a1
local gpsLabel = new("TextLabel", {AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 80), Size = UDim2.fromOffset(360, 36), BackgroundColor3 = C.ink,
	BackgroundTransparency = 0.15, Text = "", Font = Enum.Font.GothamBlack, TextSize = 17, TextColor3 = C.goldL, Visible = false}, gui); corner(gpsLabel, 10)
local function targetPos(key)
	local c = data:FindFirstChild(key); return c and c:GetAttribute("Pos")
end
local function clearGPS()
	gpsTarget = nil; gpsLabel.Visible = false
	if beam then beam:Destroy(); beam = nil end
	if a1 then a1:Destroy(); a1 = nil end
end
local function setGPS(key)
	clearGPS(); local p = targetPos(key); if not p then return end
	gpsTarget = {key = key, pos = p}
	a1 = new("Attachment", {WorldPosition = p + Vector3.new(0, 3, 0), Name = "GPSTarget"}, workspace.Terrain)
	gpsLabel.Visible = true
end
local function ensureBeam()
	local char = plr.Character; local hrp = char and char:FindFirstChild("HumanoidRootPart"); if not (hrp and a1) then return end
	if not a0 or a0.Parent ~= hrp then a0 = new("Attachment", {Name = "GPSFrom", Position = Vector3.new(0, -2, 0)}, hrp); if beam then beam.Attachment0 = a0 end end
	if not beam then
		beam = new("Beam", {Attachment0 = a0, Attachment1 = a1, Width0 = 2.5, Width1 = 2.5, FaceCamera = true, LightEmission = 1, Segments = 20,
			Color = ColorSequence.new(C.goldL, C.gold), Transparency = NumberSequence.new(0.15), CurveSize0 = 0, CurveSize1 = 0}, workspace.Terrain)
	end
end
tpBtn.MouseButton1Click:Connect(function() if selected then ev:FireServer(selected); panel.Visible = false; clearGPS() end end)
gpsBtn.MouseButton1Click:Connect(function() if selected then setGPS(selected); panel.Visible = false end end)
clearBtn.MouseButton1Click:Connect(clearGPS)

-- ---------------------------------------------------------------- zoom + pan
local zoom = 1
local function applyZoom()
	zoom = math.clamp(zoom, 1, 4)
	content.Size = UDim2.fromScale(zoom, zoom)
	if zoom == 1 then content.Position = UDim2.fromScale(0.5, 0.5) end
end
applyZoom()
local zoomBox = new("Frame", {AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -10, 1, -10), Size = UDim2.fromOffset(44, 96), BackgroundTransparency = 1, ZIndex = 40}, view)
for i, t in ipairs({"+", "−"}) do
	local b = new("TextButton", {Position = UDim2.fromOffset(0, (i - 1) * 50), Size = UDim2.fromOffset(44, 44), BackgroundColor3 = C.ink, Text = t, TextColor3 = C.goldL, Font = Enum.Font.GothamBlack, TextSize = 24, ZIndex = 41}, zoomBox)
	corner(b, 10); stroke(b, C.gold, 1)
	b.MouseButton1Click:Connect(function() zoom = zoom * (t == "+" and 1.4 or 1 / 1.4); applyZoom() end)
end
view.InputChanged:Connect(function(i) if i.UserInputType == Enum.UserInputType.MouseWheel then zoom = zoom * (i.Position.Z > 0 and 1.15 or 1 / 1.15); applyZoom() end end)
local dragging, dragStart, startPos
view.InputBegan:Connect(function(i) if i.UserInputType == Enum.UserInputType.MouseButton1 and zoom > 1 then dragging = true; dragStart = i.Position; startPos = content.Position end end)
UIS.InputEnded:Connect(function(i) if i.UserInputType == Enum.UserInputType.MouseButton1 then dragging = false end end)
UIS.InputChanged:Connect(function(i)
	if dragging and i.UserInputType == Enum.UserInputType.MouseMovement then
		local d = i.Position - dragStart
		content.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + d.X, startPos.Y.Scale, startPos.Y.Offset + d.Y)
	end
end)

-- ---------------------------------------------------------------- open / close
local function toggle(on)
	if on == nil then on = not panel.Visible end
	panel.Visible = on
	if on then panel.Size = UDim2.new(0.8, 0, 0.78, 0); TweenService:Create(panel, TweenInfo.new(0.18, Enum.EasingStyle.Quad), {Size = UDim2.new(0.86, 0, 0.84, 0)}):Play() end
end
mapBtn.MouseButton1Click:Connect(function() toggle() end); miniBtn.MouseButton1Click:Connect(function() toggle(true) end); close.MouseButton1Click:Connect(function() toggle(false) end)
UIS.InputBegan:Connect(function(i, gp) if not gp and i.KeyCode == Enum.KeyCode.M then toggle() end end)

-- ---------------------------------------------------------------- live updates
RunService.RenderStepped:Connect(function()
	local char = plr.Character; local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if hrp then
		local p = hrp.Position; local look = workspace.CurrentCamera.CFrame.LookVector
		local rotDeg = math.deg(math.atan2(look.X, look.Z))
		meMini.Position = fpos(p.X, p.Z); meMini.Rotation = rotDeg
		if panel.Visible then meBig.Position = fpos(p.X, p.Z); meBig.Rotation = rotDeg end
		if gpsTarget then
			ensureBeam()
			local dist = (Vector3.new(gpsTarget.pos.X, p.Y, gpsTarget.pos.Z) - p).Magnitude
			gpsLabel.Text = "📍 GPS: " .. gpsTarget.key:gsub("Plot", "Plot ") .. "  –  " .. math.floor(dist) .. " studs"
			if dist < 18 and not gpsTarget.arrived then gpsTarget.arrived = true; gpsLabel.Text = "✅ You arrived!"; task.delay(1.5, clearGPS)
			elseif gpsTarget.arrived then gpsLabel.Text = "✅ You arrived!" end
		end
	end
	if panel.Visible then
		for _, p in ipairs(Players:GetPlayers()) do
			if p ~= plr then
				local c = p.Character; local h = c and c:FindFirstChild("HumanoidRootPart")
				local d = dotFor(p); d.Visible = h ~= nil; if h then d.Position = fpos(h.Position.X, h.Position.Z) end
			end
		end
	end
end)
]==]; c.Parent = SPS
print("Dream Builders city map installed: press Play, then M")
