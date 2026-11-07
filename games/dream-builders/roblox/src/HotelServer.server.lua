-- Dream Grand Hotel (Tower 1): players book a room for $150 (30 minutes; the door opens for the guest and their Roblox friends).
-- Hotel Receptionist job: AI guests arrive at the desk; check them in for pay. At most 2 AI guests waiting.
local Players, TweenService = game:GetService("Players"), game:GetService("TweenService")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local Hm = workspace:WaitForChild("DreamBuilders"):WaitForChild("Downtown"):WaitForChild("Facades"):WaitForChild("Tower1"):WaitForChild("Hotel")
local desk = Hm:WaitForChild("HotelLobby"):WaitForChild("HotelReception")
local PRICE, STAY = 150, 1800
local rooms, booking = {}, {} -- rooms[id] = {model, door, closed, guest, untilT}; booking[userId] = id
for _, m in ipairs(Hm:GetChildren()) do
	local id = m:GetAttribute("RoomId")
	if id then local door = m:FindFirstChild("RoomDoor"); rooms[id] = {model = m, door = door, closed = door.CFrame, plate = m:FindFirstChild("DoorPlate") and m.DoorPlate:FindFirstChild("T", true)} end
end
local function label(r, id) if r.plate then r.plate.Text = r.guest and ("ROOM " .. id .. " · OCCUPIED") or ("ROOM " .. id) end end
for id, r in pairs(rooms) do
	label(r, id)
	local open = false
	local pp = K.prompt(r.door, "Open", "Room " .. id, 0, 8)
	pp.Triggered:Connect(function(p)
		local g = r.guest
		local ok = g == p.UserId
		if not ok and g then local s, f = pcall(function() return p:IsFriendsWith(g) end); ok = s and f end
		if not ok then K.toast(p, g and "🔒 This room is booked" or "Book a room at the hotel reception"); return end
		open = not open; r.door.CanCollide = not open
		TweenService:Create(r.door, TweenInfo.new(0.5), {CFrame = open and (r.closed * CFrame.new(4.8, 0, 0)) or r.closed}):Play()
		if open then task.delay(6, function() if open then open = false; r.door.CanCollide = true; TweenService:Create(r.door, TweenInfo.new(0.5), {CFrame = r.closed}):Play() end end) end
	end)
end
local function release(id) local r = rooms[id]; if r then if r.guest then booking[r.guest] = nil end; r.guest = nil; label(r, id) end end
local book = K.prompt(desk, "Book a room ($" .. PRICE .. ")", "Dream Grand Hotel", 0.6, 12)
book.KeyboardKeyCode = Enum.KeyCode.F; book.Exclusivity = Enum.ProximityPromptExclusivity.AlwaysShow; book.UIOffset = Vector2.new(0, 60)
book.Triggered:Connect(function(p)
	if booking[p.UserId] then K.toast(p, "You're already staying in room " .. booking[p.UserId]); return end
	local free; for id, r in pairs(rooms) do if not r.guest then free = free and math.min(tonumber(free), tonumber(id)) and tostring(math.min(tonumber(free), tonumber(id))) or id end end
	if not free then K.toast(p, "Sorry, the hotel is full"); return end
	local m = p:FindFirstChild("leaderstats") and p.leaderstats:FindFirstChild("Money")
	if not m or m.Value < PRICE then K.toast(p, "A room costs $" .. PRICE); return end
	m.Value -= PRICE
	local r = rooms[free]; r.guest = p.UserId; booking[p.UserId] = free; label(r, free)
	local floor = string.sub(free, 1, 1)
	K.toast(p, "🛎 Room " .. free .. " is yours for 30 minutes. Elevator › FLOOR " .. floor)
	K.msg(p, "Dream Grand Hotel", "Welcome! Room " .. free .. " (floor " .. floor .. "). Your door opens for you and your Roblox friends.")
	task.delay(STAY, function() if r.guest == p.UserId then release(free); if p.Parent then K.msg(p, "Dream Grand Hotel", "Checkout time. Thanks for staying with us!") end end end)
end)
Players.PlayerRemoving:Connect(function(p) local id = booking[p.UserId]; if id then release(id) end end)
-- Hotel Receptionist job: AI guests
local guests = {}
local entrance = desk.CFrame * CFrame.new(0, 0, -22)
task.spawn(function()
	while true do
		task.wait(15)
		local onDuty = false; for _, p in ipairs(Players:GetPlayers()) do if K.job(p) == "Hotel Receptionist" then onDuty = true end end
		if onDuty and #guests < 2 then
			local m = K.spawn(entrance, {parent = Hm})
			if m then
				table.insert(guests, m)
				K.walk(m, (desk.CFrame * CFrame.new(0, 0, -4 - #guests * 3)).Position, 12)
				K.bubble(m, "🧳 Checking in, please!")
				local pr = K.prompt(m:FindFirstChild("HumanoidRootPart"), "Check in guest", m.Name, 1.2, 10)
				pr.Triggered:Connect(function(p)
					if K.job(p) ~= "Hotel Receptionist" then K.toast(p, "Pick the Hotel Receptionist job first"); return end
					pr:Destroy(); table.remove(guests, table.find(guests, m) or 0)
					K.pay(p, 30, "guest checked in")
					K.bubble(m, "Thank you! 🗝", Color3.fromRGB(200, 255, 200))
					K.walk(m, Vector3.new(-544.5, 3, 892), 10); m:Destroy()
				end)
				task.delay(90, function() if m.Parent then local i = table.find(guests, m); if i then table.remove(guests, i) end; m:Destroy() end end)
			end
		end
	end
end)
