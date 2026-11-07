-- Dream Metro: street gate -> platform, platform -> street, board the train when it's docked, get out at the next station.
local Players = game:GetService("Players")
local metro = workspace:WaitForChild("DreamBuilders"):WaitForChild("Metro")
local train = metro:WaitForChild("Trains"):WaitForChild("Train1")
local stations = {}
for _, s in ipairs(metro:GetChildren()) do
	if s:IsA("Model") and s.Name:find("^Station_") then
		local gate = s:FindFirstChild("TicketGate")
		local north
		for _, p in ipairs(s:GetChildren()) do if p.Name == "Platform" and (not north or p.Position.Z > north.Position.Z) then north = p end end
		if gate and north then table.insert(stations, {name = s.Name:sub(9), gate = gate, platform = north, model = s}) end
	end
end
local function platformSpot(st, dx)
	local p = st.platform
	return CFrame.new(p.Position.X + (dx or -20), p.Position.Y + p.Size.Y / 2 + 3, p.Position.Z + 1) * CFrame.Angles(0, math.pi, 0)
end
local function nearest(x)
	local best
	for _, st in ipairs(stations) do if not best or math.abs(st.platform.Position.X - x) < math.abs(best.platform.Position.X - x) then best = st end end
	return best
end
for _, st in ipairs(stations) do
	local pr = st.gate:FindFirstChild("RideMetro")
	pr.ActionText = "Enter platform"; pr.ObjectText = "Dream Metro · " .. st.name
	pr.Triggered:Connect(function(plr)
		local r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
		if r then r.CFrame = platformSpot(st) end
	end)
	-- exit point on the platform, by the stairs
	local ex = st.model:FindFirstChild("ExitPoint") or Instance.new("Part")
	ex.Name = "ExitPoint"; ex.Anchored = true; ex.CanCollide = false; ex.Size = Vector3.new(4, 6, 1)
	ex.Color = Color3.fromRGB(30, 140, 70); ex.Material = Enum.Material.SmoothPlastic
	ex.CFrame = CFrame.new(st.platform.Position.X - 46, st.platform.Position.Y + st.platform.Size.Y / 2 + 3, st.platform.Position.Z + 4.4)
	ex.Parent = st.model
	local g = ex:FindFirstChild("SurfaceGui") or Instance.new("SurfaceGui"); g.Face = Enum.NormalId.Front; g.Parent = ex
	local t = g:FindFirstChild("TextLabel") or Instance.new("TextLabel"); t.Size = UDim2.fromScale(1, 1); t.BackgroundTransparency = 1; t.TextScaled = true
	t.Font = Enum.Font.GothamBold; t.TextColor3 = Color3.new(1, 1, 1); t.Text = "EXIT ⇧ STREET"; t.Parent = g
	local ep = ex:FindFirstChild("Exit") or Instance.new("ProximityPrompt"); ep.Name = "Exit"; ep.ActionText = "Exit to street"; ep.ObjectText = st.name
	ep.HoldDuration = 0; ep.RequiresLineOfSight = false; ep.MaxActivationDistance = 10; ep.Parent = ex
	ep.Triggered:Connect(function(plr)
		local r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
		if r then r.CFrame = st.gate.CFrame * CFrame.new(0, 3, -7) end
	end)
end
-- boarding
local seats = {}
for _, d in ipairs(train:GetDescendants()) do if d:IsA("Seat") and d.Name == "MetroSeat" then table.insert(seats, d) end end
local prompts = {}
for _, d in ipairs(train:GetDescendants()) do if d:IsA("ProximityPrompt") and d.Name == "Board" then table.insert(prompts, d) end end
local function refresh()
	local docked = train:GetAttribute("Docked")
	for _, p in ipairs(prompts) do p.Enabled = docked ~= nil; p.ActionText = docked and "Board train" or "Board train" end
end
train:GetAttributeChangedSignal("Docked"):Connect(refresh); refresh()
for _, p in ipairs(prompts) do
	p.Triggered:Connect(function(plr)
		if not train:GetAttribute("Docked") then return end
		local hum = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
		if not hum or hum.SeatPart then return end
		local r = plr.Character:FindFirstChild("HumanoidRootPart")
		local best, bd
		for _, s in ipairs(seats) do
			if not s.Occupant then local d = (s.Position - r.Position).Magnitude; if not bd or d < bd then best, bd = s, d end end
		end
		if best then r.CFrame = best.CFrame + Vector3.new(0, 2, 0); task.wait(0.1); best:Sit(hum) end
	end)
end
-- getting up inside the train puts you on the platform of the station you're at (or the next one)
for _, s in ipairs(seats) do
	local rider
	s:GetPropertyChangedSignal("Occupant"):Connect(function()
		if s.Occupant then rider = s.Occupant; return end
		local hum = rider; rider = nil
		local char = hum and hum.Parent
		local r = char and char:FindFirstChild("HumanoidRootPart")
		if not r then return end
		-- wait until the seat weld is really gone, otherwise moving the player would drag the (anchored) seat with them
		local t0 = os.clock()
		while (s:FindFirstChild("SeatWeld") or (hum and hum.SeatPart)) and os.clock() - t0 < 2 do task.wait(0.05) end
		if s:FindFirstChild("SeatWeld") then s.SeatWeld:Destroy() end
		task.wait(0.1)
		local docked = train:GetAttribute("Docked")
		local st
		if docked then for _, x in ipairs(stations) do if x.name == docked then st = x end end end
		st = st or nearest(train.PrimaryPart.Position.X)
		r.CFrame = platformSpot(st, (train.PrimaryPart.Position.X - st.platform.Position.X) + (math.random() - 0.5) * 20)
	end)
end
