-- Lighting presets (sunrise, morning, midday, golden hour, sunset, night) blended by ClockTime,
-- plus weather (clear, cloudy, rain, fog, storm) that changes every few minutes. Lighting.Weather is read by WeatherFX on clients.
local L = game:GetService("Lighting")
local atm = L:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere", L)
local cc = L:FindFirstChildOfClass("ColorCorrectionEffect") or Instance.new("ColorCorrectionEffect", L)
local bloom = L:FindFirstChildOfClass("BloomEffect") or Instance.new("BloomEffect", L)
local clouds = workspace.Terrain:FindFirstChildOfClass("Clouds") or Instance.new("Clouds", workspace.Terrain)
local C = Color3.fromRGB
-- {hour, ambient, outdoor, atm color, atm decay, density, haze, tint, contrast, saturation, brightness}
local P = {
	{0,   C(40, 44, 70),  C(70, 80, 120), C(60, 70, 110), C(30, 30, 60),  0.32, 0.5, C(200, 210, 255), 0.12, 0.05, 1.2},
	{5.5, C(90, 70, 70),  C(170, 120, 110), C(230, 170, 140), C(120, 90, 110), 0.34, 1.6, C(255, 225, 210), 0.08, 0.10, 1.8},
	{8,   C(110, 105, 100), C(170, 165, 160), C(200, 215, 230), C(140, 150, 170), 0.28, 1.0, C(255, 250, 245), 0.06, 0.06, 2.6},
	{12.5,C(120, 120, 118), C(175, 175, 170), C(205, 220, 235), C(150, 165, 185), 0.26, 0.8, C(255, 255, 255), 0.06, 0.04, 3.0},
	{17,  C(110, 85, 70), C(190, 150, 115), C(240, 190, 140), C(150, 100, 80), 0.32, 1.8, C(255, 236, 214), 0.10, 0.12, 2.6},
	{19,  C(90, 60, 60),  C(160, 105, 95), C(230, 140, 120), C(110, 70, 90), 0.36, 2.2, C(255, 220, 205), 0.12, 0.14, 1.9},
	{21,  C(45, 48, 75),  C(80, 85, 125), C(70, 80, 120), C(35, 35, 70), 0.33, 0.7, C(205, 212, 255), 0.12, 0.05, 1.3},
	{24,  C(40, 44, 70),  C(70, 80, 120), C(60, 70, 110), C(30, 30, 60),  0.32, 0.5, C(200, 210, 255), 0.12, 0.05, 1.2},
}
local W = {
	Clear  = {cover = 0.35, dens = 0, haze = 0, dim = 1.0},
	Cloudy = {cover = 0.75, dens = 0.04, haze = 0.6, dim = 0.85},
	Rain   = {cover = 0.9, dens = 0.10, haze = 1.4, dim = 0.7},
	Fog    = {cover = 0.6, dens = 0.30, haze = 3.0, dim = 0.8},
	Storm  = {cover = 0.95, dens = 0.14, haze = 1.8, dim = 0.55},
}
local ORDER = {"Clear", "Clear", "Clear", "Cloudy", "Clear", "Rain", "Cloudy", "Clear", "Fog", "Clear", "Storm", "Cloudy"}
local wcur, wtarget = W.Clear, W.Clear
local mix = 1
L:SetAttribute("Weather", "Clear")
task.spawn(function()
	local i = 0
	while true do
		task.wait(math.random(150, 300))
		i = i % #ORDER + 1
		local name = ORDER[i]
		L:SetAttribute("Weather", name); wcur = {cover = clouds.Cover, dens = 0, haze = 0, dim = 1}; wtarget = W[name]; mix = 0
	end
end)
local function lerp(a, b, t) return a + (b - a) * t end
while true do
	local dt = task.wait(0.5)
	mix = math.min(1, mix + dt / 20)
	local h = L.ClockTime
	local a, b = P[1], P[2]
	for k = 1, #P - 1 do if h >= P[k][1] and h < P[k + 1][1] then a, b = P[k], P[k + 1] end end
	local t = (h - a[1]) / math.max(0.01, b[1] - a[1])
	local w = W[L:GetAttribute("Weather")] or W.Clear
	L.Ambient = a[2]:Lerp(b[2], t)
	L.OutdoorAmbient = a[3]:Lerp(b[3], t):Lerp(C(120, 125, 135), 1 - w.dim)
	atm.Color = a[4]:Lerp(b[4], t); atm.Decay = a[5]:Lerp(b[5], t)
	atm.Density = lerp(a[6], b[6], t) + w.dens * mix; atm.Haze = lerp(a[7], b[7], t) + w.haze * mix; atm.Offset = 0.15
	cc.TintColor = a[8]:Lerp(b[8], t):Lerp(C(215, 222, 232), (1 - w.dim) * mix)
	cc.Contrast = lerp(a[9], b[9], t); cc.Saturation = lerp(a[10], b[10], t) - (1 - w.dim) * 0.25 * mix
	L.Brightness = lerp(a[11], b[11], t) * (1 - (1 - w.dim) * mix)
	bloom.Intensity = 0.35; bloom.Threshold = 1.6; bloom.Size = 20
	clouds.Cover = lerp(clouds.Cover, w.cover, 0.02); clouds.Density = 0.6
end
