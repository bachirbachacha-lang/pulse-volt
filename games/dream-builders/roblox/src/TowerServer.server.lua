-- ServerScriptService.TowerServer (copied from Studio 6 Nov)
-- Office towers: elevator floor picker (server checks the player is at an elevator) + automatic sliding lobby doors.
local RS, Players, TS = game:GetService("ReplicatedStorage"), game:GetService("Players"), game:GetService("TweenService")
local ev = RS:WaitForChild("ElevatorGo")
local facades = workspace:WaitForChild("DreamBuilders"):WaitForChild("Downtown"):WaitForChild("Facades")
local doorsByTower = {}
for _, d in ipairs(facades:GetDescendants()) do
	if d.Name == "ElevatorDoor" and d:GetAttribute("Floor") ~= nil then
		local t = d:GetAttribute("Tower")
		doorsByTower[t] = doorsByTower[t] or {}
		doorsByTower[t][d:GetAttribute("Floor")] = d
		local pr = d:FindFirstChild("Elevator")
		if pr then pr.Triggered:Connect(function(plr)
			local floors = {}
			for f in pairs(doorsByTower[t]) do floors[#floors + 1] = f end
			table.sort(floors)
			ev:FireClient(plr, t, floors, d:GetAttribute("Floor"))
		end) end
	end
end
ev.OnServerEvent:Connect(function(plr, tower, floor)
	local doors = doorsByTower[tower]; if type(floor) ~= "number" or not doors or not doors[floor] then return end
	local root = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart"); if not root then return end
	local near = false
	for _, d in pairs(doors) do if (d.Position - root.Position).Magnitude < 14 then near = true end end
	if not near then return end
	local dest = doors[floor]
	root.CFrame = CFrame.new(dest.Position.X + 4.5, dest.Position.Y - 1, dest.Position.Z - 5)
end)
-- sliding lobby doors
local lobby = {}
for _, d in ipairs(facades:GetDescendants()) do if d.Name == "LobbyDoor" and d:GetAttribute("ClosedX") then lobby[#lobby + 1] = d end end
local state = {}
while true do
	for _, d in ipairs(lobby) do
		local open = false
		for _, p in ipairs(Players:GetPlayers()) do
			local r = p.Character and p.Character:FindFirstChild("HumanoidRootPart")
			if r and (r.Position - Vector3.new(d:GetAttribute("ClosedX"), d.Position.Y, d.Position.Z)).Magnitude < 14 then open = true end
		end
		if state[d] ~= open then
			state[d] = open
			local x = open and d:GetAttribute("OpenX") or d:GetAttribute("ClosedX")
			TS:Create(d, TweenInfo.new(0.6, Enum.EasingStyle.Quad), {CFrame = CFrame.new(x, d.Position.Y, d.Position.Z)}):Play()
		end
	end
	task.wait(0.25)
end
