-- arcade driving: W/S gas + brake/reverse, A/D steer, hold SHIFT to drift (StarterPlayerScripts)
local Players, UIS, Run = game:GetService("Players"), game:GetService("UserInputService"), game:GetService("RunService")
local plr = Players.LocalPlayer
local steerVis, uprightT = 0, 0
local function drifting() return UIS:IsKeyDown(Enum.KeyCode.LeftShift) or UIS:IsKeyDown(Enum.KeyCode.RightShift) end
local function step(dt)
	dt = math.min(dt, 1 / 20)
	local char = plr.Character; local hum = char and char:FindFirstChildOfClass("Humanoid")
	local seat = hum and hum.SeatPart
	if not (seat and seat:IsA("VehicleSeat")) then return end
	local car = seat.Parent; local ch = car:FindFirstChild("Chassis")
	if not ch or ch.Anchored then return end
	local cf = ch.CFrame
	local f = Vector3.new(cf.LookVector.X, 0, cf.LookVector.Z).Unit
	local right = f:Cross(Vector3.yAxis)
	local v = ch.AssemblyLinearVelocity
	local vf, vl, vy = v:Dot(f), v:Dot(right), v.Y
	local throttle = plr:GetAttribute("TestThrottle") or seat.ThrottleFloat
	local steer = plr:GetAttribute("TestSteer") or seat.SteerFloat
	if math.abs(throttle) < 0.3 then throttle = 0 end
	if math.abs(steer) < 0.15 then steer = 0 end
	local top = ch:GetAttribute("TopSpeed") or 80
	local drift = drifting()
	local rp = RaycastParams.new(); rp.FilterDescendantsInstances = {car, char}
	local ray = workspace:Raycast(ch.Position, Vector3.new(0, -(ch.Size.Y + 6), 0), rp)
	if ray then
		local accel = math.max(25, top * 0.5)
		if throttle > 0 then
			if vf < -1 then vf += accel * 2.5 * dt else vf = math.min(vf + accel * dt * throttle, top) end
		elseif throttle < 0 then
			if vf > 1 then vf -= accel * 2.5 * dt else vf = math.max(vf - accel * 0.6 * dt, -top * 0.3) end
		else
			vf -= vf * 0.7 * dt; if math.abs(vf) < 0.5 then vf = 0 end
		end
		local grip = drift and 1.0 or 10
		vl -= vl * math.min(1, grip * dt)
		if drift then vf -= vf * 0.15 * dt end
		ch.AssemblyLinearVelocity = f * vf + right * vl + Vector3.new(0, vy, 0)
		local turn = (drift and 2.6 or 1.6) * math.clamp(math.abs(vf) / 14, 0, 1) * (vf >= 0 and 1 or -1)
		local av = ch.AssemblyAngularVelocity
		ch.AssemblyAngularVelocity = Vector3.new(av.X * 0.85, -steer * turn, av.Z * 0.85)
	end
	if cf.UpVector.Y < 0.4 then uprightT += dt else uprightT = 0 end
	if uprightT > 1.2 then
		uprightT = 0
		ch.CFrame = CFrame.lookAt(ch.Position + Vector3.new(0, 4, 0), ch.Position + Vector3.new(0, 4, 0) + f)
		ch.AssemblyLinearVelocity = Vector3.zero; ch.AssemblyAngularVelocity = Vector3.zero
	end
	steerVis += ((-steer * 0.45) - steerVis) * math.min(1, 10 * dt)
	for _, m in ipairs(ch:GetChildren()) do
		if m:IsA("Motor6D") and m.Name:match("^Spin_") then
			local r = m:GetAttribute("Radius") or 1.5
			local a = (m:GetAttribute("SpinAngle") or 0) + vf / r * dt
			m:SetAttribute("SpinAngle", a % (math.pi * 2))
			m.Transform = (m:GetAttribute("Front") and CFrame.Angles(0, steerVis, 0) or CFrame.new()) * CFrame.Angles(-a, 0, 0)
		end
	end
end
Run.Stepped:Connect(function(_, dt)
	local ok, err = pcall(step, dt)
	if not ok then plr:SetAttribute("DriveErr", tostring(err)) end
end)
