-- Dream Builders: step 1, the world (run once in the Studio command bar, edit mode)
local W = workspace
local old = W:FindFirstChild("DreamBuilders"); if old then old:Destroy() end
local root = Instance.new("Folder"); root.Name = "DreamBuilders"; root.Parent = W
local function part(p)
	local x = Instance.new("Part"); x.Anchored = true; x.TopSurface = Enum.SurfaceType.Smooth; x.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in pairs(p) do if k ~= "Parent" then x[k] = v end end
	x.Parent = p.Parent or root; return x
end
local function sign(parentPart, text, color, face)
	local g = Instance.new("SurfaceGui"); g.Face = face or Enum.NormalId.Front; g.PixelsPerStud = 40; g.Parent = parentPart
	local t = Instance.new("TextLabel"); t.Size = UDim2.fromScale(1, 1); t.BackgroundTransparency = 1; t.Text = text
	t.TextScaled = true; t.Font = Enum.Font.GothamBlack; t.TextColor3 = color or Color3.new(1, 1, 1); t.Parent = g
end
-- ground
local bp = W:FindFirstChild("Baseplate")
if bp then bp.Size = Vector3.new(700, 2, 700); bp.Position = Vector3.new(0, -1, 0); bp.Material = Enum.Material.Grass; bp.Color = Color3.fromRGB(86, 150, 72)
	for _, c in ipairs(bp:GetChildren()) do if c:IsA("Texture") or c:IsA("Decal") then c:Destroy() end end end
-- roads: a main avenue and three cross streets between the plots
local road = Color3.fromRGB(45, 45, 50)
part{Name="Avenue", Size=Vector3.new(30, 0.4, 600), Position=Vector3.new(0, 0.2, 0), Color=road, Material=Enum.Material.Asphalt}
for _, z in ipairs({-130, 10, 160}) do part{Name="Street", Size=Vector3.new(600, 0.4, 24), Position=Vector3.new(0, 0.21, z), Color=road, Material=Enum.Material.Asphalt} end
for z = -290, 290, 20 do part{Name="Stripe", Size=Vector3.new(0.8, 0.05, 8), Position=Vector3.new(0, 0.43, z), Color=Color3.fromRGB(240, 210, 80), Material=Enum.Material.Neon} end
-- sidewalks
for _, x in ipairs({-19, 19}) do part{Name="Sidewalk", Size=Vector3.new(8, 0.8, 600), Position=Vector3.new(x, 0.4, 0), Color=Color3.fromRGB(190, 188, 180), Material=Enum.Material.Concrete} end
-- mansion plots: 3 each side of the avenue
local plots = Instance.new("Folder"); plots.Name = "Plots"; plots.Parent = root
local n = 0
for _, side in ipairs({-1, 1}) do
	for _, z in ipairs({-200, -60, 80}) do
		n += 1
		local m = Instance.new("Model"); m.Name = "Plot" .. n; m.Parent = plots
		local cx = side * 95
		local pad = part{Name="Pad", Parent=m, Size=Vector3.new(110, 1, 110), Position=Vector3.new(cx, 0.5, z), Color=Color3.fromRGB(150, 120, 85), Material=Enum.Material.Ground}
		m.PrimaryPart = pad
		-- fence posts + sign
		for i = -5, 5 do
			part{Name="Fence", Parent=m, Size=Vector3.new(1, 4, 1), Position=Vector3.new(cx - side * 55, 2.5, z + i * 10), Color=Color3.fromRGB(245, 245, 240), Material=Enum.Material.Wood}
		end
		local post = part{Name="SignPost", Parent=m, Size=Vector3.new(0.6, 8, 0.6), Position=Vector3.new(cx - side * 60, 4, z - 27), Color=Color3.fromRGB(90, 60, 35), Material=Enum.Material.Wood}
		local board = part{Name="SignBoard", Parent=m, Size=Vector3.new(12, 5, 0.5), Position=Vector3.new(cx - side * 60, 9, z - 27), Color=Color3.fromRGB(255, 205, 60), Material=Enum.Material.SmoothPlastic}
		board.CFrame = CFrame.lookAt(board.Position, board.Position + Vector3.new(-side, 0, 0))
		sign(board, "PLOT " .. n .. "\nFOR SALE", Color3.fromRGB(30, 30, 35))
		m:SetAttribute("PlotId", n); m:SetAttribute("Stage", 0)
	end
end
-- Dream Builders HQ at the north end
local hq = Instance.new("Model"); hq.Name = "HQ"; hq.Parent = root
local base = part{Name="Floor", Parent=hq, Size=Vector3.new(80, 1, 50), Position=Vector3.new(0, 0.5, 260), Color=Color3.fromRGB(230, 230, 225), Material=Enum.Material.Marble}
local glass = Color3.fromRGB(120, 180, 220)
part{Name="Back", Parent=hq, Size=Vector3.new(80, 30, 2), Position=Vector3.new(0, 16, 284), Color=Color3.fromRGB(35, 38, 48), Material=Enum.Material.Concrete}
for _, x in ipairs({-39, 39}) do part{Name="Side", Parent=hq, Size=Vector3.new(2, 30, 50), Position=Vector3.new(x, 16, 260), Color=Color3.fromRGB(35, 38, 48), Material=Enum.Material.Concrete} end
part{Name="Roof", Parent=hq, Size=Vector3.new(84, 2, 54), Position=Vector3.new(0, 32, 260), Color=Color3.fromRGB(255, 190, 40), Material=Enum.Material.Metal}
for x = -30, 30, 20 do part{Name="Glass", Parent=hq, Size=Vector3.new(14, 20, 0.5), Position=Vector3.new(x, 14, 236), Color=glass, Material=Enum.Material.Glass, Transparency=0.45} end
local logo = part{Name="Logo", Parent=hq, Size=Vector3.new(60, 8, 1), Position=Vector3.new(0, 38, 236), Color=Color3.fromRGB(20, 20, 25), Material=Enum.Material.SmoothPlastic}
logo.CFrame = CFrame.lookAt(logo.Position, logo.Position + Vector3.new(0, 0, -1))
sign(logo, "DREAM BUILDERS", Color3.fromRGB(255, 200, 50))
-- job pads in front of HQ
local jobs = Instance.new("Folder"); jobs.Name = "JobPads"; jobs.Parent = root
local function jobPad(name, x, col)
	local p = part{Name=name, Parent=jobs, Size=Vector3.new(16, 1, 16), Position=Vector3.new(x, 0.6, 220), Color=col, Material=Enum.Material.Neon}
	local b = part{Name=name .. "Sign", Parent=jobs, Size=Vector3.new(16, 5, 0.5), Position=Vector3.new(x, 7, 228), Color=Color3.fromRGB(25, 25, 30)}
	b.CFrame = CFrame.lookAt(b.Position, b.Position + Vector3.new(0, 0, -1))
	sign(b, name:upper(), col); p:SetAttribute("Job", name); return p
end
jobPad("Construction Worker", -22, Color3.fromRGB(255, 150, 30))
jobPad("Architect", 22, Color3.fromRGB(80, 170, 255))
-- supply yard (bricks for workers to carry) at the south end
local yard = Instance.new("Model"); yard.Name = "SupplyYard"; yard.Parent = root
part{Name="YardFloor", Parent=yard, Size=Vector3.new(70, 1, 40), Position=Vector3.new(0, 0.5, -275), Color=Color3.fromRGB(120, 120, 115), Material=Enum.Material.Concrete}
for i = 0, 11 do
	part{Name="BrickStack", Parent=yard, Size=Vector3.new(6, 3, 4), Position=Vector3.new(-27 + (i % 6) * 10.5, 2.5 + math.floor(i / 6) * 3, -280), Color=Color3.fromRGB(170, 75, 55), Material=Enum.Material.Brick}
end
local ys = part{Name="YardSign", Parent=yard, Size=Vector3.new(30, 6, 0.5), Position=Vector3.new(0, 10, -258), Color=Color3.fromRGB(25, 25, 30)}
ys.CFrame = CFrame.lookAt(ys.Position, ys.Position + Vector3.new(0, 0, 1))
sign(ys, "SUPPLY YARD", Color3.fromRGB(255, 150, 30))
-- spawn in front of HQ
local sp = W:FindFirstChildOfClass("SpawnLocation"); if sp then sp.Position = Vector3.new(0, 1, 200); sp.Size = Vector3.new(12, 1, 12) end
-- lighting / sky
local L = game:GetService("Lighting")
L.ClockTime = 15.5; L.Brightness = 3 -- set Lighting.Technology to Future by hand (scripts cannot)
if not L:FindFirstChildOfClass("Atmosphere") then local a = Instance.new("Atmosphere"); a.Density = 0.3; a.Haze = 1; a.Parent = L end
print("Dream Builders world built: 6 plots, HQ, job pads, supply yard")
