-- Phone apps v3 (server): Supplies (order brick pallets to building plots), Assistant (rule-based tips, not an AI chat),
-- Business settings (price tier + decor upgrade). Every purchase is checked here.
local Players, RS = game:GetService("Players"), game:GetService("ReplicatedStorage")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local db = workspace:WaitForChild("DreamBuilders")
local plots = db:WaitForChild("Plots")
local units = db:WaitForChild("Businesses")
local rf = RS:FindFirstChild("PhoneExtra") or Instance.new("RemoteFunction"); rf.Name = "PhoneExtra"; rf.Parent = RS
local STAGES = {"Blueprint", "Foundation", "Ground floor", "Second floor", "Roof", "Pool & garden"}
local function money(p) local ls = p:FindFirstChild("leaderstats"); return ls and ls:FindFirstChild("Money") end
---------------------------------------------------------------- supplies
local PALLET, PALLET_BRICKS = 30, 10
local lastOrder = {}
local function giveBrick(char)
	if not char or char:FindFirstChild("CarriedBrick") then return false end
	local torso = char:FindFirstChild("UpperTorso") or char:FindFirstChild("Torso"); if not torso then return false end
	local b = Instance.new("Part"); b.Name = "CarriedBrick"; b.Size = Vector3.new(2, 1, 1.2); b.Color = Color3.fromRGB(170, 75, 55)
	b.Material = Enum.Material.Brick; b.CanCollide = false; b.Massless = true; b.CFrame = torso.CFrame * CFrame.new(0, -0.2, -1.4); b.Parent = char
	local w = Instance.new("WeldConstraint"); w.Part0 = torso; w.Part1 = b; w.Parent = b
	return true
end
local function dropPallet(plot, by)
	local pad = plot.PrimaryPart or plot:FindFirstChild("Pad")
	local pos = pad.Position + Vector3.new(pad.Size.X / 2 - 10, pad.Size.Y / 2, -pad.Size.Z / 2 + 10)
	local m = Instance.new("Model"); m.Name = "SupplyPallet"; m.Parent = plot
	local base = Instance.new("Part"); base.Name = "Pallet"; base.Anchored = true; base.Size = Vector3.new(5, 0.6, 5); base.Color = Color3.fromRGB(160, 120, 80); base.Material = Enum.Material.WoodPlanks
	base.CFrame = CFrame.new(pos + Vector3.new(0, 0.3, 0)); base.Parent = m
	local stack = Instance.new("Part"); stack.Name = "Bricks"; stack.Anchored = true; stack.Size = Vector3.new(4.4, 3, 4.4); stack.Color = Color3.fromRGB(170, 75, 55); stack.Material = Enum.Material.Brick
	stack.CFrame = base.CFrame * CFrame.new(0, 1.8, 0); stack.Parent = m
	local left = PALLET_BRICKS
	local pp = K.prompt(stack, "Pick up brick", "Pallet · " .. left .. " left", 0, 12)
	pp.Triggered:Connect(function(p)
		if K.job(p) ~= "Construction Worker" then K.toast(p, "Only Construction Workers carry bricks"); return end
		if giveBrick(p.Character) then
			left -= 1; pp.ObjectText = "Pallet · " .. left .. " left"
			stack.Size = Vector3.new(4.4, math.max(0.4, 3 * left / PALLET_BRICKS), 4.4); stack.CFrame = base.CFrame * CFrame.new(0, 0.3 + stack.Size.Y / 2, 0)
			if left <= 0 then m:Destroy() end
		end
	end)
	task.delay(900, function() if m.Parent then m:Destroy() end end)
end
---------------------------------------------------------------- assistant
local function tips(p)
	local t = {}
	local m = money(p); local cash = m and m.Value or 0
	local job = p:GetAttribute("Job")
	local hasVilla = game.ServerStorage.PropertyAPI:Invoke("home", p) ~= nil
	local biz; for _, u in ipairs(units:GetChildren()) do if u:GetAttribute("OwnerId") == p.UserId then biz = u end end
	if not job or job == "No job" then t[#t + 1] = {text = "Pick a job to start earning: Phone › Jobs.", place = "HQ (Jobs)"} end
	local HOW = {
		["Construction Worker"] = {"Carry bricks to a plot with a blueprint (Supply Yard, or order a pallet in Supplies).", "HQ (Jobs)"},
		["Architect"] = {"Design a mansion at an empty plot sign, then workers build it.", "HQ (Jobs)"},
		["Real Estate Agent"] = {"Get a client at the Dream Realty Tower reception.", "Dream Realty Tower"},
		["Car Dealer"] = {"Get a buyer at the Dream Motors sales kiosk.", "Downtown"},
		["Chef"] = {"Start a shift at the Sahara Grill or Dream Diner grill.", "Palm Island"},
		["Fashion Designer"] = {"Design outfits at the plaza table, then open your stall.", "Downtown"},
		["Delivery Driver"] = {"Food orders come to you automatically. Keep your phone close!", nil},
		["Business Owner"] = {"Rent a Downtown shop and serve your customers.", "Shops (Businesses)"},
		["Hair Stylist"] = {"Cut hair at the plaza salon chair, or open your own salon.", "Downtown"},
	}
	if job and HOW[job] then t[#t + 1] = {text = "Your job (" .. job .. "): " .. HOW[job][1], place = HOW[job][2]} end
	t[#t + 1] = {text = "Port cargo contracts pay $180–$300. Grab one at the port gate house.", place = "Cargo Port"}
	if not biz and cash >= 50 then t[#t + 1] = {text = "You can afford a shop ($50). Run your own business Downtown.", place = "Shops (Businesses)"} end
	if biz and not biz:GetAttribute("Staff") and cash >= 150 then t[#t + 1] = {text = "Hire staff for your shop ($150) so customers get served while you're away."} end
	if biz and not biz:GetAttribute("Decor") and cash >= 250 then t[#t + 1] = {text = "Upgrade your shop decor ($250) in the Business app: +$3 on every customer."} end
	if not hasVilla then
		if cash >= 25000 then t[#t + 1] = {text = "You can buy a villa now! Phone › Property.", place = "Palm Hills"}
		else t[#t + 1] = {text = "Save $" .. (25000 - cash) .. " more for your first villa in Palm Hills."} end
	else t[#t + 1] = {text = "Park your car in your garage: drive in, step out, press F on the driveway.", place = "My Home"} end
	if cash >= 150 then t[#t + 1] = {text = "Take a holiday: Dream Air flies to the Maldives from the airport ($150).", place = "Airport"} end
	t[#t + 1] = {text = "Ride the city bus for free from any 🚌 stop on the ring road."}
	return t
end
---------------------------------------------------------------- requests
local TIERS = {Budget = {0.8, 8}, Standard = {1, 12}, Premium = {1.4, 18}}
rf.OnServerInvoke = function(p, what, a)
	if what == "plots" then
		local t = {}
		for _, pl in ipairs(plots:GetChildren()) do
			local st = pl:GetAttribute("Stage") or 0
			t[#t + 1] = {id = pl:GetAttribute("PlotId"), name = pl.Name, stage = st, stageName = STAGES[st + 1] or "Finished", started = st > 0, done = st >= #STAGES,
				pallet = pl:FindFirstChild("SupplyPallet") ~= nil}
		end
		table.sort(t, function(x, y) return (x.id or 0) < (y.id or 0) end)
		return {plots = t, price = PALLET, bricks = PALLET_BRICKS}
	elseif what == "order" then
		local pl = plots:FindFirstChild(tostring(a)); if not pl then return "No such plot" end
		if (pl:GetAttribute("Stage") or 0) == 0 then return "This plot needs a blueprint first" end
		if (pl:GetAttribute("Stage") or 0) >= #STAGES then return "This mansion is finished" end
		if pl:FindFirstChild("SupplyPallet") then return "A pallet is already there" end
		if lastOrder[p] and os.clock() - lastOrder[p] < 15 then return "Wait a moment" end
		local m = money(p); if not m or m.Value < PALLET then return "A pallet costs $" .. PALLET end
		m.Value -= PALLET; lastOrder[p] = os.clock()
		task.delay(6, function() if pl.Parent then dropPallet(pl, p); K.msg(p, "Dream Supplies", "🧱 Pallet of " .. PALLET_BRICKS .. " bricks delivered to " .. pl.Name .. ".") end end)
		return "Ordered! Arriving in a few seconds"
	elseif what == "assistant" then
		return tips(p)
	elseif what == "biz" then
		for _, u in ipairs(units:GetChildren()) do
			if u:GetAttribute("OwnerId") == p.UserId then
				return {tier = u:GetAttribute("Tier") or "Standard", decor = u:GetAttribute("Decor") == true, staff = u:GetAttribute("Staff") == true}
			end
		end
		return nil
	elseif what == "tier" then
		local tier = TIERS[a]; if not tier then return false end
		for _, u in ipairs(units:GetChildren()) do
			if u:GetAttribute("OwnerId") == p.UserId then u:SetAttribute("Tier", a); u:SetAttribute("PriceMult", tier[1]); u:SetAttribute("CustomerGap", tier[2]); return true end
		end
		return false
	elseif what == "decor" then
		for _, u in ipairs(units:GetChildren()) do
			if u:GetAttribute("OwnerId") == p.UserId then
				if u:GetAttribute("Decor") then return "Already upgraded" end
				local m = money(p); if not m or m.Value < 250 then return "Decor costs $250" end
				m.Value -= 250; u:SetAttribute("Decor", true)
				-- visible upgrade: two gold planters + a chandelier
				local dp = Instance.new("Model"); dp.Name = "DecorPack"; dp.Parent = u
				local o = u.Origin.CFrame
				for _, x in ipairs({-9, 9}) do
					local pot = Instance.new("Part"); pot.Anchored = true; pot.Size = Vector3.new(2.4, 2.4, 2.4); pot.Color = Color3.fromRGB(212, 170, 90); pot.Material = Enum.Material.Metal; pot.CFrame = o * CFrame.new(x, 1.5, -8); pot.Parent = dp
					local leaf = Instance.new("Part"); leaf.Anchored = true; leaf.Shape = Enum.PartType.Ball; leaf.Size = Vector3.new(3.4, 3.4, 3.4); leaf.Color = Color3.fromRGB(60, 130, 60); leaf.Material = Enum.Material.Grass; leaf.CanCollide = false; leaf.CFrame = o * CFrame.new(x, 4, -8); leaf.Parent = dp
				end
				local ch = Instance.new("Part"); ch.Anchored = true; ch.Shape = Enum.PartType.Ball; ch.Size = Vector3.new(2.5, 2.5, 2.5); ch.Color = Color3.fromRGB(255, 240, 200); ch.Material = Enum.Material.Neon; ch.CanCollide = false; ch.CFrame = o * CFrame.new(0, 11, 0); ch.Parent = dp
				local pl = Instance.new("PointLight"); pl.Range = 22; pl.Brightness = 1.4; pl.Color = Color3.fromRGB(255, 225, 170); pl.Parent = ch
				return "Decor upgraded! +$3 per customer"
			end
		end
		return "You don't run a shop"
	end
end
Players.PlayerRemoving:Connect(function(p) lastOrder[p] = nil end)
