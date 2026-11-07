-- Dream Builders: map data + teleports (ServerScriptService/TeleportServer).
-- Publishes every plot (position, size, price, live stage) to ReplicatedStorage.MapData so the map works even when
-- far-away parts aren't streamed to the client. The client asks for a place by key; the server decides where that is.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local ev = RS:FindFirstChild("MapTeleport") or Instance.new("RemoteEvent"); ev.Name = "MapTeleport"; ev.Parent = RS
local root = workspace:WaitForChild("DreamBuilders")
local data = RS:FindFirstChild("MapData"); if data then data:Destroy() end
data = Instance.new("Folder"); data.Name = "MapData"; data.Parent = RS
local function find(path) local o = root; for _, n in ipairs(path) do o = o and o:FindFirstChild(n) end; return o end
local places = {}
local function addPlace(key, label, pos)
	if not pos then return end
	places[key] = pos
	local c = Instance.new("Configuration"); c.Name = key; c:SetAttribute("Kind", "Place"); c:SetAttribute("Label", label); c:SetAttribute("Pos", pos); c.Parent = data
end
local hqSpawn = root:FindFirstChild("HQ") and root.HQ:FindFirstChildOfClass("SpawnLocation")
addPlace("HQ", "Dream Builders HQ", hqSpawn and hqSpawn.Position + Vector3.new(0, 4, 0))
local yf = find({"Yard", "YardFloor"}); addPlace("Yard", "Supply Yard", yf and yf.Position + Vector3.new(0, 4, 40))
local bch = find({"Lake", "Beach"}); addPlace("Beach", "Beach & Pier", bch and bch.Position + Vector3.new(0, 4, 0))
local pth = find({"Park", "Path"}); addPlace("Park", "Park", pth and pth.Position + Vector3.new(0, 4, 0))
local vp = find({"Homes", "MansionViewpoint"}); addPlace("PalmHills", "Palm Hills Mansion", vp and vp.Position)
local dt = find({"Downtown", "DreamMotors"}); addPlace("Downtown", "Downtown", dt and dt.Position + Vector3.new(0, -5, -50))
local STAGES = {"Blueprint", "Foundation", "Ground floor", "Second floor", "Roof", "Pool & garden"}
for _, plot in ipairs(root:WaitForChild("Plots"):GetChildren()) do
	local pad = plot.PrimaryPart or plot:FindFirstChild("Pad")
	if pad then
		local id = plot:GetAttribute("PlotId") or 0
		local c = Instance.new("Configuration"); c.Name = "Plot" .. id
		c:SetAttribute("Kind", "Plot"); c:SetAttribute("Id", id); c:SetAttribute("Pos", pad.Position); c:SetAttribute("Size", pad.Size.X)
		c:SetAttribute("Price", plot:GetAttribute("Price") or 25000); c:SetAttribute("Premium", plot:GetAttribute("Premium") or false)
		local function sync()
			local st = plot:GetAttribute("Stage") or 0
			c:SetAttribute("Stage", st); c:SetAttribute("Bricks", plot:GetAttribute("Bricks") or 0)
			c:SetAttribute("Status", st == 0 and "For sale" or st >= #STAGES and "Sold – Dream home" or ("Building: " .. STAGES[st]))
		end
		sync(); plot:GetAttributeChangedSignal("Stage"):Connect(sync); plot:GetAttributeChangedSignal("Bricks"):Connect(sync)
		c.Parent = data
		local dir = pad.Position.X > 0 and -1 or 1
		places["Plot" .. id] = pad.Position + Vector3.new(dir * (pad.Size.X / 2 + 10), 4, 0)
		if plot:GetAttribute("Premium") then places["Plot" .. id] = pad.Position + Vector3.new(-(pad.Size.X / 2 + 10), 4, 0) end
	end
end
local last = {}
ev.OnServerEvent:Connect(function(plr, key)
	if type(key) ~= "string" then return end
	local now = os.clock(); if last[plr] and now - last[plr] < 3 then return end
	local pos = places[key]; local char = plr.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	if hum and hum.SeatPart then return end
	if pos and char and char.PrimaryPart then last[plr] = now; char:PivotTo(CFrame.new(pos)) end
end)
Players.PlayerRemoving:Connect(function(p) last[p] = nil end)
