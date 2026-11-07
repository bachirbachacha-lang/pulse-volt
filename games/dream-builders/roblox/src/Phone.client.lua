-- Dream Phone v1: press P (or the phone button). Lock screen -> home -> apps: Bank, Maps, Jobs, Property, Business, Settings.
local Players, UIS, TweenService, L = game:GetService("Players"), game:GetService("UserInputService"), game:GetService("TweenService"), game:GetService("Lighting")
local plr = Players.LocalPlayer
local rf = game:GetService("ReplicatedStorage"):WaitForChild("PhoneRequest")
local rf3 = game:GetService("ReplicatedStorage"):WaitForChild("PhoneExtra")
local GOLD, BG, CARD, WHITE, GREY = Color3.fromRGB(212, 170, 90), Color3.fromRGB(12, 13, 18), Color3.fromRGB(28, 30, 38), Color3.new(1, 1, 1), Color3.fromRGB(150, 152, 165)
local gui = Instance.new("ScreenGui"); gui.Name = "DreamPhone"; gui.ResetOnSpawn = false; gui.DisplayOrder = 30; gui.Parent = plr:WaitForChild("PlayerGui")
local btn = Instance.new("TextButton"); btn.AnchorPoint = Vector2.new(1, 1); btn.Position = UDim2.new(1, -16, 1, -96); btn.Size = UDim2.fromOffset(56, 56)
btn.Text = "📱"; btn.TextScaled = true; btn.BackgroundColor3 = BG; btn.Parent = gui; Instance.new("UICorner", btn).CornerRadius = UDim.new(1, 0)
local bs = Instance.new("UIStroke", btn); bs.Color = GOLD; bs.Thickness = 2
local phone = Instance.new("Frame"); phone.AnchorPoint = Vector2.new(1, 1); phone.Position = UDim2.new(1, -84, 1, 700); phone.Size = UDim2.fromOffset(300, 610)
phone.BackgroundColor3 = Color3.fromRGB(5, 5, 7); phone.Parent = gui; Instance.new("UICorner", phone).CornerRadius = UDim.new(0, 40)
local ps = Instance.new("UIStroke", phone); ps.Color = Color3.fromRGB(70, 72, 80); ps.Thickness = 3
local scale = Instance.new("UIScale", phone)
local function rescale() local v = workspace.CurrentCamera.ViewportSize; scale.Scale = math.clamp((v.Y - 30) / 560, 0.95, 1.6) end
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
local taxiMode = false
local open = false
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
	local mode = card(list, taxiMode and "🚕 Mode: Taxi ride (paid)" or "⚡ Mode: Fast travel (free)", "Tap to switch between fast travel and taxi", nil, function() taxiMode = not taxiMode; APPS.Maps() end, 0)
	for i, n in ipairs(rf:InvokeServer("places")) do
		local c; c = card(list, n, taxiMode and "Call a taxi here" or "Tap to travel", taxiMode and "🚕 ›" or "GO ›", function()
			if taxiMode then
				local t = game:GetService("ReplicatedStorage"):WaitForChild("TaxiRequest"):InvokeServer(n)
				c:FindFirstChildWhichIsA("TextLabel").Text = tostring(t)
				if tostring(t):find("on the way") then task.wait(0.8); TweenService:Create(phone, TweenInfo.new(0.3), {Position = UDim2.new(1, -84, 1, 700)}):Play(); open = false end
				return
			end
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
	for i, j in ipairs({"Construction Worker", "Architect", "Real Estate Agent", "Car Dealer", "Chef", "Hair Stylist", "Fashion Designer", "Delivery Driver", "Business Owner", "Teacher", "Taxi Driver", "Doctor", "Hotel Receptionist", "City Patrol Officer"}) do
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
	local b = rf3:InvokeServer("biz")
	if b then
		lbl(list, "SHOP SETTINGS", 11, GREY, Enum.Font.GothamBold, nil, UDim2.new(1, 0, 0, 16), Enum.TextXAlignment.Left).LayoutOrder = 10
		local info = {Budget = "Cheaper · customers every 8s · 80% price", Standard = "Normal · every 12s · 100% price", Premium = "Fancy · every 18s · 140% price"}
		for i, t in ipairs({"Budget", "Standard", "Premium"}) do
			card(list, (b.tier == t and "● " or "○ ") .. t .. " prices", info[t], b.tier == t and "ON" or "", function() rf3:InvokeServer("tier", t); APPS.Business() end, 10 + i)
		end
		local dc; dc = card(list, b.decor and "✨ Luxury decor" or "Upgrade decor", b.decor and "+$3 on every customer" or "$250 · plants, lights, +$3 per customer", b.decor and "✓" or "$250", not b.decor and function()
			dc:FindFirstChildWhichIsA("TextLabel").Text = tostring(rf3:InvokeServer("decor")); task.wait(1); APPS.Business() end or nil, 20)
		card(list, "👔 Staff: " .. (b.count or 0) .. " / 3", "Hire at the counter ($150 each) · wages $5 each per minute · you keep 70%", nil, nil, 21)
	end
end)
local rf2 = game:GetService("ReplicatedStorage"):WaitForChild("PhoneApps")
local function mkBtn(parent, text, color, size, order)
	local b = Instance.new("TextButton"); b.Size = size or UDim2.new(1, -4, 0, 34); b.BackgroundColor3 = color or CARD; b.Text = text; b.TextColor3 = WHITE
	b.Font = Enum.Font.GothamBold; b.TextSize = 13; b.LayoutOrder = order or 0; b.AutoButtonColor = true; b.Parent = parent
	Instance.new("UICorner", b).CornerRadius = UDim.new(0, 10); return b
end
local function row(parent, order, h)
	local f = Instance.new("Frame"); f.Size = UDim2.new(1, -4, 0, h or 34); f.BackgroundTransparency = 1; f.LayoutOrder = order; f.Parent = parent
	local l = Instance.new("UIListLayout", f); l.FillDirection = Enum.FillDirection.Horizontal; l.Padding = UDim.new(0, 6); return f
end
local function ago(s) if s < 60 then return "now" elseif s < 3600 then return math.floor(s / 60) .. "m" else return math.floor(s / 3600) .. "h" end end
app("Dreamgram", "📸", Color3.fromRGB(220, 60, 120), function(list)
	clear(list); local d = rf2:InvokeServer("feed")
	lbl(list, "👥 " .. d.followers .. " followers", 12, GREY, Enum.Font.GothamBold, nil, UDim2.new(1, 0, 0, 16), Enum.TextXAlignment.Left).LayoutOrder = 0
	local kind = "here"
	local kr = row(list, 1, 30)
	local kbs = {}
	for _, k in ipairs({{"here", "📍"}, {"villa", "🏡"}, {"car", "🚗"}, {"biz", "🛍️"}}) do
		local b = mkBtn(kr, k[2], k[1] == kind and Color3.fromRGB(220, 60, 120) or CARD, UDim2.fromOffset(56, 30)); kbs[k[1]] = b
		b.MouseButton1Click:Connect(function() kind = k[1]; for n, x in pairs(kbs) do x.BackgroundColor3 = n == kind and Color3.fromRGB(220, 60, 120) or CARD end end)
	end
	local box = Instance.new("TextBox"); box.Size = UDim2.new(1, -4, 0, 34); box.PlaceholderText = "Write a caption…"; box.Text = ""; box.TextSize = 12; box.Font = Enum.Font.GothamMedium
	box.BackgroundColor3 = CARD; box.TextColor3 = WHITE; box.ClearTextOnFocus = false; box.LayoutOrder = 2; box.Parent = list; Instance.new("UICorner", box).CornerRadius = UDim.new(0, 10)
	local pb = mkBtn(list, "Post", Color3.fromRGB(220, 60, 120), nil, 3)
	pb.MouseButton1Click:Connect(function()
		local r = rf2:InvokeServer("post", kind, box.Text)
		if r == "Posted!" then APPS.Dreamgram() else pb.Text = tostring(r) end
	end)
	if #d.posts == 0 then card(list, "No posts yet", "Be the first to post!", nil, nil, 4) end
	for i, x in ipairs(d.posts) do
		local c = Instance.new("Frame"); c.Size = UDim2.new(1, -4, 0, 96); c.BackgroundColor3 = CARD; c.LayoutOrder = 4 + i; c.Parent = list
		Instance.new("UICorner", c).CornerRadius = UDim.new(0, 12)
		lbl(c, x.name .. "  ·  " .. ago(x.ago), 13, WHITE, Enum.Font.GothamBold, UDim2.fromOffset(12, 6), UDim2.new(1, -90, 0, 16), Enum.TextXAlignment.Left)
		lbl(c, x.kind .. "  ·  " .. x.place, 11, GOLD, Enum.Font.GothamBold, UDim2.fromOffset(12, 24), UDim2.new(1, -24, 0, 14), Enum.TextXAlignment.Left)
		lbl(c, x.caption, 12, WHITE, Enum.Font.GothamMedium, UDim2.fromOffset(12, 40), UDim2.new(1, -24, 0, 26), Enum.TextXAlignment.Left)
		local lb = Instance.new("TextButton"); lb.Position = UDim2.fromOffset(10, 68); lb.Size = UDim2.fromOffset(70, 22); lb.BackgroundTransparency = 1
		lb.Text = (x.liked and "❤️ " or "🤍 ") .. x.likes; lb.TextColor3 = WHITE; lb.Font = Enum.Font.GothamBold; lb.TextSize = 13; lb.TextXAlignment = Enum.TextXAlignment.Left; lb.Parent = c
		lb.MouseButton1Click:Connect(function() rf2:InvokeServer("like", x.id); APPS.Dreamgram() end)
		if not x.mine then
			local fb = Instance.new("TextButton"); fb.AnchorPoint = Vector2.new(1, 0); fb.Position = UDim2.new(1, -10, 0, 6); fb.Size = UDim2.fromOffset(76, 22)
			fb.BackgroundColor3 = x.following and CARD or Color3.fromRGB(220, 60, 120); fb.Text = x.following and "Following" or "Follow"; fb.TextColor3 = WHITE; fb.Font = Enum.Font.GothamBold; fb.TextSize = 11; fb.Parent = c
			Instance.new("UICorner", fb).CornerRadius = UDim.new(1, 0)
			fb.MouseButton1Click:Connect(function() rf2:InvokeServer("follow", x.uid); APPS.Dreamgram() end)
		end
	end
end)
app("Messages", "💬", Color3.fromRGB(60, 180, 90), function(list)
	clear(list); local d = rf2:InvokeServer("inbox")
	lbl(list, "SEND A MESSAGE", 11, GREY, Enum.Font.GothamBold, nil, UDim2.new(1, 0, 0, 16), Enum.TextXAlignment.Left).LayoutOrder = 0
	if #d.players == 0 then card(list, "Nobody else is here yet", "Invite a friend to play!", nil, nil, 1) end
	for i, o in ipairs(d.players) do
		card(list, o.name, "Tap to send a quick message", "›", function()
			clear(list)
			lbl(list, "To " .. o.name, 14, WHITE, Enum.Font.GothamBold, nil, UDim2.new(1, 0, 0, 20), Enum.TextXAlignment.Left).LayoutOrder = 0
			for k, t in ipairs(d.presets) do
				local b = mkBtn(list, t, CARD, nil, k)
				b.MouseButton1Click:Connect(function() b.Text = tostring(rf2:InvokeServer("send", o.user, k)) .. " ✓"; task.wait(0.8); APPS.Messages() end)
			end
			mkBtn(list, "‹ Back", Color3.fromRGB(60, 62, 70), nil, 99).MouseButton1Click:Connect(APPS.Messages)
		end, i)
	end
	lbl(list, "INBOX", 11, GREY, Enum.Font.GothamBold, nil, UDim2.new(1, 0, 0, 16), Enum.TextXAlignment.Left).LayoutOrder = 50
	if #d.msgs == 0 then card(list, "No messages yet", nil, nil, nil, 51) end
	for i, m in ipairs(d.msgs) do
		local c = Instance.new("Frame"); c.Size = UDim2.new(1, -4, 0, 62); c.BackgroundColor3 = CARD; c.LayoutOrder = 50 + i; c.Parent = list
		Instance.new("UICorner", c).CornerRadius = UDim.new(0, 12)
		lbl(c, m.from, 13, GOLD, Enum.Font.GothamBold, UDim2.fromOffset(12, 6), UDim2.new(1, -70, 0, 16), Enum.TextXAlignment.Left)
		lbl(c, os.date("%H:%M", m.time), 11, GREY, Enum.Font.GothamMedium, UDim2.fromOffset(0, 6), UDim2.new(1, -12, 0, 16), Enum.TextXAlignment.Right)
		lbl(c, m.text, 12, WHITE, Enum.Font.GothamMedium, UDim2.fromOffset(12, 24), UDim2.new(1, -24, 0, 34), Enum.TextXAlignment.Left)
	end
end)
app("Dream Eats", "🍔", Color3.fromRGB(230, 80, 50), function(list)
	clear(list); local d = rf2:InvokeServer("menu")
	card(list, "Delivery to you", d.drivers > 0 and (d.drivers .. " delivery driver(s) online") or "Courier · about 20 seconds", "$" .. d.fee, nil, 0)
	for i, r in ipairs(d.restaurants) do
		card(list, r.name, "Palm Island · tap for menu", "›", function()
			clear(list)
			lbl(list, r.name, 16, WHITE, Enum.Font.GothamBlack, nil, UDim2.new(1, 0, 0, 22), Enum.TextXAlignment.Left).LayoutOrder = 0
			local picked, total = {}, d.fee
			local ob
			for k, it in ipairs(r.items) do
				local b; b = card(list, it[1], "Tap to add", fmt(it[2]), function()
					picked[k] = not picked[k]; total = d.fee; for kk, on in pairs(picked) do if on then total += r.items[kk][2] end end
					b.BackgroundColor3 = picked[k] and Color3.fromRGB(70, 40, 35) or CARD
					ob.Text = "Order · " .. fmt(total) .. " (incl. delivery)"
				end, k)
			end
			ob = mkBtn(list, "Order · " .. fmt(total) .. " (incl. delivery)", Color3.fromRGB(230, 80, 50), nil, 50)
			ob.MouseButton1Click:Connect(function()
				local idx = {}; for k, on in pairs(picked) do if on then idx[#idx + 1] = k end end
				ob.Text = tostring(rf2:InvokeServer("order", r.name, idx))
			end)
			mkBtn(list, "‹ Restaurants", Color3.fromRGB(60, 62, 70), nil, 51).MouseButton1Click:Connect(APPS["Dream Eats"])
		end, i)
	end
end)
-- notification banner (messages, likes, deliveries)
local banner = Instance.new("TextLabel"); banner.AnchorPoint = Vector2.new(0.5, 0); banner.Position = UDim2.new(0.5, 0, 0, -80); banner.Size = UDim2.fromOffset(360, 56)
banner.BackgroundColor3 = Color3.fromRGB(20, 22, 30); banner.TextColor3 = WHITE; banner.Font = Enum.Font.GothamMedium; banner.TextSize = 14; banner.TextWrapped = true; banner.Parent = gui
Instance.new("UICorner", banner).CornerRadius = UDim.new(0, 16); local bst = Instance.new("UIStroke", banner); bst.Color = GOLD; bst.Thickness = 1.5
local bpad = Instance.new("UIPadding", banner); bpad.PaddingLeft = UDim.new(0, 12); bpad.PaddingRight = UDim.new(0, 12)
local seq = 0
game:GetService("ReplicatedStorage"):WaitForChild("PhoneNotify").OnClientEvent:Connect(function(from, text)
	seq += 1; local my = seq
	banner.Text = "📱 " .. from .. ": " .. text
	TweenService:Create(banner, TweenInfo.new(0.3, Enum.EasingStyle.Quint), {Position = UDim2.new(0.5, 0, 0, 12)}):Play()
	task.delay(4.5, function() if seq == my then TweenService:Create(banner, TweenInfo.new(0.3), {Position = UDim2.new(0.5, 0, 0, -80)}):Play() end end)
	if current == "Messages" then APPS.Messages() end
end)
app("Supplies", "🧱", Color3.fromRGB(170, 75, 55), function(list)
	clear(list); local d = rf3:InvokeServer("plots")
	card(list, "Brick pallet", d.bricks .. " bricks delivered to a building plot", "$" .. d.price, nil, 0)
	local n = 0
	for _, pl in ipairs(d.plots) do
		if pl.started and not pl.done then
			n += 1
			local c; c = card(list, "Plot " .. tostring(pl.id) .. " · " .. pl.stageName, pl.pallet and "Pallet already there" or "Tap to order a pallet here", pl.pallet and "🧱" or "ORDER", not pl.pallet and function()
				c:FindFirstChildWhichIsA("TextLabel").Text = tostring(rf3:InvokeServer("order", pl.name))
			end or nil, n)
		end
	end
	if n == 0 then card(list, "No building sites yet", "An Architect has to design a mansion on a plot first", nil, nil, 1) end
end)
app("Assistant", "🤖", Color3.fromRGB(80, 90, 200), function(list)
	clear(list)
	lbl(list, "Dream Assistant · tips for you", 12, GREY, Enum.Font.GothamBold, nil, UDim2.new(1, 0, 0, 16), Enum.TextXAlignment.Left).LayoutOrder = 0
	for i, t in ipairs(rf3:InvokeServer("assistant")) do
		local c = Instance.new(t.place and "TextButton" or "Frame"); c.Size = UDim2.new(1, -4, 0, 64); c.BackgroundColor3 = CARD; c.LayoutOrder = i; c.Parent = list
		if t.place then c.Text = ""; c.MouseButton1Click:Connect(function() local r = rf:InvokeServer("go", t.place); if r == true then TweenService:Create(phone, TweenInfo.new(0.3), {Position = UDim2.new(1, -84, 1, 700)}):Play(); open = false end end) end
		Instance.new("UICorner", c).CornerRadius = UDim.new(0, 12)
		lbl(c, t.text, 12, WHITE, Enum.Font.GothamMedium, UDim2.fromOffset(12, 6), UDim2.new(1, -24, 0, t.place and 36 or 52), Enum.TextXAlignment.Left)
		if t.place then lbl(c, "Take me there ›", 11, GOLD, Enum.Font.GothamBold, UDim2.fromOffset(12, 44), UDim2.new(1, -24, 0, 14), Enum.TextXAlignment.Left) end
	end
end)
app("Inventory", "🎒", Color3.fromRGB(150, 110, 70), function(list)
	clear(list)
	local items = game:GetService("ReplicatedStorage"):WaitForChild("InventoryRequest"):InvokeServer("list")
	lbl(list, "Food & drinks are in your backpack (number keys). Wearables: tap to wear.", 11, GREY, Enum.Font.GothamMedium, nil, UDim2.new(1, 0, 0, 30), Enum.TextXAlignment.Left).LayoutOrder = 0
	if #items == 0 then card(list, "Nothing here yet", "Shop at Dream Mart (Maps › Dream Mart)", nil, nil, 1) end
	for k, it in ipairs(items) do
		card(list, it.name .. (it.count > 1 and (" ×" .. it.count) or ""), it.wear and (it.on and "Wearing · tap to take off" or "Tap to wear") or "Collectible", it.on and "ON" or "", it.wear and function()
			game:GetService("ReplicatedStorage").InventoryRequest:InvokeServer("toggle", it.name); APPS.Inventory()
		end or nil, k)
	end
end)
app("Style", "👕", Color3.fromRGB(200, 90, 160), function(list)
	clear(list)
	local srf = game:GetService("ReplicatedStorage"):WaitForChild("StyleRequest")
	local d = srf:InvokeServer("palette"); if type(d) ~= "table" then return end
	local pick = {shirt = 1, pants = 1, skin = 1}
	local order = 0
	for _, key in ipairs({"shirt", "pants", "skin"}) do
		order += 1
		lbl(list, ({shirt = "SHIRT", pants = "TROUSERS", skin = "SKIN TONE"})[key], 11, GREY, Enum.Font.GothamBold, nil, UDim2.new(1, 0, 0, 16), Enum.TextXAlignment.Left).LayoutOrder = order
		order += 1
		local row = Instance.new("Frame"); row.Size = UDim2.new(1, -4, 0, 30); row.BackgroundTransparency = 1; row.LayoutOrder = order; row.Parent = list
		local l = Instance.new("UIListLayout", row); l.FillDirection = Enum.FillDirection.Horizontal; l.Padding = UDim.new(0, 5)
		local chips = {}
		for idx, c in ipairs(d.pal[key]) do
			local b = Instance.new("TextButton"); b.Size = UDim2.fromOffset(24, 24); b.Text = ""; b.BackgroundColor3 = Color3.new(c[1], c[2], c[3]); b.Parent = row
			Instance.new("UICorner", b).CornerRadius = UDim.new(1, 0)
			local st = Instance.new("UIStroke", b); st.Color = GOLD; st.Thickness = idx == 1 and 2 or 0; chips[idx] = st
			b.MouseButton1Click:Connect(function() pick[key] = idx; for j, s in ipairs(chips) do s.Thickness = j == idx and 2 or 0 end; srf:InvokeServer("apply", pick) end)
		end
	end
	for slot = 1, 3 do
		local has = d.outfits[slot] ~= nil
		card(list, "Outfit " .. slot, has and "Tap to wear · hold-save below" or "Empty", has and "WEAR" or "", has and function() srf:InvokeServer("load", slot) end or nil, 20 + slot)
		local sv = Instance.new("TextButton"); sv.Size = UDim2.new(1, -4, 0, 26); sv.Text = "💾 Save current look to Outfit " .. slot; sv.Font = Enum.Font.GothamBold; sv.TextSize = 12
		sv.TextColor3 = WHITE; sv.BackgroundColor3 = Color3.fromRGB(60, 62, 70); sv.LayoutOrder = 20 + slot; sv.Parent = list; Instance.new("UICorner", sv).CornerRadius = UDim.new(0, 8)
		sv.MouseButton1Click:Connect(function() srf:InvokeServer("save", slot, pick); APPS.Style() end)
	end
	card(list, "↩ Back to my Roblox avatar", "Puts your own clothes back on", nil, function() srf:InvokeServer("reset") end, 40)
end)
app("Settings", "⚙️", Color3.fromRGB(90, 92, 100), function(list) clear(list); card(list, "Dream Phone v2", "Press P to open / close", nil, nil, 1) end)
-- open / close
local function toggle()
	open = not open
	if open then show("Lock"); local d = rf:InvokeServer("profile"); note.Text = "💰 " .. fmt(d.money) .. "\n💼 " .. d.job end
	TweenService:Create(phone, TweenInfo.new(0.35, Enum.EasingStyle.Quint), {Position = open and UDim2.new(1, -84, 1, -16) or UDim2.new(1, -84, 1, 700)}):Play()
end
unlock.MouseButton1Click:Connect(function() show("Home") end)
btn.MouseButton1Click:Connect(toggle)
UIS.InputBegan:Connect(function(i, gp) if not gp and i.KeyCode == Enum.KeyCode.P then toggle() end end)
task.spawn(function() while true do local t = clockText(); status.Text = t; big.Text = t; task.wait(1) end end)

-- screen fade (flights, taxi)
local fadeF = Instance.new("Frame"); fadeF.Size = UDim2.fromScale(1, 1); fadeF.BackgroundColor3 = Color3.new(0, 0, 0); fadeF.BackgroundTransparency = 1; fadeF.ZIndex = 50; fadeF.Visible = false; fadeF.Parent = gui
local fadeT = lbl(fadeF, "", 26, WHITE, Enum.Font.GothamBold, UDim2.fromScale(0, 0.45), UDim2.new(1, 0, 0, 40)); fadeT.ZIndex = 51; fadeT.TextTransparency = 1
gui.IgnoreGuiInset = true
game:GetService("ReplicatedStorage"):WaitForChild("ScreenFade").OnClientEvent:Connect(function(text, dur)
	fadeT.Text = text; fadeF.Visible = true
	TweenService:Create(fadeF, TweenInfo.new(0.8), {BackgroundTransparency = 0}):Play(); TweenService:Create(fadeT, TweenInfo.new(0.8), {TextTransparency = 0}):Play()
	task.wait(math.max(1, (dur or 3) - 0.8))
	TweenService:Create(fadeF, TweenInfo.new(0.8), {BackgroundTransparency = 1}):Play(); TweenService:Create(fadeT, TweenInfo.new(0.8), {TextTransparency = 1}):Play()
	task.wait(0.8); fadeF.Visible = false
end)
