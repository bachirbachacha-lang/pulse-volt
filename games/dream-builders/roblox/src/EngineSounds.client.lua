-- StarterPlayer.StarterPlayerScripts.EngineSounds (copied from Studio 6 Nov). Each vehicle Chassis has Sounds "Engine" (car loop 80317022777602 / diesel 71482635231754) and "Skid" (112851268328371).
-- Engine + tyre sounds for every occupied vehicle near you (pitch follows speed, skid when sliding sideways).
local Run = game:GetService("RunService")
local cam = workspace.CurrentCamera
local cars = {}
local function scan()
	cars = {}
	for _, m in ipairs(workspace:GetChildren()) do
		local seat, ch = m:FindFirstChild("DriverSeat"), m:FindFirstChild("Chassis")
		if seat and ch and ch:FindFirstChild("Engine") then cars[#cars + 1] = {seat = seat, ch = ch, e = ch.Engine, k = ch:FindFirstChild("Skid"), vol = 0} end
	end
end
scan()
workspace.ChildAdded:Connect(function() task.delay(2, scan) end)
local muted = false
local function settingsVolume()
	local plr = game.Players.LocalPlayer
	return plr:GetAttribute("SfxEnabled") == false and 0 or 1
end
Run.RenderStepped:Connect(function(dt)
	local camPos = cam.CFrame.Position
	local master = settingsVolume()
	for _, c in ipairs(cars) do
		local ch, e = c.ch, c.e
		if ch.Parent then
			local on = c.seat.Occupant ~= nil and (ch.Position - camPos).Magnitude < 220
			local v = ch.AssemblyLinearVelocity
			local top = ch:GetAttribute("TopSpeed") or 80
			local speed = v.Magnitude
			local target = on and (0.35 + 0.45 * math.clamp(speed / top, 0, 1)) * master or 0
			c.vol += (target - c.vol) * math.min(1, 6 * dt)
			e.Volume = c.vol
			e.PlaybackSpeed = (e:GetAttribute("BasePitch") or 1) * (0.75 + 0.9 * math.clamp(speed / top, 0, 1.2))
			if c.vol > 0.01 and not e.IsPlaying then e:Play() elseif c.vol <= 0.01 and e.IsPlaying then e:Stop() end
			if c.k then
				local side = math.abs(v:Dot(ch.CFrame.RightVector))
				local sk = (on and speed > 15 and side > 8) and math.clamp((side - 8) / 25, 0, 0.8) * master or 0
				c.k.Volume += (sk - c.k.Volume) * math.min(1, 10 * dt)
				if c.k.Volume > 0.02 and not c.k.IsPlaying then c.k:Play() elseif c.k.Volume <= 0.02 and c.k.IsPlaying then c.k:Stop() end
			end
		end
	end
end)
