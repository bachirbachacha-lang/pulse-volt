-- ServerScriptService.MetroServer: ticket gate prompt at each station rides you to the next station's street exit.
local metro = workspace:WaitForChild("DreamBuilders"):WaitForChild("Metro")
local gates = {}
for _, s in ipairs(metro:GetChildren()) do local g = s:FindFirstChild("TicketGate"); if g then table.insert(gates, g) end end
table.sort(gates, function(a, b) return a.Position.X < b.Position.X end)
local busy = {}
for i, g in ipairs(gates) do
	local pr = g:FindFirstChild("RideMetro")
	local nxt = gates[i % #gates + 1]
	pr.ActionText = "Ride to " .. nxt:GetAttribute("Station")
	pr.Triggered:Connect(function(plr)
		if busy[plr] then return end
		busy[plr] = true
		local char = plr.Character; local root = char and char:FindFirstChild("HumanoidRootPart")
		if root then root.CFrame = nxt.CFrame * CFrame.new(0, 3, -7) end
		task.wait(2); busy[plr] = nil
	end)
end
