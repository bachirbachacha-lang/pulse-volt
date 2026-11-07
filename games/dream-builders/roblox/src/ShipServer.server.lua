-- Cargo ship: board from the quay, move between crew deck and bridge, go ashore.
local port = workspace:WaitForChild("DreamBuilders"):WaitForChild("CargoPort")
local ship = port:WaitForChild("CargoShip")
local inside = ship:WaitForChild("ShipInside")
local crew, bridge = inside:WaitForChild("CrewSpot"), inside:WaitForChild("BridgeSpot")
local board = port:WaitForChild("BoardShip")
local function tp(plr, cf)
	local r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
	local h = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
	if not r or not h then return end
	if h.SeatPart then
		-- stand up first; moving a seated player would drag the (anchored) seat along
		local seat = h.SeatPart
		h.Sit = false
		local t0 = os.clock()
		while (h.SeatPart or seat:FindFirstChild("SeatWeld")) and os.clock() - t0 < 1.5 do task.wait(0.05) end
		local w = seat:FindFirstChild("SeatWeld"); if w then w:Destroy() end
		task.wait(0.05)
	end
	r.CFrame = cf
end
board.Go.Triggered:Connect(function(p) tp(p, crew.CFrame) end)
inside.ToBridge.Go.Triggered:Connect(function(p) tp(p, bridge.CFrame) end)
inside.ToCrew.Go.Triggered:Connect(function(p) tp(p, crew.CFrame) end)
inside.ToQuay.Go.Triggered:Connect(function(p) tp(p, board.CFrame * CFrame.new(0, 0, -5)) end)
