-- Moves the metro train between the stations (anchored model, server-driven). Seated riders move with it.
-- Sets Train1 attribute "Docked" = station name while it waits at a platform (boarding is only possible then).
local RunService = game:GetService("RunService")
local metro = workspace:WaitForChild("DreamBuilders"):WaitForChild("Metro")
local train = metro:WaitForChild("Trains"):WaitForChild("Train1")
local stops = {}
for _, s in ipairs(metro:GetChildren()) do
	if s:IsA("Model") and s.Name:find("^Station_") then
		local pl = s:FindFirstChild("Platform")
		if pl then table.insert(stops, {x = pl.Position.X, name = s.Name:sub(9)}) end
	end
end
table.sort(stops, function(a, b) return a.x < b.x end)
local y, z = train.PrimaryPart.Position.Y, train.PrimaryPart.Position.Z
local SPEED, DWELL = 40, 14
local function ease(t) return t * t * (3 - 2 * t) end
local order = {}
for i = 1, #stops do order[#order + 1] = stops[i] end
for i = #stops - 1, 2, -1 do order[#order + 1] = stops[i] end
local function setDisplays(text)
	for _, d in ipairs(train:GetDescendants()) do if d.Name == "Text" and d:IsA("TextLabel") then d.Text = text end end
end
local i = 1
train:PivotTo(CFrame.new(order[1].x, y, z))
while true do
	train:SetAttribute("Docked", order[i].name)
	setDisplays("NOW AT: " .. order[i].name:upper())
	task.wait(DWELL)
	train:SetAttribute("Docked", nil)
	local from = order[i].x
	i = i % #order + 1
	local to = order[i].x
	setDisplays("NEXT STOP: " .. order[i].name:upper())
	local dur = math.abs(to - from) / SPEED
	local t0 = os.clock()
	while true do
		local a = math.clamp((os.clock() - t0) / dur, 0, 1)
		train:PivotTo(CFrame.new(from + (to - from) * ease(a), y, z))
		if a >= 1 then break end
		RunService.Heartbeat:Wait()
	end
end
