-- Palm Island venues: club dance floor + moving lights, and music inside the club / diner (background music fades out there).
local Run = game:GetService("RunService")
local SoundService = game:GetService("SoundService")
local plr = game:GetService("Players").LocalPlayer
local TRACKS = {club = "rbxassetid://1840081722", diner = "rbxassetid://1840650601"}
local zoneSound = Instance.new("Sound"); zoneSound.Name = "VenueMusic"; zoneSound.Looped = true; zoneSound.Volume = 0; zoneSound.Parent = SoundService
local current
local cols = {Color3.fromRGB(170, 60, 255), Color3.fromRGB(40, 220, 255), Color3.fromRGB(255, 70, 160), Color3.fromRGB(255, 200, 60), Color3.fromRGB(80, 255, 120)}
local function island() local db = workspace:FindFirstChild("DreamBuilders"); return db and db:FindFirstChild("PalmIsland") end
local t, beat = 0, 0
Run.RenderStepped:Connect(function(dt)
	t += dt
	local isl = island(); if not isl then return end
	local club = isl:FindFirstChild("ClubMirage")
	if club then
		beat += dt
		if beat > 0.45 then
			beat = 0
			local df = club:FindFirstChild("DanceFloor")
			if df then for _, tile in ipairs(df:GetChildren()) do tile.Color = cols[math.random(1, #cols)] end end
			local led = club:FindFirstChild("LEDWall"); local lbl = led and led:FindFirstChild("LED", true)
			if lbl then lbl.TextColor3 = cols[math.random(1, #cols)] end
		end
		for i, s in ipairs(club:GetChildren()) do
			if s.Name == "ClubSpot" then
				local base = s:GetAttribute("Base")
				if not base then s:SetAttribute("Base", s.CFrame); base = s.CFrame end
				s.CFrame = base * CFrame.Angles(math.sin(t * 1.3 + i) * 0.6, t * (0.8 + i * 0.2), math.cos(t * 1.1 + i) * 0.5)
			end
		end
	end
end)
-- music zones
local bg
while true do
	task.wait(0.3)
	bg = bg or SoundService:FindFirstChild("DreamMusic")
	local isl = island()
	local r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
	local found
	if isl and r then
		for _, z in ipairs(isl:GetDescendants()) do
			if z.Name == "MusicZone" and z:IsA("BasePart") then
				local l = z.CFrame:PointToObjectSpace(r.Position)
				if math.abs(l.X) < z.Size.X / 2 and math.abs(l.Y) < z.Size.Y / 2 + 3 and math.abs(l.Z) < z.Size.Z / 2 then found = z:GetAttribute("Music") end
			end
		end
	end
	local allowed = plr:GetAttribute("MusicEnabled") ~= false
	if found ~= current then
		current = found
		if found and TRACKS[found] then zoneSound.SoundId = TRACKS[found]; zoneSound.TimePosition = 0; zoneSound:Play() else zoneSound:Stop() end
	end
	local target = (current and allowed) and 0.5 or 0
	zoneSound.Volume += (target - zoneSound.Volume) * 0.5
	if bg then bg.Volume = (current or not allowed) and 0 or 0.3 end
end
