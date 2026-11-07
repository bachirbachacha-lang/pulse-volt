local ev = game:GetService("ReplicatedStorage"):WaitForChild("ElevatorGo")
local plr = game:GetService("Players").LocalPlayer
local names = {[0] = "Lobby", [1] = "Dream Realty", [2] = "Dream Exchange"}
local gui
ev.OnClientEvent:Connect(function(tower, floors, current)
	if gui then gui:Destroy() end
	gui = Instance.new("ScreenGui"); gui.Name = "ElevatorPicker"; gui.ResetOnSpawn = false; gui.Parent = plr.PlayerGui
	local f = Instance.new("Frame"); f.Size = UDim2.fromOffset(300, 64 + math.ceil(#floors / 3) * 46); f.AnchorPoint = Vector2.new(0.5, 0.5); f.Position = UDim2.fromScale(0.5, 0.5)
	f.BackgroundColor3 = Color3.fromRGB(20, 22, 28); f.BackgroundTransparency = 0.08; f.Parent = gui
	Instance.new("UICorner", f).CornerRadius = UDim.new(0, 14)
	local st = Instance.new("UIStroke", f); st.Color = Color3.fromRGB(212, 170, 90); st.Thickness = 1.5
	local t = Instance.new("TextLabel"); t.Size = UDim2.new(1, -50, 0, 40); t.Position = UDim2.fromOffset(14, 6); t.BackgroundTransparency = 1; t.Text = "ELEVATOR"; t.TextXAlignment = Enum.TextXAlignment.Left
	t.Font = Enum.Font.GothamBlack; t.TextSize = 20; t.TextColor3 = Color3.fromRGB(212, 170, 90); t.Parent = f
	local x = Instance.new("TextButton"); x.Size = UDim2.fromOffset(32, 32); x.Position = UDim2.new(1, -40, 0, 8); x.Text = "✕"; x.TextSize = 18; x.Font = Enum.Font.GothamBold
	x.BackgroundColor3 = Color3.fromRGB(50, 52, 60); x.TextColor3 = Color3.new(1, 1, 1); x.Parent = f; Instance.new("UICorner", x)
	x.MouseButton1Click:Connect(function() gui:Destroy() end)
	for i, fl in ipairs(floors) do
		local b = Instance.new("TextButton"); b.Size = UDim2.fromOffset(88, 38)
		b.Position = UDim2.fromOffset(12 + ((i - 1) % 3) * 94, 52 + math.floor((i - 1) / 3) * 46)
		b.Text = (fl == 0 and "G" or tostring(fl)) .. (names[fl] and ("  " .. names[fl]) or "")
		b.TextScaled = true; b.Font = Enum.Font.GothamBold
		b.BackgroundColor3 = fl == current and Color3.fromRGB(212, 170, 90) or Color3.fromRGB(46, 50, 60)
		b.TextColor3 = fl == current and Color3.fromRGB(20, 22, 28) or Color3.new(1, 1, 1); b.Parent = f
		Instance.new("UICorner", b)
		local pad = Instance.new("UIPadding", b); pad.PaddingLeft = UDim.new(0, 6); pad.PaddingRight = UDim.new(0, 6)
		b.MouseButton1Click:Connect(function() ev:FireServer(tower, fl); gui:Destroy() end)
	end
end)
