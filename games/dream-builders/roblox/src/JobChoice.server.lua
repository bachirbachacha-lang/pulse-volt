-- ServerScriptService.JobChoice: the intro's "What do you want to be?" picker asks the server for a job.
-- The server checks the job is real, sets it (GameServer's HUD listens to the Job attribute) and gives the right hat.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local ev = RS:FindFirstChild("ChooseJob") or Instance.new("RemoteEvent")
ev.Name = "ChooseJob"; ev.Parent = RS
local JOBS = {
	["Construction Worker"] = Color3.fromRGB(255, 150, 30),
	["Architect"] = Color3.fromRGB(80, 170, 255),
	["Real Estate Agent"] = false, ["Car Dealer"] = false, ["Chef"] = false, ["Hair Stylist"] = false,
	["Fashion Designer"] = false, ["Delivery Driver"] = false, ["Business Owner"] = false,
}
local function hat(char, color)
	local old = char:FindFirstChild("HardHat"); if old then old:Destroy() end
	if not color then return end
	local head = char:FindFirstChild("Head"); if not head then return end
	local h = Instance.new("Part"); h.Name = "HardHat"; h.Shape = Enum.PartType.Ball; h.Size = Vector3.new(1.6, 0.9, 1.6)
	h.Color = color; h.CanCollide = false; h.Massless = true
	h.CFrame = head.CFrame * CFrame.new(0, 0.55, 0); h.Parent = char
	local w = Instance.new("WeldConstraint"); w.Part0 = head; w.Part1 = h; w.Parent = h
end
local last = {}
ev.OnServerEvent:Connect(function(plr, job)
	if type(job) ~= "string" or JOBS[job] == nil then return end
	if last[plr] and os.clock() - last[plr] < 1 then return end
	last[plr] = os.clock()
	plr:SetAttribute("Job", job)
	local ls = plr:FindFirstChild("leaderstats"); local jv = ls and ls:FindFirstChild("Job"); if jv then jv.Value = job end
	if plr.Character then hat(plr.Character, JOBS[job] or nil) end
	ev:FireClient(plr, "ok", job)
end)
Players.PlayerRemoving:Connect(function(p) last[p] = nil end)
