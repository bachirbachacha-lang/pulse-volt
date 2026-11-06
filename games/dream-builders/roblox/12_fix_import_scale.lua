-- Run BEFORE 10_cars_all.lua when Import 3D brings the cars in ~100x too big (parts near the 2048-stud limit).
-- Rescales every part uniformly from MeshSize so long trucks keep their shape.
local LEN = {Hypercar=16,LuxurySedan=18.5,OffroadSUV=17.4,Pickup=21,MuscleCar=17.8,EverydaySedan=17,BigSUV=20,StarterCar=15.3,ClassicCar=17.8,GTSedan=17.8,FlatbedTruck=28,MixerTruck=32,Forklift=12.5,Excavator=34}
local seen = {}
for _, m in ipairs(workspace:GetChildren()) do
	local n = m.Name:gsub("^%s+", ""):gsub("%s+$", "")
	if m:IsA("Model") and LEN[n] and not m:FindFirstChild("Chassis") then
		if seen[n] then m:Destroy() else
			seen[n] = true
			local parts, k, best = {}, 1, math.huge
			for _, d in ipairs(m:GetDescendants()) do if d:IsA("MeshPart") then table.insert(parts, d) end end
			for _, p in ipairs(parts) do local s = math.max(p.Size.X, p.Size.Y, p.Size.Z) if s < best and p.MeshSize.Magnitude > 0 then best = s; k = p.Size.X / p.MeshSize.X end end
			local piv, trueLen = m:GetPivot().Position, 0
			for _, p in ipairs(parts) do trueLen = math.max(trueLen, math.abs((p.Position - piv).Z) + p.MeshSize.Z * k / 2) end
			local f = LEN[n] / (trueLen * 2)
			for _, p in ipairs(parts) do
				local rel = p.Position - piv
				p.Size = p.MeshSize * k * f
				p.CFrame = CFrame.new(piv + rel * f) * (p.CFrame - p.CFrame.Position)
			end
		end
	end
end
print("import scale fixed")
