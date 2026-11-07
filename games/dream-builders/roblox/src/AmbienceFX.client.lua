-- District ambience (licensed Roblox Pro Sound Effects + one free waves track): crossfades by where you are.
-- Downtown: soft city traffic · beach / island / marina / Maldives: waves · port: harbor · Palm Hills / Show Villas / school / hospital: birds.
-- Yacht engine wash while you drive a yacht. Kept quiet so music and club audio still read.
local Players, Run, TS = game:GetService("Players"), game:GetService("RunService"), game:GetService("TweenService")
local plr = Players.LocalPlayer
local IDS = {city = {"rbxassetid://9112784190", 0.12}, waves = {"rbxassetid://78025480791776", 0.35}, harbor = {"rbxassetid://9112867198", 0.25}, birds = {"rbxassetid://9112811947", 0.22}}
local snd = {}
for k, v in pairs(IDS) do local s = Instance.new("Sound"); s.Name = "Amb_" .. k; s.SoundId = v[1]; s.Looped = true; s.Volume = 0; s.Parent = workspace.CurrentCamera or workspace; s:Play(); snd[k] = {s = s, max = v[2]} end
local wash = Instance.new("Sound"); wash.SoundId = "rbxassetid://9112871242"; wash.Looped = true; wash.Volume = 0; wash.Parent = workspace.CurrentCamera; wash:Play()
local function zone(p)
	local x, z = p.X, p.Z
	if x < -2000 then return "waves" end                                   -- Maldives
	if x > 1240 then return "waves" end                                    -- Palm Island
	if z < -1100 and x > 450 then return "harbor" end                      -- Cargo Port
	if x > 600 and z > -700 and z < 700 then return "waves" end            -- Palm Beach + marina
	if z < -780 or x < -460 then return "birds" end                        -- Palm Hills, Show Villas
	if z > 1300 then return "birds" end                                    -- school / hospital / airport green
	if z > 650 then return "city" end                                      -- Downtown
	return "city"
end
local current
while true do
	local r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
	if r then
		local zn = zone(r.Position)
		if r.Position.Y > 60 then zn = "city" end -- high in a tower: muffled city
		if zn ~= current then
			current = zn
			for k, v in pairs(snd) do TS:Create(v.s, TweenInfo.new(2.5), {Volume = (k == zn) and v.max or 0}):Play() end
		end
		local hum = plr.Character:FindFirstChildOfClass("Humanoid")
		local onYacht = hum and hum.SeatPart and hum.SeatPart.Name == "Helm"
		local speed = onYacht and hum.SeatPart.Parent.PrimaryPart and hum.SeatPart.Parent.PrimaryPart.AssemblyLinearVelocity.Magnitude or 0
		TS:Create(wash, TweenInfo.new(0.8), {Volume = onYacht and 0.35 or 0}):Play()
	end
	task.wait(1)
end
