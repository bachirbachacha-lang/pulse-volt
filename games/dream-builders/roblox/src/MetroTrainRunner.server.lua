-- ServerScriptService.MetroTrainRunner: moves the metro train between the stations (anchored model, server-driven).
local RunService = game:GetService("RunService")
local metro = workspace:WaitForChild("DreamBuilders"):WaitForChild("Metro")
local train = metro:WaitForChild("Trains"):WaitForChild("Train1")
local stops = {}
for _, s in ipairs(metro:GetChildren()) do
	if s:IsA("Model") and s.Name:find("^Station_") then
		local pl = s:FindFirstChild("Platform")
		if pl then table.insert(stops, pl.Position.X) end
	end
end
table.sort(stops)
local y, z = train.PrimaryPart.Position.Y, train.PrimaryPart.Position.Z
local SPEED, DWELL = 45, 10
local function ease(t) return t * t * (3 - 2 * t) end
local order = {}
for i = 1, #stops do order[#order + 1] = stops[i] end
for i = #stops - 1, 2, -1 do order[#order + 1] = stops[i] end
local i = 1
train:PivotTo(CFrame.new(order[1], y, z))
while true do
	task.wait(DWELL)
	local from = order[i]
	i = i % #order + 1
	local to = order[i]
	local dur = math.abs(to - from) / SPEED
	local t0 = os.clock()
	while true do
		local a = math.clamp((os.clock() - t0) / dur, 0, 1)
		train:PivotTo(CFrame.new(from + (to - from) * ease(a), y, z))
		if a >= 1 then break end
		RunService.Heartbeat:Wait()
	end
end
