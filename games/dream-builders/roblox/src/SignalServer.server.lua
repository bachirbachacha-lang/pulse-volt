-- Traffic signals: one city-wide cycle. North-south green 14 s -> amber 3 s -> all red 1.5 s -> east-west green 14 s -> amber -> all red.
-- Signals folder attribute "Green" = "NS" / "EW" / "" (amber or all-red) is read by the AI traffic and the bus.
local S = workspace:WaitForChild("DreamBuilders"):WaitForChild("Signals")
local ON = {Red = Color3.fromRGB(255, 50, 40), Amber = Color3.fromRGB(255, 170, 30), Green = Color3.fromRGB(40, 230, 90)}
local OFF = Color3.fromRGB(40, 40, 40)
local lamps = {}
for _, d in ipairs(S:GetDescendants()) do if d.Name:sub(1, 4) == "Lamp" then lamps[#lamps + 1] = d end end
local function show(state) -- state[axis] = "Red" | "Amber" | "Green"
	for _, l in ipairs(lamps) do
		local want = state[l:GetAttribute("Axis")]
		local on = l:GetAttribute("Col") == want
		l.Color = on and ON[want] or OFF; l.Material = on and Enum.Material.Neon or Enum.Material.SmoothPlastic
	end
end
local PHASES = {
	{NS = "Green", EW = "Red", green = "NS", t = 14}, {NS = "Amber", EW = "Red", green = "", t = 3}, {NS = "Red", EW = "Red", green = "", t = 1.5},
	{NS = "Red", EW = "Green", green = "EW", t = 14}, {NS = "Red", EW = "Amber", green = "", t = 3}, {NS = "Red", EW = "Red", green = "", t = 1.5},
}
while true do
	for _, ph in ipairs(PHASES) do
		S:SetAttribute("Green", ph.green); show(ph); task.wait(ph.t)
	end
end
