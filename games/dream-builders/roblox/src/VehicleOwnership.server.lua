-- parked cars stay anchored (no glitching); the driver's computer simulates the car while driving.
-- Press E near a car to drive it. When the driver gets out the car brakes to a stop by itself, then parks.
local Players, Run = game:GetService("Players"), game:GetService("RunService")
local function setAnchored(car, a)
	for _, p in ipairs(car:GetDescendants()) do if p:IsA("BasePart") then p.Anchored = a end end
end
local function watch(car)
	local seat, ch = car:FindFirstChild("DriverSeat"), car:FindFirstChild("Chassis")
	if not (seat and ch) or car:GetAttribute("Watched") then return end
	car:SetAttribute("Watched", true)
	setAnchored(car, true)
	-- E to drive
	local pr = ch:FindFirstChild("EnterPrompt") or Instance.new("ProximityPrompt")
	pr.Name = "EnterPrompt"; pr.ActionText = "Drive"; pr.ObjectText = car.Name:gsub("(%l)(%u)", "%1 %2")
	pr.KeyboardKeyCode = Enum.KeyCode.E; pr.HoldDuration = 0; pr.RequiresLineOfSight = false
	pr.MaxActivationDistance = math.max(ch.Size.X, ch.Size.Z) * 0.5 + 8
	pr.Parent = ch
	pr.Triggered:Connect(function(plr)
		local hum = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
		if not hum or hum.Health <= 0 or seat.Occupant then return end
		if hum.SeatPart then hum.Sit = false; task.wait(0.15) end
		seat:Sit(hum)
	end)
	local token = 0
	seat:GetPropertyChangedSignal("Occupant"):Connect(function()
		token += 1; local my = token
		local hum = seat.Occupant
		local plr = hum and Players:GetPlayerFromCharacter(hum.Parent)
		pr.Enabled = hum == nil
		if plr then
			setAnchored(car, false)
			pcall(function() ch:SetNetworkOwner(plr) end)
		elseif not hum then
			-- driver left: server takes over and brakes the car smoothly to a stop
			pcall(function() ch:SetNetworkOwner(nil) end)
			task.spawn(function()
				local t0 = os.clock()
				while os.clock() - t0 < 6 do
					local dt = Run.Heartbeat:Wait()
					if my ~= token then return end
					local v = ch.AssemblyLinearVelocity
					local flat = Vector3.new(v.X, 0, v.Z)
					local s = flat.Magnitude
					local ns = math.max(0, s - 70 * dt)
					ch.AssemblyLinearVelocity = (s > 0 and flat.Unit * ns or Vector3.zero) + Vector3.new(0, v.Y, 0)
					local av = ch.AssemblyAngularVelocity
					ch.AssemblyAngularVelocity = Vector3.new(av.X * 0.9, av.Y * 0.8, av.Z * 0.9)
					if ns < 0.5 and math.abs(v.Y) < 1 then break end
				end
				if my ~= token or seat.Occupant then return end
				task.wait(0.3)
				setAnchored(car, true)
				if ch.CFrame.UpVector.Y < 0.7 then
					local f = ch.CFrame.LookVector; f = Vector3.new(f.X, 0, f.Z).Unit
					car:PivotTo(CFrame.lookAt(car:GetPivot().Position + Vector3.new(0, 3, 0), car:GetPivot().Position + Vector3.new(0, 3, 0) + f))
				end
			end)
		end
	end)
end
for _, m in ipairs(workspace:GetChildren()) do if m:IsA("Model") then watch(m) end end
workspace.ChildAdded:Connect(function(m) if m:IsA("Model") then task.wait(1); watch(m) end end)
