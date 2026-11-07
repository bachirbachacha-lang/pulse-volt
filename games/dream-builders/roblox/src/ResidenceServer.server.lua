-- Dream Residences (Tower 3): 14 apartments (Standard floors 1–3, Premium floors 4–7) + the Penthouse.
-- Buy at the unit door; the door opens for the owner and the owner's Roblox friends; sell back for 80%.
-- One apartment per player (separate from villas). Saved with DataStore "DreamResidence_v1" (works once the place is published).
local Players, DSS, TweenService = game:GetService("Players"), game:GetService("DataStoreService"), game:GetService("TweenService")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local R = workspace:WaitForChild("DreamBuilders"):WaitForChild("Downtown"):WaitForChild("Facades"):WaitForChild("Tower3"):WaitForChild("Residences")
local okS, store = pcall(function() return DSS:GetDataStore("DreamResidence_v1") end); if not okS then store = nil end
local PRICE = {Standard = 8000, Premium = 15000, Penthouse = 80000}
local units, owned = {}, {} -- units[id] = {model, door, plate, tier}; owned[userId] = id
for _, m in ipairs(R:GetChildren()) do
	local id = m:GetAttribute("UnitId")
	if id then
		local door = m:FindFirstChild("ApartmentDoor"); local plate = m:FindFirstChild("DoorPlate")
		units[id] = {model = m, door = door, plate = plate and plate:FindFirstChild("T", true), tier = m:GetAttribute("Tier"), closed = door.CFrame}
	end
end
local function money(p) local ls = p:FindFirstChild("leaderstats"); return ls and ls:FindFirstChild("Money") end
local function label(u)
	local id = u.model:GetAttribute("UnitId")
	local owner = u.model:GetAttribute("OwnerName")
	if u.plate then u.plate.Text = owner and (id == "PH" and ("PENTHOUSE · " .. owner) or (id .. " · " .. owner)) or ((id == "PH" and "PENTHOUSE" or id) .. " · $" .. PRICE[u.tier]) end
end
local function setOwner(id, p)
	local u = units[id]
	if p then u.model:SetAttribute("OwnerId", p.UserId); u.model:SetAttribute("OwnerName", p.DisplayName); owned[p.UserId] = id
	else local o = u.model:GetAttribute("OwnerId"); if o then owned[o] = nil end; u.model:SetAttribute("OwnerId", nil); u.model:SetAttribute("OwnerName", nil) end
	label(u)
end
local function save(p) if store then local id = owned[p.UserId]; task.spawn(function() pcall(function() store:SetAsync("u_" .. p.UserId, {unit = id}) end) end) end end
local function canEnter(p, u)
	local o = u.model:GetAttribute("OwnerId")
	if not o or o == p.UserId then return true end
	local ok, friends = pcall(function() return p:IsFriendsWith(o) end)
	return ok and friends
end
for id, u in pairs(units) do
	label(u)
	local pp = K.prompt(u.door, "Open", "Door", 0, 8)
	local open = false
	local function refreshPrompt() local o = u.model:GetAttribute("OwnerId"); pp.ActionText = o and (open and "Close" or "Open") or ("Buy " .. (u.tier == "Penthouse" and "penthouse" or "apartment") .. " ($" .. PRICE[u.tier] .. ")") end
	refreshPrompt()
	u.model:GetAttributeChangedSignal("OwnerId"):Connect(refreshPrompt)
	-- owner-only second prompt to sell
	local sp = K.prompt(u.door, "Sell (80%)", "Your home", 2, 8); sp.UIOffset = Vector2.new(0, 60); sp.KeyboardKeyCode = Enum.KeyCode.F; sp.Enabled = true
	sp.Triggered:Connect(function(p)
		if u.model:GetAttribute("OwnerId") ~= p.UserId then K.toast(p, "Only the owner can sell"); return end
		local m = money(p); if m then m.Value += math.floor(PRICE[u.tier] * 0.8) end
		setOwner(id, nil); save(p); K.toast(p, "Sold for $" .. math.floor(PRICE[u.tier] * 0.8))
	end)
	pp.Triggered:Connect(function(p)
		local o = u.model:GetAttribute("OwnerId")
		if not o then
			if owned[p.UserId] then K.toast(p, "You already own a home here (" .. owned[p.UserId] .. ")"); return end
			local m = money(p); if not m or m.Value < PRICE[u.tier] then K.toast(p, "You need $" .. PRICE[u.tier]); return end
			m.Value -= PRICE[u.tier]; setOwner(id, p); save(p)
			K.toast(p, (id == "PH" and "🌆 You own the PENTHOUSE!" or ("🏢 Apartment " .. id .. " is yours!")) .. " Phone › Maps › Dream Residences")
			K.msg(p, "Dream Residences", "Welcome home! Your door opens for you and your Roblox friends. Roof terrace: elevator › ROOF.")
			return
		end
		if not canEnter(p, u) then K.toast(p, "🔒 Locked · " .. tostring(u.model:GetAttribute("OwnerName")) .. "'s home"); return end
		open = not open
		u.door.CanCollide = not open
		TweenService:Create(u.door, TweenInfo.new(0.5), {CFrame = open and (u.closed * CFrame.new(4.8, 0, 0)) or u.closed}):Play()
		refreshPrompt()
		if open then task.delay(6, function() if open then open = false; u.door.CanCollide = true; TweenService:Create(u.door, TweenInfo.new(0.5), {CFrame = u.closed}):Play(); refreshPrompt() end end) end
	end)
end
Players.PlayerAdded:Connect(function(p)
	if not store then return end
	local ok, d = pcall(function() return store:GetAsync("u_" .. p.UserId) end)
	if ok and type(d) == "table" and d.unit and units[d.unit] and not units[d.unit].model:GetAttribute("OwnerId") then setOwner(d.unit, p) end
end)
Players.PlayerRemoving:Connect(function(p) save(p); local id = owned[p.UserId]; if id then setOwner(id, nil) end end)
-- other scripts (phone) can ask
local api = Instance.new("BindableFunction"); api.Name = "ResidenceAPI"; api.Parent = game.ServerStorage
api.OnInvoke = function(what, p)
	if what == "mine" then return owned[p.UserId] end
	if what == "list" then local t = {}; for id, u in pairs(units) do t[#t + 1] = {id = id, tier = u.tier, price = PRICE[u.tier], owner = u.model:GetAttribute("OwnerName"), mine = u.model:GetAttribute("OwnerId") == p.UserId} end; table.sort(t, function(a, b) return a.price == b.price and a.id < b.id or a.price < b.price end); return t end
end
