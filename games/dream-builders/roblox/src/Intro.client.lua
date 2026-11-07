-- StarterPlayer.StarterPlayerScripts.Intro: cinematic fly-over of the city when you join,
-- then "WHAT DO YOU WANT TO BE?" - pick a job (server checks it via ReplicatedStorage.ChooseJob).
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local RS = game:GetService("ReplicatedStorage")
local plr = Players.LocalPlayer
local cam = workspace.CurrentCamera
local ev = RS:WaitForChild("ChooseJob")

local GOLD, DARK, WHITE = Color3.fromRGB(212, 170, 90), Color3.fromRGB(14, 15, 20), Color3.new(1, 1, 1)
local JOBS = {
	{"Construction Worker", "🏗️", "Carry materials, build mansions, get paid every stage"},
	{"Architect", "📐", "Design houses on empty plots, earn when they're built"},
	{"Real Estate Agent", "🏡", "Show and sell villas at Dream Realty for commission"},
	{"Car Dealer", "🚗", "Sell cars at Dream Motors and build your showroom"},
	{"Chef", "👨‍🍳", "Cook at Sahara Grill or Dream Diner, serve customers"},
	{"Hair Stylist", "💇", "Run a salon chair Downtown, then open your own salon"},
	{"Fashion Designer", "👗", "Design clothes and start your own clothing brand"},
	{"Delivery Driver", "🛵", "Deliver food and supplies across the city"},
	{"Business Owner", "💼", "Rent a Downtown shop and open any business you want"},
}
local SHOTS = {
	{Vector3.new(-300, 260, 1500), Vector3.new(0, 80, 700), "DREAM BUILDERS", "A city of dreams"},
	{Vector3.new(200, 120, 600), Vector3.new(300, 90, 870), "DOWNTOWN", "Glass towers, offices, the Dream Exchange"},
	{Vector3.new(-120, 70, 700), Vector3.new(40, 40, 735), "DREAM METRO", "Ride across the whole city"},
	{Vector3.new(1100, 90, -250), Vector3.new(1500, 10, -450), "PALM ISLAND", "Clubs, restaurants, beach villas"},
	{Vector3.new(-160, 70, -880), Vector3.new(-300, 10, -940), "PALM HILLS", "Your future mansion is waiting"},
}

local savedSpeed, savedJump
local function controls(on)
	local hum = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid"); if not hum then return end
	if on then hum.WalkSpeed = savedSpeed or 16; hum.JumpPower = savedJump or 50
	else savedSpeed, savedJump = hum.WalkSpeed, hum.JumpPower; hum.WalkSpeed = 0; hum.JumpPower = 0 end
end

local gui = Instance.new("ScreenGui"); gui.Name = "DreamIntro"; gui.IgnoreGuiInset = true; gui.ResetOnSpawn = false; gui.DisplayOrder = 50
gui.Parent = plr:WaitForChild("PlayerGui")
local shade = Instance.new("Frame"); shade.Size = UDim2.fromScale(1, 1); shade.BackgroundColor3 = Color3.new(0, 0, 0); shade.BackgroundTransparency = 1; shade.BorderSizePixel = 0; shade.Parent = gui
local bars = {}
for i, y in ipairs({0, 1}) do
	local b = Instance.new("Frame"); b.AnchorPoint = Vector2.new(0, y); b.Position = UDim2.fromScale(0, y); b.Size = UDim2.new(1, 0, 0.11, 0)
	b.BackgroundColor3 = Color3.new(0, 0, 0); b.BorderSizePixel = 0; b.Parent = gui; bars[i] = b
end
local title = Instance.new("TextLabel"); title.AnchorPoint = Vector2.new(0.5, 0.5); title.Position = UDim2.fromScale(0.5, 0.72); title.Size = UDim2.fromScale(0.8, 0.1)
title.BackgroundTransparency = 1; title.Font = Enum.Font.GothamBlack; title.TextScaled = true; title.TextColor3 = WHITE; title.TextTransparency = 1; title.Parent = gui
title.Text = ""
local sub = title:Clone(); sub.Position = UDim2.fromScale(0.5, 0.79); sub.Size = UDim2.fromScale(0.7, 0.045); sub.Font = Enum.Font.GothamMedium; sub.TextColor3 = GOLD; sub.Parent = gui
local skip = Instance.new("TextButton"); skip.AnchorPoint = Vector2.new(1, 1); skip.Position = UDim2.new(1, -20, 1, -20); skip.Size = UDim2.fromOffset(130, 40)
skip.Text = "SKIP ▸"; skip.Font = Enum.Font.GothamBold; skip.TextSize = 16; skip.TextColor3 = WHITE; skip.BackgroundColor3 = Color3.fromRGB(40, 42, 50); skip.BackgroundTransparency = 0.2; skip.ZIndex = 5; skip.Parent = gui
Instance.new("UICorner", skip).CornerRadius = UDim.new(0, 10)

local skipped = false
skip.MouseButton1Click:Connect(function() skipped = true end)

local function fade(obj, prop, to, t) TweenService:Create(obj, TweenInfo.new(t or 0.6), {[prop] = to}):Play() end

local function picker()
	skip.Visible = false
	fade(shade, "BackgroundTransparency", 0.35, 0.5)
	local panel = Instance.new("Frame"); panel.AnchorPoint = Vector2.new(0.5, 0.5); panel.Position = UDim2.fromScale(0.5, 0.5)
	panel.Size = UDim2.fromOffset(820, 560); panel.BackgroundColor3 = DARK; panel.BackgroundTransparency = 0.05; panel.ZIndex = 10; panel.Parent = gui
	Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 18)
	local st = Instance.new("UIStroke", panel); st.Color = GOLD; st.Thickness = 2
	local sc = Instance.new("UIScale", panel)
	local function rescale() local v = cam.ViewportSize; sc.Scale = math.min(1, (v.X - 24) / 820, (v.Y - 24) / 560) end
	rescale(); cam:GetPropertyChangedSignal("ViewportSize"):Connect(rescale)
	local h = Instance.new("TextLabel"); h.Size = UDim2.new(1, -40, 0, 46); h.Position = UDim2.fromOffset(20, 18); h.BackgroundTransparency = 1
	h.Font = Enum.Font.GothamBlack; h.TextSize = 32; h.TextColor3 = GOLD; h.Text = "WHAT DO YOU WANT TO BE?"; h.ZIndex = 11; h.Parent = panel
	local h2 = h:Clone(); h2.Position = UDim2.fromOffset(20, 62); h2.Size = UDim2.new(1, -40, 0, 22); h2.TextSize = 16; h2.Font = Enum.Font.GothamMedium
	h2.TextColor3 = Color3.fromRGB(200, 200, 210); h2.Text = "Everyone starts with $100. Pick a job to start earning – you can change it later at HQ."; h2.Parent = panel
	local grid = Instance.new("Frame"); grid.Position = UDim2.fromOffset(20, 100); grid.Size = UDim2.new(1, -40, 0, 380); grid.BackgroundTransparency = 1; grid.ZIndex = 11; grid.Parent = panel
	local layout = Instance.new("UIGridLayout", grid); layout.CellSize = UDim2.new(1 / 3, -10, 0, 118); layout.CellPadding = UDim2.fromOffset(12, 12)
	local chosen, cards = nil, {}
	local go = Instance.new("TextButton"); go.AnchorPoint = Vector2.new(0.5, 1); go.Position = UDim2.new(0.5, 0, 1, -16); go.Size = UDim2.fromOffset(300, 50)
	go.BackgroundColor3 = Color3.fromRGB(70, 70, 76); go.Text = "PICK A JOB"; go.Font = Enum.Font.GothamBlack; go.TextSize = 20; go.TextColor3 = WHITE; go.AutoButtonColor = false; go.ZIndex = 11; go.Parent = panel
	Instance.new("UICorner", go).CornerRadius = UDim.new(0, 12)
	for _, j in ipairs(JOBS) do
		local c = Instance.new("TextButton"); c.Name = j[1]; c.Text = ""; c.AutoButtonColor = false; c.BackgroundColor3 = Color3.fromRGB(30, 32, 40); c.ZIndex = 12; c.Parent = grid
		Instance.new("UICorner", c).CornerRadius = UDim.new(0, 12)
		local cs = Instance.new("UIStroke", c); cs.Color = Color3.fromRGB(60, 62, 72); cs.Thickness = 1.5
		local icon = Instance.new("TextLabel"); icon.BackgroundTransparency = 1; icon.Position = UDim2.fromOffset(12, 10); icon.Size = UDim2.fromOffset(44, 44)
		icon.TextScaled = true; icon.Text = j[2]; icon.ZIndex = 13; icon.Parent = c
		local n = Instance.new("TextLabel"); n.BackgroundTransparency = 1; n.Position = UDim2.fromOffset(64, 12); n.Size = UDim2.new(1, -72, 0, 40)
		n.TextXAlignment = Enum.TextXAlignment.Left; n.Font = Enum.Font.GothamBlack; n.TextSize = 18; n.TextWrapped = true; n.TextColor3 = WHITE; n.Text = j[1]; n.ZIndex = 13; n.Parent = c
		local d = Instance.new("TextLabel"); d.BackgroundTransparency = 1; d.Position = UDim2.fromOffset(12, 60); d.Size = UDim2.new(1, -24, 0, 50)
		d.TextXAlignment = Enum.TextXAlignment.Left; d.TextYAlignment = Enum.TextYAlignment.Top; d.Font = Enum.Font.Gotham; d.TextSize = 14; d.TextWrapped = true
		d.TextColor3 = Color3.fromRGB(190, 192, 200); d.Text = j[3]; d.ZIndex = 13; d.Parent = c
		cards[#cards + 1] = {c, cs, j[1]}
		c.MouseButton1Click:Connect(function()
			chosen = j[1]
			for _, k in ipairs(cards) do k[2].Color = (k[3] == chosen) and GOLD or Color3.fromRGB(60, 62, 72); k[2].Thickness = (k[3] == chosen) and 3 or 1.5
				k[1].BackgroundColor3 = (k[3] == chosen) and Color3.fromRGB(48, 42, 30) or Color3.fromRGB(30, 32, 40) end
			go.BackgroundColor3 = GOLD; go.TextColor3 = DARK; go.Text = "START AS " .. string.upper(chosen)
		end)
	end
	local done = Instance.new("BindableEvent")
	go.MouseButton1Click:Connect(function()
		if not chosen then return end
		ev:FireServer(chosen)
		done:Fire()
	end)
	done.Event:Wait()
	panel:Destroy()
end

if not plr.Character then plr.CharacterAdded:Wait() end
task.wait(1)
controls(false)
local RunService = game:GetService("RunService")
local cv = Instance.new("CFrameValue"); cv.Value = cam.CFrame
RunService:BindToRenderStep("DreamIntroCam", Enum.RenderPriority.Camera.Value + 1, function()
	cam.CameraType = Enum.CameraType.Scriptable; cam.CFrame = cv.Value
end)
fade(shade, "BackgroundTransparency", 1, 1)
for _, s in ipairs(SHOTS) do
	if skipped then break end
	local from = CFrame.lookAt(s[1], s[2])
	local to = CFrame.lookAt(s[1] + (s[2] - s[1]).Unit:Cross(Vector3.yAxis) * 60 + Vector3.new(0, -10, 0), s[2])
	cv.Value = from
	title.Text = s[3]; sub.Text = s[4]
	fade(title, "TextTransparency", 0, 0.6); fade(sub, "TextTransparency", 0, 0.6)
	TweenService:Create(cv, TweenInfo.new(3.2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {Value = to}):Play()
	local t0 = os.clock()
	while os.clock() - t0 < 3.0 and not skipped do task.wait(0.05) end
	fade(title, "TextTransparency", 1, 0.3); fade(sub, "TextTransparency", 1, 0.3)
	task.wait(0.25)
end
title.TextTransparency = 1; sub.TextTransparency = 1
picker()
fade(shade, "BackgroundTransparency", 0, 0.35); task.wait(0.4)
RunService:UnbindFromRenderStep("DreamIntroCam")
cam.CameraType = Enum.CameraType.Custom
local hum = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid"); if hum then cam.CameraSubject = hum end
for _, b in ipairs(bars) do TweenService:Create(b, TweenInfo.new(0.6), {Size = UDim2.new(1, 0, 0, 0)}):Play() end
fade(shade, "BackgroundTransparency", 1, 0.8)
controls(true)
task.wait(0.3)
local job = plr:GetAttribute("Job")
title.Text = job and ("YOU ARE NOW A " .. string.upper(job)) or ""; title.Position = UDim2.fromScale(0.5, 0.2); title.Size = UDim2.fromScale(0.7, 0.07)
fade(title, "TextTransparency", 0, 0.4); task.wait(2.2); fade(title, "TextTransparency", 1, 0.6); task.wait(0.7)
gui:Destroy()
