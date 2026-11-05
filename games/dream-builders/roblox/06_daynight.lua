-- Dream Builders: day/night cycle. Run in the Studio command bar (edit mode).
local SSS = game:GetService("ServerScriptService")
local o = SSS:FindFirstChild("DayNight"); if o then o:Destroy() end
local s = Instance.new("Script"); s.Name = "DayNight"; s.Source = [==[-- Dream Builders: day / night cycle (ServerScriptService/DayNight). Golden hour lasts longest; at night lamps, windows and neon switch on.
local Lighting = game:GetService("Lighting")
local root = workspace:WaitForChild("DreamBuilders")
local DAY_MINUTES = 12                     -- one full 24h cycle in real minutes
local lights = {}
for _, d in ipairs(root:GetDescendants()) do
	if d:IsA("PointLight") or d:IsA("SpotLight") or d:IsA("SurfaceLight") then table.insert(lights, d) end
end
root.DescendantAdded:Connect(function(d) if d:IsA("PointLight") or d:IsA("SpotLight") then table.insert(lights, d) end end)
local wasNight
while true do
	local dt = task.wait(0.25)
	local t = Lighting.ClockTime
	-- slow down around golden hour (16-19) so the city looks its best most of the time
	local speed = (t > 16 and t < 19) and 0.45 or ((t > 20 or t < 5) and 1.6 or 1)
	Lighting.ClockTime = (t + dt * 24 / (DAY_MINUTES * 60) * speed) % 24
	local night = t > 18.6 or t < 6.2
	if night ~= wasNight then
		wasNight = night
		for _, l in ipairs(lights) do l.Enabled = night; l.Brightness = night and 2.2 or 0 end
		Lighting.ExposureCompensation = night and 0.35 or 0.15
	end
end
]==]; s.Parent = SSS
print("Dream Builders day/night installed")
