-- DreamUI.client.lua  (written by Codex, reviewed + wired in by Claude)
-- Place this LocalScript in StarterPlayerScripts.
-- Self-contained luxury tycoon UI: no external assets or marketplace calls.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local Lighting = game:GetService("Lighting")

local player = Players.LocalPlayer
local dreamFolder = ReplicatedStorage:WaitForChild("DreamUI")
local shopRequest = dreamFolder:WaitForChild("ShopRequest")
local spinFunction = dreamFolder:WaitForChild("Spin")

local COLORS = {
	panel = Color3.fromRGB(22, 23, 30),
	panelLight = Color3.fromRGB(32, 33, 42),
	panelDeep = Color3.fromRGB(16, 17, 23),
	gold = Color3.fromRGB(226, 176, 70),
	goldLight = Color3.fromRGB(255, 214, 120),
	text = Color3.fromRGB(247, 244, 236),
	muted = Color3.fromRGB(165, 166, 176),
	green = Color3.fromRGB(101, 205, 145),
}
local FONT = Enum.Font.GothamBlack
local tweenFast = TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local tweenPop = TweenInfo.new(0.32, Enum.EasingStyle.Back, Enum.EasingDirection.Out)

local gui = Instance.new("ScreenGui")
gui.Name = "DreamBuildersUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.DisplayOrder = 20
gui.Parent = player:WaitForChild("PlayerGui")

local root = Instance.new("CanvasGroup")
root.Name = "DreamCanvas"
root.Size = UDim2.fromScale(1, 1)
root.BackgroundTransparency = 1
root.GroupTransparency = 0
root.Parent = gui

local function corner(parent, radius)
	local item = Instance.new("UICorner")
	item.CornerRadius = UDim.new(0, radius or 14)
	item.Parent = parent
	return item
end

local function stroke(parent, color, transparency, thickness)
	local item = Instance.new("UIStroke")
	item.Color = color or COLORS.gold
	item.Transparency = transparency or 0.45
	item.Thickness = thickness or 1.25
	item.Parent = parent
	return item
end

local function label(parent, name, value, size, position, textSize, color, alignment)
	local item = Instance.new("TextLabel")
	item.Name = name
	item.BackgroundTransparency = 1
	item.Size = size
	item.Position = position
	item.Font = FONT
	item.Text = value
	item.TextSize = textSize or 16
	item.TextColor3 = color or COLORS.text
	item.TextXAlignment = alignment or Enum.TextXAlignment.Left
	item.TextYAlignment = Enum.TextYAlignment.Center
	item.TextWrapped = true
	item.Parent = parent
	return item
end

local function button(parent, name, value, size, position, style)
	local item = Instance.new("TextButton")
	item.Name = name
	item.Size = size
	item.Position = position
	item.BackgroundColor3 = style == "gold" and COLORS.gold or COLORS.panelLight
	item.AutoButtonColor = false
	item.Font = FONT
	item.Text = value
	item.TextSize = 15
	item.TextColor3 = style == "gold" and COLORS.panelDeep or COLORS.text
	item.Parent = parent
	corner(item, 12)
	stroke(item, style == "gold" and COLORS.goldLight or COLORS.gold, style == "gold" and 0.12 or 0.62, 1)
	local scale = Instance.new("UIScale")
	scale.Scale = 1
	scale.Parent = item
	item.MouseEnter:Connect(function()
		TweenService:Create(scale, tweenFast, {Scale = 1.045}):Play()
	end)
	item.MouseLeave:Connect(function()
		TweenService:Create(scale, tweenFast, {Scale = 1}):Play()
	end)
	item.Activated:Connect(function()
		TweenService:Create(scale, TweenInfo.new(0.08), {Scale = 0.97}):Play()
		task.delay(0.08, function()
			if scale.Parent then TweenService:Create(scale, tweenFast, {Scale = 1.045}):Play() end
		end)
	end)
	return item
end

-- The left rail stays compact on mobile and desktop.
local rail = Instance.new("Frame")
rail.Name = "NavigationRail"
rail.AnchorPoint = Vector2.new(0, 0.5)
rail.Position = UDim2.new(0, 18, 0.5, 0)
rail.Size = UDim2.new(0, 78, 0, 286)
rail.BackgroundColor3 = COLORS.panel
rail.BackgroundTransparency = 0.08
rail.Parent = root
corner(rail, 20)
stroke(rail, COLORS.gold, 0.42, 1.3)
local railLayout = Instance.new("UIListLayout")
railLayout.Padding = UDim.new(0, 10)
railLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
railLayout.VerticalAlignment = Enum.VerticalAlignment.Center
railLayout.Parent = rail
local railPadding = Instance.new("UIPadding")
railPadding.PaddingTop = UDim.new(0, 12)
railPadding.PaddingBottom = UDim.new(0, 12)
railPadding.Parent = rail

local panelLayer = Instance.new("Frame")
panelLayer.Name = "PanelLayer"
panelLayer.BackgroundTransparency = 1
panelLayer.Size = UDim2.fromScale(1, 1)
panelLayer.Parent = root

local activePanel
local panelScale
local panelOpen = false
local function closePanel()
	if not panelOpen or not activePanel then return end
	panelOpen = false
	TweenService:Create(activePanel, TweenInfo.new(0.17, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {GroupTransparency = 1}):Play()
	TweenService:Create(panelScale, TweenInfo.new(0.17, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {Scale = 0.94}):Play()
	task.delay(0.18, function()
		if activePanel and not panelOpen then activePanel.Visible = false end
	end)
end

local function makePanel(name, titleText, width, height)
	local canvas = Instance.new("CanvasGroup")
	canvas.Name = name
	canvas.AnchorPoint = Vector2.new(0.5, 0.5)
	canvas.Position = UDim2.new(0.5, 34, 0.5, 0)
	canvas.Size = UDim2.new(0, width, 0, height)
	canvas.BackgroundColor3 = COLORS.panel
	canvas.BackgroundTransparency = 0.03
	canvas.GroupTransparency = 1
	canvas.Visible = false
	canvas.Parent = panelLayer
	corner(canvas, 22)
	stroke(canvas, COLORS.gold, 0.25, 1.5)
	local scale = Instance.new("UIScale")
	scale.Scale = 0.9
	scale.Parent = canvas
	local top = Instance.new("Frame")
	top.Name = "Header"
	top.BackgroundColor3 = COLORS.panelLight
	top.BackgroundTransparency = 0.15
	top.Size = UDim2.new(1, -24, 0, 62)
	top.Position = UDim2.new(0, 12, 0, 12)
	top.Parent = canvas
	corner(top, 16)
	label(top, "Title", titleText, UDim2.new(1, -82, 1, 0), UDim2.new(0, 18, 0, 0), 20, COLORS.goldLight)
	local close = button(top, "Close", "×", UDim2.new(0, 42, 0, 42), UDim2.new(1, -52, 0.5, -21), "dark")
	close.TextSize = 24
	close.Activated:Connect(closePanel)
	return canvas, scale
end

local function openPanel(canvas, scale)
	if activePanel and activePanel ~= canvas then activePanel.Visible = false end
	activePanel, panelScale = canvas, scale
	panelOpen = true
	canvas.Visible = true
	canvas.GroupTransparency = 1
	scale.Scale = 0.9
	TweenService:Create(canvas, tweenPop, {GroupTransparency = 0}):Play()
	TweenService:Create(scale, tweenPop, {Scale = 1}):Play()
end

local shopPanel, shopScale = makePanel("ShopPanel", "DREAM BOUTIQUE", 650, 440)
local spinPanel, spinScale = makePanel("SpinPanel", "DAILY SPIN", 540, 470)
local settingsPanel, settingsScale = makePanel("SettingsPanel", "PREFERENCES", 500, 430)

-- Shop tabs and catalog. Purchases only send an item key to the server request event.
local shopTabs = Instance.new("Frame")
shopTabs.Name = "Tabs"
shopTabs.BackgroundTransparency = 1
shopTabs.Position = UDim2.new(0, 20, 0, 88)
shopTabs.Size = UDim2.new(1, -40, 0, 42)
shopTabs.Parent = shopPanel
local passesTab = button(shopTabs, "PassesTab", "PASSES", UDim2.new(0, 150, 1, 0), UDim2.new(0, 0, 0, 0), "gold")
local cosmeticsTab = button(shopTabs, "CosmeticsTab", "COSMETICS", UDim2.new(0, 150, 1, 0), UDim2.new(0, 160, 0, 0), "dark")
local limited = label(shopTabs, "LimitedBadge", "LIMITED", UDim2.new(0, 112, 1, 0), UDim2.new(1, -112, 0, 0), 15, COLORS.goldLight, Enum.TextXAlignment.Center)
local rainbow = Instance.new("UIGradient")
rainbow.Color = ColorSequence.new({
	ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 84, 116)),
	ColorSequenceKeypoint.new(0.2, Color3.fromRGB(255, 194, 72)),
	ColorSequenceKeypoint.new(0.4, Color3.fromRGB(112, 230, 150)),
	ColorSequenceKeypoint.new(0.6, Color3.fromRGB(79, 204, 255)),
	ColorSequenceKeypoint.new(0.8, Color3.fromRGB(171, 115, 255)),
	ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 84, 116)),
})
rainbow.Parent = limited
task.spawn(function()
	while limited.Parent do
		rainbow.Offset = Vector2.new(-1, 0)
		TweenService:Create(rainbow, TweenInfo.new(2.8, Enum.EasingStyle.Linear), {Offset = Vector2.new(1, 0)}):Play()
		task.wait(2.85)
	end
end)
local cardArea = Instance.new("ScrollingFrame")
cardArea.Name = "Catalog"
cardArea.BackgroundTransparency = 1
cardArea.BorderSizePixel = 0
cardArea.Position = UDim2.new(0, 20, 0, 142)
cardArea.Size = UDim2.new(1, -40, 1, -162)
cardArea.ScrollBarThickness = 4
cardArea.ScrollBarImageColor3 = COLORS.gold
cardArea.CanvasSize = UDim2.new(0, 0, 0, 0)
cardArea.AutomaticCanvasSize = Enum.AutomaticSize.Y
cardArea.Parent = shopPanel
local grid = Instance.new("UIGridLayout")
grid.CellSize = UDim2.new(0.5, -8, 0, 126)
grid.CellPadding = UDim2.new(0, 12, 0, 12)
grid.SortOrder = Enum.SortOrder.LayoutOrder
grid.Parent = cardArea
local catalog = {
	{Id = "VIP", Name = "VIP ESTATE", Detail = "2× money • VIP lounge • gold name tag", Tab = "Passes"},
	{Id = "PersonalTruck", Name = "PERSONAL TRUCK", Detail = "Your own ride across the city", Tab = "Cosmetics"},
	{Id = "GoldHardHat", Name = "GOLD HARD HAT", Detail = "A builder's signature look", Tab = "Cosmetics"},
	{Id = "DoubleMoney", Name = "2× MONEY", Detail = "Double your tycoon earnings", Tab = "Passes"},
}
local selectedTab = "Passes"
local function renderCatalog()
	for _, child in ipairs(cardArea:GetChildren()) do
		if child:IsA("Frame") then child:Destroy() end
	end
	for _, data in ipairs(catalog) do
		if data.Tab == selectedTab then
			local card = Instance.new("Frame")
			card.Name = data.Id .. "Card"
			card.BackgroundColor3 = COLORS.panelLight
			card.Parent = cardArea
			corner(card, 16)
			stroke(card, COLORS.gold, 0.7, 1)
			label(card, "ItemName", data.Name, UDim2.new(1, -20, 0, 25), UDim2.new(0, 12, 0, 9), 15, COLORS.goldLight)
			label(card, "Description", data.Detail, UDim2.new(1, -20, 0, 32), UDim2.new(0, 12, 0, 36), 11, COLORS.muted)
			label(card, "Price", "R$ ???", UDim2.new(0, 105, 0, 30), UDim2.new(0, 12, 1, -38), 14, COLORS.text)
			local buy = button(card, "Buy", "BUY", UDim2.new(0, 92, 0, 34), UDim2.new(1, -104, 1, -40), "gold")
			buy.Activated:Connect(function()
				shopRequest:FireServer(data.Id)
			end)
		end
	end
end
passesTab.Activated:Connect(function()
	selectedTab = "Passes"
	passesTab.BackgroundColor3, cosmeticsTab.BackgroundColor3 = COLORS.gold, COLORS.panelLight
	passesTab.TextColor3, cosmeticsTab.TextColor3 = COLORS.panelDeep, COLORS.text
	renderCatalog()
end)
cosmeticsTab.Activated:Connect(function()
	selectedTab = "Cosmetics"
	cosmeticsTab.BackgroundColor3, passesTab.BackgroundColor3 = COLORS.gold, COLORS.panelLight
	cosmeticsTab.TextColor3, passesTab.TextColor3 = COLORS.panelDeep, COLORS.text
	renderCatalog()
end)
renderCatalog()

-- The server picks the winning slice. The client animates to that returned index.
local prizeNames = {"$100", "$250", "$500", "$1,000", "$750", "2× 10 MIN", "GOLD HAT", "$5,000"}
local wheel = Instance.new("Frame")
wheel.Name = "PrizeWheel"
wheel.AnchorPoint = Vector2.new(0.5, 0)
wheel.Position = UDim2.new(0.5, 0, 0, 95)
wheel.Size = UDim2.new(0, 280, 0, 280)
wheel.BackgroundColor3 = COLORS.panelDeep
wheel.Parent = spinPanel
corner(wheel, 140)
stroke(wheel, COLORS.gold, 0.08, 3)
local wheelRotor = Instance.new("Frame")
wheelRotor.Name = "WheelRotor"
wheelRotor.Size = UDim2.fromScale(1, 1)
wheelRotor.BackgroundTransparency = 1
wheelRotor.Parent = wheel
for i, prizeName in ipairs(prizeNames) do
	local slice = Instance.new("Frame")
	slice.Name = "Slice" .. i
	slice.AnchorPoint = Vector2.new(0.5, 0.5)
	slice.Position = UDim2.fromScale(0.5, 0.5)
	slice.Size = UDim2.new(0, 132, 0, 48)
	slice.Rotation = (i - 1) * 45
	slice.BackgroundColor3 = i % 2 == 0 and COLORS.panelLight or Color3.fromRGB(48, 43, 35)
	slice.Parent = wheelRotor
	corner(slice, 8)
	stroke(slice, COLORS.gold, 0.72, 1)
	local text = label(slice, "Prize", prizeName, UDim2.new(1, -8, 1, 0), UDim2.new(0, 4, 0, 0), 11, COLORS.text, Enum.TextXAlignment.Center)
	text.Rotation = -slice.Rotation
end
local hub = Instance.new("Frame")
hub.Name = "Hub"
hub.AnchorPoint = Vector2.new(0.5, 0.5)
hub.Position = UDim2.fromScale(0.5, 0.5)
hub.Size = UDim2.new(0, 62, 0, 62)
hub.BackgroundColor3 = COLORS.gold
hub.ZIndex = 4
hub.Parent = wheel
corner(hub, 31)
stroke(hub, COLORS.goldLight, 0, 2)
label(hub, "Monogram", "DB", UDim2.fromScale(1, 1), UDim2.new(), 17, COLORS.panelDeep, Enum.TextXAlignment.Center).ZIndex = 5
local pointer = label(spinPanel, "Pointer", "▼", UDim2.new(0, 36, 0, 32), UDim2.new(0.5, -18, 0, 79), 24, COLORS.goldLight, Enum.TextXAlignment.Center)
pointer.ZIndex = 6
local spinButton = button(spinPanel, "SpinButton", "SPIN FOR A PRIZE", UDim2.new(0, 210, 0, 48), UDim2.new(0.5, -105, 1, -62), "gold")
local spinStatus = label(spinPanel, "Status", "One golden chance every 24 hours", UDim2.new(1, -40, 0, 24), UDim2.new(0, 20, 1, -91), 12, COLORS.muted, Enum.TextXAlignment.Center)
local spinning = false
local function showReward(rewardText)
	local popup = Instance.new("CanvasGroup")
	popup.Name = "RewardPopup"
	popup.AnchorPoint = Vector2.new(0.5, 0.5)
	popup.Position = UDim2.fromScale(0.5, 0.5)
	popup.Size = UDim2.new(0, 330, 0, 178)
	popup.BackgroundColor3 = COLORS.panel
	popup.GroupTransparency = 1
	popup.ZIndex = 10
	popup.Parent = root
	corner(popup, 22)
	stroke(popup, COLORS.goldLight, 0.05, 2)
	label(popup, "RewardTitle", "A DREAM COME TRUE", UDim2.new(1, -28, 0, 34), UDim2.new(0, 14, 0, 23), 18, COLORS.goldLight, Enum.TextXAlignment.Center).ZIndex = 11
	label(popup, "Reward", rewardText, UDim2.new(1, -30, 0, 46), UDim2.new(0, 15, 0, 69), 24, COLORS.text, Enum.TextXAlignment.Center).ZIndex = 11
	local dismiss = button(popup, "Collect", "COLLECT", UDim2.new(0, 134, 0, 38), UDim2.new(0.5, -67, 1, -52), "gold")
	dismiss.ZIndex = 11
	for i = 1, 24 do
		local confetti = Instance.new("Frame")
		confetti.Name = "Confetti"
		confetti.Size = UDim2.new(0, math.random(5, 9), 0, math.random(7, 12))
		confetti.Position = UDim2.new(0.5, math.random(-20, 20), 0.5, math.random(-8, 8))
		confetti.BackgroundColor3 = i % 2 == 0 and COLORS.goldLight or Color3.fromRGB(255, 239, 184)
		confetti.Rotation = math.random(0, 180)
		confetti.ZIndex = 12
		confetti.Parent = popup
		local target = UDim2.new(0.5, math.random(-220, 220), 0.5, math.random(-160, 160))
		TweenService:Create(confetti, TweenInfo.new(math.random(55, 105) / 100, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {Position = target, Rotation = confetti.Rotation + math.random(160, 380), BackgroundTransparency = 1}):Play()
	end
	TweenService:Create(popup, tweenPop, {GroupTransparency = 0}):Play()
	local popScale = Instance.new("UIScale")
	popScale.Scale = 0.82
	popScale.Parent = popup
	TweenService:Create(popScale, tweenPop, {Scale = 1}):Play()
	local function dismissPopup()
		TweenService:Create(popup, tweenFast, {GroupTransparency = 1}):Play()
		task.delay(0.18, function() popup:Destroy() end)
	end
	dismiss.Activated:Connect(dismissPopup)
	task.delay(4, function() if popup.Parent then dismissPopup() end end)
end
spinButton.Activated:Connect(function()
	if spinning then return end
	spinning = true
	spinButton.Text = "SPINNING…"
	spinStatus.Text = "The city is choosing your fortune"
	local ok, result = pcall(function() return spinFunction:InvokeServer() end)
	if not ok or type(result) ~= "table" then
		spinStatus.Text = "Could not reach the spin service. Try again."
		spinButton.Text = "SPIN FOR A PRIZE"
		spinning = false
		return
	end
	if not result.Success then
		local remaining = math.max(0, tonumber(result.Remaining) or 0)
		spinStatus.Text = string.format("Next spin in %02dh %02dm", math.floor(remaining / 3600), math.floor((remaining % 3600) / 60))
		spinButton.Text = "COME BACK TOMORROW"
		spinning = false
		return
	end
	local index = math.clamp(math.floor(tonumber(result.SliceIndex) or 1), 1, #prizeNames)
	local current = wheelRotor.Rotation % 360
	local desired = ((index - 1) * 45 + 22.5) % 360
	local delta = (360 - current + desired) % 360
	local goal = wheelRotor.Rotation + 360 * 6 + delta
	local spinTween = TweenService:Create(wheelRotor, TweenInfo.new(5.4, Enum.EasingStyle.Quint, Enum.EasingDirection.Out), {Rotation = goal})
	spinTween:Play()
	spinTween.Completed:Wait()
	spinStatus.Text = "Your next spin is ready in 24 hours"
	spinButton.Text = "COME BACK TOMORROW"
	spinning = false
	showReward(result.Reward or prizeNames[index])
end)

-- Settings persist as player attributes; the game can observe them elsewhere.
local settingsRows = {
	{Key = "MusicEnabled", Title = "MUSIC", Default = true},
	{Key = "SfxEnabled", Title = "SOUND EFFECTS", Default = true},
	{Key = "ShowMinimap", Title = "SHOW MINIMAP", Default = true},
}
local settingsControls = {}
for i, setting in ipairs(settingsRows) do
	local row = Instance.new("Frame")
	row.Name = setting.Key .. "Row"
	row.BackgroundColor3 = COLORS.panelLight
	row.Position = UDim2.new(0, 20, 0, 94 + (i - 1) * 66)
	row.Size = UDim2.new(1, -40, 0, 54)
	row.Parent = settingsPanel
	corner(row, 14)
	label(row, "SettingName", setting.Title, UDim2.new(0.65, 0, 1, 0), UDim2.new(0, 16, 0, 0), 14, COLORS.text)
	local toggle = button(row, "Toggle", "ON", UDim2.new(0, 80, 0, 36), UDim2.new(1, -94, 0.5, -18), "gold")
	settingsControls[setting.Key] = {Button = toggle, Default = setting.Default}
	toggle.Activated:Connect(function()
		local current = player:GetAttribute(setting.Key)
		if current == nil then current = setting.Default end
		player:SetAttribute(setting.Key, not current)
	end)
end
local graphicsRow = Instance.new("Frame")
graphicsRow.Name = "GraphicsRow"
graphicsRow.BackgroundColor3 = COLORS.panelLight
graphicsRow.Position = UDim2.new(0, 20, 0, 292)
graphicsRow.Size = UDim2.new(1, -40, 0, 54)
graphicsRow.Parent = settingsPanel
corner(graphicsRow, 14)
label(graphicsRow, "SettingName", "GRAPHICS", UDim2.new(0.5, 0, 1, 0), UDim2.new(0, 16, 0, 0), 14, COLORS.text)
local graphicsButton = button(graphicsRow, "GraphicsToggle", "HIGH", UDim2.new(0, 104, 0, 36), UDim2.new(1, -118, 0.5, -18), "gold")
local function applyGraphics()
	local mode = player:GetAttribute("GraphicsMode") or "High"
	graphicsButton.Text = string.upper(mode)
	Lighting.GlobalShadows = mode == "High"
end
graphicsButton.Activated:Connect(function()
	local current = player:GetAttribute("GraphicsMode") or "High"
	player:SetAttribute("GraphicsMode", current == "High" and "Low" or "High")
end)
for key, control in pairs(settingsControls) do
	local function updateToggle()
		local value = player:GetAttribute(key)
		if value == nil then value = control.Default end
		control.Button.Text = value and "ON" or "OFF"
		control.Button.BackgroundColor3 = value and COLORS.gold or COLORS.panelDeep
	end
	if player:GetAttribute(key) == nil then player:SetAttribute(key, control.Default) end
	updateToggle()
	player:GetAttributeChangedSignal(key):Connect(updateToggle)
end
if player:GetAttribute("GraphicsMode") == nil then player:SetAttribute("GraphicsMode", "High") end
applyGraphics()
player:GetAttributeChangedSignal("GraphicsMode"):Connect(applyGraphics)

local navItems = {
	{Text = "🛍", Hint = "SHOP", Panel = shopPanel, Scale = shopScale},
	{Text = "🎡", Hint = "SPIN", Panel = spinPanel, Scale = spinScale},
	{Text = "⚙", Hint = "SETTINGS", Panel = settingsPanel, Scale = settingsScale},
}
for _, nav in ipairs(navItems) do
	local navButton = button(rail, nav.Hint, nav.Text, UDim2.new(0, 54, 0, 54), UDim2.new(), "dark")
	navButton.LayoutOrder = #rail:GetChildren()
	navButton.TextSize = 25
	navButton.Activated:Connect(function()
		if panelOpen and activePanel == nav.Panel then closePanel() else openPanel(nav.Panel, nav.Scale) end
	end)
end

UserInputService.InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == Enum.KeyCode.Escape then closePanel() end
end)

-- Allow background clicking outside panels to close while keeping gameplay visible.
print("Dream Builders luxury UI ready")

