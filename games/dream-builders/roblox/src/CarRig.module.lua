local M = {}
function M.rig(m, name, LEN, topSpeed)
	for _, p in ipairs(m:GetDescendants()) do if p:IsA("BasePart") then p.Anchored = true; p.Parent = m end end
	for _, d in ipairs(m:GetChildren()) do if d:IsA("Model") then d:Destroy() end end
	local e = m:GetExtentsSize(); local longest = math.max(e.X, e.Z)
	m:ScaleTo(m:GetScale() * LEN / longest)
	local wheels, lights = {}, nil
	for _, p in ipairs(m:GetChildren()) do
		if p:IsA("BasePart") then
			local n = p.Name:lower()
			if n:find("wheel") and not n:find("middle") and not n:find("steering") then table.insert(wheels, p)
			elseif n:find("body") then p.Name = "Body_Paint"
			elseif n:find("window") then p.Name = "Glass"
			elseif n:find("head") then p.Name = "LightsFront"; lights = p
			elseif n:find("tail") then p.Name = "LightsRear"
			else p.Name = "Body_Extra" end
		end
	end
	if #wheels < 4 then return nil, "need 4 wheels, got " .. #wheels end
	-- long axis = direction of biggest wheel spread; front = the end nearer the headlights (or the windscreen)
	local c = Vector3.zero; for _, w in ipairs(wheels) do c += w.Position end; c /= #wheels
	local ext = m:GetExtentsSize()
	local axis = (ext.X >= ext.Z) and Vector3.xAxis or Vector3.zAxis
	local ref = lights or m:FindFirstChild("Glass")
	if ref and (ref.Position - c):Dot(axis) < 0 then axis = -axis end
	if m:GetAttribute("FlipFront") then axis = -axis end
	local fwd = axis
	local up = Vector3.yAxis
	local lat = up:Cross(fwd)
	table.sort(wheels, function(x, y) return (x.Position - c):Dot(fwd) > (y.Position - c):Dot(fwd) end)
	local W = {}
	local fr, rr_ = {wheels[1], wheels[2]}, {wheels[#wheels - 1], wheels[#wheels]}
	for _, pair in ipairs({{fr, "F"}, {rr_, "R"}}) do
		local p1, p2 = pair[1][1], pair[1][2]
		if (p1.Position - c):Dot(lat) < (p2.Position - c):Dot(lat) then p1, p2 = p2, p1 end
		W[pair[2] .. "L"] = p1; W[pair[2] .. "R"] = p2
	end
	for i = 3, #wheels - 2 do wheels[i].Name = "Body_Wheel" end
	for k, w in pairs(W) do w.Name = "Wheel_" .. k .. "_tyre" end
	local cF, cR = (W.FL.Position + W.FR.Position) / 2, (W.RL.Position + W.RR.Position) / 2
	local mid = (cF + cR) / 2
	local r = math.max(W.FL.Size.Y, W.RL.Size.Y) / 2
	local ch = Instance.new("Part"); ch.Name = "Chassis"; ch.Size = Vector3.new(LEN * 0.35, 1, LEN * 0.7)
	ch.CFrame = CFrame.lookAt(mid + Vector3.new(0, 0.6, 0), mid + Vector3.new(0, 0.6, 0) + fwd)
	ch.Transparency = 1; ch.Anchored = true; ch.CanCollide = true; ch.CustomPhysicalProperties = PhysicalProperties.new(2, 0.2, 0.1); ch.Parent = m
	m.PrimaryPart = ch; ch:SetAttribute("TopSpeed", topSpeed)
	for _, p in ipairs(m:GetChildren()) do
		if p:IsA("BasePart") and p ~= ch then
			p.CanCollide = false; p.Massless = true
			if not p.Name:match("^Wheel_") then local w = Instance.new("WeldConstraint"); w.Part0 = ch; w.Part1 = p; w.Parent = p end
		end
	end
	for key, wh in pairs(W) do
		local pos = wh.Position; local rr = wh.Size.Y / 2
		local col = Instance.new("Part"); col.Name = "Collider_" .. key; col.Shape = Enum.PartType.Ball
		col.Size = Vector3.new(rr * 2, rr * 2, rr * 2); col.CFrame = CFrame.new(pos); col.Transparency = 1; col.Anchored = true
		col.CanCollide = true; col.CustomPhysicalProperties = PhysicalProperties.new(1, 0, 0, 100, 1); col.Parent = m
		local w = Instance.new("WeldConstraint"); w.Part0 = ch; w.Part1 = col; w.Parent = col
		local mo = Instance.new("Motor6D"); mo.Name = "Spin_" .. key; mo.Part0 = ch; mo.Part1 = wh
		local frame = CFrame.new(pos) * (ch.CFrame - ch.CFrame.Position)
		mo.C0 = ch.CFrame:ToObjectSpace(frame); mo.C1 = wh.CFrame:ToObjectSpace(frame)
		mo:SetAttribute("Front", key:sub(1, 1) == "F"); mo:SetAttribute("Radius", rr); mo.Parent = ch
	end
	local groundY = mid.Y - r
	local seatPos = mid + lat * LEN * 0.07 - fwd * LEN * 0.04
	seatPos = Vector3.new(seatPos.X, groundY + 1.0, seatPos.Z)
	local seat = Instance.new("VehicleSeat"); seat.Name = "DriverSeat"; seat.Size = Vector3.new(2, 0.4, 2); seat.Transparency = 1
	seat.CanCollide = false; seat.CFrame = CFrame.lookAt(seatPos, seatPos + fwd); seat.Anchored = true; seat.MaxSpeed = 0; seat.Torque = 0; seat.Parent = m
	local ws = Instance.new("WeldConstraint"); ws.Part0 = ch; ws.Part1 = seat; ws.Parent = seat
	seat:SetAttribute("TopSpeed", topSpeed); seat:SetAttribute("WheelRadius", r)
	local function ip(nm, size, cf, col, mat, shape)
		local p = Instance.new("Part"); p.Name = "Interior_" .. nm; p.Size = size; p.CFrame = cf; p.Color = col
		p.Material = mat or Enum.Material.SmoothPlastic; p.Anchored = true; p.CanCollide = false; p.Massless = true; p.CastShadow = false
		if shape then p.Shape = shape end
		p.Parent = m; local w = Instance.new("WeldConstraint"); w.Part0 = ch; w.Part1 = p; w.Parent = p
	end
	local LEATHER, DASH = Color3.fromRGB(150, 110, 70), Color3.fromRGB(28, 26, 28)
	for _, side in ipairs({0, 1}) do
		local sp = seatPos - lat * LEN * 0.14 * side
		local b = CFrame.lookAt(sp, sp + fwd)
		ip("Seat" .. side, Vector3.new(2.1, 0.6, 2.1), b * CFrame.new(0, -0.45, 0), LEATHER, Enum.Material.Leather)
		ip("Back" .. side, Vector3.new(2.1, 2.6, 0.5), b * CFrame.new(0, 0.95, 1.15) * CFrame.Angles(math.rad(-14), 0, 0), LEATHER, Enum.Material.Leather)
	end
	local m2 = seatPos - lat * LEN * 0.07
	ip("Dash", Vector3.new(LEN * 0.2, 1.0, 1.3), CFrame.lookAt(m2, m2 + fwd) * CFrame.new(0, 1.2, -3.0), DASH)
	ip("Wheel", Vector3.new(0.25, 1.4, 1.4), CFrame.lookAt(seatPos, seatPos + fwd) * CFrame.new(0, 1.5, -2.1) * CFrame.Angles(0, math.rad(90), 0) * CFrame.Angles(0, 0, math.rad(-20)), Color3.fromRGB(20, 20, 22), nil, Enum.PartType.Cylinder)
	m.Name = name; m.WorldPivot = ch.CFrame
	return m
end
function M.swap(gen, name, LEN, topSpeed)
	local old = workspace:FindFirstChild(name)
	local spot = old and old:FindFirstChild("Chassis") and old.Chassis.CFrame
	local car, err = M.rig(gen, name .. "_new", LEN, topSpeed)
	if not car then return nil, err end
	if old then
		local bk = game.ServerStorage:FindFirstChild("CarBackups") or Instance.new("Folder"); bk.Name = "CarBackups"; bk.Parent = game.ServerStorage
		old.Name = name .. "_AIold"; old.Parent = bk
	end
	car.Name = name
	if spot then
		local rp = RaycastParams.new(); rp.FilterDescendantsInstances = {car}
		local ray = workspace:Raycast(spot.Position + Vector3.new(0, 100, 0), Vector3.new(0, -300, 0), rp)
		local cfb, size = car:GetBoundingBox()
		local lift = car:GetPivot().Position.Y - (cfb.Position.Y - size.Y / 2)
		local look = Vector3.new(spot.LookVector.X, 0, spot.LookVector.Z).Unit
		local p = Vector3.new(spot.Position.X, (ray and ray.Position.Y or 0) + lift + 0.05, spot.Position.Z)
		car:PivotTo(CFrame.lookAt(p, p + look))
	end
	return car
end
return M
