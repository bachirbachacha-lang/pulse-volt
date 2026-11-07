local Players, UIS, RS, Run = game:GetService("Players"), game:GetService("UserInputService"), game:GetService("ReplicatedStorage"), game:GetService("RunService")
local plr = Players.LocalPlayer
local folder = RS:WaitForChild("DreamVehicles"); local ev = folder:WaitForChild("VehicleRequest"); local list = folder:WaitForChild("List")
local GOLD, DARK, CREAM = Color3.fromRGB(214, 172, 92), Color3.fromRGB(22, 20, 24), Color3.fromRGB(246, 238, 222)
local gui = Instance.new("ScreenGui"); gui.Name = "VehicleMenuGui"; gui.ResetOnSpawn = false; gui.IgnoreGuiInset = true; gui.Parent = plr:WaitForChild("PlayerGui")
local function corner(o, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 12); c.Parent = o end
local function txt(parent, t, size, color, font)
	local l = Instance.new("TextLabel"); l.BackgroundTransparency = 1; l.Text = t; l.TextSize = size; l.TextColor3 = color or CREAM
	l.Font = font or Enum.Font.GothamBold; l.Parent = parent; return l
end
local open = Instance.new("TextButton"); open.Size = UDim2.fromOffset(160, 44); open.Position = UDim2.new(0, 16, 1, -128)
open.BackgroundColor3 = DARK; open.Text = "VEHICLES  (B)"; open.TextColor3 = GOLD; open.Font = Enum.Font.GothamBold; open.TextSize = 15
open.Parent = gui; corner(open); local st = Instance.new("UIStroke"); st.Color = GOLD; st.Thickness = 1.5; st.Parent = open
local panel = Instance.new("Frame"); panel.Size = UDim2.fromOffset(520, 470); panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.5); panel.BackgroundColor3 = DARK; panel.Visible = false; panel.Parent = gui; corner(panel, 16)
local st2 = st:Clone(); st2.Parent = panel
local title = txt(panel, "DREAM MOTORS  ·  TEST GARAGE", 20, GOLD); title.Size = UDim2.new(1, -60, 0, 50); title.Position = UDim2.fromOffset(20, 6); title.TextXAlignment = Enum.TextXAlignment.Left
local sub = txt(panel, "DRIVE = jump in where it's parked   ·   BRING = brings it to you", 13, Color3.fromRGB(170, 160, 145), Enum.Font.Gotham)
sub.Size = UDim2.new(1, -40, 0, 18); sub.Position = UDim2.fromOffset(20, 50); sub.TextXAlignment = Enum.TextXAlignment.Left
local close = Instance.new("TextButton"); close.Size = UDim2.fromOffset(36, 36); close.Position = UDim2.new(1, -48, 0, 12); close.Text = "X"
close.BackgroundColor3 = Color3.fromRGB(45, 40, 44); close.TextColor3 = CREAM; close.Font = Enum.Font.GothamBold; close.TextSize = 16; close.Parent = panel; corner(close, 18)
local scroll = Instance.new("ScrollingFrame"); scroll.Size = UDim2.new(1, -32, 1, -96); scroll.Position = UDim2.fromOffset(16, 80)
scroll.BackgroundTransparency = 1; scroll.ScrollBarThickness = 5; scroll.ScrollBarImageColor3 = GOLD; scroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroll.CanvasSize = UDim2.new(); scroll.Parent = panel
local lay = Instance.new("UIListLayout"); lay.Padding = UDim.new(0, 8); lay.SortOrder = Enum.SortOrder.LayoutOrder; lay.Parent = scroll
local ORDER = {Starter = 1, Normal = 2, Classic = 3, SUV = 4, Truck = 5, Sport = 6, Luxury = 7, Super = 8, Work = 9}
local function btn(parent, t, x, col)
	local b = Instance.new("TextButton"); b.Size = UDim2.fromOffset(84, 34); b.Position = UDim2.new(1, x, 0.5, -17); b.Text = t
	b.BackgroundColor3 = col; b.TextColor3 = DARK; b.Font = Enum.Font.GothamBold; b.TextSize = 14; b.Parent = parent; corner(b, 10); return b
end
local function rebuild()
	for _, c in ipairs(scroll:GetChildren()) do if c:IsA("Frame") then c:Destroy() end end
	for _, v in ipairs(list:GetChildren()) do
		local row = Instance.new("Frame"); row.Size = UDim2.new(1, -8, 0, 58); row.BackgroundColor3 = Color3.fromRGB(36, 32, 36)
		row.LayoutOrder = (ORDER[v:GetAttribute("Class")] or 5) * 100 + (v:GetAttribute("Top") or 0); row.Parent = scroll; corner(row, 10)
		local n = txt(row, v.Value, 17); n.Size = UDim2.new(1, -220, 0, 26); n.Position = UDim2.fromOffset(14, 6); n.TextXAlignment = Enum.TextXAlignment.Left
		local c = txt(row, (v:GetAttribute("Class") or "") .. "  ·  top " .. math.floor(v:GetAttribute("Top") or 0) .. " km/h", 13, Color3.fromRGB(170, 160, 145), Enum.Font.Gotham)
		c.Size = UDim2.new(1, -220, 0, 18); c.Position = UDim2.fromOffset(14, 32); c.TextXAlignment = Enum.TextXAlignment.Left
		btn(row, "DRIVE", -184, GOLD).MouseButton1Click:Connect(function() ev:FireServer("drive", v.Name); panel.Visible = false end)
		btn(row, "BRING", -94, CREAM).MouseButton1Click:Connect(function() ev:FireServer("bring", v.Name); panel.Visible = false end)
	end
end
list.ChildAdded:Connect(rebuild); list.ChildRemoved:Connect(rebuild); rebuild()
local function toggle() panel.Visible = not panel.Visible end
open.MouseButton1Click:Connect(toggle); close.MouseButton1Click:Connect(function() panel.Visible = false end)
local hud = Instance.new("Frame"); hud.Size = UDim2.fromOffset(200, 86); hud.Position = UDim2.new(0.5, -100, 1, -110); hud.BackgroundColor3 = DARK
hud.BackgroundTransparency = 0.15; hud.Visible = false; hud.Parent = gui; corner(hud, 14)
local spd = txt(hud, "0", 34, CREAM, Enum.Font.GothamBlack); spd.Size = UDim2.new(1, 0, 0, 44); spd.Position = UDim2.fromOffset(0, 4)
local unit = txt(hud, "KM/H   ·   V = inside / outside", 11, GOLD); unit.Size = UDim2.new(1, 0, 0, 16); unit.Position = UDim2.fromOffset(0, 50)
local inside = false
local function setView()
	if inside then plr.CameraMaxZoomDistance = 0.5; plr.CameraMinZoomDistance = 0.5
	else plr.CameraMaxZoomDistance = 60; plr.CameraMinZoomDistance = 18; task.delay(0.15, function() plr.CameraMinZoomDistance = 0.5 end) end
end
UIS.InputBegan:Connect(function(i, gp)
	if gp then return end
	if i.KeyCode == Enum.KeyCode.B then toggle()
	elseif i.KeyCode == Enum.KeyCode.V and hud.Visible then inside = not inside; setView() end
end)
Run.RenderStepped:Connect(function()
	local char = plr.Character; local hum = char and char:FindFirstChildOfClass("Humanoid")
	local seat = hum and hum.SeatPart
	local driving = (seat and seat:IsA("VehicleSeat")) and true or false
	if driving ~= hud.Visible then
		hud.Visible = driving
		if not driving and inside then inside = false; setView() end
	end
	if driving then spd.Text = tostring(math.floor(seat.AssemblyLinearVelocity.Magnitude + 0.5)) end
end)
