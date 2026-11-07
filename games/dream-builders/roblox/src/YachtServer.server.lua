-- Yachts: board from the marina, sit at the helm (W/S throttle, A/D steer), cruise on the water; passengers ride along on the
-- aft sofa. The server moves the yacht and keeps it on open water (it stops before land, piers or other boats).
local Players, Run = game:GetService("Players"), game:GetService("RunService")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local Y = workspace:WaitForChild("DreamBuilders"):WaitForChild("Yachts")
local WATER_Y = 0.8
local MAX, ACC, TURN = 42, 9, 0.55
local boats = {}
local function standUp(p) local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid"); if hum and hum.SeatPart then local s = hum.SeatPart; hum.Sit = false; local t0 = os.clock(); while (hum.SeatPart or s:FindFirstChild("SeatWeld")) and os.clock() - t0 < 1.5 do task.wait(0.05) end; local w = s:FindFirstChild("SeatWeld"); if w then w:Destroy() end end end
local function nearestPier(pos)
	local best, bd
	for _, p in ipairs(workspace.DreamBuilders.Marina:GetChildren()) do if p:IsA("BasePart") then local d = (p.Position - pos).Magnitude; if not bd or d < bd then best, bd = p, d end end end
	return best
end
for _, m in ipairs(Y:GetChildren()) do
	local helm = m:FindFirstChild("Helm")
	if helm then
		local b = {model = m, helm = helm, speed = 0, yaw = select(2, m:GetPivot():ToOrientation())}
		boats[#boats + 1] = b
		-- board from the pier side and go ashore from the swim platform
		local hull = m:FindFirstChild("Hull")
		local bp = K.prompt(hull, "Board yacht", m:GetAttribute("YachtName"), 0.4, 22)
		bp.Triggered:Connect(function(p)
			local r = p.Character and p.Character:FindFirstChild("HumanoidRootPart"); if not r then return end
			standUp(p); r.CFrame = m.Deck.CFrame * CFrame.new(0, 3.5, 10)
			K.toast(p, "⚓ Welcome aboard " .. m:GetAttribute("YachtName") .. "! Sit at the helm to drive")
		end)
		local ap = K.prompt(m:FindFirstChild("SwimPlatform"), "Go ashore", "Marina", 0.4, 12)
		ap.Triggered:Connect(function(p)
			local r = p.Character and p.Character:FindFirstChild("HumanoidRootPart"); if not r then return end
			local pier = nearestPier(m:GetPivot().Position)
			standUp(p); r.CFrame = CFrame.new(pier.Position + Vector3.new(-30, 3.5, 0))
		end)
		helm:GetPropertyChangedSignal("Occupant"):Connect(function()
			local hum = helm.Occupant; local p = hum and Players:GetPlayerFromCharacter(hum.Parent)
			if p then K.toast(p, "🛥 W/S throttle · A/D steer · Space to stand up") end
		end)
	end
end
local function clear(b, pos, dir)
	-- open water ahead? (water under the bow, nothing solid at deck height)
	local rp = RaycastParams.new(); rp.FilterType = Enum.RaycastFilterType.Exclude; rp.FilterDescendantsInstances = {b.model}; rp.IgnoreWater = false
	local probe = pos + dir * 34
	local down = workspace:Raycast(probe + Vector3.new(0, 30, 0), Vector3.new(0, -40, 0), rp)
	if not down or down.Material ~= Enum.Material.Water then return false end
	local params = OverlapParams.new(); params.FilterType = Enum.RaycastFilterType.Exclude; params.FilterDescendantsInstances = {b.model}
	for _, p in ipairs(workspace:GetPartBoundsInBox(CFrame.new(probe + Vector3.new(0, 4, 0)), Vector3.new(16, 6, 10), params)) do
		if p.CanCollide and not p:IsDescendantOf(workspace.Terrain) then local c = p:FindFirstAncestorOfClass("Model"); if not (c and Players:GetPlayerFromCharacter(c)) then return false end end
	end
	return true
end
Run.Heartbeat:Connect(function(dt)
	for _, b in ipairs(boats) do
		local occ = b.helm.Occupant
		local throttle = occ and b.helm.ThrottleFloat or 0
		local steer = occ and b.helm.SteerFloat or 0
		local target = throttle * MAX
		b.speed += math.clamp(target - b.speed, -ACC * 1.5 * dt, ACC * dt)
		if math.abs(b.speed) > 0.05 or steer ~= 0 then
			b.yaw -= steer * TURN * dt * math.clamp(math.abs(b.speed) / 12, 0.25, 1)
			local cf = CFrame.new(b.model:GetPivot().Position) * CFrame.Angles(0, b.yaw, 0)
			local dir = -cf.LookVector * Vector3.new(1, 0, 1); dir = (b.speed >= 0 and -1 or 1) * dir -- bow is local -Z
			local fwd = cf.LookVector * Vector3.new(1, 0, 1)
			local moveDir = b.speed >= 0 and fwd or -fwd
			if not clear(b, cf.Position, moveDir) then b.speed = 0 end
			local pos = cf.Position + fwd * b.speed * dt
			local bob = math.sin(os.clock() * 1.4) * 0.15
			b.model:PivotTo(CFrame.new(pos.X, b.model:GetPivot().Position.Y + (WATER_Y + 2 + bob - b.model:GetPivot().Position.Y) * 0.2, pos.Z) * CFrame.Angles(0, b.yaw, 0) * CFrame.Angles(math.rad(-math.clamp(b.speed / MAX, -1, 1) * 2), 0, math.rad(-steer * math.clamp(math.abs(b.speed) / MAX, 0, 1) * 4)))
		end
	end
end)
