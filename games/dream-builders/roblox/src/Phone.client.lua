-- Dream Phone v1: press P (or the phone button). Lock screen -> home -> apps: Bank, Maps, Jobs, Property, Business, Settings.
local Players, UIS, TweenService, L = game:GetService("Players"), game:GetService("UserInputService"), game:GetService("TweenService"), game:GetService("Lighting")
local plr = Players.LocalPlayer
local rf = game:GetService("ReplicatedStorage"):WaitForChild("PhoneRequest")
local GOLD, BG, CARD, WHITE, GREY = Color3.fromRGB(212, 170, 90), Color3.fromRGB(12, 13, 18), Color3.fromRGB(28, 30, 38), Color3.new(1, 1, 1), Color3.fromRGB(150, 152, 165)
local gui = Instance.new("ScreenGui"); gui.Name = "DreamPhone"; gui.ResetOnSpawn = false; gui.DisplayOrder = 30; gui.Parent = plr:WaitForChild("PlayerGui")
local btn = Instance.new("TextButton"); btn.AnchorPoint = Vector2.new(1, 1); btn.Position = UDim2.new(1, -16, 1, -96); btn.Size = UDim2.fromOffset(56, 56)
btn.Text = "📱"; btn.TextScaled = true; btn.BackgroundColor3 = BG; btn.Parent = gui; Instance.new("UICorner", btn).CornerRadius = UDim.new(1, 0)
local bs = Instance.new("UIStroke", btn); bs.Color = GOLD; bs.Thickness = 2
local phone = Instance.new("Frame"); phone.AnchorPoint = Vector2.new(1, 1); phone.Position = UDim2.new(1, -84, 1, 700); phone.Size = UDim2.fromOffset(300, 610)
phone.BackgroundColor3 = Color3.fromRGB(5, 5, 7); phone.Parent = gui; Instance.new("UICorner", phone).CornerRadius = UDim.new(0, 40)
local ps = Instance.new("UIStroke", phone); ps.Color = Color3.fromRGB(70, 72, 80); ps.Thickness = 3
local scale = Instance.new("UIScale", phone)
local function rescale() local v = workspace.CurrentCamera.ViewportSize; scale.Scale = math.min(1, (v.Y - 40) / 640) end
rescale(); workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(rescale)
local screen = Instance.new("Frame"); screen.Position = UDim2.fromOffset(10, 10); screen.Size = UDim2.new(1, -20, 1, -20); screen.BackgroundColor3 = BG; screen.ClipsDescendants = true; screen.Parent = phone
Instance.new("UICorner", screen).CornerRadius = UDim.new(0, 32)
local grad = Instance.new("UIGradient", screen); grad.Color = ColorSequence.new(Color3.fromRGB(40, 30, 60), Color3.fromRGB(10, 12, 20)); grad.Rotation = 90
local function lbl(parent, text, size, color, font, pos, sz, align)
	local t = Instance.new("TextLabel"); t.BackgroundTransparency = 1; t.Text = text; t.TextSize = size; t.TextColor3 = color or WHITE; t.Font = font or Enum.Font.GothamBold
	t.Position = pos or UDim2.new(); t.Size = sz or UDim2.new(1, 0, 0, size + 6); t.TextXAlignment = align or Enum.TextXAlignment.Center; t.TextWrapped = true; t.Parent = parent; return t
end
local status = lbl(screen, "", 13, WHITE, Enum.Font.GothamBold, UDim2.fromOffset(22, 10), UDim2.new(1, -44, 0, 18), Enum.TextXAlignment.Left)
local battery = lbl(screen, "5G  ▮▮▮▯", 12, WHITE, Enum.Font.GothamBold, UDim2.fromOffset(22, 10), UDim2.new(1, -44, 0, 18), Enum.TextXAlignment.Right)
local pages = {}
local function page(name)
	local f = Instance.new("Frame"); f.Name = name; f.BackgroundTransparency = 1; f.Position = UDim2.fromOffset(0, 34); f.Size = UDim2.new(1, 0, 1, -34); f.Visible = false; f.Parent = screen
	pages[name] = f; return f
end
local current
local function show(name) for n, f in pairs(pages) do f.Visible = (n == name) end; current = name end
local function clockText() local h = L.ClockTime; local hh = math.floor(h); local mm = math.floor((h - hh) * 60); return string.format("%02d:%02d", hh, mm) end
-- lock screen
local lock = page("Lock")
local big = lbl(lock, "", 64, WHITE, Enum.Font.GothamBold, UDim2.fromOffset(0, 60), UDim2.new(1, 0, 0, 70))
lbl(lock, "DREAM PHONE", 14, GOLD, Enum.Font.GothamBlack, UDim2.fromOffset(0, 140))
local note = lbl(lock, "", 13, GREY, Enum.Font.GothamMedium, UDim2.fromOffset(20, 200), UDim2.new(1, -40, 0, 60))
local unlock = Instance.new("TextButton"); unlock.AnchorPoint = Vector2.new(0.5, 1); unlock.Position = UDim2.new(0.5, 0, 1, -24); unlock.Size = UDim2.fromOffset(180, 40)
unlock.Text = "Tap to unlock"; unlock.Font = Enum.Font.GothamBold; unlock.TextSize = 14; unlock.TextColor3 = WHITE; unlock.BackgroundColor3 = Color3.fromRGB(255, 255, 255); unlock.BackgroundTransparency = 0.85; unlock.Parent = lock
Instance.new("UICorner", unlock).CornerRadius = UDim.new(1, 0)
-- home
local home = page("Home")
local grid = Instance.new("Frame"); grid.BackgroundTransparency = 1; grid.Position = UDim2.fromOffset(16, 20); grid.Size = UDim2.new(1, -32, 1, -40); grid.Parent = home
local gl = Instance.new("UIGridLayout", grid); gl.CellSize = UDim2.fromOffset(58, 80); gl.CellPadding = UDim2.fromOffset(10, 14)
local function header(p, title)
	local back = Instance.new("TextButton"); back.Position = UDim2.fromOffset(12, 4); back.Size = UDim2.fromOffset(60, 26); back.Text = "‹ Home"; back.Font = Enum.Font.GothamBold; back.TextSize = 13
	back.TextColor3 = GOLD; back.BackgroundTransparency = 1; back.Parent = p; back.MouseButton1Click:Connect(function() show("Home") end)
	lbl(p, title, 22, WHITE, Enum.Font.GothamBlack, UDim2.fromOffset(16, 32), UDim2.new(1, -32, 0, 28), Enum.TextXAlignment.Left)
	local list = Instance.new("ScrollingFrame"); list.Name = "List"; list.BackgroundTransparency = 1; list.Position = UDim2.fromOffset(12, 70); list.Size = UDim2.new(1, -24, 1, -80)
	list.ScrollBarThickness = 3; list.AutomaticCanvasSize = Enum.AutomaticSize.Y; list.CanvasSize = UDim2.new(); list.BorderSizePixel = 0; list.Parent = p
	local ll = Instance.new("UIListLayout", list); ll.Padding = UDim.new(0, 8); ll.SortOrder = Enum.SortOrder.LayoutOrder
	return list
end
local function clear(list) for _, c in ipairs(list:GetChildren()) do if not c:IsA("UIListLayout") then c:Destroy() end end end
local function card(list, title, sub, right, onClick, order)
	local b = Instance.new(onClick and "TextButton" or "Frame"); b.Size = UDim2.new(1, -4, 0, sub and 54 or 40); b.BackgroundColor3 = CARD; b.LayoutOrder = order or 0
	if onClick then b.Text = ""; b.AutoButtonColor = true; b.MouseButton1Click:Connect(onClick) end
	b.Parent = list; Instance.new("UICorner", b).CornerRadius = UDim.new(0, 12)
	lbl(b, title, 14, WHITE, Enum.Font.GothamBold, UDim2.fromOffset(12, 6), UDim2.new(1, -100, 0, 18), Enum.TextXAlignment.Left)
	if sub then lbl(b, sub, 12, GREY, Enum.Font.GothamMedium, UDim2.fromOffset(12, 28), UDim2.new(1, -100, 0, 18), Enum.TextXAlignment.Left) end
	if right then local r = lbl(b, right, 14, GOLD, Enum.Font.GothamBlack, UDim2.fromOffset(0, 0), UDim2.new(1, -12, 1, 0), Enum.TextXAlignment.Right) end
	return b
end
local APPS = {}
local function app(name, icon, color, build)
	local b = Instance.new("TextButton"); b.Text = ""; b.BackgroundTransparency = 1; b.Parent = grid
	local ic = Instance.new("TextLabel"); ic.Size = UDim2.fromOffset(58, 58); ic.BackgroundColor3 = color; ic.Text = icon; ic.TextScaled = true; ic.Parent = b
	Instance.new("UICorner", ic).CornerRadius = UDim.new(0, 16); local pad = Instance.new("UIPadding", ic); pad.PaddingTop = UDim.new(0, 10); pad.PaddingBottom = UDim.new(0, 10)
	lbl(b, name, 11, WHITE, Enum.Font.GothamMedium, UDim2.fromOffset(-6, 60), UDim2.new(1, 12, 0, 16))
	local p = page(name); local list = header(p, name)
	APPS[name] = function() show(name); build(list) end
	b.MouseButton1Click:Connect(APPS[name])
end
local function fmt(n) local s = tostring(math.floor(math.abs(n))); s = s:reverse():gsub("(%d%d%d)", "%1,"):reverse():gsub("^,", ""); return (n < 0 and "-$" or "$") .. s end
app("Bank", "🏦", Color3.fromRGB(30, 120, 80), function(list)
	clear(list); local d = rf:InvokeServer("profile")
	card(list, "Balance", "Dream Bank · personal", fmt(d.money), nil, 1)
	card(list, "Business earnings", d.biz and d.biz.brand or "No business yet", fmt(d.earned), nil, 2)
	local box = Instance.new("TextBox"); box.Size = UDim2.new(1, -4, 0, 36); box.PlaceholderText = "Send money: player name, amount"; box.Text = ""; box.TextSize = 12
	box.Font = Enum.Font.GothamMedium; box.BackgroundColor3 = CARD; box.TextColor3 = WHITE; box.LayoutOrder = 3; box.ClearTextOnFocus = false; box.Parent = list; Instance.new("UICorner", box).CornerRadius = UDim.new(0, 10)
	box.FocusLost:Connect(function(enter)
		if not enter then return end
		local who, amt = box.Text:match("^%s*(%S+)%s*,%s*(%d+)")
		if who then box.Text = tostring(rf:InvokeServer("transfer", who, tonumber(amt))) end
	end)
	lbl(list, "RECENT", 11, GREY, Enum.Font.GothamBold, nil, UDim2.new(1, 0, 0, 16), Enum.TextXAlignment.Left).LayoutOrder = 4
	for i, t in ipairs(d.tx) do card(list, t.amount > 0 and "Money in" or "Money out", os.date("%H:%M", t.time), (t.amount > 0 and "+" or "") .. fmt(t.amount), nil, 4 + i) end
end)
app("Maps", "🗺️", Color3.fromRGB(40, 110, 200), function(list)
	clear(list)
	for i, n in ipairs(rf:InvokeServer("places")) do
		local c; c = card(list, n, "Tap to travel", "GO ›", function()
			local r = rf:InvokeServer("go", n)
			if r == true then gui.Enabled = true; TweenService:Create(phone, TweenInfo.new(0.3), {Position = UDim2.new(1, -84, 1, 700)}):Play()
			elseif r == "seated" then c:FindFirstChildWhichIsA("TextLabel").Text = "Get out of the seat first"
			elseif r == "wait" then c:FindFirstChildWhichIsA("TextLabel").Text = "Wait a few seconds" end
		end, i)
	end
end)
app("Jobs", "💼", Color3.fromRGB(200, 120, 40), function(list)
	clear(list); local d = rf:InvokeServer("profile")
	card(list, "Current job", d.job, nil, nil, 0)
	for i, j in ipairs({"Construction Worker", "Architect", "Real Estate Agent", "Car Dealer", "Chef", "Hair Stylist", "Fashion Designer", "Delivery Driver", "Business Owner"}) do
		card(list, j, j == d.job and "Your job" or "Tap to switch", j == d.job and "✓" or "", function() rf:InvokeServer("job", j); APPS.Jobs() end, i)
	end
end)
app("Property", "🏡", Color3.fromRGB(150, 90, 200), function(list)
	clear(list)
	for i, h in ipairs(rf:InvokeServer("listings")) do
		local nice = h.variant .. " villa · " .. h.area
		if h.mine then
			card(list, "🏠 " .. nice, "Your home · tap to sell (80%)", "MINE", function() local r = rf:InvokeServer("sell"); APPS.Property() end, i)
		elseif h.owner then
			card(list, nice, "Owned by " .. h.owner, "SOLD", nil, i + 100)
		else
			local c; c = card(list, nice, "4 bed · pool · garage · tap to buy", fmt(h.price), function()
				local r = rf:InvokeServer("buy", h.name)
				if r == "Bought!" then APPS.Property() else c:FindFirstChildWhichIsA("TextLabel").Text = tostring(r) end
			end, i)
		end
	end
end)
app("Business", "📊", Color3.fromRGB(212, 150, 60), function(list)
	clear(list); local d = rf:InvokeServer("profile")
	if d.biz then
		card(list, d.biz.brand, d.biz.type, "OPEN", nil, 1); card(list, "Earned today", "From customers", fmt(d.earned), nil, 2)
	else card(list, "No business yet", "Rent a shop Downtown ($50) – Maps › Shops", nil, nil, 1) end
	card(list, "Bricks delivered", nil, tostring(d.bricks), nil, 3); card(list, "Mansions built", nil, tostring(d.mansions), nil, 4)
end)
app("Dreamgram", "📸", Color3.fromRGB(220, 60, 120), function(list) clear(list); card(list, "Coming soon", "Post your mansion, cars and business", nil, nil, 1) end)
app("Messages", "💬", Color3.fromRGB(60, 180, 90), function(list) clear(list); card(list, "Coming soon", "Chat with friends and businesses", nil, nil, 1) end)
app("Food", "🍔", Color3.fromRGB(230, 80, 50), function(list) clear(list); card(list, "Coming soon", "Order from Palm Island restaurants", nil, nil, 1) end)
app("Settings", "⚙️", Color3.fromRGB(90, 92, 100), function(list) clear(list); card(list, "Dream Phone v1", "Press P to open / close", nil, nil, 1) end)
-- open / close
local open = false
local function toggle()
	open = not open
	if open then show("Lock"); local d = rf:InvokeServer("profile"); note.Text = "💰 " .. fmt(d.money) .. "\n💼 " .. d.job end
	TweenService:Create(phone, TweenInfo.new(0.35, Enum.EasingStyle.Quint), {Position = open and UDim2.new(1, -84, 1, -16) or UDim2.new(1, -84, 1, 700)}):Play()
end
unlock.MouseButton1Click:Connect(function() show("Home") end)
btn.MouseButton1Click:Connect(toggle)
UIS.InputBegan:Connect(function(i, gp) if not gp and i.KeyCode == Enum.KeyCode.P then toggle() end end)
task.spawn(function() while true do local t = clockText(); status.Text = t; big.Text = t; task.wait(1) end end)
