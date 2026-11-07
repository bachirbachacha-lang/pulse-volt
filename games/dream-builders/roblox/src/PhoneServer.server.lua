-- Phone v1 backend: profile/bank data, GPS fast travel (fixed list, cooldown), job switching, property list, business stats, bank transfers.
local Players, RS = game:GetService("Players"), game:GetService("ReplicatedStorage")
local rf = RS:WaitForChild("PhoneRequest")
local DEST = {
	["Spawn"] = Vector3.new(0, 5, 520), ["Downtown"] = Vector3.new(120, 5, 800), ["Dream Realty Tower"] = Vector3.new(300, 5, 828),
	["Shops (Businesses)"] = Vector3.new(150, 5, 822), ["Metro – Downtown"] = Vector3.new(-5, 5, 790), ["Palm Beach"] = Vector3.new(690, 6, -150),
	["Palm Island"] = Vector3.new(1330, 6, -420), ["Cargo Port"] = Vector3.new(716, 5, -1330), ["Palm Hills"] = Vector3.new(-252, 5, -930),
	["HQ (Jobs)"] = Vector3.new(0, 5, 600),
	["Airport"] = Vector3.new(-500, 4, 1430),
	["School (Academy)"] = Vector3.new(250, 4, 1395), ["Dream Residences"] = Vector3.new(-300, 4, 828), ["Hospital"] = Vector3.new(520, 4, 1395), ["Dream Grand Hotel"] = Vector3.new(-540, 4, 828), ["Dream Agency (Missions)"] = Vector3.new(-330, 4, 760),
}
local JOBS = {["Construction Worker"] = 1, ["Architect"] = 1, ["Real Estate Agent"] = 1, ["Car Dealer"] = 1, ["Chef"] = 1, ["Hair Stylist"] = 1, ["Fashion Designer"] = 1, ["Delivery Driver"] = 1, ["Business Owner"] = 1, ["Teacher"] = 1, ["Taxi Driver"] = 1, ["Doctor"] = 1, ["Hotel Receptionist"] = 1}
local log = {}   -- [userId] = {transactions}
local lastTp = {}
local function money(p) local ls = p:FindFirstChild("leaderstats"); return ls and ls:FindFirstChild("Money") end
local function track(p)
	local m = money(p); if not m then return end
	local last = m.Value
	log[p.UserId] = log[p.UserId] or {}
	m.Changed:Connect(function(v)
		local d = v - last; last = v
		if d ~= 0 then table.insert(log[p.UserId], 1, {amount = d, time = os.time()}); if #log[p.UserId] > 30 then table.remove(log[p.UserId]) end end
	end)
end
Players.PlayerAdded:Connect(function(p) p:WaitForChild("leaderstats", 10); task.wait(1); track(p) end)
for _, p in ipairs(Players:GetPlayers()) do task.spawn(track, p) end
rf.OnServerInvoke = function(p, what, arg, arg2)
	if what == "profile" then
		local m = money(p)
		local biz
		for _, u in ipairs(workspace.DreamBuilders.Businesses:GetChildren()) do if u:GetAttribute("OwnerId") == p.UserId then biz = {type = u:GetAttribute("Type"), brand = u:GetAttribute("Brand")} end end
		return {money = m and m.Value or 0, job = p:GetAttribute("Job") or "No job", earned = p:GetAttribute("BusinessEarned") or 0, biz = biz, tx = log[p.UserId] or {},
			bricks = p:GetAttribute("BricksDelivered") or 0, mansions = p:GetAttribute("MansionsBuilt") or 0}
	elseif what == "places" then
		local t = {}; for k in pairs(DEST) do t[#t + 1] = k end; table.sort(t); if game.ServerStorage.PropertyAPI:Invoke("home", p) then table.insert(t, 1, "My Home") end; return t
	elseif what == "go" then
		local d = DEST[arg]; if arg == "My Home" then d = game.ServerStorage.PropertyAPI:Invoke("home", p) end; if not d then return false end
		if lastTp[p] and os.clock() - lastTp[p] < 8 then return "wait" end
		local char = p.Character; local hum = char and char:FindFirstChildOfClass("Humanoid"); local r = char and char:FindFirstChild("HumanoidRootPart")
		if not r or (hum and hum.SeatPart) then return "seated" end
		lastTp[p] = os.clock(); r.CFrame = CFrame.new(d); return true
	elseif what == "job" then
		if not JOBS[arg] then return false end
		local ev = RS:FindFirstChild("ChooseJob"); p:SetAttribute("Job", arg)
		local ls = p:FindFirstChild("leaderstats"); if ls and ls:FindFirstChild("Job") then ls.Job.Value = arg end
		return true
	elseif what == "listings" then
		return game.ServerStorage.PropertyAPI:Invoke("list", p)
	elseif what == "buy" or what == "sell" then
		return game.ServerStorage.PropertyAPI:Invoke(what, p, arg)
	elseif what == "transfer" then
		local to = Players:FindFirstChild(tostring(arg)); local amt = tonumber(arg2)
		if not to or to == p or not amt then return "Player not found" end
		amt = math.floor(amt); if amt < 1 or amt > 100000 then return "Bad amount" end
		local a, b = money(p), money(to); if not a or not b or a.Value < amt then return "Not enough money" end
		if lastTp["tx" .. p.UserId] and os.clock() - lastTp["tx" .. p.UserId] < 5 then return "Wait a few seconds" end
		lastTp["tx" .. p.UserId] = os.clock()
		a.Value -= amt; b.Value += amt
		local sm = game.ServerStorage:FindFirstChild("SendPhoneMessage")
		if sm then sm:Fire(to, "Dream Bank", p.DisplayName .. " sent you $" .. amt); sm:Fire(p, "Dream Bank", "You sent $" .. amt .. " to " .. to.DisplayName) end
		return "Sent $" .. amt .. " to " .. to.DisplayName
	end
end

-- other scripts (taxi) can look up a destination
local placesApi = Instance.new("BindableFunction"); placesApi.Name = "PlacesAPI"; placesApi.Parent = game.ServerStorage
placesApi.OnInvoke = function(p, name)
	if name == "My Home" then return game.ServerStorage.PropertyAPI:Invoke("home", p) end
	return DEST[name]
end
