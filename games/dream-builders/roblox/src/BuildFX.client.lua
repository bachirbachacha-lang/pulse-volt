-- Hologram build effect: blueprint lines -> scan ring sweeps up -> each piece materialises at its height.
-- Any BasePart tagged "BuildFX" (by the server) plays it once, for every nearby player.
local CS, TS, Run, Players = game:GetService("CollectionService"), game:GetService("TweenService"), game:GetService("RunService"), game:GetService("Players")
local plr = Players.LocalPlayer
local CYAN = Color3.fromRGB(80, 220, 255)
local batch, timer = {}, nil
local function play(parts)
	local mn, mx = Vector3.new(math.huge, math.huge, math.huge), Vector3.new(-math.huge, -math.huge, -math.huge)
	for _, p in ipairs(parts) do
		local h = p.Size / 2
		mn = mn:Min(p.Position - h); mx = mx:Max(p.Position + h)
	end
	local cam = workspace.CurrentCamera
	if cam and (cam.CFrame.Position - (mn + mx) / 2).Magnitude > 450 then return end
	local height = math.max(1, mx.Y - mn.Y)
	local T = math.clamp(0.9 + height / 18, 1.2, 3.5)
	-- hide pieces and show glowing outlines
	local boxes = {}
	for _, p in ipairs(parts) do
		p.LocalTransparencyModifier = 1
		local sb = Instance.new("SelectionBox"); sb.Adornee = p; sb.Color3 = CYAN; sb.LineThickness = 0.04
		sb.SurfaceTransparency = 1; sb.Transparency = 0.15; sb.Parent = p; boxes[p] = sb
	end
	-- scan ring
	local size = mx - mn
	local ring = Instance.new("Part"); ring.Anchored = true; ring.CanCollide = false; ring.CanQuery = false; ring.CanTouch = false; ring.CastShadow = false
	ring.Material = Enum.Material.Neon; ring.Color = CYAN; ring.Transparency = 0.35
	ring.Size = Vector3.new(size.X + 3, 0.15, size.Z + 3)
	ring.CFrame = CFrame.new((mn.X + mx.X) / 2, mn.Y, (mn.Z + mx.Z) / 2); ring.Parent = workspace
	local glow = Instance.new("PointLight"); glow.Color = CYAN; glow.Range = 24; glow.Brightness = 2.5; glow.Parent = ring
	TS:Create(ring, TweenInfo.new(T, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {CFrame = ring.CFrame + Vector3.new(0, height, 0)}):Play()
	-- reveal each piece when the ring passes it
	for _, p in ipairs(parts) do
		local t = ((p.Position.Y - p.Size.Y / 2) - mn.Y) / height * T
		task.delay(t, function()
			if not p.Parent then return end
			TS:Create(p, TweenInfo.new(0.35, Enum.EasingStyle.Quad), {LocalTransparencyModifier = 0}):Play()
			local sb = boxes[p]
			if sb then TS:Create(sb, TweenInfo.new(0.6), {Transparency = 1}):Play(); task.delay(0.7, function() sb:Destroy() end) end
		end)
	end
	task.delay(T + 0.2, function()
		TS:Create(ring, TweenInfo.new(0.5), {Transparency = 1}):Play()
		task.delay(0.6, function() ring:Destroy() end)
	end)
end
local function added(p)
	if not p:IsA("BasePart") then return end
	table.insert(batch, p)
	if not timer then
		timer = true
		task.delay(0.15, function()
			local b = batch; batch = {}; timer = nil
			play(b)
		end)
	end
end
CS:GetInstanceAddedSignal("BuildFX"):Connect(added)
