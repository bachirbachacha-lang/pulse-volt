-- Rain/storm particles that follow the camera, rain + thunder sound, lightning flashes. Reads Lighting.Weather.
local L = game:GetService("Lighting")
local cam = workspace.CurrentCamera
local box = Instance.new("Part"); box.Name = "RainEmitter"; box.Anchored = true; box.CanCollide = false; box.CanQuery = false; box.CanTouch = false
box.Transparency = 1; box.Size = Vector3.new(120, 1, 120); box.Parent = workspace
local pe = Instance.new("ParticleEmitter"); pe.Texture = "rbxasset://textures/particles/sparkles_main.dds"; pe.EmissionDirection = Enum.NormalId.Bottom
pe.Speed = NumberRange.new(90, 110); pe.Lifetime = NumberRange.new(0.9, 1.1); pe.Rate = 0; pe.LightInfluence = 1
pe.Size = NumberSequence.new(0.08); pe.Squash = NumberSequence.new(3.5); pe.Transparency = NumberSequence.new(0.45)
pe.Color = ColorSequence.new(Color3.fromRGB(190, 205, 220)); pe.Orientation = Enum.ParticleOrientation.VelocityParallel; pe.Parent = box
local rain = Instance.new("Sound"); rain.SoundId = "rbxassetid://5911952995"; rain.Looped = true; rain.Volume = 0; rain.Parent = game:GetService("SoundService")
local thunder = Instance.new("Sound"); thunder.SoundId = "rbxassetid://139319051979882"; thunder.Volume = 0.6; thunder.Parent = game:GetService("SoundService")
local flashT = 0
game:GetService("RunService").RenderStepped:Connect(function(dt)
	local w = L:GetAttribute("Weather")
	local wet = (w == "Rain" or w == "Storm")
	box.CFrame = CFrame.new(cam.CFrame.Position + Vector3.new(0, 45, 0))
	pe.Rate = wet and (w == "Storm" and 2200 or 1400) or 0
	rain.Volume += ((wet and 0.5 or 0) - rain.Volume) * math.min(1, dt)
	if wet and not rain.IsPlaying then rain:Play() elseif not wet and rain.Volume < 0.02 and rain.IsPlaying then rain:Stop() end
	if w == "Storm" then
		flashT -= dt
		if flashT <= 0 then
			flashT = math.random(8, 20)
			local old = L.ExposureCompensation
			L.ExposureCompensation = 1.6; task.delay(0.12, function() L.ExposureCompensation = old end)
			task.delay(math.random() * 2 + 0.5, function() thunder:Play() end)
		end
	end
end)
