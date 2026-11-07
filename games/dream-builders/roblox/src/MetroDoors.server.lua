-- Metro doors: when Train1 docks (attribute "Docked" = station), its doors and that station's platform screen doors
-- slide open with a chime; 2.5 s before the train leaves they close again (the runner waits DWELL = 14 s).
local TweenService = game:GetService("TweenService")
local M = workspace:WaitForChild("DreamBuilders"):WaitForChild("Metro")
local train = M:WaitForChild("Trains"):WaitForChild("Train1")
local DWELL = 14
local trainDoors = {}
for _, d in ipairs(train:WaitForChild("Interior"):GetChildren()) do if d.Name == "Door" then trainDoors[#trainDoors + 1] = d end end
local chime = Instance.new("Sound"); chime.SoundId = "rbxasset://sounds/electronicpingshort.wav"; chime.Volume = 0.6; chime.Parent = train.PrimaryPart or train:FindFirstChild("Root")
local function screenDoors(station)
	for _, st in ipairs(M:GetChildren()) do
		local sd = st:FindFirstChild("ScreenDoors")
		if sd and sd:GetAttribute("Station") == station then return sd end
	end
end
local token = 0
local function setOpen(station, open)
	local info = TweenInfo.new(1.1, Enum.EasingStyle.Quad)
	-- train doors slide along the car (local X) relative to where the train is parked now
	local pivot = train:GetPivot()
	for i, d in ipairs(trainDoors) do
		if not d:GetAttribute("Rel") then d:SetAttribute("Rel", pivot:ToObjectSpace(d.CFrame).Position) end
		local rel = d:GetAttribute("Rel")
		local side = (i % 2 == 0) and 1 or -1
		local closed = pivot * CFrame.new(rel) * (pivot - pivot.Position):Inverse() * (d.CFrame - d.CFrame.Position)
		local target = open and (closed + pivot.RightVector * side * 3.4) or closed
		d.CanCollide = not open
		TweenService:Create(d, info, {CFrame = target}):Play()
	end
	local sd = station and screenDoors(station)
	if sd then
		for _, leaf in ipairs(sd:GetChildren()) do
			if leaf.Name == "ScreenDoorLeaf" then
				local closed = leaf:GetAttribute("Closed")
				TweenService:Create(leaf, info, {Position = open and (closed + Vector3.new(leaf:GetAttribute("Side") * 2.2, 0, 0)) or closed}):Play()
			end
		end
	end
	chime:Play()
end
local current
train:GetAttributeChangedSignal("Docked"):Connect(function()
	local st = train:GetAttribute("Docked")
	token += 1; local my = token
	if st then
		current = st
		task.wait(0.6); if my ~= token then return end
		setOpen(st, true)
		task.wait(DWELL - 3.2); if my ~= token then return end
		setOpen(st, false)
	else
		-- safety: make sure everything is closed when it leaves
		for _, d in ipairs(trainDoors) do d.CanCollide = true end
	end
end)
