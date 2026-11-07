-- Businesses v1: rent a Downtown shop, pick a type + brand name, NPC customers come in, the owner serves them and gets paid.
-- Server-authoritative: price, ownership, names (filtered) and payments are all checked here.
local Players, RS, TextService = game:GetService("Players"), game:GetService("ReplicatedStorage"), game:GetService("TextService")
local Kit = require(game.ServerStorage.DB_Tools.BusinessKit)
local ev = RS:WaitForChild("BusinessEvent")
local units = workspace:WaitForChild("DreamBuilders"):WaitForChild("Businesses")
local RENT = 50
local owned = {} -- [player] = unit
local okStore, store = pcall(function() return game:GetService("DataStoreService"):GetDataStore("DreamBusiness_v1") end)
if not okStore then store = nil end
local function saveBiz(plr, data)
	if not store then return end
	task.spawn(function() pcall(function() store:SetAsync("u_" .. plr.UserId, data or {}) end) end)
end
local function money(plr) local ls = plr:FindFirstChild("leaderstats"); return ls and ls:FindFirstChild("Money") end
local function toast(plr, msg)
	local g = plr:FindFirstChild("PlayerGui") and plr.PlayerGui:FindFirstChild("DreamHUD"); if not g or not g:FindFirstChild("Toast") then return end
	g.Toast.Text = msg; g.Toast.Visible = true
	task.delay(2.8, function() if g.Toast.Text == msg then g.Toast.Visible = false end end)
end
local function setSign(unit, text)
	local l = unit.Sign:FindFirstChildWhichIsA("TextLabel", true); if l then l.Text = text end
end
local function reset(unit)
	Kit.clear(unit)
	local c = unit:FindFirstChild("Customer"); if c then c:Destroy() end
	unit:SetAttribute("OwnerId", nil); unit:SetAttribute("Type", nil); unit:SetAttribute("PriceMult", nil); unit:SetAttribute("CustomerGap", nil); unit:SetAttribute("Decor", nil); unit:SetAttribute("Tier", nil)
	local dec = unit:FindFirstChild("DecorPack"); if dec then dec:Destroy() end; unit:SetAttribute("Brand", nil); unit:SetAttribute("Waiting", nil)
	setSign(unit, "FOR RENT · $" .. RENT)
	unit.RentBoard.Transparency = 0; unit.RentBoard.Open.Enabled = true
	local sp = unit:FindFirstChild("ServePoint"); if sp then sp:Destroy() end
end
for _, u in ipairs(units:GetChildren()) do
	reset(u)
	u.RentBoard.Open.Triggered:Connect(function(plr)
		if u:GetAttribute("OwnerId") then toast(plr, "This shop is taken"); return end
		if owned[plr] then toast(plr, "You already run a business"); return end
		ev:FireClient(plr, "pick", u.Name, RENT, Kit.TYPES)
	end)
end
local function handle(plr, action, unitName, kind, brand, restored)
	if action == "open" then
		local u = units:FindFirstChild(tostring(unitName)); if not u or u:GetAttribute("OwnerId") or owned[plr] then return end
		if type(kind) ~= "string" or not Kit.TYPES[kind] then return end
		if type(brand) ~= "string" then return end
		brand = brand:sub(1, 24):gsub("^%s+", ""):gsub("%s+$", "")
		if #brand < 2 then brand = plr.DisplayName .. "'s " .. kind end
		local ok, res = pcall(function() return TextService:FilterStringAsync(brand, plr.UserId):GetNonChatStringForBroadcastAsync() end)
		if not ok then toast(plr, "Couldn't check that name, try again"); return end
		brand = res
		if not restored then
			local m = money(plr); if not m or m.Value < RENT then toast(plr, "You need $" .. RENT .. " to rent a shop"); return end
			m.Value -= RENT
		end
		owned[plr] = u
		u:SetAttribute("OwnerId", plr.UserId); u:SetAttribute("Type", kind); u:SetAttribute("Brand", brand)
		Kit.furnish(u, kind, plr.Name, brand)
		setSign(u, Kit.TYPES[kind].icon .. " " .. string.upper(brand))
		u.RentBoard.Transparency = 1; u.RentBoard.Open.Enabled = false
		-- owner's serve prompt behind the counter
		local sp = Instance.new("Part"); sp.Name = "ServePoint"; sp.Anchored = true; sp.CanCollide = false; sp.Transparency = 1; sp.Size = Vector3.new(2, 2, 2)
		sp.CFrame = u.Origin.CFrame * CFrame.new(0, 3, 12.5); sp.Parent = u
		local pr = Instance.new("ProximityPrompt"); pr.Name = "Serve"; pr.ActionText = Kit.TYPES[kind].serve; pr.ObjectText = "Customer waiting"; pr.Enabled = false
		pr.HoldDuration = 1; pr.RequiresLineOfSight = false; pr.MaxActivationDistance = 10; pr.Parent = sp
		pr.Triggered:Connect(function(who)
			if who.UserId ~= u:GetAttribute("OwnerId") then toast(who, "Only the owner can serve here"); return end
			local c = u:FindFirstChild("Customer"); if not c or not u:GetAttribute("Waiting") then return end
			u:SetAttribute("Waiting", nil); pr.Enabled = false
			local pay = math.floor(Kit.TYPES[kind].price * (u:GetAttribute("PriceMult") or 1)) + (u:GetAttribute("Decor") and 3 or 0)
			local mm = money(who); if mm then mm.Value += pay end
			who:SetAttribute("BusinessEarned", (who:GetAttribute("BusinessEarned") or 0) + pay)
			toast(who, "+$" .. pay .. "  happy customer at " .. brand)
			local hum = c:FindFirstChildOfClass("Humanoid")
			if hum then hum:MoveTo((u.Origin.CFrame * CFrame.new(0, 0, -30)).Position); task.delay(5, function() if c.Parent then c:Destroy() end end) else c:Destroy() end
		end)
		toast(plr, "Welcome to " .. brand .. "! Customers are on their way")
		ev:FireClient(plr, "opened", u.Name, brand)
		saveBiz(plr, {type = kind, brand = brand})
	elseif action == "close" then
		local u = owned[plr]; if u then reset(u); owned[plr] = nil; toast(plr, "Business closed"); saveBiz(plr, {}) end
	end
end
local lastBiz = {}
ev.OnServerEvent:Connect(function(plr, action, unitName, kind, brand)
	if lastBiz[plr] and os.clock() - lastBiz[plr] < 1 then return end
	lastBiz[plr] = os.clock()
	if type(action) ~= "string" then return end
	handle(plr, action, unitName, kind, brand, false)
end)
Players.PlayerRemoving:Connect(function(p) lastBiz[p] = nil end)
-- reopen your business when you come back (any free shop unit, no rent charged again)
Players.PlayerAdded:Connect(function(plr)
	if not store then return end
	local ok, d = pcall(function() return store:GetAsync("u_" .. plr.UserId) end)
	if not ok or type(d) ~= "table" or not d.type or not Kit.TYPES[d.type] then return end
	plr:WaitForChild("leaderstats", 15); task.wait(3)
	for _, u in ipairs(units:GetChildren()) do
		if not u:GetAttribute("OwnerId") then
			handle(plr, "open", u.Name, d.type, d.brand or "", true)
			task.delay(4, function() toast(plr, "Welcome back! " .. tostring(d.brand) .. " is open again") end)
			return
		end
	end
	toast(plr, "All shops are taken right now, your brand is saved")
end)
Players.PlayerRemoving:Connect(function(plr) local u = owned[plr]; if u then reset(u); owned[plr] = nil end end)
-- customers: one at a time per open shop
local function spawnCustomer(u)
	local okd, desc = pcall(function()
		local d = Instance.new("HumanoidDescription")
		local shirts = {Color3.fromRGB(200, 60, 60), Color3.fromRGB(60, 120, 200), Color3.fromRGB(240, 240, 240), Color3.fromRGB(40, 40, 40), Color3.fromRGB(90, 160, 90)}
		local skins = {Color3.fromRGB(255, 220, 180), Color3.fromRGB(200, 150, 110), Color3.fromRGB(130, 90, 60), Color3.fromRGB(240, 200, 160)}
		local sk = skins[math.random(#skins)]
		d.HeadColor = sk; d.LeftArmColor = sk; d.RightArmColor = sk; d.LeftLegColor = shirts[math.random(#shirts)]; d.RightLegColor = d.LeftLegColor
		d.TorsoColor = shirts[math.random(#shirts)]
		return Players:CreateHumanoidModelFromDescription(d, Enum.HumanoidRigType.R15)
	end)
	if not okd or not desc then return end
	local c = desc; c.Name = "Customer"
	local o = u.Origin.CFrame
	c:PivotTo(o * CFrame.new(0, 3, -27))
	c.Parent = u
	local hum = c:FindFirstChildOfClass("Humanoid"); hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	for _, p in ipairs(c:GetDescendants()) do if p:IsA("BasePart") then pcall(function() p:SetNetworkOwner(nil) end) end end
	hum:MoveTo((o * CFrame.new(0, 0, -20)).Position); hum.MoveToFinished:Wait()
	local spot = u.Interior and u.Interior:FindFirstChild("CustomerSpot")
	if spot and c.Parent then hum:MoveTo(spot.Position); hum.MoveToFinished:Wait() end
	if not c.Parent then return end
	u:SetAttribute("Waiting", true)
	local sp = u:FindFirstChild("ServePoint"); if sp then sp.Serve.Enabled = true end
	local owner = Players:GetPlayerByUserId(u:GetAttribute("OwnerId") or 0)
	if owner then toast(owner, "A customer is waiting at " .. (u:GetAttribute("Brand") or "your shop") .. "!") end
	task.delay(40, function()
		if c.Parent and u:GetAttribute("Waiting") then
			u:SetAttribute("Waiting", nil); if sp then sp.Serve.Enabled = false end
			hum:MoveTo((o * CFrame.new(0, 0, -30)).Position); task.wait(5); if c.Parent then c:Destroy() end
		end
	end)
end
while true do
	task.wait(2)
	for _, u in ipairs(units:GetChildren()) do
		if u:GetAttribute("OwnerId") and not u:FindFirstChild("Customer") and u:FindFirstChild("Interior") and (u:GetAttribute("NextCustomer") or 0) <= os.clock() then
			u:SetAttribute("NextCustomer", os.clock() + (u:GetAttribute("CustomerGap") or 12))
			task.spawn(spawnCustomer, u)
		end
	end
end
