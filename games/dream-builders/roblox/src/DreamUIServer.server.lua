-- DreamUIServer.server.lua  (written by Codex, reviewed + wired in by Claude)
-- Place this Script in ServerScriptService.
-- Creates the DreamUI remotes and securely handles the daily prize spin.
-- ShopRequest intentionally records no purchase; the owner must approve Robux pricing first.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local COOLDOWN_SECONDS = 24 * 60 * 60
local folder = ReplicatedStorage:FindFirstChild("DreamUI")
if not folder then
	folder = Instance.new("Folder")
	folder.Name = "DreamUI"
	folder.Parent = ReplicatedStorage
end

local shopRequest = folder:FindFirstChild("ShopRequest")
if not shopRequest then
	shopRequest = Instance.new("RemoteEvent")
	shopRequest.Name = "ShopRequest"
	shopRequest.Parent = folder
end

local spinFunction = folder:FindFirstChild("Spin")
if not spinFunction then
	spinFunction = Instance.new("RemoteFunction")
	spinFunction.Name = "Spin"
	spinFunction.Parent = folder
end

-- Weighted prize table; the jackpot remains rare compared with regular rewards.
local prizes = {
	{Slice = 1, Reward = "$100", Weight = 28, Kind = "Money", Amount = 100},
	{Slice = 2, Reward = "$250", Weight = 22, Kind = "Money", Amount = 250},
	{Slice = 3, Reward = "$500", Weight = 17, Kind = "Money", Amount = 500},
	{Slice = 4, Reward = "$1,000", Weight = 12, Kind = "Money", Amount = 1000},
	{Slice = 5, Reward = "$750", Weight = 10, Kind = "Money", Amount = 750},
	{Slice = 6, Reward = "2× money for 10 minutes", Weight = 6, Kind = "DoubleMoney", Amount = 600},
	{Slice = 7, Reward = "Gold hard hat", Weight = 4, Kind = "GoldHat"},
	{Slice = 8, Reward = "$5,000 JACKPOT", Weight = 1, Kind = "Money", Amount = 5000},
}
local totalWeight = 0
for _, prize in ipairs(prizes) do totalWeight += prize.Weight end

local function choosePrize()
	local roll = math.random(1, totalWeight)
	for _, prize in ipairs(prizes) do
		roll -= prize.Weight
		if roll <= 0 then return prize end
	end
	return prizes[1]
end

local function award(player, prize)
	if prize.Kind == "Money" then
		local leaderstats = player:FindFirstChild("leaderstats")
		local money = leaderstats and leaderstats:FindFirstChild("Money")
		if money and money:IsA("IntValue") then
			money.Value += prize.Amount
		else
			warn("DreamUI: leaderstats.Money IntValue missing for " .. player.Name)
		end
	elseif prize.Kind == "Bricks" then
		-- Bricks is an attribute placeholder until the game's inventory system is connected.
		local current = player:GetAttribute("Bricks") or 0
		player:SetAttribute("Bricks", current + prize.Amount)
	elseif prize.Kind == "DoubleMoney" then
		player:SetAttribute("MoneyMultiplier", 2)
		player:SetAttribute("MoneyMultiplierExpiresAt", os.time() + prize.Amount)
		local expiresAt = player:GetAttribute("MoneyMultiplierExpiresAt")
		task.delay(prize.Amount, function()
			if player.Parent and player:GetAttribute("MoneyMultiplierExpiresAt") == expiresAt then
				player:SetAttribute("MoneyMultiplier", 1)
				player:SetAttribute("MoneyMultiplierExpiresAt", nil)
			end
		end)
	elseif prize.Kind == "GoldHat" then
		player:SetAttribute("HasGoldHardHat", true)
	end
end

spinFunction.OnServerInvoke = function(player)
	local now = os.time()
	local lastSpin = player:GetAttribute("LastSpin")
	if typeof(lastSpin) == "number" then
		local remaining = COOLDOWN_SECONDS - (now - lastSpin)
		if remaining > 0 then
			return {Success = false, Remaining = remaining}
		end
	end

	-- Set cooldown before awarding so rapid duplicate invocations cannot double-pay.
	player:SetAttribute("LastSpin", now)
	local prize = choosePrize()
	award(player, prize)
	return {Success = true, SliceIndex = prize.Slice, Reward = prize.Reward}
end

shopRequest.OnServerEvent:Connect(function(player, itemId)
	-- Intentionally no MarketplaceService or Robux transaction is performed here.
	-- This event is a placeholder for a future owner-approved purchase flow.
	if type(itemId) ~= "string" then return end
	local allowed = {VIP = true, PersonalTruck = true, GoldHardHat = true, DoubleMoney = true}
	if not allowed[itemId] then return end
	print(("DreamUI shop request from %s: %s (purchase not enabled)"):format(player.Name, itemId))
end)

Players.PlayerAdded:Connect(function(player)
	if player:GetAttribute("MoneyMultiplier") == nil then player:SetAttribute("MoneyMultiplier", 1) end
end)

