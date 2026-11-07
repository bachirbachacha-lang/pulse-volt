-- Phone apps v2 (server): Dreamgram (posts, likes, follows), Messages (inbox + safe preset messages), Food (order + delivery).
-- Food orders go to a real Delivery Driver player when one is online (they pick up at the restaurant and deliver for pay),
-- otherwise an NPC courier brings it. All money, text filtering and rules are checked here.
local Players, RS, TextService, SS = game:GetService("Players"), game:GetService("ReplicatedStorage"), game:GetService("TextService"), game:GetService("ServerStorage")
local rf = RS:FindFirstChild("PhoneApps") or Instance.new("RemoteFunction"); rf.Name = "PhoneApps"; rf.Parent = RS
local notify = RS:FindFirstChild("PhoneNotify") or Instance.new("RemoteEvent"); notify.Name = "PhoneNotify"; notify.Parent = RS
local sendMsg = SS:FindFirstChild("SendPhoneMessage") or Instance.new("BindableEvent"); sendMsg.Name = "SendPhoneMessage"; sendMsg.Parent = SS

local function money(p) local ls = p:FindFirstChild("leaderstats"); return ls and ls:FindFirstChild("Money") end
local function where(p)
	local r = p.Character and p.Character:FindFirstChild("HumanoidRootPart"); if not r then return "Dream City" end
	local x, z = r.Position.X, r.Position.Z
	if x > 1240 then return "Palm Island" elseif z < -1100 and x > 500 then return "Cargo Port" elseif z < -780 then return "Palm Hills"
	elseif x < -460 then return "Show Villas" elseif z > 700 then return "Downtown" elseif x > 600 then return "Palm Beach" end
	return "Dream City"
end

---------------------------------------------------------------- Messages
local inbox = {} -- [userId] = {{from, text, time}}
local function push(p, from, text)
	inbox[p.UserId] = inbox[p.UserId] or {}
	table.insert(inbox[p.UserId], 1, {from = from, text = text, time = os.time()})
	if #inbox[p.UserId] > 40 then table.remove(inbox[p.UserId]) end
	notify:FireClient(p, from, text)
end
sendMsg.Event:Connect(push)
-- preset messages only (no free text between players), so nothing unsafe can be sent privately
local PRESETS = {"Hey! 👋", "Want to race? 🏎️", "Come to my villa 🏡", "Meet me at Club Mirage 🎶", "Nice car! 🔥", "Visit my shop 🛍️", "Thanks! 🙏", "On my way 🚗"}

---------------------------------------------------------------- Dreamgram
local posts, nextId, lastPost, follows = {}, 1, {}, {} -- follows[userId] = {[otherId]=true}
local KINDS = {villa = "🏡 My villa", car = "🚗 My ride", biz = "🛍️ My business", here = "📍 Out and about"}

---------------------------------------------------------------- Food
local MENU = {
	["Sahara Grill"] = {model = "SaharaGrill", items = {{"Mixed Grill", 40}, {"Chicken Shawarma", 18}, {"Hummus & Bread", 10}}},
	["Dream Diner"] = {model = "DreamDiner", items = {{"Double Burger", 22}, {"Milkshake", 9}, {"Fries", 6}}},
	["Pearl Sushi"] = {model = "PearlSushi", items = {{"Sushi Platter", 45}, {"Salmon Roll", 20}, {"Miso Soup", 8}}},
	["Palm Café"] = {model = "PalmCafe", items = {{"Karak Tea", 5}, {"Iced Latte", 12}, {"Pistachio Cake", 14}}},
}
local DELIVERY_FEE = 15
local orders, nextOrder, busyDriver, lastOrder = {}, 1, {}, {}
local function pickupPoint(rest)
	local m = workspace.DreamBuilders.PalmIsland:FindFirstChild(MENU[rest].model)
	if not m then return Vector3.new(1330, 4, -423) end
	local cf = m:GetBoundingBox()
	local z = cf.Position.Z > -450 and -419 or -481 -- on the island walk in front of the restaurant
	return Vector3.new(cf.Position.X, 3.2, z)
end
local function foodTool(name)
	local t = Instance.new("Tool"); t.Name = name; t.CanBeDropped = false; t.ToolTip = "Click to eat"
	local h = Instance.new("Part"); h.Name = "Handle"; h.Size = Vector3.new(1, 0.6, 1); h.Color = Color3.fromRGB(196, 140, 70); h.Material = Enum.Material.SmoothPlastic; h.CanCollide = false; h.Parent = t
	local box = Instance.new("Part"); box.Size = Vector3.new(1.2, 0.2, 1.2); box.Color = Color3.fromRGB(212, 170, 90); box.CanCollide = false; box.Massless = true; box.CFrame = h.CFrame * CFrame.new(0, -0.4, 0); box.Parent = t
	local w = Instance.new("WeldConstraint"); w.Part0 = h; w.Part1 = box; w.Parent = box
	t.Activated:Connect(function()
		local hum = t.Parent and t.Parent:FindFirstChildOfClass("Humanoid")
		if hum then hum.Health = hum.MaxHealth; hum.WalkSpeed = 20; task.delay(30, function() if hum.Parent then hum.WalkSpeed = 16 end end) end
		local p = Players:GetPlayerFromCharacter(t.Parent); if p then notify:FireClient(p, "Food", "Yum! " .. name .. " gives you a speed boost for 30s") end
		t:Destroy()
	end)
	return t
end
local function giveFood(o)
	local c = o.customer
	if not c.Parent then return end
	for _, it in ipairs(o.items) do foodTool(it).Parent = c:FindFirstChild("Backpack") end
	push(c, o.rest, "Your order has arrived. Enjoy! Open your backpack to eat.")
end
local function npcCourier(o)
	task.delay(20, function()
		local c = o.customer; local r = c.Character and c.Character:FindFirstChild("HumanoidRootPart")
		if not r then giveFood(o); return end
		local d = Instance.new("HumanoidDescription"); d.TorsoColor = Color3.fromRGB(230, 80, 50); d.LeftArmColor = Color3.fromRGB(230, 80, 50); d.RightArmColor = d.LeftArmColor
		local ok, npc = pcall(function() return Players:CreateHumanoidModelFromDescription(d, Enum.HumanoidRigType.R15) end)
		if not ok then giveFood(o); return end
		npc.Name = "Courier"; npc:PivotTo(r.CFrame * CFrame.new(0, 0, 18)); npc.Parent = workspace
		local hum = npc:FindFirstChildOfClass("Humanoid"); hum.DisplayName = "Dream Eats courier"
		local t0 = os.clock()
		while os.clock() - t0 < 12 and r.Parent and (npc:GetPivot().Position - r.Position).Magnitude > 5 do hum:MoveTo(r.Position); task.wait(0.5) end
		giveFood(o)
		task.wait(1.5); npc:Destroy()
	end)
end
local function marker(driver, adornee, text, color)
	local b = Instance.new("BillboardGui"); b.Name = "DeliveryMarker"; b.AlwaysOnTop = true; b.Size = UDim2.fromOffset(170, 46); b.StudsOffset = Vector3.new(0, 5, 0)
	b.Adornee = adornee; b.Parent = driver:FindFirstChild("PlayerGui") -- only the driver sees it
	local l = Instance.new("TextLabel"); l.Size = UDim2.fromScale(1, 1); l.BackgroundColor3 = color; l.TextColor3 = Color3.new(1, 1, 1); l.Font = Enum.Font.GothamBold; l.TextScaled = true; l.Text = text; l.Parent = b
	Instance.new("UICorner", l).CornerRadius = UDim.new(0, 10)
	return b
end
local function assign(o, driver)
	busyDriver[driver] = o; o.driver = driver
	local pad = Instance.new("Part"); pad.Name = "FoodPickup"; pad.Anchored = true; pad.CanCollide = false; pad.Size = Vector3.new(4, 0.2, 4); pad.Shape = Enum.PartType.Cylinder
	pad.CFrame = CFrame.new(pickupPoint(o.rest)) * CFrame.Angles(0, 0, math.rad(90)); pad.Color = Color3.fromRGB(230, 80, 50); pad.Material = Enum.Material.Neon; pad.Transparency = 0.3
	local holder = Instance.new("Model"); holder.Name = "FoodPickup"; holder.ModelStreamingMode = Enum.ModelStreamingMode.Persistent; holder.Parent = workspace
	pad.Parent = holder; pad.Destroying:Connect(function() holder:Destroy() end)
	local pr = Instance.new("ProximityPrompt"); pr.ActionText = "Pick up order"; pr.ObjectText = o.rest; pr.HoldDuration = 0.6; pr.RequiresLineOfSight = false; pr.Parent = pad
	local mk = marker(driver, pad, "📦 Pick up at " .. o.rest, Color3.fromRGB(230, 80, 50))
	push(driver, "Dream Eats", "New delivery! Pick up " .. #o.items .. " item(s) at " .. o.rest .. " (Palm Island) for " .. o.customer.DisplayName .. ". Pay: $" .. o.pay)
	local picked = false
	pr.Triggered:Connect(function(who)
		if who ~= driver or picked then return end
		picked = true; pad:Destroy(); mk:Destroy()
		local cr = o.customer.Character and o.customer.Character:FindFirstChild("HumanoidRootPart")
		if not cr then busyDriver[driver] = nil; giveFood(o); return end
		local mk2 = marker(driver, cr, "🍔 Deliver to " .. o.customer.DisplayName, Color3.fromRGB(40, 160, 90))
		local dp = Instance.new("ProximityPrompt"); dp.Name = "DeliverPrompt"; dp.ActionText = "Hand over food"; dp.ObjectText = "Dream Eats"; dp.HoldDuration = 0.5; dp.RequiresLineOfSight = false; dp.Parent = cr
		push(driver, "Dream Eats", "Picked up! Now bring it to " .. o.customer.DisplayName .. " (follow the green marker).")
		push(o.customer, "Dream Eats", driver.DisplayName .. " picked up your order and is on the way 🛵")
		dp.Triggered:Connect(function(w2)
			if w2 ~= driver or o.done then return end
			o.done = true; dp:Destroy(); mk2:Destroy(); busyDriver[driver] = nil
			local m = money(driver); if m then m.Value += o.pay end
			push(driver, "Dream Eats", "Delivered ✅ +$" .. o.pay)
			giveFood(o)
		end)
		task.delay(240, function() if not o.done then o.done = true; if dp.Parent then dp:Destroy() end; mk2:Destroy(); busyDriver[driver] = nil; giveFood(o) end end)
	end)
	task.delay(120, function()
		if not picked then picked = true; if pad.Parent then pad:Destroy() end; mk:Destroy(); busyDriver[driver] = nil
			push(driver, "Dream Eats", "Order cancelled: not picked up in time"); npcCourier(o) end
	end)
end

---------------------------------------------------------------- requests
local lastAct = {}
local LIMIT = {like = 0.5, follow = 1, send = 2}
rf.OnServerInvoke = function(p, what, a, b)
	if LIMIT[what] then
		local k = p.UserId .. what
		if lastAct[k] and os.clock() - lastAct[k] < LIMIT[what] then return "Slow down" end
		lastAct[k] = os.clock()
	end
	if what == "feed" then
		local t = {}
		for i = #posts, math.max(1, #posts - 29), -1 do
			local x = posts[i]
			t[#t + 1] = {id = x.id, name = x.name, kind = KINDS[x.kind], caption = x.caption, place = x.place, likes = x.likeCount, liked = x.likes[p.UserId] == true,
				mine = x.uid == p.UserId, following = follows[p.UserId] and follows[p.UserId][x.uid] == true, uid = x.uid, ago = os.time() - x.time}
		end
		local fc = 0; for _, f in pairs(follows) do for id in pairs(f) do if id == p.UserId then fc += 1 end end end
		return {posts = t, followers = fc}
	elseif what == "post" then
		if type(a) ~= "string" or not KINDS[a] or type(b) ~= "string" then return "Bad post" end
		if lastPost[p] and os.clock() - lastPost[p] < 30 then return "Wait a bit before posting again" end
		local text = b:sub(1, 80)
		local ok, res = pcall(function() return TextService:FilterStringAsync(text, p.UserId):GetNonChatStringForBroadcastAsync() end)
		if not ok then return "Couldn't post, try again" end
		lastPost[p] = os.clock()
		table.insert(posts, {id = nextId, uid = p.UserId, name = p.DisplayName, kind = a, caption = res, place = where(p), likes = {}, likeCount = 0, time = os.time()})
		nextId += 1; if #posts > 100 then table.remove(posts, 1) end
		for _, f in ipairs(Players:GetPlayers()) do if f ~= p and follows[f.UserId] and follows[f.UserId][p.UserId] then push(f, "Dreamgram", p.DisplayName .. " posted: " .. KINDS[a]) end end
		return "Posted!"
	elseif what == "like" then
		for _, x in ipairs(posts) do
			if x.id == a then
				if x.likes[p.UserId] then x.likes[p.UserId] = nil; x.likeCount -= 1 else x.likes[p.UserId] = true; x.likeCount += 1
					local o = Players:GetPlayerByUserId(x.uid); if o and o ~= p then notify:FireClient(o, "Dreamgram", p.DisplayName .. " liked your post ❤️") end end
				return true
			end
		end
	elseif what == "follow" then
		if type(a) ~= "number" or a == p.UserId then return false end
		follows[p.UserId] = follows[p.UserId] or {}
		follows[p.UserId][a] = not follows[p.UserId][a] or nil
		return true
	elseif what == "inbox" then
		local ps = {}
		for _, o in ipairs(Players:GetPlayers()) do if o ~= p then ps[#ps + 1] = {name = o.DisplayName, user = o.Name} end end
		return {msgs = inbox[p.UserId] or {}, players = ps, presets = PRESETS}
	elseif what == "send" then
		local to = Players:FindFirstChild(tostring(a)); local i = tonumber(b)
		if not to or to == p or not i or not PRESETS[i] then return "Can't send" end
		push(to, p.DisplayName, PRESETS[i]); return "Sent"
	elseif what == "menu" then
		local t = {}
		for name, r in pairs(MENU) do t[#t + 1] = {name = name, items = r.items} end
		table.sort(t, function(x, y) return x.name < y.name end)
		local drivers = 0; for _, o in ipairs(Players:GetPlayers()) do if o ~= p and o:GetAttribute("Job") == "Delivery Driver" and not busyDriver[o] then drivers += 1 end end
		return {restaurants = t, fee = DELIVERY_FEE, drivers = drivers}
	elseif what == "order" then
		local r = MENU[a]; if not r or type(b) ~= "table" then return "Bad order" end
		if lastOrder[p] and os.clock() - lastOrder[p] < 20 then return "One order at a time" end
		local items, total = {}, DELIVERY_FEE
		for _, idx in ipairs(b) do local it = r.items[tonumber(idx) or 0]; if it and #items < 4 then items[#items + 1] = it[1]; total += it[2] end end
		if #items == 0 then return "Pick something" end
		local m = money(p); if not m or m.Value < total then return "You need $" .. total end
		m.Value -= total; lastOrder[p] = os.clock()
		local o = {id = nextOrder, customer = p, rest = a, items = items, total = total, pay = 25 + math.floor((total - DELIVERY_FEE) * 0.2)}
		nextOrder += 1; orders[o.id] = o
		local best
		for _, d in ipairs(Players:GetPlayers()) do if d ~= p and d:GetAttribute("Job") == "Delivery Driver" and not busyDriver[d] then best = d; break end end
		if best then assign(o, best); push(p, "Dream Eats", "Order placed ($" .. total .. "). " .. best.DisplayName .. " will deliver it.")
		else npcCourier(o); push(p, "Dream Eats", "Order placed ($" .. total .. "). A courier is on the way, about 20 seconds.") end
		return "Ordered!"
	end
end
Players.PlayerRemoving:Connect(function(p) inbox[p.UserId] = nil; lastPost[p] = nil; lastOrder[p] = nil; busyDriver[p] = nil end)
-- welcome message
Players.PlayerAdded:Connect(function(p)
	task.wait(12)
	if p.Parent then push(p, "Dream Builders", "Welcome to Dream City! Press P for your phone. Order food in Dream Eats, post on Dreamgram, buy a villa in Property.") end
end)
