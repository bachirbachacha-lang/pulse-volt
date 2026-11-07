-- Dream City Hospital: AI patients check in and wait; a Doctor calls the next patient to a bay and treats them (paid).
-- Any player can get a free check-up at reception (heals to full). At most 3 AI patients at once.
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local H = workspace:WaitForChild("DreamBuilders"):WaitForChild("Hospital")
local reception = H:WaitForChild("Reception")
local seats, beds = {}, {}
for _, d in ipairs(H:GetChildren()) do if d.Name == "WaitSeat" then seats[#seats + 1] = d elseif d:GetAttribute("Bay") then beds[d:GetAttribute("Bay")] = d end end
local SYMPTOMS = {"🤒 Fever", "🤕 Headache", "🦵 Sprained ankle", "🤧 Bad cold", "😵 Feeling dizzy", "🩹 Small cut"}
local waiting, inBay = {}, {} -- waiting = list of {m, hum, seat, symptom}; inBay[bay] = patient
local entrance = H.Floor.CFrame * CFrame.new(0, 3, -32)
local function onDuty() for _, p in ipairs(Players:GetPlayers()) do if K.job(p) == "Doctor" then return true end end; return false end
task.spawn(function()
	while true do
		task.wait(onDuty() and 12 or 30)
		local count = #waiting; for _ in pairs(inBay) do count += 1 end
		if count < 3 then
			local free; for _, st in ipairs(seats) do if not st.Occupant then free = st; break end end
			if free then
				local m, hum = K.spawn(entrance, {parent = H})
				if m then
					local pt = {m = m, hum = hum, symptom = SYMPTOMS[math.random(#SYMPTOMS)]}
					K.bubble(m, pt.symptom)
					K.walk(m, free.Position, 12); if m.Parent then free:Sit(hum) end
					pt.seat = free; table.insert(waiting, pt)
				end
			end
		end
	end
end)
-- reception: doctor calls the next patient; anyone can get a check-up
local call = K.prompt(reception, "Call next patient", "Doctor", 0.5, 12)
call.Triggered:Connect(function(p)
	if K.job(p) ~= "Doctor" then K.toast(p, "Pick the Doctor job first (Phone › Jobs)"); return end
	local pt = table.remove(waiting, 1)
	if not pt then K.toast(p, "No patients waiting right now"); return end
	local bay; for i = 1, #beds do if not inBay[i] then bay = i; break end end
	if not bay then table.insert(waiting, 1, pt); K.toast(p, "All bays are busy"); return end
	inBay[bay] = pt
	pt.hum.Sit = false; task.wait(0.3)
	local bed = beds[bay]
	if pt.m.Parent then pt.m:PivotTo(bed.CFrame * CFrame.new(0, 3, 0) * CFrame.Angles(math.rad(-90), 0, 0)); for _, x in ipairs(pt.m:GetDescendants()) do if x:IsA("BasePart") then x.Anchored = true end end end
	K.toast(p, "Patient (" .. pt.symptom .. ") is in BAY " .. bay)
	local mk = K.marker(p, bed, "🩺 Treat · Bay " .. bay, Color3.fromRGB(40, 160, 90))
	local tr = K.prompt(bed, "Treat patient", pt.symptom, 4, 10)
	tr.Triggered:Connect(function(who)
		if who ~= p then return end
		tr:Destroy(); mk:Destroy(); inBay[bay] = nil
		local tip = math.random(0, 2) == 0 and math.random(5, 15) or 0
		K.pay(p, 35 + tip, "patient treated" .. (tip > 0 and (" (+$" .. tip .. " thank-you)") or ""))
		K.bubble(pt.m, "Thank you, doctor! 😊", Color3.fromRGB(200, 255, 200))
		task.wait(3); if pt.m.Parent then pt.m:Destroy() end
	end)
	task.delay(180, function() if inBay[bay] == pt then inBay[bay] = nil; if tr.Parent then tr:Destroy() end; if mk.Parent then mk:Destroy() end; if pt.m.Parent then pt.m:Destroy() end end end)
end)
local check = K.prompt(reception, "Free check-up", "Reception", 1.5, 12); check.UIOffset = Vector2.new(0, 60); check.KeyboardKeyCode = Enum.KeyCode.F
check.Triggered:Connect(function(p)
	local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid"); if hum then hum.Health = hum.MaxHealth end
	K.toast(p, "✚ You're healthy! Have a great day")
end)
