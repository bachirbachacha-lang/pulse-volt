-- Dream Builders: controls (StarterPlayerScripts/Controls). WASD + Space are Roblox defaults, E = ProximityPrompts, Shift = sprint.
local UIS = game:GetService("UserInputService")
local plr = game:GetService("Players").LocalPlayer
local WALK, RUN = 16, 30
local function hum() local c = plr.Character; return c and c:FindFirstChildOfClass("Humanoid") end
UIS.InputBegan:Connect(function(i, gp)
	if gp then return end
	if i.KeyCode == Enum.KeyCode.LeftShift or i.KeyCode == Enum.KeyCode.RightShift then local h = hum(); if h then h.WalkSpeed = RUN end end
end)
UIS.InputEnded:Connect(function(i)
	if i.KeyCode == Enum.KeyCode.LeftShift or i.KeyCode == Enum.KeyCode.RightShift then local h = hum(); if h then h.WalkSpeed = WALK end end
end)
