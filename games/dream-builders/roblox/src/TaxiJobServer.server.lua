-- Taxi Driver job: drive any car; AI passengers wave you down at kerbside spots around the city.
-- Stop next to them (within 14 studs, slow) to pick up, drive to their destination, get paid by distance + tip.
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local SPOTS = {
	{"Downtown plaza", Vector3.new(-120, 1.2, 732)}, {"Dream Realty Tower", Vector3.new(300, 1.2, 732)}, {"Spawn", Vector3.new(60, 1.2, 497)},
	{"Palm Beach", Vector3.new(417, 1.2, -150)}, {"Palm Hills", Vector3.new(-200, 1.2, -903)}, {"Airport", Vector3.new(-520, 1.2, 1408)},
	{"Dream City Academy", Vector3.new(250, 1.2, 1343)}, {"Palm Island", Vector3.new(1450, 2.6, -423)}, {"Show Villas", Vector3.new(-417, 1.2, 150)},
	{"Cargo Port", Vector3.new(743, 1.2, -1150)},
}
local holder = Instance.new("Model"); holder.Name = "TaxiFares"; holder.ModelStreamingMode = Enum.ModelStreamingMode.Persistent; holder.Parent = workspace
local fares = {} -- [player] = fare
local function driving(p)
	local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid"); local seat = hum and hum.SeatPart
	if seat and seat.Name == "DriverSeat" then return seat.Parent, seat end
end
local function clear(f) for _, x in ipairs(f.trash) do if x and x.Parent then x:Destroy() end end end
local function newFare(p)
	local a = SPOTS[math.random(#SPOTS)]; local b repeat b = SPOTS[math.random(#SPOTS)] until b ~= a
	local f = {from = a, to = b, stage = "pickup", trash = {}, t0 = os.clock()}
	local npc = K.spawn(CFrame.new(a[2]), {parent = holder, persistent = true})
	if not npc then return end
	f.npc = npc; table.insert(f.trash, npc)
	K.bubble(npc, "🚕 Taxi! To " .. b[1])
	table.insert(f.trash, K.marker(p, npc:FindFirstChild("Head"), "🙋 Passenger · " .. a[1], Color3.fromRGB(245, 195, 30)))
	K.msg(p, "Dream Taxi", "New fare at " .. a[1] .. " going to " .. b[1] .. ". Pull up next to them.")
	fares[p] = f
end
-- start / stop shifts from the phone-free way: any Taxi Driver who sits in a driver seat gets fares automatically
task.spawn(function()
	while true do
		task.wait(1)
		for _, p in ipairs(Players:GetPlayers()) do
			local car, seat = driving(p)
			local f = fares[p]
			if K.job(p) ~= "Taxi Driver" then if f then clear(f); fares[p] = nil end
			elseif car and not f then newFare(p)
			elseif f and car then
				local pos = seat.Position
				local speed = seat.AssemblyLinearVelocity.Magnitude
				if f.stage == "pickup" and f.npc.Parent and (pos - f.npc:GetPivot().Position).Magnitude < 16 and speed < 12 then
					f.stage = "ride"; f.npc:Destroy(); clear(f); f.trash = {}
					local pad = Instance.new("Part"); pad.Name = "Dropoff"; pad.Anchored = true; pad.CanCollide = false; pad.Shape = Enum.PartType.Cylinder; pad.Size = Vector3.new(0.3, 14, 14)
					pad.CFrame = CFrame.new(f.to[2]) * CFrame.Angles(0, 0, math.rad(90)); pad.Color = Color3.fromRGB(245, 195, 30); pad.Material = Enum.Material.Neon; pad.Transparency = 0.45; pad.Parent = holder
					table.insert(f.trash, pad); table.insert(f.trash, K.marker(p, pad, "🏁 Drop off · " .. f.to[1], Color3.fromRGB(40, 160, 90)))
					K.toast(p, "Passenger in! Drive to " .. f.to[1]); f.tRide = os.clock()
				elseif f.stage == "ride" and (Vector3.new(pos.X, 0, pos.Z) - Vector3.new(f.to[2].X, 0, f.to[2].Z)).Magnitude < 18 and speed < 12 then
					clear(f); fares[p] = nil
					local dist = (f.to[2] - f.from[2]).Magnitude
					local fare = 20 + math.floor(dist / 25)
					local tip = (os.clock() - f.tRide) < dist / 45 and math.floor(fare * 0.2) or 0
					K.pay(p, fare + tip, "taxi fare to " .. f.to[1] .. (tip > 0 and (" (+$" .. tip .. " fast-ride tip)") or ""))
					local out = K.spawn(CFrame.new(f.to[2] + Vector3.new(0, 0, 4)), {parent = holder}); if out then K.bubble(out, "Thanks, driver! 👋"); task.delay(4, function() if out.Parent then out:Destroy() end end) end
				end
			elseif f and not car and f.stage == "pickup" and os.clock() - f.t0 > 240 then clear(f); fares[p] = nil end
		end
	end
end)
Players.PlayerRemoving:Connect(function(p) local f = fares[p]; if f then clear(f); fares[p] = nil end end)
