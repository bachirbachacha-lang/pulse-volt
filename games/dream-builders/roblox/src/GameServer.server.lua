-- Dream Builders: game server (ServerScriptService/GameServer)
-- Jobs at HQ, bricks from the Supply Yard, mansions that build stage by stage, money for everyone who helped.
local Players = game:GetService("Players")
local root = workspace:WaitForChild("DreamBuilders")
local plotsFolder = root:WaitForChild("Plots")

local STAGES = {"Blueprint", "Foundation", "Ground floor", "Second floor", "Roof", "Pool & garden"}
local BRICKS_PER_STAGE = {0, 4, 5, 5, 4, 3}       -- bricks needed to finish each stage after the blueprint
local PAY_ARCHITECT, PAY_BRICK = 150, 25
local START_MONEY = 100

-- ---------------------------------------------------------------- players: money, job, HUD
local function hud(plr)
	local g = Instance.new("ScreenGui"); g.Name = "DreamHUD"; g.ResetOnSpawn = false
	local f = Instance.new("Frame"); f.Size = UDim2.fromOffset(260, 92); f.Position = UDim2.new(0, 16, 0, 16)
	f.BackgroundColor3 = Color3.fromRGB(20, 22, 30); f.BackgroundTransparency = 0.15; f.Parent = g
	Instance.new("UICorner", f).CornerRadius = UDim.new(0, 14)
	local function lab(name, y, size, color)
		local t = Instance.new("TextLabel"); t.Name = name; t.BackgroundTransparency = 1; t.Size = UDim2.new(1, -24, 0, size + 6)
		t.Position = UDim2.fromOffset(12, y); t.Font = Enum.Font.GothamBlack; t.TextSize = size; t.TextXAlignment = Enum.TextXAlignment.Left
		t.TextColor3 = color; t.Parent = f; return t
	end
	lab("Money", 8, 28, Color3.fromRGB(120, 230, 120)); lab("Job", 44, 16, Color3.fromRGB(255, 200, 60)); lab("Hint", 66, 13, Color3.fromRGB(220, 220, 230))
	local toast = Instance.new("TextLabel"); toast.Name = "Toast"; toast.AnchorPoint = Vector2.new(0.5, 0); toast.Position = UDim2.new(0.5, 0, 0, 24)
	toast.Size = UDim2.fromOffset(520, 48); toast.BackgroundColor3 = Color3.fromRGB(255, 190, 40); toast.TextColor3 = Color3.fromRGB(25, 25, 30)
	toast.Font = Enum.Font.GothamBlack; toast.TextSize = 22; toast.Visible = false; toast.Parent = g
	Instance.new("UICorner", toast).CornerRadius = UDim.new(0, 12)
	g.Parent = plr:WaitForChild("PlayerGui"); return g
end
local function refresh(plr)
	local g = plr:FindFirstChild("PlayerGui") and plr.PlayerGui:FindFirstChild("DreamHUD"); if not g then return end
	local f = g.Frame; local job = plr:GetAttribute("Job") or "No job"
	f.Money.Text = "$" .. tostring(plr.leaderstats.Money.Value)
	f.Job.Text = "JOB: " .. string.upper(job)
	local HINTS = {["Construction Worker"] = "Get bricks at the Supply Yard (E)", ["Architect"] = "Design a plot: press E at its sign", ["Real Estate Agent"] = "Dream Realty Tower reception: get a client (E)", ["Car Dealer"] = "Dream Motors sales kiosk: get a buyer (E)", ["Chef"] = "Sahara Grill / Dream Diner: start a shift at the grill (F)", ["Hair Stylist"] = "Plaza salon chair: open it and cut hair (E)", ["Fashion Designer"] = "Plaza pop-up: design outfits, then sell at the stall", ["Delivery Driver"] = "Food orders come to you: pick up, then deliver", ["Business Owner"] = "Rent a Downtown shop for your business", ["Teacher"] = "Dream City Academy: teach at the maths room desk (E)", ["Taxi Driver"] = "Get in any car: passengers wave you down", ["Doctor"] = "Dream City Hospital: call the next patient at reception (E)", ["Hotel Receptionist"] = "Dream Grand Hotel: check in arriving guests"}
	f.Hint.Text = HINTS[job] or "Pick a job at HQ"
end
local function toast(plr, msg)
	local g = plr:FindFirstChild("PlayerGui") and plr.PlayerGui:FindFirstChild("DreamHUD"); if not g then return end
	g.Toast.Text = msg; g.Toast.Visible = true
	task.delay(2.5, function() if g.Toast.Text == msg then g.Toast.Visible = false end end)
end
local function pay(plr, amount, why)
	local mult = plr:GetAttribute("MoneyMultiplier") or 1
	amount = math.floor(amount * mult)
	plr.leaderstats.Money.Value += amount; refresh(plr); toast(plr, "+$" .. amount .. "  " .. why .. (mult > 1 and "  (2×!)" or ""))
end
-- save data: money, job and career stats survive leaving the game (DataStore; in Studio turn on
-- Game Settings > Security > "Enable Studio Access to API Services" to test saving)
local DSS = game:GetService("DataStoreService")
local store; pcall(function() store = DSS:GetDataStore("DreamBuilders_v1") end)
local loaded = {}
local function save(plr)
	if not (store and loaded[plr]) then return end
	local d = {money = plr.leaderstats.Money.Value, job = plr:GetAttribute("Job"), bricks = plr:GetAttribute("BricksDelivered") or 0,
		mansions = plr:GetAttribute("MansionsBuilt") or 0, designs = plr:GetAttribute("Designs") or 0,
		lastSpin = plr:GetAttribute("LastSpin"), goldHat = plr:GetAttribute("HasGoldHardHat")}
	local ok, err = pcall(function() store:SetAsync("p_" .. plr.UserId, d) end)
	if not ok then warn("save failed", plr.Name, err) end
end
Players.PlayerAdded:Connect(function(plr)
	local ls = Instance.new("Folder"); ls.Name = "leaderstats"; ls.Parent = plr
	local m = Instance.new("IntValue"); m.Name = "Money"; m.Value = START_MONEY; m.Parent = ls
	local j = Instance.new("StringValue"); j.Name = "Job"; j.Value = "None"; j.Parent = ls
	if store then
		local ok, d = pcall(function() return store:GetAsync("p_" .. plr.UserId) end)
		if ok and type(d) == "table" then
			m.Value = d.money or START_MONEY
			if d.job then plr:SetAttribute("Job", d.job); j.Value = d.job end
			plr:SetAttribute("BricksDelivered", d.bricks or 0); plr:SetAttribute("MansionsBuilt", d.mansions or 0); plr:SetAttribute("Designs", d.designs or 0)
			if d.lastSpin then plr:SetAttribute("LastSpin", d.lastSpin) end
			if d.goldHat then plr:SetAttribute("HasGoldHardHat", true) end
		end
		loaded[plr] = ok
	end
	hud(plr); refresh(plr)
	m.Changed:Connect(function() refresh(plr) end) -- MoneyChangedListener
	plr:GetAttributeChangedSignal("Job"):Connect(function() -- JobAttrListener
		local jv = plr:GetAttribute("Job"); if jv then j.Value = jv end; refresh(plr)
	end)
	plr.CharacterAdded:Connect(function() task.wait(0.5); refresh(plr) end)
end)
Players.PlayerRemoving:Connect(function(plr) save(plr); loaded[plr] = nil end)
game:BindToClose(function() for _, p in ipairs(Players:GetPlayers()) do save(p) end end)
task.spawn(function() while true do task.wait(120); for _, p in ipairs(Players:GetPlayers()) do save(p) end end end)
local function stat(plr, key) plr:SetAttribute(key, (plr:GetAttribute(key) or 0) + 1) end

-- ---------------------------------------------------------------- hats + carried brick
local function hat(char, color)
	local old = char:FindFirstChild("HardHat"); if old then old:Destroy() end
	local head = char:FindFirstChild("Head"); if not head then return end
	local h = Instance.new("Part"); h.Name = "HardHat"; h.Shape = Enum.PartType.Ball; h.Size = Vector3.new(1.6, 0.9, 1.6)
	local plr = Players:GetPlayerFromCharacter(char)
	if plr and plr:GetAttribute("HasGoldHardHat") then color = Color3.fromRGB(255, 200, 60) end
	h.Color = color; h.Material = (plr and plr:GetAttribute("HasGoldHardHat")) and Enum.Material.Foil or Enum.Material.SmoothPlastic; h.CanCollide = false; h.Massless = true
	h.CFrame = head.CFrame * CFrame.new(0, 0.55, 0); h.Parent = char
	local w = Instance.new("WeldConstraint"); w.Part0 = head; w.Part1 = h; w.Parent = h
end
local function carrying(char) return char and char:FindFirstChild("CarriedBrick") end
local function giveBrick(char)
	if carrying(char) then return false end
	local torso = char:FindFirstChild("UpperTorso") or char:FindFirstChild("Torso"); if not torso then return false end
	local b = Instance.new("Part"); b.Name = "CarriedBrick"; b.Size = Vector3.new(2, 1, 1.2); b.Color = Color3.fromRGB(170, 75, 55)
	b.Material = Enum.Material.Brick; b.CanCollide = false; b.Massless = true
	b.CFrame = torso.CFrame * CFrame.new(0, -0.2, -1.4); b.Parent = char
	local w = Instance.new("WeldConstraint"); w.Part0 = torso; w.Part1 = b; w.Parent = b
	return true
end

-- ---------------------------------------------------------------- job pads
for _, pad in ipairs(root:WaitForChild("JobPads"):GetChildren()) do
	local job = pad:GetAttribute("Job")
	if job then
		pad.Touched:Connect(function(hit)
			local char = hit.Parent; local plr = Players:GetPlayerFromCharacter(char)
			if not plr or plr:GetAttribute("Job") == job then return end
			plr:SetAttribute("Job", job); plr.leaderstats.Job.Value = job
			hat(char, job == "Architect" and Color3.fromRGB(80, 170, 255) or Color3.fromRGB(255, 150, 30))
			refresh(plr); toast(plr, "You are now a " .. job .. "!")
		end)
	end
end
Players.PlayerAdded:Connect(function(plr)
	plr.CharacterAdded:Connect(function(char)
		task.wait(0.3); local job = plr:GetAttribute("Job")
		if job then hat(char, job == "Architect" and Color3.fromRGB(80, 170, 255) or Color3.fromRGB(255, 150, 30)) end
	end)
end)

-- ---------------------------------------------------------------- brick stacks (E to pick up)
local materials = root:FindFirstChild("Materials")
if materials then
	for _, stack in ipairs(materials:GetChildren()) do
		if stack.Name == "BrickStack" then
			local pp = Instance.new("ProximityPrompt"); pp.ActionText = "Pick up brick"; pp.ObjectText = "Bricks"
			pp.KeyboardKeyCode = Enum.KeyCode.E; pp.MaxActivationDistance = 12; pp.Parent = stack
			pp.Triggered:Connect(function(plr)
				if plr:GetAttribute("Job") ~= "Construction Worker" then toast(plr, "Only Construction Workers carry bricks"); return end
				if giveBrick(plr.Character) then toast(plr, "Brick! Take it to a plot with a blueprint") end
			end)
		end
	end
end

-- ---------------------------------------------------------------- mansion builder
local function piece(model, cf, size, color, mat, tr, name)
	local p = Instance.new("Part"); p.Anchored = true; p.Size = size; p.CFrame = cf; p.Color = color
	p.Material = mat or Enum.Material.SmoothPlastic; p.Transparency = tr or 0; p.Name = name or "Mansion"
	p.TopSurface = Enum.SurfaceType.Smooth; p.BottomSurface = Enum.SurfaceType.Smooth; p.Parent = model
	if model.Name == "Mansion" then game:GetService("CollectionService"):AddTag(p, "BuildFX") end
	return p
end
local function buildStage(plot, stage, intoModel)
	local pad = plot.PrimaryPart; local S = pad.Size.X; local top = pad.CFrame * CFrame.new(0, pad.Size.Y / 2, 0)
	local m = intoModel or plot:FindFirstChild("Mansion") or Instance.new("Model"); if not intoModel then m.Name = "Mansion"; m.Parent = plot end
	local W, Dp = S * 0.62, S * 0.42                    -- house footprint
	local cx = top * CFrame.new(0, 0, -S * 0.08)
	local white, cream, glass = Color3.fromRGB(248, 246, 240), Color3.fromRGB(236, 226, 204), Color3.fromRGB(110, 170, 190)
	if stage == 1 then
		for _, e in ipairs({{0, Dp / 2, W, 0.3}, {0, -Dp / 2, W, 0.3}, {W / 2, 0, 0.3, Dp}, {-W / 2, 0, 0.3, Dp}}) do
			piece(m, cx * CFrame.new(e[1], 0.15, e[2]), Vector3.new(e[3], 0.3, e[4]), Color3.fromRGB(80, 170, 255), Enum.Material.Neon, 0, "Blueprint")
		end
	elseif stage == 2 then
		for _, c in ipairs(m:GetChildren()) do if c.Name == "Blueprint" then c:Destroy() end end
		piece(m, cx * CFrame.new(0, 0.6, 0), Vector3.new(W + 2, 1.2, Dp + 2), Color3.fromRGB(190, 188, 182), Enum.Material.Concrete)
	elseif stage == 3 or stage == 4 then
		local y = stage == 3 and 1.2 or 15.2
		for _, e in ipairs({{0, -Dp / 2, W, 1}, {0, Dp / 2, W, 1}, {W / 2, 0, 1, Dp}, {-W / 2, 0, 1, Dp}}) do
			piece(m, cx * CFrame.new(e[1], y + 6.5, e[2]), Vector3.new(e[3], 13, e[4]), stage == 3 and white or cream, Enum.Material.Plaster)
		end
		for i = -2, 2 do piece(m, cx * CFrame.new(i * W / 5.5, y + 7, -Dp / 2 - 0.4), Vector3.new(W / 8, 8, 0.3), glass, Enum.Material.Glass, 0.3) end
		piece(m, cx * CFrame.new(0, y + 13.5, 0), Vector3.new(W + 1, 1, Dp + 1), white, Enum.Material.Concrete)
		if stage == 3 then piece(m, cx * CFrame.new(0, y + 4.5, -Dp / 2 - 0.5), Vector3.new(6, 9, 0.4), Color3.fromRGB(90, 60, 40), Enum.Material.Wood, 0, "Door") end
	elseif stage == 5 then
		-- flat luxury roof slabs with overhang, wood slat feature wall, roof terrace rail
		piece(m, cx * CFrame.new(0, 30.4, 0), Vector3.new(W + 8, 1.4, Dp + 8), Color3.fromRGB(60, 58, 56), Enum.Material.Concrete)
		for i = 0, 8 do piece(m, cx * CFrame.new(-W / 2 + 2 + i * 1.6, 22.2, -Dp / 2 - 0.9), Vector3.new(0.6, 13, 0.6), Color3.fromRGB(146, 98, 58), Enum.Material.WoodPlanks) end
		piece(m, cx * CFrame.new(0, 32.4, -Dp / 2 - 3), Vector3.new(W + 6, 2.6, 0.3), Color3.fromRGB(150, 200, 220), Enum.Material.Glass, 0.4)
	elseif stage == 6 then
		local pool = top * CFrame.new(0, 0, S * 0.32)
		piece(m, pool * CFrame.new(0, 0.3, 0), Vector3.new(W * 0.7, 0.6, S * 0.2), Color3.fromRGB(235, 232, 225), Enum.Material.Marble)
		piece(m, pool * CFrame.new(0, 0.65, 0), Vector3.new(W * 0.62, 0.2, S * 0.15), Color3.fromRGB(60, 170, 230), Enum.Material.Glass, 0.2, "Pool")
		for _, x in ipairs({-W / 2 - 4, W / 2 + 4}) do
			local t = piece(m, top * CFrame.new(x, 6, S * 0.3), Vector3.new(12, 2, 2), Color3.fromRGB(110, 80, 50), Enum.Material.Wood); t.Shape = Enum.PartType.Cylinder; t.CFrame = top * CFrame.new(x, 6, S * 0.3) * CFrame.Angles(0, 0, math.rad(90))
			local l = piece(m, top * CFrame.new(x, 13, S * 0.3), Vector3.new(9, 8, 9), Color3.fromRGB(60, 130, 50), Enum.Material.LeafyGrass); l.Shape = Enum.PartType.Ball
		end
	end
end
-- glowing blue hologram of the finished mansion (like a zoning preview); each stage's ghost disappears when it is really built
local HOLO = Color3.fromRGB(90, 180, 255)
local function hologram(plot)
	local old = plot:FindFirstChild("Hologram"); if old then old:Destroy() end
	local h = Instance.new("Model"); h.Name = "Hologram"; h.Parent = plot
	for st = 2, #STAGES do
		local tmp = Instance.new("Model"); buildStage(plot, st, tmp)
		for _, p in ipairs(tmp:GetChildren()) do
			if p:IsA("BasePart") then
				p.Material = Enum.Material.ForceField; p.Color = HOLO; p.Transparency = 0; p.CanCollide = false; p.CanQuery = false; p.CastShadow = false
				p:SetAttribute("HoloStage", st); p.Parent = h
			end
		end
		tmp:Destroy()
	end
end
local function clearHolo(plot, stage)
	local h = plot:FindFirstChild("Hologram"); if not h then return end
	for _, p in ipairs(h:GetChildren()) do if p:GetAttribute("HoloStage") == stage then p:Destroy() end end
	if #h:GetChildren() == 0 then h:Destroy() end
end
-- dust burst when a stage is built, confetti when a mansion is finished
local function burst(plot, confetti)
	local pad = plot.PrimaryPart; if not pad then return end
	local a = Instance.new("Attachment"); a.Position = Vector3.new(0, 4, 0); a.Parent = pad
	local e = Instance.new("ParticleEmitter"); e.Enabled = false; e.Rate = 0; e.Speed = NumberRange.new(confetti and 30 or 12, confetti and 60 or 26)
	e.SpreadAngle = Vector2.new(confetti and 70 or 180, confetti and 70 or 20); e.Lifetime = NumberRange.new(confetti and 2.5 or 1.6, confetti and 4 or 2.6)
	e.Size = confetti and NumberSequence.new(0.8) or NumberSequence.new({NumberSequenceKeypoint.new(0, 4), NumberSequenceKeypoint.new(1, 14)})
	e.Transparency = NumberSequence.new({NumberSequenceKeypoint.new(0, confetti and 0 or 0.3), NumberSequenceKeypoint.new(1, 1)})
	e.Color = confetti and ColorSequence.new({ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 205, 70)), ColorSequenceKeypoint.new(0.5, Color3.fromRGB(80, 180, 255)), ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 90, 140))})
		or ColorSequence.new(Color3.fromRGB(214, 190, 150))
	e.Acceleration = confetti and Vector3.new(0, -30, 0) or Vector3.new(0, 2, 0); e.Drag = confetti and 1 or 3; e.RotSpeed = NumberRange.new(-200, 200); e.LightEmission = confetti and 0.4 or 0
	e.Parent = a; e:Emit(confetti and 220 or 60)
	game:GetService("Debris"):AddItem(a, 6)
end
local function setSign(plot, text, bg)
	for _, p in ipairs(plot:GetDescendants()) do
		if p:IsA("TextLabel") and p.Parent:IsA("SurfaceGui") and p.Parent.Parent.Parent == plot then
			p.Text = text; p.Parent.Parent.Color = bg
		end
	end
end
local function signPart(plot)
	for _, p in ipairs(plot:GetChildren()) do if p:IsA("BasePart") and p:FindFirstChildOfClass("SurfaceGui") then return p end end
end

for _, plot in ipairs(plotsFolder:GetChildren()) do
	local pad = plot.PrimaryPart or plot:FindFirstChild("Pad"); if not pad then continue end
	plot:SetAttribute("Stage", 0); plot:SetAttribute("Bricks", 0)
	local helpers = {}
	local sp = signPart(plot)
	-- architect: design the blueprint at the sign
	if sp then
		local pp = Instance.new("ProximityPrompt"); pp.ActionText = "Design mansion"; pp.ObjectText = "Plot " .. plot:GetAttribute("PlotId")
		pp.KeyboardKeyCode = Enum.KeyCode.E; pp.MaxActivationDistance = 16; pp.HoldDuration = 1.5; pp.RequiresLineOfSight = false; pp.Parent = sp
		pp.Triggered:Connect(function(plr)
			if plot:GetAttribute("Stage") ~= 0 then toast(plr, "This plot already has a design"); return end
			if plr:GetAttribute("Job") ~= "Architect" then toast(plr, "Only Architects can design. Go to HQ"); return end
			plot:SetAttribute("Stage", 1); helpers[plr] = true; buildStage(plot, 1); hologram(plot); burst(plot, false); stat(plr, "Designs")
			setSign(plot, "PLOT " .. plot:GetAttribute("PlotId") .. "\nUNDER CONSTRUCTION\nbring bricks!", Color3.fromRGB(255, 150, 30))
			pay(plr, PAY_ARCHITECT, "Blueprint designed")
			pp.Enabled = false
		end)
	end
	-- workers: deliver bricks on the pad
	local dp = Instance.new("ProximityPrompt"); dp.ActionText = "Deliver brick"; dp.ObjectText = "Building site"
	dp.KeyboardKeyCode = Enum.KeyCode.E; dp.MaxActivationDistance = 40; dp.RequiresLineOfSight = false
	local anchor = Instance.new("Attachment"); anchor.Position = Vector3.new(0, 3, 0); anchor.Parent = pad; dp.Parent = anchor
	dp.Triggered:Connect(function(plr)
		local stage = plot:GetAttribute("Stage")
		if stage == 0 then toast(plr, "This plot needs an Architect's blueprint first"); return end
		if stage >= #STAGES then toast(plr, "This mansion is finished!"); return end
		local b = carrying(plr.Character); if not b then toast(plr, "Grab a brick at the Supply Yard first"); return end
		b:Destroy(); helpers[plr] = true; stat(plr, "BricksDelivered")
		local n = plot:GetAttribute("Bricks") + 1; plot:SetAttribute("Bricks", n)
		pay(plr, PAY_BRICK, "Brick delivered (" .. n .. "/" .. BRICKS_PER_STAGE[stage + 1] .. ")")
		if n >= BRICKS_PER_STAGE[stage + 1] then
			stage += 1; plot:SetAttribute("Stage", stage); plot:SetAttribute("Bricks", 0); buildStage(plot, stage); clearHolo(plot, stage); burst(plot, stage == #STAGES)
			for p in pairs(helpers) do if p.Parent then toast(p, STAGES[stage] .. " done on plot " .. plot:GetAttribute("PlotId")) end end
			if stage == #STAGES then
				local bonus = math.floor((plot:GetAttribute("Price") or 25000) * 0.02)
				setSign(plot, "PLOT " .. plot:GetAttribute("PlotId") .. "\nSOLD\nDREAM HOME", Color3.fromRGB(60, 200, 120))
				for p in pairs(helpers) do if p.Parent then pay(p, bonus, "Mansion finished! Client paid"); stat(p, "MansionsBuilt") end end
				dp.Enabled = false
			end
		end
	end)
end
print("Dream Builders server ready")
