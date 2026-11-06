-- parked cars stay anchored (no glitching); the driver's computer simulates the car while driving
local Players = game:GetService("Players")
local function setAnchored(car, a)
	for _, p in ipairs(car:GetDescendants()) do if p:IsA("BasePart") then p.Anchored = a end end
end
local function watch(car)
	local seat, ch = car:FindFirstChild("DriverSeat"), car:FindFirstChild("Chassis")
	if not (seat and ch) or car:GetAttribute("Watched") then return end
	car:SetAttribute("Watched", true)
	setAnchored(car, true)
	local token = 0
	seat:GetPropertyChangedSignal("Occupant"):Connect(function()
		token += 1; local my = token
		local hum = seat.Occupant
		local plr = hum and Players:GetPlayerFromCharacter(hum.Parent)
		if plr then
			setAnchored(car, false)
			pcall(function() ch:SetNetworkOwner(plr) end)
		else
			task.spawn(function()
				for _ = 1, 40 do
					task.wait(0.25)
					if my ~= token then return end
					if ch.AssemblyLinearVelocity.Magnitude < 1.5 then break end
				end
				if my ~= token or seat.Occupant then return end
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
