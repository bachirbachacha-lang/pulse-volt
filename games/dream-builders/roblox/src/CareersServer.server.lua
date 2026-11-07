-- Jobs with AI clients: Real Estate Agent (Dream Realty reception), Car Dealer (Dream Motors kiosk), Fashion Designer (plaza pop-up).
-- One AI client at a time per player. Money is paid only here on the server.
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local db = workspace:WaitForChild("DreamBuilders")
local homes = db:WaitForChild("Homes")
local stations = db:WaitForChild("JobStations")
local active = {} -- [player] = true while they have a client
local function done(p) active[p] = nil end

---------------------------------------------------------------- Real Estate Agent
local desk = db.Downtown.Facades.Tower4.Interior.ReceptionTop
local rp1 = K.prompt(desk, "Get a client", "Dream Realty", 0.5, 12)
rp1.Triggered:Connect(function(p)
	if K.job(p) ~= "Real Estate Agent" then K.toast(p, "Pick the Real Estate Agent job first (Phone › Jobs)"); return end
	if active[p] then K.toast(p, "Finish with your current client first"); return end
	-- pick a villa nobody owns
	local list = {}
	for _, h in ipairs(homes:GetChildren()) do if h:IsA("Model") and (h.Name:find("^Villa_") or h.Name:find("^IslandVilla")) and not h:GetAttribute("OwnerId") and h:FindFirstChild("OwnerSign") then list[#list + 1] = h end end
	if #list == 0 then K.toast(p, "No villas for sale right now"); return end
	active[p] = true
	local villa = list[math.random(#list)]
	local sign = villa.OwnerSign
	local area = villa.Name:find("Island") and "Palm Island" or (villa.Name:find("Show") and "Show Villas" or "Palm Hills")
	local client = K.spawn(sign.CFrame * CFrame.new(0, -1, -5), {persistent = true})
	if not client then done(p); return end
	K.bubble(client, "Waiting for my agent 🏡")
	local mk = K.marker(p, client:FindFirstChild("Head"), "🏡 Your client · " .. area, Color3.fromRGB(150, 90, 200))
	K.msg(p, "Dream Realty", client.Name .. " wants to see a villa in " .. area .. ". Meet them at the villa (purple marker) and show it. Tip: Phone › Maps.")
	local shown = false
	local pp = K.prompt(client:FindFirstChild("HumanoidRootPart"), "Show the villa", client.Name, 3, 10)
	pp.Triggered:Connect(function(who)
		if who ~= p or shown then return end
		shown = true; pp:Destroy(); mk:Destroy()
		K.bubble(client, "Hmm… 🤔")
		task.wait(2)
		if math.random() < 0.6 then
			K.bubble(client, "I'll take it! 🎉", Color3.fromRGB(200, 255, 200))
			K.pay(p, 250, "commission: villa sale")
		else
			K.bubble(client, "I'll think about it", Color3.fromRGB(255, 230, 200))
			K.pay(p, 40, "showing fee")
		end
		task.wait(4); client:Destroy(); done(p)
	end)
	task.delay(180, function() if not shown then shown = true; if mk.Parent then mk:Destroy() end; if client.Parent then client:Destroy() end; done(p); K.toast(p, "Your client left (too slow)") end end)
end)

---------------------------------------------------------------- Car Dealer
local kiosk = stations.DreamMotorsKiosk.CounterTop
local WANTS = {
	{"Sport", "something fast for the weekend 🏎️", 220}, {"SUV", "a big car for my family 🚙", 180},
	{"Luxury", "something classy for business 💼", 260}, {"Starter", "my first cheap car 🚗", 80},
}
local cp = K.prompt(kiosk, "Get a buyer", "Dream Motors", 0.5, 12)
cp.Triggered:Connect(function(p)
	if K.job(p) ~= "Car Dealer" then K.toast(p, "Pick the Car Dealer job first (Phone › Jobs)"); return end
	if active[p] then K.toast(p, "Finish with your current buyer first"); return end
	active[p] = true
	local want = WANTS[math.random(#WANTS)]
	local buyer = K.spawn(kiosk.CFrame * CFrame.new(0, -2, -6), {})
	if not buyer then done(p); return end
	K.bubble(buyer, "I want " .. want[2])
	local tries, sold = 2, false
	local root = buyer:FindFirstChild("HumanoidRootPart")
	local pitches = {}
	for i, w in ipairs(WANTS) do
		local pr = K.prompt(root, "Pitch a " .. w[1] .. " car", buyer.Name, 0.8, 10)
		pr.UIOffset = Vector2.new(0, -55 * (i - 1)); pr.Exclusivity = Enum.ProximityPromptExclusivity.AlwaysShow
		pr.KeyboardKeyCode = ({Enum.KeyCode.One, Enum.KeyCode.Two, Enum.KeyCode.Three, Enum.KeyCode.Four})[i]
		pitches[#pitches + 1] = pr
		pr.Triggered:Connect(function(who)
			if who ~= p or sold or tries <= 0 then return end
			if w[1] == want[1] then
				sold = true; for _, x in ipairs(pitches) do x:Destroy() end
				K.bubble(buyer, "Perfect, I'll buy it! 🔑", Color3.fromRGB(200, 255, 200))
				K.pay(p, want[3], "car sold (" .. want[1] .. ")")
				task.wait(4); buyer:Destroy(); done(p)
			else
				tries -= 1
				if tries <= 0 then
					sold = true; for _, x in ipairs(pitches) do x:Destroy() end
					K.bubble(buyer, "Not what I wanted, bye 👋", Color3.fromRGB(255, 200, 200)); task.wait(3); buyer:Destroy(); done(p)
				else K.bubble(buyer, "Hmm, not really… I want " .. want[2]) end
			end
		end)
	end
	task.delay(120, function() if not sold and buyer.Parent then sold = true; buyer:Destroy(); done(p) end end)
end)

---------------------------------------------------------------- Fashion Designer
local FM = stations.FashionPopUp
local STYLES = {"Gold silk tee", "Desert linen shirt", "Midnight hoodie", "Palm print dress", "Marina jacket", "Sunset abaya", "Street cap", "Pearl evening dress"}
local stock = {} -- [player] = {items}
local dp = K.prompt(FM.DesignTable, "Design an outfit", "Design table", 3, 10)
dp.Triggered:Connect(function(p)
	if K.job(p) ~= "Fashion Designer" then K.toast(p, "Pick the Fashion Designer job first (Phone › Jobs)"); return end
	stock[p] = stock[p] or {}
	if #stock[p] >= 5 then K.toast(p, "Your rail is full (5). Sell some at the stall"); return end
	local item = STYLES[math.random(#STYLES)]
	table.insert(stock[p], item)
	K.toast(p, "✂️ You designed: " .. item .. " (" .. #stock[p] .. " in stock)")
end)
local stallOwner, shopper = nil, nil
local sp = K.prompt(FM.StallCounter, "Open your stall", "Pop-up fashion", 0.5, 10)
sp.Triggered:Connect(function(p)
	if K.job(p) ~= "Fashion Designer" then K.toast(p, "Pick the Fashion Designer job first"); return end
	if stallOwner and stallOwner ~= p and stallOwner.Parent then K.toast(p, "The stall is busy, try again soon"); return end
	if stallOwner == p then stallOwner = nil; sp.ActionText = "Open your stall"; K.toast(p, "Stall closed"); return end
	if not stock[p] or #stock[p] == 0 then K.toast(p, "Design some outfits at the table first"); return end
	stallOwner = p; sp.ActionText = "Close your stall"; K.toast(p, "🛍️ Stall open! Shoppers are coming")
end)
task.spawn(function()
	while true do
		task.wait(10)
		local p = stallOwner
		if p and p.Parent and stock[p] and #stock[p] > 0 and not shopper then
			local m = K.spawn(FM.StallCounter.CFrame * CFrame.new(0, -1, -12), {})
			if m then
				shopper = m
				K.walk(m, (FM.StallCounter.CFrame * CFrame.new(0, 0, -3.5)).Position, 8)
				local item = stock[p][1]
				local price = math.random(35, 70)
				K.bubble(m, "Love the " .. item .. "! 😍")
				local sold = false
				local pr = K.prompt(m:FindFirstChild("HumanoidRootPart"), "Sell for $" .. price, item, 0.5, 10)
				pr.Triggered:Connect(function(who)
					if who ~= p or sold then return end
					sold = true; pr:Destroy()
					table.remove(stock[p], 1)
					K.pay(p, price, "sold " .. item)
					K.bubble(m, "Thank you! 🛍️", Color3.fromRGB(200, 255, 200))
					task.wait(3); m:Destroy(); shopper = nil
					if #stock[p] == 0 then stallOwner = nil; sp.ActionText = "Open your stall"; K.toast(p, "Sold out! Design more at the table") end
				end)
				task.delay(40, function() if not sold and m.Parent then sold = true; m:Destroy(); shopper = nil end end)
			end
		end
	end
end)
Players.PlayerRemoving:Connect(function(p) active[p] = nil; stock[p] = nil; if stallOwner == p then stallOwner = nil; sp.ActionText = "Open your stall" end end)
