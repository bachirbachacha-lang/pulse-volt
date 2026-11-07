local RS = game:GetService("ReplicatedStorage")
local folder = RS:FindFirstChild("DreamVehicles") or Instance.new("Folder"); folder.Name = "DreamVehicles"; folder.Parent = RS
local ev = folder:FindFirstChild("VehicleRequest") or Instance.new("RemoteEvent"); ev.Name = "VehicleRequest"; ev.Parent = folder
local list = folder:FindFirstChild("List") or Instance.new("Folder"); list.Name = "List"; list.Parent = folder
local INFO = {
	Hypercar = {"Hypercar", "Super", 120}, LuxurySedan = {"Luxury Sedan", "Luxury", 95}, OffroadSUV = {"Offroad SUV", "SUV", 85},
	Pickup = {"Pickup Truck", "Truck", 80}, MuscleCar = {"Muscle Car", "Sport", 105}, EverydaySedan = {"Everyday Sedan", "Normal", 80},
	BigSUV = {"Big SUV", "SUV", 80}, StarterCar = {"Rusty Starter Car", "Starter", 55}, ClassicCar = {"Classic 60s Car", "Classic", 75},
	GTSedan = {"GT Sedan", "Sport", 110}, FlatbedTruck = {"Flatbed Truck", "Work", 60}, MixerTruck = {"Cement Mixer", "Work", 50},
	Forklift = {"Forklift", "Work", 30},
}
local function cars()
	local t = {}
	for _, m in ipairs(workspace:GetChildren()) do
		if m:IsA("Model") and m:FindFirstChild("DriverSeat") and m:FindFirstChild("Chassis") then t[m.Name] = m end
	end
	return t
end
list:ClearAllChildren()
for name in pairs(cars()) do
	local v = Instance.new("StringValue"); v.Name = name
	local i = INFO[name] or {name, "Car", 80}; v.Value = i[1]; v:SetAttribute("Class", i[2]); v:SetAttribute("Top", i[3]); v.Parent = list
end
local last = {}
ev.OnServerEvent:Connect(function(plr, action, name)
	if type(name) ~= "string" then return end
	if last[plr] and os.clock() - last[plr] < 1 then return end
	last[plr] = os.clock()
	local car = cars()[name]; local char = plr.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid"); local root = char and char:FindFirstChild("HumanoidRootPart")
	if not (car and hum and root) then return end
	local seat = car.DriverSeat
	if seat.Occupant and seat.Occupant ~= hum then return end
	if hum.SeatPart then hum.Sit = false; task.wait(0.2) end
	if action == "bring" then
		local look = root.CFrame.LookVector; look = Vector3.new(look.X, 0, look.Z).Unit
		local pos = root.Position + look * 18
		local rp = RaycastParams.new(); rp.FilterDescendantsInstances = {car, char}
		local ray = workspace:Raycast(pos + Vector3.new(0, 60, 0), Vector3.new(0, -200, 0), rp)
		local gy = ray and ray.Position.Y or root.Position.Y - 3
		local cf, size = car:GetBoundingBox()
		local lift = car:GetPivot().Position.Y - (cf.Position.Y - size.Y / 2)
		local p = Vector3.new(pos.X, gy + lift + 0.5, pos.Z)
		car:PivotTo(CFrame.lookAt(p, p + look))
		for _, d in ipairs(car:GetDescendants()) do if d:IsA("BasePart") then d.AssemblyLinearVelocity = Vector3.zero; d.AssemblyAngularVelocity = Vector3.zero end end
		task.wait(0.3)
	end
	if action == "drive" or action == "bring" then
		root.CFrame = seat.CFrame + Vector3.new(0, 3, 0); task.wait(0.15); seat:Sit(hum)
	end
end)
game.Players.PlayerRemoving:Connect(function(p) last[p] = nil end)
