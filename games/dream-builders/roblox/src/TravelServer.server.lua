-- Travel: Dream Air flights to the Maldives resort (a far island inside this game world; real other-country servers need
-- the game published + TeleportService) and phone taxi rides (an AI taxi picks you up and drops you at your destination).
local Players, RS = game:GetService("Players"), game:GetService("ReplicatedStorage")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local db = workspace:WaitForChild("DreamBuilders")
local fade = RS:FindFirstChild("ScreenFade") or Instance.new("RemoteEvent"); fade.Name = "ScreenFade"; fade.Parent = RS
local taxiRF = RS:FindFirstChild("TaxiRequest") or Instance.new("RemoteFunction"); taxiRF.Name = "TaxiRequest"; taxiRF.Parent = RS
local function money(p) local ls = p:FindFirstChild("leaderstats"); return ls and ls:FindFirstChild("Money") end
local function standUp(p)
	local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid"); if not hum or not hum.SeatPart then return end
	local seat = hum.SeatPart; hum.Sit = false
	local t0 = os.clock(); while (hum.SeatPart or seat:FindFirstChild("SeatWeld")) and os.clock() - t0 < 1.5 do task.wait(0.05) end
	local w = seat:FindFirstChild("SeatWeld"); if w then w:Destroy() end
end
local busy = {}
---------------------------------------------------------------- flights
local terminal = db:WaitForChild("Airport"):WaitForChild("Terminal")
local resort = db:WaitForChild("Maldives")
local FARE = 150
local fp = K.prompt(terminal.TicketDesk, "Fly to the Maldives ($" .. FARE .. ")", "Dream Air", 0.8, 12)
fp.Triggered:Connect(function(p)
	if busy[p] then return end
	local m = money(p); if not m or m.Value < FARE then K.toast(p, "A ticket costs $" .. FARE); return end
	busy[p] = true; m.Value -= FARE
	standUp(p)
	fade:FireClient(p, "✈️  Dream Air flight DA 101 to the Maldives…", 5)
	task.wait(2.5)
	local r = p.Character and p.Character:FindFirstChild("HumanoidRootPart")
	if r then r.CFrame = resort.ArrivalSpot.CFrame + Vector3.new(0, 3, 0) end
	task.wait(3)
	K.msg(p, "Dream Air", "Welcome to the Maldives! 🌴 Fly home any time at the seaplane desk on the dock (free).")
	busy[p] = nil
end)
local hp = K.prompt(resort.SeaplaneDesk, "Fly home (free)", "Dream Air", 0.8, 12)
hp.Triggered:Connect(function(p)
	if busy[p] then return end
	busy[p] = true; standUp(p)
	fade:FireClient(p, "✈️  Flying home to Dream City…", 5)
	task.wait(2.5)
	local r = p.Character and p.Character:FindFirstChild("HumanoidRootPart")
	if r then r.CFrame = CFrame.new(-500, 5, 1425) end
	task.wait(3); busy[p] = nil
end)
---------------------------------------------------------------- taxi
local function groundAt(pos, ignore)
	local rp = RaycastParams.new(); rp.FilterType = Enum.RaycastFilterType.Exclude; rp.FilterDescendantsInstances = ignore; rp.RespectCanCollide = true
	local h = workspace:Raycast(pos + Vector3.new(0, 60, 0), Vector3.new(0, -200, 0), rp); return h and h.Position.Y or pos.Y
end
local function makeTaxi()
	local src = workspace:FindFirstChild("EverydaySedan"); if not src then return end
	local c = src:Clone(); c.Name = "Taxi"
	for _, d in ipairs(c:GetDescendants()) do
		if d:IsA("Script") or d:IsA("LocalScript") or d:IsA("ProximityPrompt") or d:IsA("Sound") then d:Destroy()
		elseif d:IsA("VehicleSeat") or d:IsA("Seat") then d.Disabled = true end
		if d:IsA("BasePart") then d.Anchored = true; d.CanCollide = false; d.CanTouch = false; if d.Name:find("Paint") then d.Color = Color3.fromRGB(245, 195, 30) end end
	end
	c:SetAttribute("Watched", true)
	local cf, size = c:GetBoundingBox()
	local sign = Instance.new("Part"); sign.Name = "TaxiSign"; sign.Anchored = true; sign.CanCollide = false; sign.Size = Vector3.new(2.4, 0.8, 1); sign.Color = Color3.fromRGB(255, 220, 60); sign.Material = Enum.Material.Neon
	sign.CFrame = cf * CFrame.new(0, size.Y / 2 + 0.4, 1); sign.Parent = c
	local seat = Instance.new("Seat"); seat.Name = "PassengerSeat"; seat.Anchored = true; seat.Transparency = 1; seat.CanCollide = false; seat.Size = Vector3.new(2, 1, 2)
	seat.CFrame = c.DriverSeat.CFrame * CFrame.new(0, 0, 3.5); seat.Parent = c
	local d, hum = K.spawn(c.DriverSeat.CFrame, {parent = c, shirt = Color3.fromRGB(245, 195, 30)})
	if d then d.Name = "TaxiDriver"; for _, x in ipairs(d:GetDescendants()) do if x:IsA("BasePart") then x.Anchored = true; x.CanCollide = false end end; d:PivotTo(c.DriverSeat.CFrame * CFrame.new(0, 1.2, 0)) end
	c.ModelStreamingMode = Enum.ModelStreamingMode.Persistent
	return c
end
local lastTaxi = {}
taxiRF.OnServerInvoke = function(p, destName)
	if busy[p] then return "Already riding" end
	if lastTaxi[p] and os.clock() - lastTaxi[p] < 12 then return "Wait a moment" end
	local dest = game.ServerStorage.PlacesAPI:Invoke(p, tostring(destName)); if typeof(dest) ~= "Vector3" then return "Unknown place" end
	local char = p.Character; local hum = char and char:FindFirstChildOfClass("Humanoid"); local r = char and char:FindFirstChild("HumanoidRootPart")
	if not r or hum.SeatPart then return "Get out of your seat first" end
	local fare = 5 + math.floor((dest - r.Position).Magnitude / 120)
	local m = money(p); if not m or m.Value < fare then return "Taxi fare is $" .. fare end
	m.Value -= fare; busy[p] = true; lastTaxi[p] = os.clock()
	task.spawn(function()
		local taxi = makeTaxi(); if not taxi then busy[p] = nil; return end
		local look = r.CFrame.LookVector * Vector3.new(1, 0, 1); look = look.Magnitude > 0 and look.Unit or Vector3.new(0, 0, -1)
		local side = Vector3.new(-look.Z, 0, look.X)
		local cf, size = taxi:GetBoundingBox(); local lift = taxi:GetPivot().Position.Y - (cf.Position.Y - size.Y / 2)
		local spot = r.Position + side * 9
		local function place(pos, dir) taxi:PivotTo(CFrame.lookAt(Vector3.new(pos.X, groundAt(pos, {taxi, char}) + lift + 0.1, pos.Z), Vector3.new(pos.X, groundAt(pos, {taxi, char}) + lift + 0.1, pos.Z) + dir)) end
		-- arrives from behind
		taxi.Parent = workspace
		for t = 0, 1, 0.05 do place(spot - look * (30 * (1 - t)), look); task.wait(0.05) end
		K.toast(p, "🚕 Your taxi is here! Fare $" .. fare)
		task.wait(0.4)
		taxi.PassengerSeat:Sit(hum)
		task.wait(0.6)
		-- drive off, fade, arrive
		for t = 0, 1, 0.04 do place(spot + look * (40 * t), look); task.wait(0.05) end
		fade:FireClient(p, "🚕  Taxi to " .. tostring(destName) .. "…", 3)
		task.wait(1.4)
		local dir = (dest - r.Position) * Vector3.new(1, 0, 1); dir = dir.Magnitude > 1 and dir.Unit or look
		local stop = dest - dir * 6 + Vector3.new(-dir.Z, 0, dir.X) * 6
		place(stop, dir)
		task.wait(1.8)
		standUp(p)
		task.wait(0.1)
		if r.Parent then r.CFrame = CFrame.new(dest + Vector3.new(0, 1, 0)) end
		K.toast(p, "Arrived at " .. tostring(destName) .. " 👋")
		busy[p] = nil
		for t = 0, 1, 0.05 do place(stop + dir * (40 * t), dir); task.wait(0.05) end
		taxi:Destroy()
	end)
	return "Taxi on the way ($" .. fare .. ")"
end
Players.PlayerRemoving:Connect(function(p) busy[p] = nil; lastTaxi[p] = nil end)
