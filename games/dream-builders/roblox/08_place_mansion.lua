-- Dream Builders: step 8. After importing LuxuryMansion.fbx (Import 3D, Anchored, Stud units) this script finishes it:
-- colours + materials by mesh name, glass/water transparency, precise collisions (walk inside!), moves it into Palm Hills
-- (replacing the first block villa), and installs the door script. Run in the Studio command bar (edit mode).
local W = workspace
local root = W:WaitForChild("DreamBuilders")
local homes = root:FindFirstChild("Homes") or Instance.new("Folder"); homes.Name = "Homes"; homes.Parent = root
local m = W:FindFirstChild("LuxuryMansion") or homes:FindFirstChild("LuxuryMansion"); assert(m, "import LuxuryMansion.fbx first")
local LOOK = {
	plaster = {{246, 244, 238}, "Plaster"}, cream = {{236, 226, 204}, "Plaster"}, slab = {{62, 60, 58}, "Concrete"},
	wood = {{150, 100, 60}, "WoodPlanks"}, oak = {{196, 160, 116}, "WoodPlanks"}, tile = {{228, 226, 222}, "Marble"},
	glass = {{140, 185, 205}, "Glass", 0.55, false}, frame = {{32, 32, 36}, "Metal"}, stone = {{222, 214, 196}, "Limestone"},
	pool = {{40, 180, 205}, "Glass", 0.3}, gold = {{226, 176, 70}, "Metal"}, light = {{255, 228, 175}, "Neon", 0, false},
	sofa = {{214, 204, 186}, "Fabric"}, fabric = {{52, 54, 60}, "Fabric"}, kitchen = {{245, 245, 242}, "SmoothPlastic"},
	marble = {{236, 232, 226}, "Marble"}, leaf = {{60, 136, 54}, "LeafyGrass", 0, false}, grass = {{96, 150, 66}, "Grass"},
	black = {{22, 22, 26}, "SmoothPlastic"}, bed = {{250, 248, 244}, "Fabric"},
}
for _, p in ipairs(m:GetDescendants()) do
	if p:IsA("MeshPart") then
		local key = p.Name:match("^Mansion_(.+)$")
		local look = key and LOOK[key] or (p.Name:find("^Door_Garage") and LOOK.frame) or (p.Name:find("^Door_") and LOOK.wood)
		if look then
			p.Color = Color3.fromRGB(look[1][1], look[1][2], look[1][3]); p.Material = Enum.Material[look[2]]
			p.Transparency = look[3] or 0; if look[4] == false then p.CanCollide = false end
		end
		p.Anchored = true
		pcall(function() p.CollisionFidelity = Enum.CollisionFidelity.PreciseConvexDecomposition end)
		if p.Name:find("^Door_") then p.CanCollide = true end
	end
end
-- clear the block villa that stood on this Palm Hills lot, then place the mansion there facing the street
local SPOT = Vector3.new(-380, 0, -556)
local ph = root:FindFirstChild("PalmHills")
if ph then for _, p in ipairs(ph:GetChildren()) do
	if p:IsA("BasePart") and math.abs(p.Position.X - SPOT.X) < 34 and math.abs(p.Position.Z - SPOT.Z) < 34 then p:Destroy() end
end end
m.Parent = homes
local k = 1
local door = m:FindFirstChild("Door_Front", true); if door and door.Size.X > 20 then k = door.Size.X / 6 end  -- importer unit fix (came in ~22x)
if k ~= 1 then m:ScaleTo(m:GetScale() / k) end
m:PivotTo(CFrame.new(SPOT) * CFrame.Angles(0, math.pi, 0))
local bcf, bsz = m:GetBoundingBox(); m:PivotTo(m:GetPivot() + Vector3.new(0, -(bcf.Position.Y - bsz.Y / 2), 0))
local ss = game:GetService("ServerScriptService")
local old = ss:FindFirstChild("MansionDoors"); if old then old:Destroy() end
local s = Instance.new("Script"); s.Name = "MansionDoors"; s.Source = [==[-- Doors for imported Blender mansions: every MeshPart named Door_* gets an E prompt and swings open on its hinge
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
]==]; s.Parent = ss
local spawnHere = Instance.new("Part"); spawnHere.Name = "MansionViewpoint"; spawnHere.Anchored = true; spawnHere.Transparency = 1; spawnHere.CanCollide = false
spawnHere.Size = Vector3.new(1, 1, 1); spawnHere.Position = SPOT + Vector3.new(0, 4, 52); spawnHere.Parent = homes
print("Luxury mansion placed in Palm Hills at", SPOT)
