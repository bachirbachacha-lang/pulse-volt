-- AI employees: a business owner can hire one staff member ($150). Staff serve waiting customers by themselves
-- after a few seconds; the owner keeps 70% of the price (30% is the staff wage). Staff leave when the shop closes.
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local Kit = require(game.ServerStorage.DB_Tools.BusinessKit)
local units = workspace:WaitForChild("DreamBuilders"):WaitForChild("Businesses")
local HIRE = 150
local function setup(u)
	local spot = Instance.new("Part"); spot.Name = "StaffSpot"; spot.Anchored = true; spot.CanCollide = false; spot.Transparency = 1; spot.Size = Vector3.new(2, 2, 2)
	spot.CFrame = u.Origin.CFrame * CFrame.new(5, 3, 12.5); spot.Parent = u
	local pp = K.prompt(spot, "Hire staff ($" .. HIRE .. ")", "AI employee", 0.8, 10); pp.Name = "Hire"
	pp.Triggered:Connect(function(p)
		if p.UserId ~= u:GetAttribute("OwnerId") then K.toast(p, "Only the owner can hire staff"); return end
		if u:GetAttribute("Staff") then K.toast(p, "You already have staff here"); return end
		local m = p:FindFirstChild("leaderstats") and p.leaderstats:FindFirstChild("Money")
		if not m or m.Value < HIRE then K.toast(p, "You need $" .. HIRE); return end
		m.Value -= HIRE
		local e = K.spawn(u.Origin.CFrame * CFrame.new(-4, 0, 13) * CFrame.Angles(0, math.rad(180), 0), {parent = u, shirt = Color3.fromRGB(20, 20, 24), pants = Color3.fromRGB(20, 20, 24)})
		if e then e.Name = "Staff"; e.HumanoidRootPart.Anchored = true; K.bubble(e, "Hi, I'm " .. K.name() .. "! 👋") ; task.delay(4, function() K.bubble(e, nil) end) end
		u:SetAttribute("Staff", true); pp.Enabled = false
		K.toast(p, "Staff hired! They serve customers for you (you keep 70%)")
	end)
end
while true do
	for _, u in ipairs(units:GetChildren()) do
		local owner = u:GetAttribute("OwnerId")
		if owner and not u:FindFirstChild("StaffSpot") and u:FindFirstChild("Origin") then setup(u) end
		if not owner and u:FindFirstChild("StaffSpot") then
			u.StaffSpot:Destroy(); local e = u:FindFirstChild("Staff"); if e then e:Destroy() end; u:SetAttribute("Staff", nil)
		end
		-- staff serve after 5 s
		if owner and u:GetAttribute("Staff") and u:GetAttribute("Waiting") and not u:GetAttribute("StaffBusy") then
			u:SetAttribute("StaffBusy", true)
			task.delay(5, function()
				u:SetAttribute("StaffBusy", nil)
				local c = u:FindFirstChild("Customer")
				if not (c and u:GetAttribute("Waiting")) then return end
				u:SetAttribute("Waiting", nil)
				local sp = u:FindFirstChild("ServePoint"); if sp and sp:FindFirstChild("Serve") then sp.Serve.Enabled = false end
				local kind = u:GetAttribute("Type"); local price = math.floor((Kit.TYPES[kind] and Kit.TYPES[kind].price or 15) * (u:GetAttribute("PriceMult") or 1)) + (u:GetAttribute("Decor") and 3 or 0)
				local p = Players:GetPlayerByUserId(owner)
				if p then K.pay(p, math.floor(price * 0.7), "your staff served a customer") end
				local e = u:FindFirstChild("Staff"); if e then K.bubble(e, "Thank you, come again! 😊"); task.delay(3, function() if e.Parent then K.bubble(e, nil) end end) end
				local hum = c:FindFirstChildOfClass("Humanoid")
				if hum then hum:MoveTo((u.Origin.CFrame * CFrame.new(0, 0, -30)).Position) end
				task.delay(5, function() if c.Parent then c:Destroy() end end)
			end)
		end
	end
	task.wait(1)
end
