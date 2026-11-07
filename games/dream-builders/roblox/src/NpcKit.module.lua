-- Shared helpers for AI people (customers, clients, couriers, walkers) and job UI.
local Players = game:GetService("Players")
local K = {}
local SKIN = {Color3.fromRGB(255, 220, 180), Color3.fromRGB(224, 172, 130), Color3.fromRGB(176, 120, 82), Color3.fromRGB(120, 80, 55), Color3.fromRGB(240, 205, 170)}
local CLOTH = {Color3.fromRGB(240, 240, 238), Color3.fromRGB(30, 32, 38), Color3.fromRGB(60, 110, 190), Color3.fromRGB(190, 60, 60), Color3.fromRGB(212, 170, 90), Color3.fromRGB(80, 150, 100), Color3.fromRGB(150, 120, 200), Color3.fromRGB(200, 190, 170)}
local FIRST = {"Omar", "Layla", "Sara", "Yousef", "Noor", "Adam", "Mia", "Zayn", "Hana", "Ali", "Lina", "Karim", "Emma", "Rami", "Dana", "Leo"}
function K.name() return FIRST[math.random(#FIRST)] end
-- spawn an AI person at a CFrame. opts: {name, shirt, pants, parent}
function K.spawn(cf, opts)
	opts = opts or {}
	local d = Instance.new("HumanoidDescription")
	local sk = SKIN[math.random(#SKIN)]
	d.HeadColor = sk; d.LeftArmColor = sk; d.RightArmColor = sk
	d.TorsoColor = opts.shirt or CLOTH[math.random(#CLOTH)]
	local pants = opts.pants or CLOTH[math.random(#CLOTH)]; d.LeftLegColor = pants; d.RightLegColor = pants
	local ok, m = pcall(function() return Players:CreateHumanoidModelFromDescription(d, Enum.HumanoidRigType.R15) end)
	if not ok then return nil end
	m.Name = opts.name or K.name()
	local hum = m:FindFirstChildOfClass("Humanoid"); hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	if opts.persistent then m.ModelStreamingMode = Enum.ModelStreamingMode.Persistent end
	m:PivotTo(cf + Vector3.new(0, 3, 0)); m.Parent = opts.parent or workspace
	for _, p in ipairs(m:GetDescendants()) do if p:IsA("BasePart") then pcall(function() p:SetNetworkOwner(nil) end) end end
	return m, hum
end
-- walk to a point; returns true when reached (or false on timeout)
function K.walk(m, pos, timeout)
	local hum = m and m:FindFirstChildOfClass("Humanoid"); if not hum then return false end
	local t0 = os.clock()
	while m.Parent and os.clock() - t0 < (timeout or 15) do
		local here = m:GetPivot().Position
		if (Vector3.new(pos.X, here.Y, pos.Z) - here).Magnitude < 3 then return true end
		hum:MoveTo(pos); task.wait(0.4)
	end
	return false
end
-- speech/thought bubble above an AI person
function K.bubble(m, text, color)
	local head = m and m:FindFirstChild("Head"); if not head then return end
	local old = head:FindFirstChild("Bubble"); if old then old:Destroy() end
	if not text then return end
	local b = Instance.new("BillboardGui"); b.Name = "Bubble"; b.Size = UDim2.fromOffset(150, 40); b.StudsOffset = Vector3.new(0, 2.6, 0); b.MaxDistance = 80; b.Parent = head
	local l = Instance.new("TextLabel"); l.Size = UDim2.fromScale(1, 1); l.BackgroundColor3 = color or Color3.fromRGB(255, 255, 255); l.TextColor3 = Color3.fromRGB(20, 20, 24)
	l.Font = Enum.Font.GothamBold; l.TextScaled = true; l.Text = text; l.Parent = b
	Instance.new("UICorner", l).CornerRadius = UDim.new(0, 10)
	local pad = Instance.new("UIPadding", l); pad.PaddingLeft = UDim.new(0, 6); pad.PaddingRight = UDim.new(0, 6)
	return b
end
function K.toast(p, msg)
	local g = p:FindFirstChild("PlayerGui") and p.PlayerGui:FindFirstChild("DreamHUD"); if not g or not g:FindFirstChild("Toast") then return end
	g.Toast.Text = msg; g.Toast.Visible = true; task.delay(3, function() if g.Toast.Text == msg then g.Toast.Visible = false end end)
end
function K.pay(p, amount, why)
	local ls = p:FindFirstChild("leaderstats"); local m = ls and ls:FindFirstChild("Money"); if not m then return end
	m.Value += amount
	p:SetAttribute("JobEarned", (p:GetAttribute("JobEarned") or 0) + amount)
	K.toast(p, "+$" .. amount .. "  " .. (why or ""))
end
function K.msg(p, from, text) local e = game.ServerStorage:FindFirstChild("SendPhoneMessage"); if e then e:Fire(p, from, text) end end
-- marker only one player can see (placed in their PlayerGui)
function K.marker(p, adornee, text, color)
	local b = Instance.new("BillboardGui"); b.Name = "JobMarker"; b.AlwaysOnTop = true; b.Size = UDim2.fromOffset(180, 44); b.StudsOffset = Vector3.new(0, 6, 0)
	b.Adornee = adornee; b.Parent = p:FindFirstChild("PlayerGui")
	local l = Instance.new("TextLabel"); l.Size = UDim2.fromScale(1, 1); l.BackgroundColor3 = color or Color3.fromRGB(212, 170, 90); l.TextColor3 = Color3.new(1, 1, 1)
	l.Font = Enum.Font.GothamBold; l.TextScaled = true; l.Text = text; l.Parent = b
	Instance.new("UICorner", l).CornerRadius = UDim.new(0, 10)
	return b
end
function K.prompt(parent, action, object, hold, dist)
	local pp = Instance.new("ProximityPrompt"); pp.ActionText = action; pp.ObjectText = object or ""; pp.HoldDuration = hold or 0.4
	pp.RequiresLineOfSight = false; pp.MaxActivationDistance = dist or 10; pp.Parent = parent; return pp
end
function K.job(p) return p:GetAttribute("Job") end
return K
