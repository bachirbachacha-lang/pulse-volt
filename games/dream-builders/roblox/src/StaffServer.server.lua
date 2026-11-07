-- AI employees v2: hire up to 3 staff ($150 each). Staff serve waiting customers by themselves (faster with more staff),
-- the owner keeps 70% of each sale, and pays each staff member $5 wages every minute. If you can't pay, someone quits.
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local Kit = require(game.ServerStorage.DB_Tools.BusinessKit)
local units = workspace:WaitForChild("DreamBuilders"):WaitForChild("Businesses")
local HIRE, MAX, WAGE = 150, 3, 5
local SPOTS = {CFrame.new(-4, 0, 13), CFrame.new(4, 0, 13), CFrame.new(-8, 0, 6)}
local function staff(u) local t = {}; for _, c in ipairs(u:GetChildren()) do if c.Name == "Staff" then t[#t + 1] = c end end; return t end
local function money(p) local ls = p:FindFirstChild("leaderstats"); return ls and ls:FindFirstChild("Money") end
local function refresh(u)
	local n = #staff(u)
	u:SetAttribute("Staff", n > 0 and true or nil); u:SetAttribute("StaffCount", n)
	local sp = u:FindFirstChild("StaffSpot"); if sp and sp:FindFirstChild("Hire") then
		sp.Hire.Enabled = n < MAX; sp.Hire.ActionText = "Hire staff #" .. (n + 1) .. " ($" .. HIRE .. ")"
	end
end
local function setup(u)
	local spot = Instance.new("Part"); spot.Name = "StaffSpot"; spot.Anchored = true; spot.CanCollide = false; spot.Transparency = 1; spot.Size = Vector3.new(2, 2, 2)
	spot.CFrame = u.Origin.CFrame * CFrame.new(5, 3, 12.5); spot.Parent = u
	local pp = K.prompt(spot, "Hire staff #1 ($" .. HIRE .. ")", "AI employee", 0.8, 10); pp.Name = "Hire"
	pp.Triggered:Connect(function(p)
		if p.UserId ~= u:GetAttribute("OwnerId") then K.toast(p, "Only the owner can hire staff"); return end
		local n = #staff(u); if n >= MAX then K.toast(p, "Your team is full (" .. MAX .. ")"); return end
		local m = money(p); if not m or m.Value < HIRE then K.toast(p, "You need $" .. HIRE); return end
		m.Value -= HIRE
		local e = K.spawn(u.Origin.CFrame * SPOTS[n + 1] * CFrame.Angles(0, math.rad(180), 0), {parent = u, shirt = Color3.fromRGB(20, 20, 24), pants = Color3.fromRGB(20, 20, 24)})
		if e then
			local nm = e.Name; e.Name = "Staff"; e:SetAttribute("StaffName", nm); e.HumanoidRootPart.Anchored = true
			K.bubble(e, "Hi, I'm " .. nm .. "! 👋"); task.delay(4, function() if e.Parent then K.bubble(e, nil) end end)
		end
		refresh(u)
		K.toast(p, "Staff hired (" .. #staff(u) .. "/" .. MAX .. "). Wages: $" .. WAGE .. " each per minute")
	end)
	refresh(u)
end
-- wages every minute
task.spawn(function()
	while true do
		task.wait(60)
		for _, u in ipairs(units:GetChildren()) do
			local owner = u:GetAttribute("OwnerId"); local team = staff(u)
			if owner and #team > 0 then
				local p = Players:GetPlayerByUserId(owner)
				local m = p and money(p)
				local bill = WAGE * #team
				if m and m.Value >= bill then m.Value -= bill; K.toast(p, "Paid staff wages: $" .. bill)
				else
					local quit = team[#team]; K.bubble(quit, "No pay, I quit! 😠", Color3.fromRGB(255, 200, 200)); task.delay(3, function() if quit.Parent then quit:Destroy(); refresh(u) end end)
					if p then K.toast(p, "A staff member quit: you couldn't pay wages") end
				end
			end
		end
	end
end)
while true do
	for _, u in ipairs(units:GetChildren()) do
		local owner = u:GetAttribute("OwnerId")
		if owner and not u:FindFirstChild("StaffSpot") and u:FindFirstChild("Origin") then setup(u) end
		if not owner and u:FindFirstChild("StaffSpot") then
			u.StaffSpot:Destroy(); for _, e in ipairs(staff(u)) do e:Destroy() end; u:SetAttribute("Staff", nil); u:SetAttribute("StaffCount", nil)
		end
		local team = owner and staff(u) or {}
		if #team > 0 and u:GetAttribute("Waiting") and not u:GetAttribute("StaffBusy") then
			u:SetAttribute("StaffBusy", true)
			task.delay(math.max(2, 6 - 1.5 * (#team - 1)), function()
				u:SetAttribute("StaffBusy", nil)
				local c = u:FindFirstChild("Customer")
				if not (c and u:GetAttribute("Waiting")) then return end
				u:SetAttribute("Waiting", nil)
				local sp = u:FindFirstChild("ServePoint"); if sp and sp:FindFirstChild("Serve") then sp.Serve.Enabled = false end
				local kind = u:GetAttribute("Type")
				local price = math.floor((Kit.TYPES[kind] and Kit.TYPES[kind].price or 15) * (u:GetAttribute("PriceMult") or 1)) + (u:GetAttribute("Decor") and 3 or 0)
				local p = Players:GetPlayerByUserId(owner)
				if p then K.pay(p, math.floor(price * 0.7), "your staff served a customer") end
				local e = team[math.random(#team)]; if e.Parent then K.bubble(e, "Thank you, come again! 😊"); task.delay(3, function() if e.Parent then K.bubble(e, nil) end end) end
				-- bigger team = next customer sooner
				u:SetAttribute("NextCustomer", os.clock() + (u:GetAttribute("CustomerGap") or 12) / #team)
				local hum = c:FindFirstChildOfClass("Humanoid")
				if hum then hum:MoveTo((u.Origin.CFrame * CFrame.new(0, 0, -30)).Position) end
				task.delay(5, function() if c.Parent then c:Destroy() end end)
			end)
		end
	end
	task.wait(1)
end
