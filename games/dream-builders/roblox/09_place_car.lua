-- Dream Builders: finish an imported AI car (Import 3D -> FBX from blender/finish_ai_car.py) and make it drivable.
-- Usage (command bar): CAR_NAME="Hypercar" CAR_LEN=16 then loadstring(...)()   (defaults below)
local NAME = rawget(_G, "CAR_NAME") or "Hypercar"
local LEN = rawget(_G, "CAR_LEN") or 16
local PAINT = rawget(_G, "CAR_PAINT") or Color3.fromRGB(18, 34, 120)
local TOP_SPEED = rawget(_G, "CAR_SPEED") or 110 -- studs/s

local W = workspace
local car
for _, m in ipairs(W:GetChildren()) do
	if m:IsA("Model") and m.Name:match("^%s*" .. NAME) then car = m end
end
assert(car, "No imported model named " .. NAME .. " in Workspace - import the FBX first")
car.Name = NAME
-- flatten (importer can nest models)
for _, d in ipairs(car:GetDescendants()) do
	if d:IsA("BasePart") then d.Parent = car end
end
for _, d in ipairs(car:GetChildren()) do
	if d:IsA("Model") or d:IsA("Folder") then d:Destroy() end
end
local function P(nm) return car:FindFirstChild(nm) end
local function find(pat) local t = {} for _, p in ipairs(car:GetChildren()) do if p:IsA("BasePart") and p.Name:match(pat) then table.insert(t, p) end end return t end

-- scale to LEN studs (importer often comes in ~22x too big)
local ext = car:GetExtentsSize()
local longest = math.max(ext.X, ext.Z)
if math.abs(longest - LEN) > 0.5 then car:ScaleTo(car:GetScale() * LEN / longest) end

-- looks
local LOOK = {
	Body_Paint = {PAINT, Enum.Material.SmoothPlastic, 0, 0.18},
	Glass = {Color3.fromRGB(18, 22, 28), Enum.Material.Glass, 0.25, 0.3},
	Body_Trim = {Color3.fromRGB(14, 14, 16), Enum.Material.SmoothPlastic, 0, 0},
	LightsFront = {Color3.fromRGB(255, 250, 235), Enum.Material.Neon, 0, 0},
	LightsRear = {Color3.fromRGB(220, 20, 15), Enum.Material.Neon, 0, 0},
	tyre = {Color3.fromRGB(24, 24, 26), Enum.Material.SmoothPlastic, 0, 0},
	rim = {Color3.fromRGB(70, 70, 76), Enum.Material.Metal, 0, 0.1},
	Well = {Color3.fromRGB(8, 8, 8), Enum.Material.SmoothPlastic, 0, 0},
	Caliper = {Color3.fromRGB(235, 175, 20), Enum.Material.SmoothPlastic, 0, 0},
}
for _, p in ipairs(car:GetChildren()) do
	if p:IsA("BasePart") then
		local key = LOOK[p.Name] and p.Name or (p.Name:match("_tyre$") and "tyre") or (p.Name:match("_rim$") and "rim")
			or (p.Name:match("^Well") and "Well") or (p.Name:match("^Caliper") and "Caliper")
		local l = LOOK[key]
		if l then p.Color, p.Material, p.Transparency, p.Reflectance = l[1], l[2], l[3], l[4] end
		if p:IsA("MeshPart") then p.TextureID = "" end
		p.Anchored = true; p.CanCollide = false; p.Massless = true; p.CastShadow = true
	end
end

-- orientation from wheels
local function center(list) local s = Vector3.zero for _, p in ipairs(list) do s += p.Position end return s / #list end
local fronts, rears = find("^Wheel_F%a_tyre$"), find("^Wheel_R%a_tyre$")
assert(#fronts == 2 and #rears == 2, "need Wheel_FL/FR/RL/RR_tyre parts")
local up = Vector3.yAxis
local fwd = (center(fronts) - center(rears)); fwd = Vector3.new(fwd.X, 0, fwd.Z).Unit
local lat = up:Cross(fwd) -- positive spin about lat rolls the car forward
local mid = (center(fronts) + center(rears)) / 2

-- old rig cleanup
for _, n in ipairs({"Chassis", "DriverSeat", "DriveScript"}) do local o = car:FindFirstChild(n) if o then o:Destroy() end end
for _, o in ipairs(car:GetChildren()) do if o.Name:match("^Collider_") or o.Name:match("^Knuckle_") then o:Destroy() end end

local r = fronts[1].Size.Y / 2
local chassis = Instance.new("Part"); chassis.Name = "Chassis"
chassis.Size = Vector3.new(ext.X * 0.0 + (LEN * 0.5), 1, LEN * 0.75)
chassis.CFrame = CFrame.lookAt(mid + Vector3.new(0, 0.6, 0), mid + Vector3.new(0, 0.6, 0) + fwd)
chassis.Transparency = 1; chassis.CanCollide = true; chassis.Anchored = true
chassis.CustomPhysicalProperties = PhysicalProperties.new(2, 0.3, 0.2)
chassis.Parent = car; car.PrimaryPart = chassis
for _, p in ipairs(car:GetChildren()) do
	if p:IsA("BasePart") and p ~= chassis and not p.Name:match("^Wheel_") and not p.Name:match("^Caliper") then
		local w = Instance.new("WeldConstraint"); w.Part0 = chassis; w.Part1 = p; w.Parent = p
	end
end

local motors, servos = {}, {}
local function att(part, wcf, nm) local a = Instance.new("Attachment"); a.Name = nm; a.Parent = part; a.WorldCFrame = wcf; return a end
for _, tyre in ipairs(find("^Wheel_%a%a_tyre$")) do
	local key = tyre.Name:match("^Wheel_(%a%a)_")
	local isFront = key:sub(1, 1) == "F"
	local pos = tyre.Position
	local col = Instance.new("Part"); col.Name = "Collider_" .. key; col.Shape = Enum.PartType.Cylinder
	col.Size = Vector3.new(math.max(tyre.Size.X, tyre.Size.Z) * 0 + 1.4, r * 2, r * 2)
	col.CFrame = CFrame.fromMatrix(pos, lat, up)
	col.Transparency = 1; col.CanCollide = true; col.Anchored = true
	col.CustomPhysicalProperties = PhysicalProperties.new(1, 2, 0.3, 1, 1)
	col.Parent = car
	for _, v in ipairs(find("^Wheel_" .. key .. "_")) do
		local w = Instance.new("WeldConstraint"); w.Part0 = col; w.Part1 = v; w.Parent = v
	end
	for _, v in ipairs(find("^Caliper_" .. key)) do -- calipers don't spin
		local w = Instance.new("WeldConstraint"); w.Part0 = chassis; w.Part1 = v; w.Parent = v
	end
	local holder = chassis
	if isFront then
		local k = Instance.new("Part"); k.Name = "Knuckle_" .. key; k.Size = Vector3.new(0.4, 0.4, 0.4)
		k.CFrame = CFrame.new(pos); k.Transparency = 1; k.CanCollide = false; k.Anchored = true; k.Parent = car
		local s = Instance.new("HingeConstraint"); s.ActuatorType = Enum.ActuatorType.Servo
		s.ServoMaxTorque = 1e6; s.AngularSpeed = 4; s.LimitsEnabled = true; s.LowerAngle = -35; s.UpperAngle = 35
		s.Attachment0 = att(chassis, CFrame.fromMatrix(pos, up, lat), "Steer0_" .. key)
		s.Attachment1 = att(k, CFrame.fromMatrix(pos, up, lat), "Steer1_" .. key)
		s.Parent = k; table.insert(servos, s); holder = k
	end
	local h = Instance.new("HingeConstraint"); h.Name = "Axle_" .. key
	h.Attachment0 = att(holder, CFrame.fromMatrix(pos, lat, up), "Axle0_" .. key)
	h.Attachment1 = att(col, CFrame.fromMatrix(pos, lat, up), "Axle1_" .. key)
	h.ActuatorType = Enum.ActuatorType.Motor; h.MotorMaxTorque = isFront and 0 or 4e5; h.AngularVelocity = 0
	h.MotorMaxAcceleration = 60
	h.Parent = col; table.insert(motors, h)
end

-- driver seat (left side, inside the cabin)
local seat = Instance.new("VehicleSeat"); seat.Name = "DriverSeat"
seat.Size = Vector3.new(2, 0.4, 2); seat.Transparency = 1; seat.CanCollide = false
seat.CFrame = CFrame.lookAt(mid - lat * LEN * 0.07 - fwd * LEN * 0.06 + Vector3.new(0, r * 0.55, 0), mid - lat * LEN * 0.07 + Vector3.new(0, r * 0.55, 0))
seat.Anchored = true; seat.Parent = car
do local w = Instance.new("WeldConstraint"); w.Part0 = chassis; w.Part1 = seat; w.Parent = seat end
seat:SetAttribute("TopSpeed", TOP_SPEED); seat:SetAttribute("WheelRadius", r)

local src = Instance.new("Script"); src.Name = "DriveScript"; src.Parent = car
src.Source = [[
local car = script.Parent
local seat = car:WaitForChild("DriverSeat")
local motors, servos = {}, {}
for _, d in ipairs(car:GetDescendants()) do
	if d:IsA("HingeConstraint") then
		if d.ActuatorType == Enum.ActuatorType.Servo then table.insert(servos, d) else table.insert(motors, d) end
	end
end
for _, p in ipairs(car:GetDescendants()) do if p:IsA("BasePart") then p.Anchored = false end end
local top, r = seat:GetAttribute("TopSpeed") or 100, seat:GetAttribute("WheelRadius") or 1.5
seat:GetPropertyChangedSignal("Occupant"):Connect(function()
	local h = seat.Occupant
	local plr = h and game.Players:GetPlayerFromCharacter(h.Parent)
	pcall(function() car.Chassis:SetNetworkOwner(plr) end)
end)
game:GetService("RunService").Heartbeat:Connect(function()
	local t, s = seat.ThrottleFloat, seat.SteerFloat
	local w = t * top / r
	for _, m in ipairs(motors) do
		m.AngularVelocity = w
		if m.MotorMaxTorque > 0 then m.MotorMaxTorque = (t == 0) and 1.5e5 or 4e5 end
	end
	for _, sv in ipairs(servos) do sv.TargetAngle = -s * 32 end
end)
]]

-- park it on the street in front of the spawn
local spawnL = W:FindFirstChildWhichIsA("SpawnLocation", true)
local base = spawnL and spawnL.Position or Vector3.new(0, 0, 0)
local target = base + Vector3.new(0, 0, -40)
local cf = chassis.CFrame
local rel = cf:Inverse() * car:GetPivot()
car.WorldPivot = cf
local ray = W:Raycast(target + Vector3.new(0, 200, 0), Vector3.new(0, -400, 0))
local gy = ray and ray.Position.Y or 0
local lift = (chassis.Position.Y - (mid.Y - r)) + 0.2
car:PivotTo(CFrame.new(target.X, gy + lift, target.Z) * CFrame.Angles(0, math.rad(90), 0))
print("Car ready:", NAME, "- press Play, walk to it and sit in the driver seat (W/S/A/D)")
