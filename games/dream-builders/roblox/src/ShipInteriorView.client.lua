-- When you're inside the cargo ship's rooms, hide the ship's outer mesh (it would poke through the walls)
-- and show the simple deck instead. Outside, it's the other way round.
local plr = game:GetService("Players").LocalPlayer
local function get()
	local db = workspace:FindFirstChild("DreamBuilders"); local port = db and db:FindFirstChild("CargoPort")
	local ship = port and port:FindFirstChild("CargoShip"); local ins = ship and ship:FindFirstChild("ShipInside")
	return ship, ins
end
local inside = nil
while true do
	task.wait(0.2)
	local ship, ins = get()
	local char = plr.Character; local r = char and char:FindFirstChild("HumanoidRootPart")
	if ship and ins and r then
		local cf, size = ins:GetBoundingBox()
		local l = cf:PointToObjectSpace(r.Position)
		local now = math.abs(l.X) < size.X / 2 and math.abs(l.Z) < size.Z / 2 and r.Position.Y > 75 and r.Position.Y < cf.Position.Y + size.Y / 2 + 4
		if now ~= inside then
			inside = now
			for _, p in ipairs(ship:GetChildren()) do if p:IsA("BasePart") or p:IsA("Model") then for _, q in ipairs(p:IsA("Model") and p:GetDescendants() or {p}) do if q:IsA("BasePart") and q.Parent ~= ins then q.LocalTransparencyModifier = now and 1 or 0 end end end end
			for _, n in ipairs({"DeckCollider", "TowerCollider"}) do local p = ins:FindFirstChild(n); if p then p.LocalTransparencyModifier = now and 0 or 1 end end
		end
	end
end
