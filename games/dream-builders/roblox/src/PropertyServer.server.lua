-- Property v1: buy a villa from the phone, it's yours (sign, doors only open for you + people you invite later),
-- "My Home" in Maps, saved between sessions (DataStore "DreamProperty_v1"). Server checks price and ownership.
local Players, DSS = game:GetService("Players"), game:GetService("DataStoreService")
local homes = workspace:WaitForChild("DreamBuilders"):WaitForChild("Homes")
local okStore, store = pcall(function() return DSS:GetDataStore("DreamProperty_v1") end)
if not okStore then store = nil end
local PRICE = {["Palm Hills"] = 25000, ["Show Villas"] = 35000, ["Palm Island"] = 60000}
local owned = {} -- [userId] = villa model
local function area(h) return h.Name:find("Island") and "Palm Island" or (h.Name:find("ShowVillas") and "Show Villas" or "Palm Hills") end
local function price(h) return PRICE[area(h)] end
local function money(p) local ls = p:FindFirstChild("leaderstats"); return ls and ls:FindFirstChild("Money") end
local function toast(p, msg)
	local g = p:FindFirstChild("PlayerGui") and p.PlayerGui:FindFirstChild("DreamHUD"); if not g or not g:FindFirstChild("Toast") then return end
	g.Toast.Text = msg; g.Toast.Visible = true; task.delay(3, function() if g.Toast.Text == msg then g.Toast.Visible = false end end)
end
local function sign(h, text)
	local s = h:FindFirstChild("OwnerSign")
	if not s then
		local cf, size = h:GetBoundingBox()
		local front = h:FindFirstChild("Door_FrontL", true)
		local dir = front and (front.Position - cf.Position) * Vector3.new(1, 0, 1) or Vector3.new(0, 0, -1)
		dir = dir.Magnitude > 0 and dir.Unit or Vector3.new(0, 0, -1)
		local base = cf.Position + dir * (math.max(size.X, size.Z) / 2 + 4)
		local rp = RaycastParams.new(); rp.FilterType = Enum.RaycastFilterType.Exclude; rp.FilterDescendantsInstances = {h}; rp.RespectCanCollide = true
		local hit = workspace:Raycast(base + Vector3.new(0, 80, 0), Vector3.new(0, -200, 0), rp)
		base = Vector3.new(base.X, hit and hit.Position.Y or 1, base.Z)
		s = Instance.new("Part"); s.Name = "OwnerSign"; s.Anchored = true; s.Size = Vector3.new(7, 2.4, 0.4)
		s.CFrame = CFrame.lookAt(base + Vector3.new(0, 3, 0), base + Vector3.new(0, 3, 0) + dir); s.Color = Color3.fromRGB(20, 22, 28); s.Parent = h
		local post = Instance.new("Part"); post.Name = "SignPost"; post.Anchored = true; post.Size = Vector3.new(0.4, 3, 0.4); post.CFrame = CFrame.new(base + Vector3.new(0, 1.5, 0)); post.Color = Color3.fromRGB(212, 170, 90); post.Material = Enum.Material.Metal; post.Parent = s
		local g = (function() local _g = Instance.new("SurfaceGui"); _g.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud; _g.PixelsPerStud = 50; return _g end)(); g.Face = Enum.NormalId.Front; g.PixelsPerStud = 30; g.Parent = s
		local l = Instance.new("TextLabel"); l.Name = "T"; l.Size = UDim2.fromScale(1, 1); l.BackgroundTransparency = 1; l.TextScaled = true; l.Font = Enum.Font.GothamBold; l.TextColor3 = Color3.fromRGB(212, 170, 90); l.Parent = g
	end
	s:FindFirstChild("T", true).Text = text
end
local function setOwner(h, p)
	if p then h:SetAttribute("OwnerId", p.UserId); h:SetAttribute("OwnerName", p.DisplayName); owned[p.UserId] = h; sign(h, p.DisplayName .. "'s Villa")
	else local id = h:GetAttribute("OwnerId"); if id then owned[id] = nil end; h:SetAttribute("OwnerId", nil); h:SetAttribute("OwnerName", nil); sign(h, "FOR SALE · $" .. price(h)) end
end
for _, h in ipairs(homes:GetChildren()) do if h:IsA("Model") and (h.Name:find("^Villa_") or h.Name:find("^IslandVilla")) then setOwner(h, nil) end end
local function save(p)
	if not store then return end
	local h = owned[p.UserId]
	pcall(function() store:SetAsync("u_" .. p.UserId, {villa = h and h.Name or nil}) end)
end
Players.PlayerAdded:Connect(function(p)
	if not store then return end
	local ok, d = pcall(function() return store:GetAsync("u_" .. p.UserId) end)
	if ok and type(d) == "table" and d.villa then
		local h = homes:FindFirstChild(d.villa)
		if h and not h:GetAttribute("OwnerId") then setOwner(h, p); task.delay(6, function() toast(p, "Welcome home! Your villa is waiting (Phone › Maps › My Home)") end) end
	end
end)
Players.PlayerRemoving:Connect(function(p) save(p); local h = owned[p.UserId]; if h then setOwner(h, nil) end end)
game:BindToClose(function() for _, p in ipairs(Players:GetPlayers()) do save(p) end end)
-- API for PhoneServer / doors
local api = Instance.new("BindableFunction"); api.Name = "PropertyAPI"; api.Parent = game.ServerStorage
api.OnInvoke = function(what, p, name)
	if what == "list" then
		local t = {}
		for _, h in ipairs(homes:GetChildren()) do
			if h:GetAttribute("OwnerId") ~= nil or h.Name:find("^Villa_") or h.Name:find("^IslandVilla") then
				if price(h) and (h.Name:find("^Villa_") or h.Name:find("^IslandVilla")) then
					t[#t + 1] = {name = h.Name, area = area(h), variant = h:GetAttribute("Variant") or "Classic", price = price(h), owner = h:GetAttribute("OwnerName"), mine = h:GetAttribute("OwnerId") == p.UserId}
				end
			end
		end
		table.sort(t, function(a, b) return a.price < b.price end)
		return t
	elseif what == "buy" then
		local h = homes:FindFirstChild(tostring(name)); if not h or not price(h) then return "Not for sale" end
		if h:GetAttribute("OwnerId") then return "Already owned" end
		if owned[p.UserId] then return "You already own a villa" end
		local m = money(p); if not m or m.Value < price(h) then return "You need $" .. price(h) end
		m.Value -= price(h); setOwner(h, p); save(p); toast(p, "🏡 You bought a villa! Phone › Maps › My Home"); return "Bought!"
	elseif what == "sell" then
		local h = owned[p.UserId]; if not h then return "No villa" end
		local m = money(p); if m then m.Value += math.floor(price(h) * 0.8) end
		setOwner(h, nil); save(p); return "Sold for $" .. math.floor(price(h) * 0.8)
	elseif what == "home" then
		local h = owned[p.UserId]; if not h then return nil end
		local s = h:FindFirstChild("OwnerSign"); return s and (s.Position + s.CFrame.LookVector * 4 + Vector3.new(0, 2, 0)) or nil
	elseif what == "canOpen" then
		local id = name:GetAttribute("OwnerId"); return id == nil or id == p.UserId
	end
end
