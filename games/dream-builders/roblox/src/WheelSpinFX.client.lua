-- Turns the wheels of every car you can see (other players' cars, traffic, taxis).
-- The car you drive yourself is handled by VehicleDrive (it also steers the front wheels).
-- Physics cars: rotate the spin joint's C0.
-- Server-moved (anchored) cars: the server keeps resetting their wheels, so we hide the real
-- wheel on this screen only and draw a local copy that spins.
local CS, Run, Players = game:GetService("CollectionService"), game:GetService("RunService"), game:GetService("Players")
local plr = Players.LocalPlayer
local RANGE = 300
local folder = Instance.new("Folder"); folder.Name = "LocalWheels"; folder.Parent = workspace
local last, speed, baseC0, angle, copies = {}, {}, {}, {}, {}
local function drop(m)
	local c = copies[m]
	if c then c:Destroy(); copies[m] = nil end
	if m.Part1 then m.Part1.LocalTransparencyModifier = 0 end
end
local function forget(ch)
	for _, m in ipairs(ch:GetChildren()) do if copies[m] then drop(m) end end
	last[ch], speed[ch] = nil, nil
end
CS:GetInstanceRemovedSignal("SpinChassis"):Connect(forget)
Run.RenderStepped:Connect(function(dt)
	local ok, err = pcall(function()
	if dt <= 0 then return end
	local char = plr.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	local mySeat = hum and hum.SeatPart
	local myCar = mySeat and mySeat:IsA("VehicleSeat") and mySeat.Parent
	local cam = workspace.CurrentCamera
		if not cam then return end
		local camPos = cam.CFrame.Position
	for _, ch in ipairs(CS:GetTagged("SpinChassis")) do
		local active = ch.Parent ~= myCar and ch:IsDescendantOf(workspace) and (ch.Position - camPos).Magnitude < RANGE
		if not active then
			if last[ch] then forget(ch) end
		else
			local pos = ch.Position
			local prev = last[ch]
			last[ch] = pos
			local vf
			if ch.Anchored then
				-- network updates arrive every few frames, so smooth the speed
				local d = prev and (pos - prev) or Vector3.zero
				if d.Magnitude > 0.001 then
					speed[ch] = (speed[ch] or 0) * 0.6 + (d:Dot(ch.CFrame.LookVector) / dt) * 0.4
				else
					speed[ch] = (speed[ch] or 0) * 0.93
				end
				vf = speed[ch]
			else
				vf = ch.AssemblyLinearVelocity:Dot(ch.CFrame.LookVector)
			end
			if math.abs(vf) > 300 then vf = 0 end
			for _, m in ipairs(ch:GetChildren()) do
				if m:IsA("Motor6D") and m.Name:sub(1, 5) == "Spin_" and m.Part1 then
					baseC0[m] = baseC0[m] or m.C0
					local r = m:GetAttribute("Radius") or 1.5
					local a = ((angle[m] or 0) + vf / r * dt) % (math.pi * 2)
					angle[m] = a
					local spin = baseC0[m] * CFrame.Angles(-a, 0, 0)
					if m.Part1.Anchored then
						local c = copies[m]
						if not c then
							c = m.Part1:Clone()
							c:ClearAllChildren()
							c.Anchored = true; c.CanCollide = false; c.CanQuery = false; c.CanTouch = false
							c.Parent = folder
							copies[m] = c
						end
						m.Part1.LocalTransparencyModifier = 1
						c.CFrame = ch.CFrame * spin * m.C1:Inverse()
					else
						if copies[m] then drop(m) end
						if math.abs(vf) > 0.3 then m.C0 = spin end
					end
				end
			end
		end
	end
	end)
	if not ok then plr:SetAttribute("WheelFxErr", tostring(err)) end
end)
