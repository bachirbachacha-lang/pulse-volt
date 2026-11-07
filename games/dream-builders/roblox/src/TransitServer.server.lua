-- City life (kept light on purpose): 4 AI traffic cars + 1 city bus on the ring road (x ±390, z ±705), and 6 pedestrians downtown.
-- AI cars and the bus stop when a player or a player's car is in front of them. Bus: board at a stop, it rides the loop.
local Players, Run = game:GetService("Players"), game:GetService("RunService")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local db = workspace:WaitForChild("DreamBuilders")
local T = db:WaitForChild("Transit")
local Y = 0.6 -- road top
-- ring road lanes: inner lane (clockwise when seen from above, -X..+X on the south side) and outer lane (other direction)
local function ring(h, rev)
	local pts = {Vector3.new(-h.X, Y, -h.Z), Vector3.new(h.X, Y, -h.Z), Vector3.new(h.X, Y, h.Z), Vector3.new(-h.X, Y, h.Z)}
	if rev then pts = {pts[4], pts[3], pts[2], pts[1]} end
	local R, out = 18, {}
	-- recompute arcs properly (center = b - d1*R + d2*R)
	for i = 1, 4 do
		local a, b, c = pts[i], pts[i % 4 + 1], pts[(i + 1) % 4 + 1]
		local d1, d2 = (b - a).Unit, (c - b).Unit
		local s0, s1 = a + d1 * R, b - d1 * R
		local len = (s1 - s0).Magnitude
		for t = 0, len, 4 do out[#out + 1] = s0 + d1 * t end
		local center = b - d1 * R + d2 * R
		for k = 1, 8 do local th = k / 8 * math.pi / 2; out[#out + 1] = center - d2 * R * math.cos(th) + d1 * R * math.sin(th) end
	end
	local cum = {0}
	for i = 2, #out + 1 do cum[i] = cum[i - 1] + (out[(i - 1) % #out + 1] - out[i - 1]).Magnitude end
	return {pts = out, cum = cum, total = cum[#out + 1]}
end
local INNER = ring(Vector3.new(380, 0, 695), false)
local OUTER = ring(Vector3.new(400, 0, 715), true)
local function at(path, d)
	d = d % path.total
	local lo, hi = 1, #path.pts
	while hi - lo > 1 do local mid = (lo + hi) // 2; if path.cum[mid] <= d then lo = mid else hi = mid end end
	local a, b = path.pts[lo], path.pts[lo % #path.pts + 1]
	local seg = path.cum[lo + 1] - path.cum[lo]
	local p = a:Lerp(b, seg > 0 and (d - path.cum[lo]) / seg or 0)
	return p, (b - a).Unit
end
-- something in front? (players, player-driven cars, other AI vehicles)
local blockers = {}
local bus = T:WaitForChild("CityBus")
local function blocked(me, pos, dir, dist)
	local probe = pos + dir * dist
	for _, p in ipairs(Players:GetPlayers()) do
		local r = p.Character and p.Character:FindFirstChild("HumanoidRootPart")
		local hm = p.Character and p.Character:FindFirstChildOfClass("Humanoid")
		if hm and hm.SeatPart and (hm.SeatPart:IsDescendantOf(me) or hm.SeatPart:IsDescendantOf(bus)) then r = nil end -- passengers never block
		if r then
			local rel = r.Position - pos; local ahead = rel:Dot(dir); local side = (rel - dir * ahead).Magnitude
			if ahead > 0 and ahead < dist and side < 7 and math.abs(rel.Y) < 12 then return true end
		end
	end
	for v, info in pairs(blockers) do
		if v ~= me and v.Parent then
			local rel = info.pos - pos; local ahead = rel:Dot(dir); local side = (rel - dir * ahead).Magnitude
			if ahead > 0 and ahead < dist and side < 6 then return true end
		end
	end
	return false
end
local SIG = db:WaitForChild("Signals")
local JUNCTIONS = {}
for _, j in ipairs(SIG:GetChildren()) do JUNCTIONS[#JUNCTIONS + 1] = Vector3.new(j:GetAttribute("X"), 0, j:GetAttribute("Z")) end
local function redAhead(pos, dir)
	local axis = math.abs(dir.Z) > math.abs(dir.X) and "NS" or "EW"
	if SIG:GetAttribute("Green") == axis then return false end
	for _, j in ipairs(JUNCTIONS) do
		local rel = (j - pos) * Vector3.new(1, 0, 1)
		local ahead = rel:Dot(dir)
		local side = (rel - dir * ahead).Magnitude
		if ahead > 22 and ahead < 40 and side < 30 then return true end
	end
	return false
end
local function lift(m) local cf, sz = m:GetBoundingBox(); return m:GetPivot().Position.Y - (cf.Position.Y - sz.Y / 2) end
---------------------------------------------------------------- traffic cars (copies of city cars, no seats/scripts)
local traffic = T:FindFirstChild("Traffic") or Instance.new("Folder"); traffic.Name = "Traffic"; traffic.Parent = T
traffic:ClearAllChildren()
local COLORS = {Color3.fromRGB(240, 240, 238), Color3.fromRGB(25, 26, 30), Color3.fromRGB(150, 155, 160), Color3.fromRGB(120, 20, 30)}
local plan = {{"EverydaySedan", INNER, 0}, {"LuxurySedan", INNER, 0.5}, {"BigSUV", OUTER, 0.25}, {"ClassicCar", OUTER, 0.75}}
local movers = {}
for i, pl in ipairs(plan) do
	local src = workspace:FindFirstChild(pl[1])
	if src then
		local c = src:Clone(); c.Name = "Traffic_" .. pl[1]
		for _, d in ipairs(c:GetDescendants()) do
			if d:IsA("Script") or d:IsA("LocalScript") or d:IsA("ProximityPrompt") or d:IsA("Sound") then d:Destroy()
			elseif d:IsA("VehicleSeat") or d:IsA("Seat") then d.Disabled = true end
			if d:IsA("BasePart") then d.Anchored = true; d.CanCollide = false; d.CanTouch = false end
		end
		c:SetAttribute("Watched", true)
		c.ModelStreamingMode = Enum.ModelStreamingMode.Atomic
		c.Parent = traffic
		movers[#movers + 1] = {model = c, path = pl[2], d = pl[3] * pl[2].total, speed = 42, lift = lift(c), v = 0}
	end
end
---------------------------------------------------------------- bus + stops
local busLift = 0 -- wheels already sit at y=0 in the model
local STOPS = {{"Downtown", 0.12}, {"Palm Beach", 0.37}, {"Palm Hills", 0.62}, {"Show Villas", 0.87}}
local stopsF = T:FindFirstChild("Stops") or Instance.new("Folder"); stopsF.Name = "Stops"; stopsF.Parent = T
stopsF:ClearAllChildren()
local busM = {model = bus, path = OUTER, d = 0, speed = 30, lift = busLift, v = 0, isBus = true}
local stopD = {}
for i, st in ipairs(STOPS) do
	local d = st[2] * OUTER.total; stopD[i] = d
	local p, dir = at(OUTER, d)
	local right = Vector3.new(-dir.Z, 0, dir.X)
	local sp = p + right * 17 -- sidewalk outside the outer lane
	local sh = Instance.new("Model"); sh.Name = "Stop_" .. st[1]; sh.Parent = stopsF
	local cf = CFrame.lookAt(Vector3.new(sp.X, 1.2, sp.Z), Vector3.new(sp.X, 1.2, sp.Z) - right)
	local function bp(n, size, off, col, mat, tr)
		local q = Instance.new("Part"); q.Name = n; q.Anchored = true; q.Size = size; q.CFrame = cf * off; q.Color = col; q.Material = mat or Enum.Material.SmoothPlastic; q.Transparency = tr or 0; q.Parent = sh; return q
	end
	bp("Roof", Vector3.new(10, 0.4, 4), CFrame.new(0, 8, 0), Color3.fromRGB(30, 32, 36), Enum.Material.Metal)
	bp("Back", Vector3.new(10, 6, 0.2), CFrame.new(0, 4.6, 1.8), Color3.fromRGB(180, 210, 230), Enum.Material.Glass, 0.5)
	for _, x in ipairs({-4.8, 4.8}) do bp("Post", Vector3.new(0.3, 7.6, 0.3), CFrame.new(x, 4, 1.8), Color3.fromRGB(30, 32, 36), Enum.Material.Metal) end
	bp("Bench", Vector3.new(7, 0.4, 1.6), CFrame.new(0, 2, 1), Color3.fromRGB(212, 170, 90), Enum.Material.Wood)
	local sg = bp("Sign", Vector3.new(4, 1.2, 0.2), CFrame.new(-3, 7, -0.2), Color3.fromRGB(10, 10, 12))
	local gui = Instance.new("SurfaceGui"); gui.Face = Enum.NormalId.Front; gui.PixelsPerStud = 40; gui.Parent = sg
	local tl = Instance.new("TextLabel"); tl.Size = UDim2.fromScale(1, 1); tl.BackgroundTransparency = 1; tl.TextScaled = true; tl.Font = Enum.Font.GothamBold; tl.TextColor3 = Color3.fromRGB(255, 170, 40); tl.Text = "🚌 " .. st[1]; tl.Parent = gui
	local pp = K.prompt(sg, "Board the bus", "Bus stop · " .. st[1], 0.3, 14); pp.Enabled = false; pp.Name = "Board"
	pp.Triggered:Connect(function(p)
		if bus:GetAttribute("AtStop") ~= i then return end
		local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid"); if not hum or hum.SeatPart then return end
		for _, seat in ipairs(bus:GetChildren()) do
			if seat:IsA("Seat") and not seat.Occupant then seat:Sit(hum); K.toast(p, "🚌 Free ride! Press Space to get off"); return end
		end
		K.toast(p, "The bus is full")
	end)
end
---------------------------------------------------------------- main loop
local dwellUntil, lastStop = 0, 0
Run.Heartbeat:Connect(function(dt)
	for _, m in ipairs(movers) do
		local p, dir = at(m.path, m.d)
		blockers[m.model] = {pos = p}
		local want = (blocked(m.model, p, dir, 26) or redAhead(p, dir)) and 0 or m.speed
		m.v = m.v + math.clamp(want - m.v, -60 * dt, 20 * dt)
		m.d += m.v * dt
		local q, dq = at(m.path, m.d + 6)
		m.model:PivotTo(CFrame.lookAt(p + Vector3.new(0, m.lift, 0), p + Vector3.new(0, m.lift, 0) + (q - p).Unit * Vector3.new(1, 0, 1)))
	end
	-- bus
	local p, dir = at(OUTER, busM.d)
	blockers[bus] = {pos = p}
	local now = os.clock()
	local want = busM.speed
	if now < dwellUntil then want = 0 else
		bus:SetAttribute("AtStop", nil)
		for i, d in ipairs(stopD) do
			local ahead = (d - busM.d) % OUTER.total
			if ahead < 25 and lastStop ~= i then want = math.min(want, math.max(4, ahead * 1.2)) end
			if ahead < 0.8 and lastStop ~= i then dwellUntil = now + 9; lastStop = i; bus:SetAttribute("AtStop", i); want = 0 end
		end
		if blocked(bus, p, dir, 30) or redAhead(p, dir) then want = 0 end
	end
	for i, st in ipairs(stopsF:GetChildren()) do local b = st:FindFirstChild("Sign") and st.Sign:FindFirstChild("Board"); if b then b.Enabled = bus:GetAttribute("AtStop") == tonumber(st:GetAttribute("Index")) end end
	busM.v = busM.v + math.clamp(want - busM.v, -40 * dt, 12 * dt)
	busM.d += busM.v * dt
	local q = at(OUTER, busM.d + 8)
	local bp = p + Vector3.new(0, 2, 0)
	bus:PivotTo(CFrame.lookAt(bp, bp + (q - p).Unit * Vector3.new(1, 0, 1)))
end)
for i, st in ipairs(STOPS) do stopsF["Stop_" .. st[1]]:SetAttribute("Index", i) end
---------------------------------------------------------------- pedestrians (only 6)
local WALKS = {
	{Vector3.new(-330, 1.2, 732), Vector3.new(330, 1.2, 732)},
	{Vector3.new(330, 1.2, 678), Vector3.new(-330, 1.2, 678)},
	{Vector3.new(-200, 1.2, 732), Vector3.new(250, 1.2, 732)},
	{Vector3.new(150, 1.2, 678), Vector3.new(-250, 1.2, 678)},
	{Vector3.new(417, 1.2, -600), Vector3.new(417, 1.2, 600)},
	{Vector3.new(-417, 1.2, 500), Vector3.new(-417, 1.2, -500)},
}
local peds = T:FindFirstChild("People") or Instance.new("Folder"); peds.Name = "People"; peds.Parent = T
for _, w in ipairs(WALKS) do
	task.spawn(function()
		local m, hum = K.spawn(CFrame.new(w[1]), {parent = peds}); if not m then return end
		hum.WalkSpeed = 7 + math.random() * 3
		local i = 2
		while m.Parent do
			K.walk(m, w[i], 200)
			task.wait(math.random(2, 6))
			i = i == 1 and 2 or 1
		end
	end)
end
