-- Business picker: choose a business type + brand name for the Downtown shop you're renting.
local plr = game:GetService("Players").LocalPlayer
local ev = game:GetService("ReplicatedStorage"):WaitForChild("BusinessEvent")
local cam = workspace.CurrentCamera
local GOLD, DARK, WHITE = Color3.fromRGB(212, 170, 90), Color3.fromRGB(14, 15, 20), Color3.new(1, 1, 1)
local gui = Instance.new("ScreenGui"); gui.Name = "BusinessUI"; gui.ResetOnSpawn = false; gui.DisplayOrder = 40; gui.Parent = plr:WaitForChild("PlayerGui")
local closeBtn = Instance.new("TextButton"); closeBtn.AnchorPoint = Vector2.new(1, 0); closeBtn.Position = UDim2.new(1, -16, 0, 120); closeBtn.Size = UDim2.fromOffset(170, 36)
closeBtn.Text = "CLOSE MY BUSINESS"; closeBtn.Font = Enum.Font.GothamBold; closeBtn.TextSize = 13; closeBtn.TextColor3 = WHITE; closeBtn.BackgroundColor3 = Color3.fromRGB(120, 40, 40); closeBtn.Visible = false; closeBtn.Parent = gui
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 10)
closeBtn.MouseButton1Click:Connect(function() ev:FireServer("close"); closeBtn.Visible = false end)
local panel
local function pick(unitName, rent, types)
	if panel then panel:Destroy() end
	panel = Instance.new("Frame"); panel.AnchorPoint = Vector2.new(0.5, 0.5); panel.Position = UDim2.fromScale(0.5, 0.5); panel.Size = UDim2.fromOffset(760, 500)
	panel.BackgroundColor3 = DARK; panel.Parent = gui
	Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 18); local st = Instance.new("UIStroke", panel); st.Color = GOLD; st.Thickness = 2
	local sc = Instance.new("UIScale", panel); local v = cam.ViewportSize; sc.Scale = math.min(1, (v.X - 24) / 760, (v.Y - 24) / 500)
	local h = Instance.new("TextLabel"); h.BackgroundTransparency = 1; h.Position = UDim2.fromOffset(20, 14); h.Size = UDim2.new(1, -80, 0, 40); h.Font = Enum.Font.GothamBlack; h.TextSize = 28; h.TextColor3 = GOLD
	h.TextXAlignment = Enum.TextXAlignment.Left; h.Text = "OPEN YOUR BUSINESS"; h.Parent = panel
	local x = Instance.new("TextButton"); x.Position = UDim2.new(1, -48, 0, 14); x.Size = UDim2.fromOffset(34, 34); x.Text = "✕"; x.TextSize = 18; x.Font = Enum.Font.GothamBold; x.TextColor3 = WHITE; x.BackgroundColor3 = Color3.fromRGB(50, 52, 60); x.Parent = panel
	Instance.new("UICorner", x); x.MouseButton1Click:Connect(function() panel:Destroy(); panel = nil end)
	local grid = Instance.new("Frame"); grid.BackgroundTransparency = 1; grid.Position = UDim2.fromOffset(20, 64); grid.Size = UDim2.new(1, -40, 0, 290); grid.Parent = panel
	local gl = Instance.new("UIGridLayout", grid); gl.CellSize = UDim2.new(0.25, -9, 0, 136); gl.CellPadding = UDim2.fromOffset(12, 12)
	local chosen, cards = nil, {}
	local box = Instance.new("TextBox"); box.Position = UDim2.fromOffset(20, 374); box.Size = UDim2.new(1, -40, 0, 44); box.PlaceholderText = "Brand name (e.g. Luxe Cuts)"; box.Text = ""
	box.Font = Enum.Font.GothamBold; box.TextSize = 18; box.TextColor3 = WHITE; box.PlaceholderColor3 = Color3.fromRGB(140, 140, 150); box.BackgroundColor3 = Color3.fromRGB(30, 32, 40); box.ClearTextOnFocus = false; box.Parent = panel
	Instance.new("UICorner", box).CornerRadius = UDim.new(0, 10)
	local go = Instance.new("TextButton"); go.AnchorPoint = Vector2.new(0.5, 1); go.Position = UDim2.new(0.5, 0, 1, -16); go.Size = UDim2.fromOffset(320, 46); go.AutoButtonColor = false
	go.BackgroundColor3 = Color3.fromRGB(70, 70, 76); go.Text = "PICK A BUSINESS TYPE"; go.Font = Enum.Font.GothamBlack; go.TextSize = 18; go.TextColor3 = WHITE; go.Parent = panel
	Instance.new("UICorner", go).CornerRadius = UDim.new(0, 12)
	local names = {}; for k in pairs(types) do names[#names + 1] = k end; table.sort(names)
	for _, k in ipairs(names) do
		local t = types[k]
		local c = Instance.new("TextButton"); c.Text = ""; c.AutoButtonColor = false; c.BackgroundColor3 = Color3.fromRGB(30, 32, 40); c.Parent = grid
		Instance.new("UICorner", c).CornerRadius = UDim.new(0, 12); local cs = Instance.new("UIStroke", c); cs.Color = Color3.fromRGB(60, 62, 72); cs.Thickness = 1.5
		local ic = Instance.new("TextLabel"); ic.BackgroundTransparency = 1; ic.Position = UDim2.fromOffset(0, 10); ic.Size = UDim2.new(1, 0, 0, 50); ic.TextScaled = true; ic.Text = t.icon; ic.Parent = c
		local n = Instance.new("TextLabel"); n.BackgroundTransparency = 1; n.Position = UDim2.fromOffset(6, 66); n.Size = UDim2.new(1, -12, 0, 26); n.Font = Enum.Font.GothamBlack; n.TextSize = 17; n.TextColor3 = WHITE; n.Text = k; n.Parent = c
		local p = n:Clone(); p.Position = UDim2.fromOffset(6, 96); p.Font = Enum.Font.GothamMedium; p.TextSize = 14; p.TextColor3 = t.color; p.Text = "$" .. t.price .. " per customer"; p.Parent = c
		cards[#cards + 1] = {c, cs, k}
		c.MouseButton1Click:Connect(function()
			chosen = k
			for _, q in ipairs(cards) do q[2].Color = (q[3] == k) and GOLD or Color3.fromRGB(60, 62, 72); q[2].Thickness = (q[3] == k) and 3 or 1.5 end
			go.BackgroundColor3 = GOLD; go.TextColor3 = DARK; go.Text = "OPEN FOR $" .. rent
		end)
	end
	go.MouseButton1Click:Connect(function()
		if not chosen then return end
		ev:FireServer("open", unitName, chosen, box.Text)
		panel:Destroy(); panel = nil
	end)
end
ev.OnClientEvent:Connect(function(kind, a, b, c)
	if kind == "pick" then pick(a, b, c)
	elseif kind == "opened" then closeBtn.Visible = true end
end)
