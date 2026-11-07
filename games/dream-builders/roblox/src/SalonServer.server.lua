-- Hair Stylist job: open the plaza salon chair; AI customers sit down and ask for a style; hold to cut; get paid.
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local H = workspace:WaitForChild("DreamBuilders"):WaitForChild("JobStations"):WaitForChild("SalonChair")
local seat = H:WaitForChild("Chair")
local STYLES = {{"✂️ Skin fade", 30}, {"💇 Long layers", 35}, {"🧔 Beard trim", 20}, {"✨ Blow-dry", 25}, {"💈 Classic cut", 28}}
local stylist, customer = nil, nil
local op = K.prompt(H.Counter, "Open salon chair", "Plaza salon", 0.5, 10)
op.Triggered:Connect(function(p)
	if K.job(p) ~= "Hair Stylist" then K.toast(p, "Pick the Hair Stylist job first (Phone › Jobs)"); return end
	if stylist == p then stylist = nil; op.ActionText = "Open salon chair"; K.toast(p, "Salon closed"); return end
	if stylist and stylist.Parent then K.toast(p, "Another stylist is working here"); return end
	stylist = p; op.ActionText = "Close salon chair"; K.toast(p, "💈 Salon open! Customers are coming")
end)
task.spawn(function()
	while true do
		task.wait(8)
		local p = stylist
		if p and p.Parent and not customer then
			local m, hum = K.spawn(seat.CFrame * CFrame.new(0, 0, 14), {})
			if m then
				customer = m
				K.walk(m, seat.Position, 10)
				if m.Parent then seat:Sit(hum) end
				local style = STYLES[math.random(#STYLES)]
				K.bubble(m, style[1] .. " please!")
				local done = false
				local pr = K.prompt(seat, "Cut hair (" .. style[1] .. ")", m.Name, 4, 9)
				pr.Triggered:Connect(function(who)
					if who ~= p or done then return end
					done = true; pr:Destroy()
					local tip = math.random(0, 2) == 0 and math.random(5, 12) or 0
					K.pay(p, style[2] + tip, "haircut" .. (tip > 0 and (" +$" .. tip .. " tip") or ""))
					K.bubble(m, "Looks amazing! 😍", Color3.fromRGB(200, 255, 200))
					task.wait(3); hum.Sit = false; task.wait(0.4); K.walk(m, (seat.CFrame * CFrame.new(0, 0, 20)).Position, 6); m:Destroy(); customer = nil
				end)
				task.delay(60, function() if not done and m.Parent then done = true; if pr.Parent then pr:Destroy() end; hum.Sit = false; m:Destroy(); customer = nil end end)
			end
		end
	end
end)
Players.PlayerRemoving:Connect(function(p) if stylist == p then stylist = nil; op.ActionText = "Open salon chair" end end)
