-- Dream Mart + Inventory: buy at the shelves (server price list, money checked here). Food and drinks go to the backpack
-- (use them for health / speed); wearables and collectibles go to your Inventory (Phone › Inventory) where you equip them.
-- Saved with DataStore "DreamInventory_v1" (works once the place is published); equipped items come back after respawn.
local Players, RS, DSS = game:GetService("Players"), game:GetService("ReplicatedStorage"), game:GetService("DataStoreService")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local mart = workspace:WaitForChild("DreamBuilders"):WaitForChild("DreamMart")
local rf = RS:FindFirstChild("InventoryRequest") or Instance.new("RemoteFunction"); rf.Name = "InventoryRequest"; rf.Parent = RS
local okS, store = pcall(function() return DSS:GetDataStore("DreamInventory_v1") end); if not okS then store = nil end
local C = Color3.fromRGB
-- the server's own catalogue (prices from the client are never trusted)
local ITEMS = {
	["Water"] = {kind = "food", heal = 15}, ["Karak Tea"] = {kind = "food", heal = 10, speed = 2}, ["Sandwich"] = {kind = "food", heal = 35},
	["Energy Drink"] = {kind = "food", speed = 6}, ["Dates Box"] = {kind = "food", heal = 25}, ["Fruit Basket"] = {kind = "food", heal = 40}, ["Ice Cream"] = {kind = "food", heal = 15},
	["Flowers"] = {kind = "hold", color = C(230, 80, 150)}, ["Camera"] = {kind = "hold", color = C(40, 40, 46)},
	["Headphones"] = {kind = "wear", at = "Head", size = Vector3.new(2.3, 0.5, 1.4), off = CFrame.new(0, 0.55, 0), color = C(30, 30, 34)},
	["Smart Watch"] = {kind = "wear", at = "LeftLowerArm", size = Vector3.new(0.5, 0.35, 0.5), off = CFrame.new(0, -0.4, 0), color = C(40, 40, 46)},
	["Sunglasses"] = {kind = "wear", at = "Head", size = Vector3.new(1.3, 0.3, 0.2), off = CFrame.new(0, 0.15, -0.6), color = C(15, 15, 18)},
	["Gold Chain"] = {kind = "wear", at = "UpperTorso", size = Vector3.new(1.4, 0.2, 0.9), off = CFrame.new(0, 0.6, -0.15), color = C(212, 170, 90), mat = Enum.Material.Metal},
	["Cap"] = {kind = "wear", at = "Head", size = Vector3.new(1.4, 0.45, 1.6), off = CFrame.new(0, 0.75, -0.1), color = C(200, 40, 50)},
	["Designer Bag"] = {kind = "wear", at = "RightHand", size = Vector3.new(1, 1.1, 0.5), off = CFrame.new(0, -0.7, 0), color = C(150, 90, 60), mat = Enum.Material.Leather},
	["Gaming Console"] = {kind = "collect"},
}
local inv = {} -- [userId] = {items = {[name] = count}, equipped = {[name] = true}}
local function data(p) inv[p.UserId] = inv[p.UserId] or {items = {}, equipped = {}}; return inv[p.UserId] end
local function save(p) if not store then return end; local d = inv[p.UserId]; if d then task.spawn(function() pcall(function() store:SetAsync("u_" .. p.UserId, d) end) end) end end
local function tool(name, info)
	local t = Instance.new("Tool"); t.Name = name; t.CanBeDropped = false; t.ToolTip = info.kind == "food" and "Click to use" or name
	local h = Instance.new("Part"); h.Name = "Handle"; h.Size = Vector3.new(0.8, 1, 0.8); h.CanCollide = false; h.Color = info.color or C(240, 240, 240); h.Parent = t
	if info.kind == "food" then
		t.Activated:Connect(function()
			local hum = t.Parent and t.Parent:FindFirstChildOfClass("Humanoid"); if not hum then return end
			if info.heal then hum.Health = math.min(hum.MaxHealth, hum.Health + info.heal) end
			if info.speed then hum.WalkSpeed = 16 + info.speed; task.delay(25, function() if hum.Parent then hum.WalkSpeed = 16 end end) end
			local p = Players:GetPlayerFromCharacter(t.Parent); if p then K.toast(p, "😋 " .. name .. (info.heal and (" +" .. info.heal .. " health") or "") .. (info.speed and " · faster for 25 s" or "")) end
			t:Destroy()
		end)
	end
	return t
end
local function wear(p, name)
	local info = ITEMS[name]; local char = p.Character; local at = char and char:FindFirstChild(info.at); if not at then return end
	local old = char:FindFirstChild("Wear_" .. name); if old then old:Destroy() end
	local w = Instance.new("Part"); w.Name = "Wear_" .. name; w.Size = info.size; w.Color = info.color; w.Material = info.mat or Enum.Material.SmoothPlastic
	w.CanCollide = false; w.Massless = true; w.CanQuery = false; w.CFrame = at.CFrame * info.off; w.Parent = char
	local weld = Instance.new("WeldConstraint"); weld.Part0 = at; weld.Part1 = w; weld.Parent = w
end
local function unwear(p, name) local w = p.Character and p.Character:FindFirstChild("Wear_" .. name); if w then w:Destroy() end end
-- shelves
local last = {}
for _, sh in ipairs(mart:WaitForChild("Shelves"):GetChildren()) do
	local name, price = sh:GetAttribute("Item"), sh:GetAttribute("Price")
	local info = ITEMS[name]
	if info then
		local pp = K.prompt(sh, "Buy " .. name .. " ($" .. price .. ")", "Dream Mart", 0.4, 9)
		pp.Triggered:Connect(function(p)
			if last[p] and os.clock() - last[p] < 0.8 then return end; last[p] = os.clock()
			local m = p:FindFirstChild("leaderstats") and p.leaderstats:FindFirstChild("Money")
			if not m or m.Value < price then K.toast(p, "You need $" .. price); return end
			m.Value -= price
			if info.kind == "food" or info.kind == "hold" then
				tool(name, info).Parent = p:FindFirstChild("Backpack")
				K.toast(p, "🛍 " .. name .. " is in your backpack")
			else
				local d = data(p); d.items[name] = (d.items[name] or 0) + 1; save(p)
				K.toast(p, "🛍 " .. name .. " added to Phone › Inventory" .. (info.kind == "wear" and " (tap to wear)" or ""))
			end
		end)
	end
end
rf.OnServerInvoke = function(p, what, name)
	local d = data(p)
	if what == "list" then
		local t = {}
		for n, c in pairs(d.items) do t[#t + 1] = {name = n, count = c, wear = ITEMS[n] and ITEMS[n].kind == "wear", on = d.equipped[n] == true} end
		table.sort(t, function(a, b) return a.name < b.name end)
		return t
	elseif what == "toggle" then
		if type(name) ~= "string" or not d.items[name] or not ITEMS[name] or ITEMS[name].kind ~= "wear" then return false end
		if d.equipped[name] then d.equipped[name] = nil; unwear(p, name) else d.equipped[name] = true; wear(p, name) end
		save(p); return true
	end
end
Players.PlayerAdded:Connect(function(p)
	if store then local ok, v = pcall(function() return store:GetAsync("u_" .. p.UserId) end); if ok and type(v) == "table" then inv[p.UserId] = {items = v.items or {}, equipped = v.equipped or {}} end end
	p.CharacterAdded:Connect(function() task.wait(1); local d = data(p); for n in pairs(d.equipped) do if ITEMS[n] then wear(p, n) end end end)
end)
Players.PlayerRemoving:Connect(function(p) save(p); inv[p.UserId] = nil; last[p] = nil end)
