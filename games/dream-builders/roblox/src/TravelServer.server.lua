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
---------------------------------------------------------------- taxi (drives the real road network)
local Run = game:GetService("RunService")
-- road graph: nodes are intersections / road ends; edges are roads that really exist on the map
local N, E = {}, {}
local function node(x, z) local k = x .. "," .. z; if not N[k] then N[k] = Vector3.new(x, 0.6, z); E[k] = {} end; return k end
local function link(a, b) table.insert(E[a], b); table.insert(E[b], a) end
local function line(pts) local prev; for _, p in ipairs(pts) do local k = node(p[1], p[2]); if prev then link(prev, k) end; prev = k end end
for _, z in ipairs({705, 474, 150, -150, -450}) do line({{-750, z}, {-390, z}, {390, z}, {750, z}}) end
line({{-750, -705}, {-390, -705}, {390, -705}, {716, -705}, {750, -705}})
for _, x in ipairs({-390, 390}) do line({{x, 705}, {x, 474}, {x, 150}, {x, -150}, {x, -450}, {x, -705}}) end
line({{750, -450}, {1250, -450}, {1580, -450}, {1880, -450}})          -- bridge + island boulevard
line({{-750, 705}, {-800, 705}, {-800, 1400}, {-500, 1400}})            -- airport road
line({{716, -705}, {716, -930}, {716, -1340}})                          -- port road
line({{716, -930}, {675, -930}, {0, -930}, {-675, -930}})               -- Palm Hills road
local function nearest(pos) local best, bd; for k, v in pairs(N) do local d = (Vector3.new(pos.X, 0.6, pos.Z) - v).Magnitude; if not bd or d < bd then best, bd = k, d end end; return best end
local function route(from, to)
	local a, b = nearest(from), nearest(to)
	local dist, prev, done = {[a] = 0}, {}, {}
	while true do
		local u, ud; for k, d in pairs(dist) do if not done[k] and (not ud or d < ud) then u, ud = k, d end end
		if not u or u == b then break end
		done[u] = true
		for _, w in ipairs(E[u]) do local nd = ud + (N[u] - N[w]).Magnitude; if not dist[w] or nd < dist[w] then dist[w] = nd; prev[w] = u end end
	end
	local path, k = {}, b
	while k do table.insert(path, 1, N[k]); k = prev[k] end
	return path
end
-- dense list of points with a right-hand lane offset
local function lanePoints(pts)
	local out = {}
	for i = 1, #pts - 1 do
		local a, b = pts[i], pts[i + 1]
		local dir = (b - a) * Vector3.new(1, 0, 1); if dir.Magnitude < 1 then continue end
		local len = dir.Magnitude; dir = dir.Unit
		local right = Vector3.new(-dir.Z, 0, dir.X) * 9
		for t = 0, len, 3 do out[#out + 1] = a + dir * t + right end
	end
	out[#out + 1] = pts[#pts]
	return out
end
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
	local d = K.spawn(c.DriverSeat.CFrame, {parent = c, shirt = Color3.fromRGB(245, 195, 30)})
	if d then d.Name = "TaxiDriver"; for _, x in ipairs(d:GetDescendants()) do if x:IsA("BasePart") then x.Anchored = true; x.CanCollide = false end end; d:PivotTo(c.DriverSeat.CFrame * CFrame.new(0, 1.2, 0)) end
	c.ModelStreamingMode = Enum.ModelStreamingMode.Persistent
	return c
end
local SPEED = 95
local lastTaxi = {}
taxiRF.OnServerInvoke = function(p, destName)
	if busy[p] then return "Already riding" end
	if lastTaxi[p] and os.clock() - lastTaxi[p] < 12 then return "Wait a moment" end
	local dest = game.ServerStorage.PlacesAPI:Invoke(p, tostring(destName)); if typeof(dest) ~= "Vector3" then return "Unknown place" end
	local char = p.Character; local hum = char and char:FindFirstChildOfClass("Humanoid"); local r = char and char:FindFirstChild("HumanoidRootPart")
	if not r or hum.SeatPart then return "Get out of your seat first" end
	if r.Position.X < -2000 then return "No taxis on this island 🌴 Fly home first" end
	local fare = 5 + math.floor((dest - r.Position).Magnitude / 120)
	local m = money(p); if not m or m.Value < fare then return "Taxi fare is $" .. fare end
	m.Value -= fare; busy[p] = true; lastTaxi[p] = os.clock()
	task.spawn(function()
		local taxi = makeTaxi(); if not taxi then busy[p] = nil; return end
		local cf, size = taxi:GetBoundingBox(); local lift = taxi:GetPivot().Position.Y - (cf.Position.Y - size.Y / 2)
		local ignore = {taxi}; for _, pl in ipairs(Players:GetPlayers()) do if pl.Character then table.insert(ignore, pl.Character) end end
		local function place(pos, dir)
			local y = groundAt(pos, ignore) + lift + 0.1
			taxi:PivotTo(CFrame.lookAt(Vector3.new(pos.X, y, pos.Z), Vector3.new(pos.X, y, pos.Z) + dir))
		end
		local look = r.CFrame.LookVector * Vector3.new(1, 0, 1); look = look.Magnitude > 0 and look.Unit or Vector3.new(0, 0, -1)
		local pick = r.Position + Vector3.new(-look.Z, 0, look.X) * 8
		taxi.Parent = workspace
		for t = 0, 1, 0.05 do place(pick - look * (30 * (1 - t)), look); task.wait(0.05) end
		K.toast(p, "🚕 Your taxi is here! Fare $" .. fare .. ". Sit back and enjoy the ride")
		task.wait(0.4)
		if not (hum.Parent and r.Parent) then taxi:Destroy(); busy[p] = nil; return end
		taxi.PassengerSeat:Sit(hum)
		task.wait(0.6)
		-- drive: pickup -> road network -> destination
		local pts = {Vector3.new(pick.X, 0.6, pick.Z)}
		for _, v in ipairs(route(pick, dest)) do pts[#pts + 1] = v end
		pts[#pts + 1] = Vector3.new(dest.X, 0.6, dest.Z)
		local path = lanePoints(pts)
		local i, heading = 1, look
		while i < #path and hum.SeatPart == taxi.PassengerSeat do
			local a, b = path[i], path[i + 1]
			local seg = (b - a) * Vector3.new(1, 0, 1)
			if seg.Magnitude > 0.1 then
				local steps = math.max(1, math.floor(seg.Magnitude / (SPEED * 0.05)))
				for k = 1, steps do
					heading = heading:Lerp(seg.Unit, 0.35); if heading.Magnitude < 0.01 then heading = seg.Unit end
					place(a:Lerp(b, k / steps), heading.Unit); Run.Heartbeat:Wait()
				end
			end
			i += 1
		end
		task.wait(0.5)
		standUp(p)
		if r.Parent then r.CFrame = CFrame.new(dest + Vector3.new(0, 1, 0)) end
		K.toast(p, "Arrived at " .. tostring(destName) .. " 👋")
		busy[p] = nil
		local endPos = path[#path]
		for t = 0, 1, 0.05 do place(endPos + heading.Unit * (40 * t), heading.Unit); task.wait(0.05) end
		taxi:Destroy()
	end)
	return "Taxi on the way ($" .. fare .. ")"
end
Players.PlayerRemoving:Connect(function(p) busy[p] = nil; lastTaxi[p] = nil end)
