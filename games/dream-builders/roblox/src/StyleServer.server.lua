-- Style: change shirt / trousers / skin colours (this removes your Roblox clothing in this game only), save 3 outfits,
-- or reset to your own Roblox avatar. Colours come from fixed palettes checked here. Saved: DataStore "DreamOutfits_v1".
local Players, RS, DSS = game:GetService("Players"), game:GetService("ReplicatedStorage"), game:GetService("DataStoreService")
local rf = RS:FindFirstChild("StyleRequest") or Instance.new("RemoteFunction"); rf.Name = "StyleRequest"; rf.Parent = RS
local okS, store = pcall(function() return DSS:GetDataStore("DreamOutfits_v1") end); if not okS then store = nil end
local C = Color3.fromRGB
local PAL = {
	shirt = {C(245, 245, 245), C(25, 26, 30), C(30, 60, 120), C(150, 30, 40), C(212, 170, 90), C(60, 130, 80), C(230, 150, 180), C(120, 90, 170), C(240, 140, 40)},
	pants = {C(25, 26, 30), C(40, 50, 80), C(200, 190, 170), C(245, 245, 245), C(90, 60, 40), C(110, 110, 115)},
	skin = {C(255, 224, 189), C(234, 192, 134), C(198, 134, 66), C(141, 85, 36), C(92, 56, 32), C(255, 205, 170)},
}
local saved, last = {}, {}
local function apply(p, o)
	local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid"); if not hum then return false end
	local d = hum:GetAppliedDescription()
	d.Shirt = 0; d.Pants = 0; d.GraphicTShirt = 0
	local sh, pa, sk = PAL.shirt[o.shirt], PAL.pants[o.pants], PAL.skin[o.skin]
	if not (sh and pa and sk) then return false end
	d.TorsoColor = sh; d.LeftLegColor = pa; d.RightLegColor = pa; d.LeftArmColor = sk; d.RightArmColor = sk; d.HeadColor = sk
	local ok = pcall(function() hum:ApplyDescription(d) end)
	return ok
end
rf.OnServerInvoke = function(p, what, a, b)
	if last[p] and os.clock() - last[p] < 0.5 then return "Slow down" end; last[p] = os.clock()
	saved[p.UserId] = saved[p.UserId] or {}
	if what == "palette" then
		local t = {}; for k, list in pairs(PAL) do t[k] = {}; for i, c in ipairs(list) do t[k][i] = {c.R, c.G, c.B} end end
		return {pal = t, outfits = saved[p.UserId]}
	elseif what == "apply" then
		if type(a) ~= "table" then return false end
		local o = {shirt = tonumber(a.shirt), pants = tonumber(a.pants), skin = tonumber(a.skin)}
		return apply(p, o)
	elseif what == "save" then
		local slot = tonumber(a); if not slot or slot < 1 or slot > 3 or type(b) ~= "table" then return false end
		saved[p.UserId][slot] = {shirt = tonumber(b.shirt), pants = tonumber(b.pants), skin = tonumber(b.skin)}
		if store then task.spawn(function() pcall(function() store:SetAsync("u_" .. p.UserId, saved[p.UserId]) end) end) end
		return true
	elseif what == "load" then
		local o = saved[p.UserId][tonumber(a) or 0]; if not o then return false end
		return apply(p, o)
	elseif what == "reset" then
		local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid"); if not hum then return false end
		local ok, d = pcall(function() return Players:GetHumanoidDescriptionFromUserId(p.UserId) end)
		if ok and d then pcall(function() hum:ApplyDescription(d) end) end
		return ok
	end
end
Players.PlayerAdded:Connect(function(p)
	if store then local ok, v = pcall(function() return store:GetAsync("u_" .. p.UserId) end); if ok and type(v) == "table" then saved[p.UserId] = v end end
end)
Players.PlayerRemoving:Connect(function(p) saved[p.UserId] = nil; last[p] = nil end)
