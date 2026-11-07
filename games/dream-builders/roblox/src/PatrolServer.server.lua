-- City Patrol Officer job (friendly, non-violent): help around the city. A new call comes in every ~25 s while you're on duty:
-- lost tourist, broken-down car, lost pet, noise at the club, parking trouble. Go to the marker, help, get paid.
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local holder = Instance.new("Model"); holder.Name = "PatrolCalls"; holder.ModelStreamingMode = Enum.ModelStreamingMode.Persistent; holder.Parent = workspace
local function ground(x, z)
	local rp = RaycastParams.new(); rp.FilterType = Enum.RaycastFilterType.Exclude; rp.FilterDescendantsInstances = {holder}; rp.RespectCanCollide = true
	local h = workspace:Raycast(Vector3.new(x, 60, z), Vector3.new(0, -120, 0), rp); return Vector3.new(x, h and h.Position.Y or 1, z)
end
local CALLS = {
	{"Lost tourist", "Give directions", "🗺 Where is the Dream Tower?", 45, {Vector3.new(60, 0, 732), Vector3.new(690, 0, -150), Vector3.new(-500, 0, 1408)}},
	{"Broken-down car", "Call a tow truck", "🚗 My car won't start!", 55, {Vector3.new(399, 0, -300), Vector3.new(-381, 0, 300), Vector3.new(150, 0, -441)}},
	{"Lost pet", "Return the puppy", "🐶 Have you seen my dog?", 50, {Vector3.new(-200, 0, -903), Vector3.new(-417, 0, 150), Vector3.new(250, 0, 1343)}},
	{"Noise complaint", "Ask to turn it down", "🔊 The music is too loud!", 40, {Vector3.new(1340, 0, -419)}},
	{"Parking trouble", "Sort out the parking", "🅿 Someone blocked my car!", 40, {Vector3.new(-690, 0, 1340), Vector3.new(-100, 0, 1408)}},
}
local active = {}
local function clear(c) for _, x in ipairs(c.trash) do if x and x.Parent then x:Destroy() end end end
local function hat(char, on)
	local old = char and char:FindFirstChild("PatrolCap"); if old then old:Destroy() end
	if not on or not char then return end
	local head = char:FindFirstChild("Head"); if not head then return end
	local c = Instance.new("Part"); c.Name = "PatrolCap"; c.Size = Vector3.new(1.4, 0.45, 1.5); c.Color = Color3.fromRGB(25, 45, 90); c.CanCollide = false; c.Massless = true
	c.CFrame = head.CFrame * CFrame.new(0, 0.7, -0.05); c.Parent = char
	local w = Instance.new("WeldConstraint"); w.Part0 = head; w.Part1 = c; w.Parent = c
end
local function newCall(p)
	local def = CALLS[math.random(#CALLS)]
	local spot = def[5][math.random(#def[5])]
	local pos = ground(spot.X + math.random(-6, 6), spot.Z + math.random(-6, 6))
	local c = {trash = {}}
	local npc = K.spawn(CFrame.new(pos), {parent = holder, persistent = true})
	if not npc then return end
	table.insert(c.trash, npc)
	K.bubble(npc, def[3])
	table.insert(c.trash, K.marker(p, npc:FindFirstChild("Head"), "🚓 " .. def[1], Color3.fromRGB(40, 80, 170)))
	K.msg(p, "Dream City Patrol", "New call: " .. def[1] .. ". Follow the blue marker.")
	local pr = K.prompt(npc:FindFirstChild("HumanoidRootPart"), def[2], def[1], 1.5, 10)
	pr.Triggered:Connect(function(who)
		if who ~= p or c.done then return end
		c.done = true; pr:Destroy()
		K.pay(p, def[4], "helped: " .. def[1])
		p:SetAttribute("PatrolHelped", (p:GetAttribute("PatrolHelped") or 0) + 1)
		K.bubble(npc, "Thank you, officer! 🙏", Color3.fromRGB(200, 255, 200))
		task.delay(4, function() clear(c); if active[p] == c then active[p] = nil end end)
	end)
	active[p] = c
	task.delay(240, function() if active[p] == c and not c.done then clear(c); active[p] = nil end end)
end
task.spawn(function()
	while true do
		task.wait(5)
		for _, p in ipairs(Players:GetPlayers()) do
			local on = K.job(p) == "City Patrol Officer"
			if p.Character and (p.Character:FindFirstChild("PatrolCap") ~= nil) ~= on then hat(p.Character, on) end
			if on and not active[p] and (not p:GetAttribute("NextCall") or os.clock() > p:GetAttribute("NextCall")) then
				p:SetAttribute("NextCall", os.clock() + 25); newCall(p)
			elseif not on and active[p] then clear(active[p]); active[p] = nil end
		end
	end
end)
Players.PlayerRemoving:Connect(function(p) if active[p] then clear(active[p]); active[p] = nil end end)
