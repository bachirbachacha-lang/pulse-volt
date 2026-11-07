-- Dream Agency (fictional organisation): team missions with a briefing, steps across the city, rewards and reputation.
-- Everyone standing at the board when a mission starts joins the team; any team member can complete a step.
-- Safe, story-only objectives (escort a VIP, recover a package, set up a gala, a city photo tour).
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local db = workspace:WaitForChild("DreamBuilders")
local board = db:WaitForChild("JobStations"):WaitForChild("AgencyBoard")
local status = board.MissionBoard:FindFirstChildWhichIsA("TextLabel", true).Parent:FindFirstChild("Status")
local holder = Instance.new("Model"); holder.Name = "MissionObjects"; holder.ModelStreamingMode = Enum.ModelStreamingMode.Persistent; holder.Parent = workspace
local function ground(x, z)
	local rp = RaycastParams.new(); rp.FilterType = Enum.RaycastFilterType.Exclude; rp.FilterDescendantsInstances = {holder}; rp.RespectCanCollide = true
	local h = workspace:Raycast(Vector3.new(x, 60, z), Vector3.new(0, -120, 0), rp); return Vector3.new(x, (h and h.Position.Y or 1), z)
end
local RANKS = {{0, "Rookie"}, {3, "Agent"}, {8, "Senior Agent"}, {15, "Director"}}
local function rank(n) local r = RANKS[1][2]; for _, x in ipairs(RANKS) do if n >= x[1] then r = x[2] end end; return r end
local P = {
	airport = function() return ground(-500, 1425) end, realty = function() return ground(300, 815) end,
	yard = function() return ground(150, -600) end, club = function() return ground(1340, -419) end,
	tower = function() return ground(-400, 950) end, island = function() return ground(1300, -430) end,
	marina = function() return ground(772, -520) end, beach = function() return ground(690, -150) end,
	hq = function() return ground(-330, 760) end,
}
local MISSIONS = {
	{id = "vip", title = "Operation First Class", brief = "A VIP lands at Dream International Airport. Pick them up and bring them safely to Dream Realty Tower for a business meeting.", reward = 260,
		steps = {{"pickupVIP", "airport", "Meet the VIP at the airport"}, {"dropVIP", "realty", "Bring the VIP to Dream Realty Tower"}}},
	{id = "package", title = "The Lost Briefcase", brief = "An agent left a briefcase somewhere at the marina. Recover it and return it to the Agency.", reward = 170,
		steps = {{"collect", "marina", "Find the briefcase at the marina"}, {"deliver", "hq", "Return it to the Dream Agency board"}}},
	{id = "gala", title = "Gala Night", brief = "Club Mirage hosts the Agency gala tonight. Bring 2 crates of decorations from the Supply Yard.", reward = 230,
		steps = {{"collect", "yard", "Pick up crate 1 at the Supply Yard"}, {"deliver", "club", "Deliver crate 1 to Club Mirage"}, {"collect", "yard", "Pick up crate 2"}, {"deliver", "club", "Deliver crate 2 to Club Mirage"}}},
	{id = "photo", title = "City Postcards", brief = "The tourism office needs fresh photos. Visit three landmarks and take a picture at each.", reward = 190,
		steps = {{"photo", "tower", "Photo at the Dream Tower"}, {"photo", "island", "Photo on Palm Island"}, {"photo", "beach", "Photo at Palm Beach"}}},
}
local active = nil -- one Agency operation at a time (keeps it simple and social)
local function teamMsg(team, text) for _, p in ipairs(team) do if p.Parent then K.msg(p, "Dream Agency", text) end end end
local function clear(m) for _, x in ipairs(m.trash) do if x and x.Parent then x:Destroy() end end; m.trash = {} end
local runStep
local function finish(m, ok)
	clear(m)
	if ok then
		for _, p in ipairs(m.team) do
			if p.Parent then
				K.pay(p, m.def.reward, "mission complete: " .. m.def.title)
				local r = (p:GetAttribute("AgencyRep") or 0) + 1; p:SetAttribute("AgencyRep", r)
				K.msg(p, "Dream Agency", "✅ " .. m.def.title .. " complete! +$" .. m.def.reward .. " · Reputation " .. r .. " (" .. rank(r) .. ")")
			end
		end
	else teamMsg(m.team, "❌ " .. m.def.title .. " failed (time ran out). Try again at the board.") end
	active = nil; status.Text = "Missions for you and your friends.\nStand close together and press E."
end
runStep = function(m)
	clear(m)
	m.i += 1
	local st = m.def.steps[m.i]
	if not st then finish(m, true); return end
	local kind, where, text = st[1], st[2], st[3]
	local pos = P[where]()
	status.Text = "ACTIVE: " .. m.def.title .. "\nStep " .. m.i .. "/" .. #m.def.steps .. ": " .. text
	local pad = Instance.new("Part"); pad.Name = "MissionPad"; pad.Anchored = true; pad.CanCollide = false; pad.Shape = Enum.PartType.Cylinder
	pad.Size = Vector3.new(0.3, 10, 10); pad.CFrame = CFrame.new(pos + Vector3.new(0, 0.2, 0)) * CFrame.Angles(0, 0, math.rad(90)); pad.Color = Color3.fromRGB(150, 90, 230); pad.Material = Enum.Material.Neon; pad.Transparency = 0.4; pad.Parent = holder
	table.insert(m.trash, pad)
	local adorn = pad
	local action = ({pickupVIP = "Greet the VIP", dropVIP = "Drop off the VIP", collect = "Pick up", deliver = "Deliver", photo = "📸 Take photo"})[kind]
	if kind == "pickupVIP" then
		local vip = K.spawn(CFrame.new(pos + Vector3.new(0, 0, -3)), {parent = holder, shirt = Color3.fromRGB(20, 20, 24), pants = Color3.fromRGB(20, 20, 24), persistent = true})
		if vip then vip.Name = "VIP"; K.bubble(vip, "Agency? Let's go 🕶"); table.insert(m.trash, vip); adorn = vip:FindFirstChild("Head") or pad end
	end
	for _, p in ipairs(m.team) do if p.Parent then table.insert(m.trash, K.marker(p, adorn, "🕵 " .. text, Color3.fromRGB(130, 80, 210))) end end
	teamMsg(m.team, "Step " .. m.i .. ": " .. text)
	local pr = K.prompt(pad, action, m.def.title, kind == "photo" and 1.2 or 0.8, 16)
	pr.Triggered:Connect(function(who)
		if not table.find(m.team, who) or m.done then return end
		if kind == "pickupVIP" then for _, x in ipairs(m.trash) do if x.Name == "VIP" then x:Destroy() end end; K.toast(who, "🕶 The VIP is with your team. Head to Dream Realty Tower") end
		if kind == "dropVIP" then local v = K.spawn(CFrame.new(pos), {parent = holder, shirt = Color3.fromRGB(20, 20, 24)}); if v then K.bubble(v, "Excellent work, agents. 🤝"); task.delay(5, function() if v.Parent then v:Destroy() end end) end end
		if kind == "collect" then K.toast(who, "📦 Got it!") end
		if kind == "photo" then K.toast(who, "📸 Click! Great shot") end
		runStep(m)
	end)
end
local sp = K.prompt(board.BriefingDesk, "Start a mission", "Dream Agency", 0.8, 12)
sp.Triggered:Connect(function(p)
	if active then K.toast(p, "An operation is already running: " .. active.def.title); return end
	-- pick the mission this player has done least recently (rotates through all four)
	local idx = ((p:GetAttribute("AgencyNext") or 0) % #MISSIONS) + 1; p:SetAttribute("AgencyNext", idx)
	local def = MISSIONS[idx]
	local team = {}
	for _, o in ipairs(Players:GetPlayers()) do
		local r = o.Character and o.Character:FindFirstChild("HumanoidRootPart")
		if r and (r.Position - board.BriefingDesk.Position).Magnitude < 30 then team[#team + 1] = o end
	end
	if not table.find(team, p) then team[#team + 1] = p end
	local m = {def = def, team = team, i = 0, trash = {}}
	active = m
	local names = {}; for _, o in ipairs(team) do names[#names + 1] = o.DisplayName end
	teamMsg(team, "🕵 BRIEFING · " .. def.title .. "\n" .. def.brief .. "\nTeam: " .. table.concat(names, ", ") .. " · Reward $" .. def.reward .. " each")
	runStep(m)
	task.delay(900, function() if active == m then finish(m, false) end end)
end)
Players.PlayerRemoving:Connect(function(p)
	if active then local i = table.find(active.team, p); if i then table.remove(active.team, i) end; if #active.team == 0 then clear(active); active = nil end end
end)
