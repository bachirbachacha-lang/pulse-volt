-- Doors for imported Blender mansions: every MeshPart named Door_* gets an E prompt and swings open on its hinge
-- (garage doors roll up). Works for any model with Door_ parts under workspace.DreamBuilders.Homes.
local TweenService = game:GetService("TweenService")
local homes = workspace:WaitForChild("DreamBuilders"):WaitForChild("Homes")
local function setup(door)
	if door:GetAttribute("DoorReady") or not door:IsA("BasePart") then return end
	door:SetAttribute("DoorReady", true)
	local closed = door.CFrame; local s = door.Size
	local alongX = s.X >= s.Z
	local open
	if door.Name:find("Garage") then
		open = closed * CFrame.new(0, s.Y - 1, 0)
	else
		local w = alongX and s.X or s.Z
		local hingeOffset = alongX and CFrame.new(-s.X / 2, 0, 0) or CFrame.new(0, 0, -s.Z / 2)
		local hinge = closed * hingeOffset
		open = hinge * CFrame.Angles(0, math.rad(-95), 0) * hingeOffset:Inverse()
	end
	local pp = Instance.new("ProximityPrompt"); pp.ActionText = "Open"; pp.ObjectText = "Door"; pp.KeyboardKeyCode = Enum.KeyCode.E
	pp.MaxActivationDistance = 10; pp.RequiresLineOfSight = false; pp.Parent = door
	local isOpen = false
	pp.Triggered:Connect(function()
		isOpen = not isOpen; pp.ActionText = isOpen and "Close" or "Open"
		TweenService:Create(door, TweenInfo.new(0.6, Enum.EasingStyle.Quad), {CFrame = isOpen and open or closed}):Play()
	end)
end
for _, d in ipairs(homes:GetDescendants()) do if d.Name:sub(1, 5) == "Door_" then setup(d) end end
homes.DescendantAdded:Connect(function(d) if d.Name:sub(1, 5) == "Door_" then task.wait(); setup(d) end end)
