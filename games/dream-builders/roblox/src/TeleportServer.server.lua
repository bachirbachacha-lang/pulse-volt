-- Dream Builders: city map teleports (ServerScriptService/TeleportServer). The client asks for a place by key; the server decides where that is.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local ev = RS:FindFirstChild("MapTeleport") or Instance.new("RemoteEvent"); ev.Name = "MapTeleport"; ev.Parent = RS
local root = workspace:WaitForChild("DreamBuilders")
local last = {}
local function find(path) local o = root; for _, n in ipairs(path) do o = o and o:FindFirstChild(n) end; return o end
local function dest(key)
	if key == "HQ" then local s = root:FindFirstChild("HQ") and root.HQ:FindFirstChildOfClass("SpawnLocation"); return s and s.Position + Vector3.new(0, 4, 0) end
	if key == "Yard" then local f = find({"Yard", "YardFloor"}); return f and f.Position + Vector3.new(0, 4, 30) end
	if key == "Lake" then local b = find({"Lake", "Beach"}); return b and b.Position + Vector3.new(-10, 4, 0) end
	if key == "Park" then local p = find({"Park", "Path"}); return p and p.Position + Vector3.new(0, 4, 0) end
	local id = tonumber(string.match(key, "^Plot(%d+)$"))
	if id then
		local plot = root.Plots:FindFirstChild("Plot" .. id); local pad = plot and plot.PrimaryPart
		if pad then local dir = pad.Position.X > 0 and -1 or 1; return pad.Position + Vector3.new(dir * (pad.Size.X / 2 + 10), 4, 0) end
	end
end
ev.OnServerEvent:Connect(function(plr, key)
	if type(key) ~= "string" then return end
	local now = os.clock(); if last[plr] and now - last[plr] < 3 then return end
	local pos = dest(key); local char = plr.Character
	if pos and char and char.PrimaryPart then last[plr] = now; char:PivotTo(CFrame.new(pos)) end
end)
Players.PlayerRemoving:Connect(function(p) last[p] = nil end)
