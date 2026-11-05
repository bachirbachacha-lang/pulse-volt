-- Dream Builders: city map (StarterPlayerScripts/CityMap). Press M (or the MAP button) to open; click a place to teleport.
local Players = game:GetService("Players")
local UIS = game:GetService("UserInputService")
local RS = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local plr = Players.LocalPlayer
local ev = RS:WaitForChild("MapTeleport")
local root = workspace:WaitForChild("DreamBuilders")
local WORLD, SIZE = 1200, 460                 -- studs shown, map size in pixels
local function px(x, z) return UDim2.fromOffset((x + WORLD / 2) / WORLD * SIZE, (z + WORLD / 2) / WORLD * SIZE) end
local function rect(parent, x, z, sx, sz, color, text)
	local f = Instance.new("TextButton"); f.AutoButtonColor = true; f.AnchorPoint = Vector2.new(0.5, 0.5)
	f.Position = px(x, z); f.Size = UDim2.fromOffset(math.max(6, sx / WORLD * SIZE), math.max(6, sz / WORLD * SIZE))
	f.BackgroundColor3 = color; f.BorderSizePixel = 0; f.Text = text or ""; f.TextScaled = true; f.Font = Enum.Font.GothamBlack
	f.TextColor3 = Color3.fromRGB(25, 25, 30); f.Parent = parent; Instance.new("UICorner", f).CornerRadius = UDim.new(0, 4); return f
end
local gui = Instance.new("ScreenGui"); gui.Name = "CityMap"; gui.ResetOnSpawn = false; gui.Parent = plr:WaitForChild("PlayerGui")
local btn = Instance.new("TextButton"); btn.Text = "🗺  MAP (M)"; btn.Size = UDim2.fromOffset(140, 40); btn.AnchorPoint = Vector2.new(1, 1)
btn.Position = UDim2.new(1, -16, 1, -16); btn.BackgroundColor3 = Color3.fromRGB(255, 190, 40); btn.Font = Enum.Font.GothamBlack; btn.TextSize = 18
btn.TextColor3 = Color3.fromRGB(25, 25, 30); btn.Parent = gui; Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 10)
local panel = Instance.new("Frame"); panel.Visible = false; panel.AnchorPoint = Vector2.new(0.5, 0.5); panel.Position = UDim2.fromScale(0.5, 0.5)
panel.Size = UDim2.fromOffset(SIZE + 40, SIZE + 90); panel.BackgroundColor3 = Color3.fromRGB(20, 22, 30); panel.Parent = gui
Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 16)
local title = Instance.new("TextLabel"); title.BackgroundTransparency = 1; title.Size = UDim2.new(1, 0, 0, 40); title.Text = "DREAM CITY: click a place to teleport"
title.Font = Enum.Font.GothamBlack; title.TextSize = 18; title.TextColor3 = Color3.fromRGB(255, 200, 60); title.Parent = panel
local map = Instance.new("Frame"); map.Position = UDim2.fromOffset(20, 44); map.Size = UDim2.fromOffset(SIZE, SIZE); map.ClipsDescendants = true
map.BackgroundColor3 = Color3.fromRGB(78, 142, 66); map.Parent = panel; Instance.new("UICorner", map).CornerRadius = UDim.new(0, 8)
local legend = Instance.new("TextLabel"); legend.BackgroundTransparency = 1; legend.Position = UDim2.fromOffset(20, SIZE + 50); legend.Size = UDim2.fromOffset(SIZE, 30)
legend.Text = "🟨 for sale   🟧 building   🟩 sold   •  you = white dot"; legend.Font = Enum.Font.GothamBold; legend.TextSize = 14
legend.TextColor3 = Color3.fromRGB(230, 230, 235); legend.Parent = panel
-- roads (match map v2)
local road = Color3.fromRGB(45, 46, 52)
rect(map, 0, 0, 44, 660, road).Active = false
for _, z in ipairs({-300, -100, 100, 300, -470, 470}) do rect(map, 0, z, 1000, 28, road).Active = false end
for _, x in ipairs({-260, 260}) do rect(map, x, 0, 28, 1000, road).Active = false end
rect(map, 500, 0, 150, 520, Color3.fromRGB(70, 150, 210)).Active = false
local places = {
	{"HQ", 0, 410, 120, 70, Color3.fromRGB(255, 190, 40), "HQ"},
	{"Yard", 0, -400, 200, 90, Color3.fromRGB(170, 170, 170), "YARD"},
	{"Lake", 412, 0, 24, 300, Color3.fromRGB(226, 206, 160), "BEACH"},
	{"Park", -370, 0, 180, 300, Color3.fromRGB(100, 170, 80), "PARK"},
}
for _, p in ipairs(places) do local b = rect(map, p[2], p[3], p[4], p[5], p[6], p[7]); b.MouseButton1Click:Connect(function() ev:FireServer(p[1]); panel.Visible = false end) end
local plotButtons = {}
for _, plot in ipairs(root:WaitForChild("Plots"):GetChildren()) do
	local pad = plot.PrimaryPart or plot:FindFirstChild("Pad")
	if pad then
		local id = plot:GetAttribute("PlotId") or 0
		local b = rect(map, pad.Position.X, pad.Position.Z, pad.Size.X, pad.Size.Z, Color3.fromRGB(255, 205, 60), tostring(id))
		b.MouseButton1Click:Connect(function() ev:FireServer("Plot" .. id); panel.Visible = false end)
		plotButtons[plot] = b
	end
end
local me = Instance.new("Frame"); me.Size = UDim2.fromOffset(10, 10); me.AnchorPoint = Vector2.new(0.5, 0.5); me.BackgroundColor3 = Color3.new(1, 1, 1)
me.ZIndex = 5; me.Parent = map; Instance.new("UICorner", me).CornerRadius = UDim.new(1, 0)
local function toggle() panel.Visible = not panel.Visible end
btn.MouseButton1Click:Connect(toggle)
UIS.InputBegan:Connect(function(i, gp) if not gp and i.KeyCode == Enum.KeyCode.M then toggle() end end)
RunService.RenderStepped:Connect(function()
	if not panel.Visible then return end
	local c = plr.Character; if c and c.PrimaryPart then local p = c.PrimaryPart.Position; me.Position = px(p.X, p.Z) end
	for plot, b in pairs(plotButtons) do
		local st = plot:GetAttribute("Stage") or 0
		b.BackgroundColor3 = st == 0 and Color3.fromRGB(255, 205, 60) or st >= 6 and Color3.fromRGB(60, 200, 120) or Color3.fromRGB(255, 150, 30)
	end
end)
