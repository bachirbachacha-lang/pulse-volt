-- Chef job: start a shift at Sahara Grill or Dream Diner. AI diners come in, sit and order.
-- Cook the dish at the grill (hold), then serve it at their table. Paid per dish + tips.
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local island = workspace:WaitForChild("DreamBuilders"):WaitForChild("PalmIsland")
local R = {
	SaharaGrill = {title = "Sahara Grill", stove = "Grill", dishes = {{"Mixed Grill", 40, "🍢"}, {"Chicken Shawarma", 18, "🌯"}, {"Hummus & Bread", 10, "🥙"}}},
	DreamDiner = {title = "Dream Diner", stove = "Griddle", dishes = {{"Double Burger", 22, "🍔"}, {"Milkshake", 9, "🥤"}, {"Fries", 6, "🍟"}}},
}
local shift = {}   -- [player] = restaurant key
local holding = {} -- [player] = dish name
local function chefsAt(key) local n = 0; for p, k in pairs(shift) do if k == key and p.Parent then n += 1 end end; return n end
for key, cfg in pairs(R) do
	local r = island:FindFirstChild(key)
	if r then
		local stove = r:FindFirstChild(cfg.stove)
		-- shift on/off at the menu board side of the kitchen
		local sp = K.prompt(stove, "Start chef shift", cfg.title, 0.3, 12); sp.KeyboardKeyCode = Enum.KeyCode.F; sp.UIOffset = Vector2.new(0, 60)
		sp.Triggered:Connect(function(p)
			if K.job(p) ~= "Chef" then K.toast(p, "Pick the Chef job first (Phone › Jobs)"); return end
			if shift[p] == key then shift[p] = nil; holding[p] = nil; K.toast(p, "Shift ended at " .. cfg.title); return end
			shift[p] = key; K.toast(p, "👨‍🍳 Shift started! Diners are coming to " .. cfg.title)
			K.msg(p, cfg.title, "Diners sit and show their order. Hold E at the grill to cook it, then serve it at their table.")
		end)
		-- cooking: one prompt per dish
		for i, d in ipairs(cfg.dishes) do
			local cp = K.prompt(stove, "Cook " .. d[1], d[3], 2.5, 10)
			cp.UIOffset = Vector2.new(0, -60 * (i - 1)); cp.Exclusivity = Enum.ProximityPromptExclusivity.AlwaysShow
			cp.Triggered:Connect(function(p)
				if shift[p] ~= key then K.toast(p, "Start your chef shift first"); return end
				holding[p] = d[1]; K.toast(p, d[3] .. " " .. d[1] .. " ready! Serve it to the diner who ordered it")
			end)
		end
		-- diners
		local seats = {}
		for _, c in ipairs(r:GetChildren()) do if c:IsA("Seat") then table.insert(seats, c) end end
		local door = r.Step.CFrame * CFrame.new(0, 1, -4)
		local diners = Instance.new("Folder"); diners.Name = "Diners"; diners.Parent = r
		task.spawn(function()
			while true do
				task.wait(math.random(9, 14))
				if chefsAt(key) > 0 and #diners:GetChildren() < 3 then
					local free = {}; for _, st in ipairs(seats) do if not st.Occupant then free[#free + 1] = st end end
					if #free > 0 then
						task.spawn(function()
							local seat = free[math.random(#free)]
							local m, hum = K.spawn(door, {parent = diners}); if not m then return end
							K.walk(m, seat.Position, 14); if not m.Parent then return end
							seat:Sit(hum)
							local d = cfg.dishes[math.random(#cfg.dishes)]
							K.bubble(m, d[3] .. " " .. d[1])
							local served = false
							local pp = K.prompt(m:FindFirstChild("HumanoidRootPart"), "Serve", m.Name, 0.3, 9)
							pp.Triggered:Connect(function(p)
								if served or shift[p] ~= key then return end
								if holding[p] ~= d[1] then K.toast(p, m.Name .. " ordered " .. d[1] .. ". Cook it first!"); return end
								served = true; holding[p] = nil; pp:Destroy()
								local tip = math.random(0, 3) == 0 and math.random(5, 15) or 0
								K.pay(p, 10 + math.floor(d[2] * 0.6) + tip, "served " .. d[1] .. (tip > 0 and (" (+$" .. tip .. " tip!)") or ""))
								K.bubble(m, "😋 Delicious!", Color3.fromRGB(200, 255, 200))
								task.wait(8)
								hum.Sit = false; task.wait(0.5); K.bubble(m, nil); K.walk(m, door.Position, 10); m:Destroy()
							end)
							task.delay(70, function()
								if not served and m.Parent then served = true; if pp.Parent then pp:Destroy() end
									K.bubble(m, "😤 Too slow…", Color3.fromRGB(255, 200, 200)); task.wait(3); hum.Sit = false; task.wait(0.5); K.walk(m, door.Position, 8); m:Destroy() end
							end)
						end)
					end
				end
			end
		end)
	end
end
Players.PlayerRemoving:Connect(function(p) shift[p] = nil; holding[p] = nil end)
