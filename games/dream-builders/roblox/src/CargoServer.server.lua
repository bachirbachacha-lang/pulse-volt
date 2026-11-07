-- Port cargo contracts: take a contract at the port gate house, drive a vehicle to the quay pad, load a container,
-- deliver it to the destination pad, unload and get paid. Any job can do it; the Flatbed Truck fits best.
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local port = workspace:WaitForChild("DreamBuilders"):WaitForChild("CargoPort")
local holder = Instance.new("Model"); holder.Name = "CargoPads"; holder.ModelStreamingMode = Enum.ModelStreamingMode.Persistent; holder.Parent = workspace
local function ground(x, z)
	local rp = RaycastParams.new(); rp.FilterType = Enum.RaycastFilterType.Exclude; rp.FilterDescendantsInstances = {holder}; rp.RespectCanCollide = true
	local h = workspace:Raycast(Vector3.new(x, 120, z), Vector3.new(0, -240, 0), rp); return h and h.Position.Y or 1
end
local DEST = {
	{name = "Supply Yard", pos = Vector3.new(200, 0, -600), pay = 180},
	{name = "Downtown shops", pos = Vector3.new(150, 0, 780), pay = 260},
	{name = "Palm Island", pos = Vector3.new(1320, 0, -419), pay = 300},
}
local function pad(name, pos, color)
	local p = Instance.new("Part"); p.Name = name; p.Anchored = true; p.CanCollide = false; p.Shape = Enum.PartType.Cylinder
	p.Size = Vector3.new(0.3, 18, 18); p.CFrame = CFrame.new(pos.X, ground(pos.X, pos.Z) + 0.2, pos.Z) * CFrame.Angles(0, 0, math.rad(90))
	p.Color = color; p.Material = Enum.Material.Neon; p.Transparency = 0.45; p.Parent = holder; return p
end
local function vehicleOf(p)
	local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid")
	local seat = hum and hum.SeatPart
	if seat and seat.Name == "DriverSeat" then return seat.Parent end
end
local contract = {} -- [player] = {stage, dest, pads, markers, box}
local function cleanup(p)
	local c = contract[p]; if not c then return end
	for _, x in ipairs(c.trash) do if x and x.Parent then x:Destroy() end end
	contract[p] = nil
end
local gate = port:WaitForChild("GateHouse")
local QUAY = Vector3.new(800, 0, -1600)
local function run(p, loadPos, loadName, dropPos, dropName, payAmount)
	local c = {stage = "load", trash = {}}; contract[p] = c
	local lp = pad("LoadPad", loadPos, Color3.fromRGB(255, 190, 40)); table.insert(c.trash, lp)
	local mk = K.marker(p, lp, "📦 Load cargo · " .. loadName, Color3.fromRGB(230, 150, 30)); table.insert(c.trash, mk)
	K.msg(p, "Dream Port", "Contract: load cargo at " .. loadName .. " and bring it to " .. dropName .. " for $" .. payAmount .. ". Drive a vehicle onto the yellow pad (Flatbed Truck fits best).")
	local pr = K.prompt(lp, "Load container", "Cargo", 1.5, 16); table.insert(c.trash, pr)
	pr.Triggered:Connect(function(who)
		if who ~= p or c.stage ~= "load" then return end
		local car = vehicleOf(p)
		if not car then K.toast(p, "Drive a vehicle onto the pad first"); return end
		local ch = car:FindFirstChild("Chassis") or car.PrimaryPart
		local cf, size = car:GetBoundingBox()
		local box = Instance.new("Part"); box.Name = "CargoContainer"; box.Size = Vector3.new(math.min(size.X, 8), 4, math.min(size.Z * 0.6, 12))
		box.CFrame = cf * CFrame.new(0, size.Y / 2 + 2.2, size.Z * 0.15); box.Color = ({Color3.fromRGB(190, 50, 40), Color3.fromRGB(40, 90, 170), Color3.fromRGB(40, 140, 80), Color3.fromRGB(220, 150, 30)})[math.random(4)]
		box.Material = Enum.Material.CorrodedMetal; box.Massless = true; box.CanCollide = false; box.Parent = car
		local w = Instance.new("WeldConstraint"); w.Part0 = ch; w.Part1 = box; w.Parent = box
		table.insert(c.trash, box)
		c.stage = "deliver"; lp:Destroy(); mk:Destroy()
		local dp = pad("DropPad", dropPos, Color3.fromRGB(60, 200, 110)); table.insert(c.trash, dp)
		local mk2 = K.marker(p, dp, "🚚 Deliver to " .. dropName, Color3.fromRGB(40, 160, 90)); table.insert(c.trash, mk2)
		K.toast(p, "Container loaded! Deliver it to " .. dropName)
		local up = K.prompt(dp, "Unload container", dropName, 1.5, 16)
		up.Triggered:Connect(function(w2)
			if w2 ~= p or c.stage ~= "deliver" then return end
			if vehicleOf(p) ~= car then K.toast(p, "Bring the truck with the container"); return end
			c.stage = "done"
			K.pay(p, payAmount, "cargo delivered to " .. dropName)
			cleanup(p)
		end)
	end)
	task.delay(600, function() if contract[p] == c and c.stage ~= "done" then cleanup(p); K.toast(p, "Cargo contract expired") end end)
end
local gp = K.prompt(gate, "Import contract (port → city)", "Port office", 0.5, 14)
gp.Triggered:Connect(function(p)
	if contract[p] then K.toast(p, "You already have a contract. Check the yellow marker"); return end
	local d = DEST[math.random(#DEST)]
	run(p, QUAY, "the quay", d.pos, d.name, d.pay)
end)
local ep = K.prompt(gate, "Export contract (city → ship)", "Port office", 0.5, 14)
ep.UIOffset = Vector2.new(0, 60); ep.KeyboardKeyCode = Enum.KeyCode.F; ep.Exclusivity = Enum.ProximityPromptExclusivity.AlwaysShow
ep.Triggered:Connect(function(p)
	if contract[p] then K.toast(p, "You already have a contract. Check the yellow marker"); return end
	local d = DEST[math.random(#DEST)]
	run(p, d.pos, d.name, QUAY, "the cargo ship (quay)", d.pay + 60)
end)
Players.PlayerRemoving:Connect(cleanup)
