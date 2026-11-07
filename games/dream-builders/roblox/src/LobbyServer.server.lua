-- Downtown tower lobbies: automatic doors, Dream Bank (tellers + ATMs), Sky Tower lift to the 270m Sky Deck,
-- Dream Café (barista sells drinks). Staff are AI people that stay at their posts.
local Players, TweenService = game:GetService("Players"), game:GetService("TweenService")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local DB = workspace:WaitForChild("DreamBuilders")
local F = DB:WaitForChild("Downtown"):WaitForChild("Facades")

---------------------------------------------------------------- automatic sliding doors
local doors = {}
for _, d in ipairs(DB:GetDescendants()) do
	if d:IsA("BasePart") and d:GetAttribute("AutoDoor") then
		doors[#doors + 1] = {part = d, closed = d.CFrame, open = false}
	end
end
-- pair doors so each slides away from the other
for _, a in ipairs(doors) do
	local nearest, best = nil, 20
	for _, b in ipairs(doors) do
		if b ~= a then local dist = (a.closed.Position - b.closed.Position).Magnitude; if dist < best then nearest, best = b, dist end end
	end
	local dir = nearest and (a.closed.Position - nearest.closed.Position) or a.closed.RightVector
	dir = Vector3.new(dir.X, 0, dir.Z).Unit
	a.openCF = a.closed + dir * (math.max(a.part.Size.X, a.part.Size.Z) - 0.3)
end
task.spawn(function()
	while true do
		task.wait(0.25)
		local roots = {}
		for _, p in ipairs(Players:GetPlayers()) do local r = p.Character and p.Character:FindFirstChild("HumanoidRootPart"); if r then roots[#roots + 1] = r.Position end end
		for _, dr in ipairs(doors) do
			local near = false
			for _, r in ipairs(roots) do if (r - dr.closed.Position).Magnitude < 13 then near = true; break end end
			if near ~= dr.open then
				dr.open = near
				dr.part.CanCollide = not near
				TweenService:Create(dr.part, TweenInfo.new(0.5, Enum.EasingStyle.Quad), {CFrame = near and dr.openCF or dr.closed}):Play()
			end
		end
	end
end)

---------------------------------------------------------------- staff at their posts
local function staff(spot, title, shirt)
	local cf = CFrame.lookAt(spot.Position, spot.Position + Vector3.new(0, 0, -1))
	local m, hum = K.spawn(cf, {name = title, shirt = shirt, parent = spot.Parent})
	if not m then return end
	hum.WalkSpeed = 0
	m.HumanoidRootPart.Anchored = true
	m:PivotTo(cf + Vector3.new(0, 3, 0))
	return m
end
local function money(p) local ls = p:FindFirstChild("leaderstats"); return ls and ls:FindFirstChild("Money") end

---------------------------------------------------------------- Dream Bank (Tower2)
local bank = F:FindFirstChild("Tower2") and F.Tower2:FindFirstChild("Lobby")
if bank then
	for _, d in ipairs(bank.Furniture:GetChildren()) do
		if d.Name == "TellerSpot" then
			local m = staff(d, "Teller " .. d:GetAttribute("Teller"), Color3.fromRGB(25, 40, 80))
			if m then
				local pp = K.prompt(m.HumanoidRootPart, "Talk", "Bank teller", 0, 12)
				pp.Triggered:Connect(function(p)
					local mv = money(p)
					K.bubble(m, "Welcome to Dream Bank! Your balance is $" .. (mv and mv.Value or 0) .. ". Send money in Phone › Bank.")
				end)
			end
		elseif d.Name == "ATM" then
			local pp = K.prompt(d, "Check balance", "ATM", 0, 8)
			pp.Triggered:Connect(function(p)
				local mv = money(p)
				K.toast(p, "🏦 Dream Bank balance: $" .. (mv and mv.Value or 0))
			end)
		end
	end
end

---------------------------------------------------------------- Sky Tower lift (Tower5)
local sky = F:FindFirstChild("Tower5")
local lobby5 = sky and sky:FindFirstChild("Lobby")
local deck = sky and sky:FindFirstChild("SkyDeck")
if lobby5 and deck then
	local up, down
	for _, d in ipairs(lobby5.Furniture:GetChildren()) do
		if d:GetAttribute("SkyLift") then up = d end
		if d:GetAttribute("Staff") then staff(d, "Sky Tower host", Color3.fromRGB(120, 20, 30)) end
	end
	for _, d in ipairs(deck:GetChildren()) do if d:GetAttribute("SkyLiftDown") then down = d end end
	local arrive = deck:FindFirstChild("DeckArrive")
	local cool = {}
	local function ride(p, target, msg)
		if cool[p] and os.clock() - cool[p] < 3 then return end
		cool[p] = os.clock()
		local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid")
		if not hum or hum.SeatPart then return end
		local fade = game.ReplicatedStorage:FindFirstChild("ScreenFade")
		-- send the caption + duration the Phone fade expects (no text made Phone:342 error); wait 0.9 s so the move happens on a fully black screen
		if fade and fade:IsA("RemoteEvent") then fade:FireClient(p, msg, 2.5) ; task.wait(0.9) end
		p.Character:PivotTo(target)
		K.toast(p, msg)
	end
	if up and arrive then
		local pp = K.prompt(up, "Ride to Sky Deck", "Elevator · 270m", 0.3, 10)
		pp.Triggered:Connect(function(p) ride(p, arrive.CFrame + Vector3.new(0, 3.5, 0), "🌇 Sky Deck — the best view in Dream City") end)
	end
	if down and up then
		local pp = K.prompt(down, "Go down to the lobby", "Elevator", 0.3, 10)
		pp.Triggered:Connect(function(p) ride(p, up.CFrame * CFrame.new(0, -1, -6) * CFrame.Angles(0, math.pi, 0), "Back in the Sky Tower lobby") end)
	end
	for _, d in ipairs(deck:GetChildren()) do
		if d:GetAttribute("Telescope") then
			local pp = K.prompt(d, "Look", "Telescope", 0, 8)
			pp.Triggered:Connect(function(p) K.toast(p, "🔭 You can see Palm Island, the port and the airport from here!") end)
		end
	end
end

---------------------------------------------------------------- Dream Café (Tower6)
local cafe = F:FindFirstChild("Tower6") and F.Tower6:FindFirstChild("Lobby")
if cafe then
	local MENU = {{"Karak Tea", 3}, {"Latte", 5}, {"Fresh Juice", 4}}
	local barista
	for _, d in ipairs(cafe.Furniture:GetChildren()) do
		if d:GetAttribute("Staff") then barista = staff(d, "Barista", Color3.fromRGB(110, 70, 40)) end
	end
	local spot
	for _, d in ipairs(cafe.Furniture:GetChildren()) do if d:GetAttribute("CafeOrder") then spot = d end end
	if spot then
		local last = {}
		for i, item in ipairs(MENU) do
			local att = Instance.new("Attachment"); att.Position = Vector3.new((i - 2) * 1.5, 0, 0); att.Parent = spot
			local pp = K.prompt(att, "Buy " .. item[1] .. " $" .. item[2], "Dream Café", 0, 10)
			pp.KeyboardKeyCode = ({Enum.KeyCode.E, Enum.KeyCode.F, Enum.KeyCode.G})[i]
			pp.Exclusivity = Enum.ProximityPromptExclusivity.AlwaysShow
			pp.Triggered:Connect(function(p)
				if last[p] and os.clock() - last[p] < 4 then return end
				last[p] = os.clock()
				local mv = money(p)
				if not mv or mv.Value < item[2] then K.toast(p, "Not enough money"); return end
				mv.Value -= item[2]
				local t = Instance.new("Tool"); t.Name = item[1]; t.CanBeDropped = false; t.RequiresHandle = true
				local h = Instance.new("Part"); h.Name = "Handle"; h.Size = Vector3.new(0.7, 1, 0.7); h.Color = item[1] == "Latte" and Color3.fromRGB(230, 210, 180) or (item[1] == "Karak Tea" and Color3.fromRGB(190, 140, 90) or Color3.fromRGB(250, 160, 40)); h.Parent = t
				t.Activated:Connect(function()
					local hum = t.Parent and t.Parent:FindFirstChildOfClass("Humanoid")
					if hum then hum.Health = math.min(hum.MaxHealth, hum.Health + 15) end
					t:Destroy()
				end)
				t.Parent = p:FindFirstChild("Backpack")
				if barista then K.bubble(barista, "Here's your " .. item[1] .. "! ☕") end
				K.toast(p, "-$" .. item[2] .. "  " .. item[1] .. " (in your backpack)")
			end)
		end
	end
end
