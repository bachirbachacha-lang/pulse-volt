-- City life: AI people who work, sit and hang out around the city so places don't feel empty.
-- Mostly seated or standing (cheap); a few stroll slowly between nearby points.
-- They are scenery only: no shops, money or jobs depend on them.
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local DB = workspace:WaitForChild("DreamBuilders")
local folder = Instance.new("Folder"); folder.Name = "CityLife"; folder.Parent = workspace
local CHAT = {"😄", "Nice day!", "Have you seen the Sky Deck?", "☕", "Let's go to Palm Island later", "🏖️", "I love this city", "📱", "Busy day at work...", "🛍️"}
local OFFICE = {"📊 Meeting at 3", "📞", "💻", "Deadline today!", "☕ Coffee break soon"}

local function sitAt(seat, lines)
	if not seat or seat.Occupant then return end
	local m, hum = K.spawn(seat.CFrame, {parent = folder})
	if not m then return end
	task.wait(0.2)
	seat:Sit(hum)
	if lines then
		task.spawn(function()
			while m.Parent do
				task.wait(math.random(25, 60))
				if m.Parent and math.random() < 0.5 then K.bubble(m, lines[math.random(#lines)]) end
			end
		end)
	end
	return m
end
local function stand(pos, face, lines)
	local m, hum = K.spawn(CFrame.lookAt(pos, pos + face), {parent = folder})
	if not m then return end
	m.HumanoidRootPart.Anchored = true
	m:PivotTo(CFrame.lookAt(pos + Vector3.new(0, 3, 0), pos + Vector3.new(0, 3, 0) + face))
	if lines then
		task.spawn(function()
			while m.Parent do
				task.wait(math.random(20, 50))
				if m.Parent and math.random() < 0.5 then K.bubble(m, lines[math.random(#lines)]) end
			end
		end)
	end
	return m
end
local function ground(x, z, top)
	local rp = RaycastParams.new(); rp.FilterType = Enum.RaycastFilterType.Exclude; rp.FilterDescendantsInstances = {folder}; rp.RespectCanCollide = true
	local r = workspace:Raycast(Vector3.new(x, top or 12, z), Vector3.new(0, -40, 0), rp)
	return r and r.Position or Vector3.new(x, 1, z)
end
local function stroll(points)
	local m, hum = K.spawn(CFrame.new(points[1] + Vector3.new(0, 1, 0)), {parent = folder})
	if not m then return end
	hum.WalkSpeed = 7
	task.spawn(function()
		local i = 1
		while m.Parent do
			i = i % #points + 1
			K.walk(m, points[i], 25)
			task.wait(math.random(3, 9))
			if math.random() < 0.25 then K.bubble(m, CHAT[math.random(#CHAT)]) end
		end
	end)
end
-- seats in a container, picked evenly
local function seatsIn(container, n, lines)
	if not container then return 0 end
	local list = {}
	for _, d in ipairs(container:GetDescendants()) do if d:IsA("Seat") and not d.Disabled then list[#list + 1] = d end end
	local done = 0
	if #list == 0 then return 0 end
	local step = math.max(1, math.floor(#list / n))
	for i = 1, #list, step do
		if done >= n then break end
		if sitAt(list[i], lines) then done += 1 end
		task.wait(0.1)
	end
	return done
end

task.wait(3)
local count = 0
-- office workers in the Dream Exchange tower (Tower4)
local interior = DB.Downtown.Facades:FindFirstChild("Tower4") and DB.Downtown.Facades.Tower4:FindFirstChild("Interior")
if interior then
	for _, fl in ipairs(interior:GetChildren()) do
		if fl.Name:find("_Office") then count += seatsIn(fl, 2, OFFICE) end
	end
	count += seatsIn(interior:FindFirstChild("F2_DreamExchange"), 3, {"📈 Buy!", "📉 Sell!", "Markets are up today"})
end
-- people relaxing at the beach club and on the Sky Deck
count += seatsIn(DB:FindFirstChild("BeachClub_Restaurant", true), 5, CHAT)
count += seatsIn(DB:FindFirstChild("BeachWorkspace", true), 2, {"💻", "Working from the beach 😎"})
local t5 = DB.Downtown.Facades:FindFirstChild("Tower5"); count += seatsIn(t5 and t5:FindFirstChild("SkyDeck"), 2, {"What a view!", "📸"})
local t6 = DB.Downtown.Facades:FindFirstChild("Tower6"); count += seatsIn(t6 and t6:FindFirstChild("Lobby"), 3, {"☕", "This latte is great", "😄"})
local t2 = DB.Downtown.Facades:FindFirstChild("Tower2"); count += seatsIn(t2 and t2:FindFirstChild("Lobby"), 2, {"Waiting for my turn...", "🏦"})
-- metro riders waiting on the platforms
for _, st in ipairs(DB.Metro:GetChildren()) do
	local plat = st:FindFirstChild("Platform")
	if plat then
		for _, pl in ipairs(st:GetChildren()) do
			if pl.Name == "Platform" and pl.Position.Z > 740 then
				local top = pl.Position.Y + pl.Size.Y / 2
				stand(Vector3.new(pl.Position.X - 20, top, pl.Position.Z + 1), Vector3.new(0, 0, -1), {"Train's coming!", "📱"}); count += 1
				stand(Vector3.new(pl.Position.X + 14, top, pl.Position.Z + 2), Vector3.new(0, 0, -1)); count += 1
			end
		end
	end
end
-- friends chatting on the downtown plaza
for _, c in ipairs({{-150, 790}, {160, 800}, {360, 805}}) do
	local a = ground(c[1], c[2]); local b = a + Vector3.new(3, 0, 0)
	stand(a, Vector3.new(1, 0, 0), CHAT); stand(b, Vector3.new(-1, 0, 0), CHAT); count += 2
end
-- slow strollers: downtown plaza, the beach, Dream Mart aisles
stroll({ground(-250, 780), ground(-100, 790), ground(60, 785), ground(-100, 780)}); count += 1
stroll({ground(250, 790), ground(400, 800), ground(560, 795)}); count += 1
stroll({ground(690, -60), ground(700, -120), ground(690, 0)}); count += 1
stroll({ground(-128, 1450, 8), ground(-128, 1475, 8), ground(-72, 1475, 8), ground(-72, 1450, 8)}); count += 1
print("City life: " .. count .. " AI people placed")
