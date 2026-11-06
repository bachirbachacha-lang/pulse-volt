-- Dream Builders: finish every imported AI vehicle at once (run after Import 3D of the FBX files).
-- Parks them in a row by the spawn. Re-running replaces cars that were imported again.
local H = game:GetService("HttpService")
local COMMIT = rawget(_G, "DB_COMMIT") or "main"
local src = H:GetAsync("https://raw.githubusercontent.com/bachirbachacha-lang/pulse-volt/" .. COMMIT .. "/games/dream-builders/roblox/09_place_car.lua")
local run = loadstring(src)
local C = Color3.fromRGB
local CARS = {
	{"Hypercar", 16, C(18, 34, 120), 120},
	{"LuxurySedan", 18.5, C(175, 160, 140), 95},
	{"OffroadSUV", 17.4, C(25, 25, 28), 85},
	{"Pickup", 21, C(170, 80, 30), 80},
	{"MuscleCar", 17.8, C(180, 20, 20), 105},
	{"EverydaySedan", 17, C(215, 215, 215), 80},
	{"BigSUV", 20, C(225, 225, 228), 80},
	{"StarterCar", 15.3, C(140, 170, 150), 55},
	{"ClassicCar", 17.8, C(30, 120, 120), 75},
	{"GTSedan", 17.8, C(70, 72, 78), 110},
	{"FlatbedTruck", 28, C(235, 235, 235), 60},
	{"MixerTruck", 32, C(235, 235, 235), 50},
	{"Forklift", 12.5, C(235, 190, 20), 30},
}
local spawnL = workspace:FindFirstChildWhichIsA("SpawnLocation", true)
local base = (spawnL and spawnL.Position or Vector3.zero) + Vector3.new(0, 0, -39) -- showroom row facing the spawn
local x = -110
for i, c in ipairs(CARS) do
	local name, len, paint, speed = c[1], c[2], c[3], c[4]
	_G.CAR_NAME, _G.CAR_LEN, _G.CAR_PAINT, _G.CAR_SPEED = name, len, paint, speed
	local w = (len > 22) and 18 or 14
	_G.CAR_POS = base + Vector3.new(x + w / 2, 0, 0); _G.CAR_YAW = 180
	local found = false
	for _, m in ipairs(workspace:GetChildren()) do
		if m:IsA("Model") and not m:FindFirstChild("Chassis") and (m.Name:gsub("^%s+", ""):gsub("_AI", ""):gsub("%s+$", "")) == name then found = true end
	end
	if found then
		local ok, err = pcall(run)
		print(ok and ("OK  " .. name) or ("ERR " .. name .. ": " .. tostring(err)))
	end
	x += w
	for _, k in ipairs({"CAR_NAME", "CAR_LEN", "CAR_PAINT", "CAR_SPEED", "CAR_POS", "CAR_YAW"}) do _G[k] = nil end
end
-- the static excavator (no wheels yet): paint + anchor only
local ex
for _, m in ipairs(workspace:GetChildren()) do
	if m:IsA("Model") and (m.Name:gsub("^%s+", ""):gsub("%s+$", "")) == "Excavator" then ex = m end
end
if ex then
	local e = ex:GetExtentsSize(); local l = math.max(e.X, e.Z); if math.abs(l - 34) > 0.5 then ex:ScaleTo(ex:GetScale() * 34 / l) end
	for _, p in ipairs(ex:GetDescendants()) do
		if p:IsA("BasePart") then
			p.Anchored = true
			if p:IsA("MeshPart") then p.TextureID = "" end
			if p.Name == "Body_Paint" then p.Color = C(230, 180, 20); p.Material = Enum.Material.SmoothPlastic
			elseif p.Name == "Glass" then p.Color = C(20, 24, 30); p.Material = Enum.Material.Glass; p.Transparency = 0.3
			else p.Color = C(30, 30, 32); p.Material = Enum.Material.SmoothPlastic end
		end
	end
	ex:PivotTo(CFrame.new(base + Vector3.new(x + 10, ex:GetExtentsSize().Y / 2, 0)))
	print("OK  Excavator (parked, not drivable yet)")
end
print("All cars done")
