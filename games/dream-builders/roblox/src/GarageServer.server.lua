-- Villa garages: the owner can park the car they last drove inside their garage (door rolls up, car slides in, door closes).
local Players, TweenService = game:GetService("Players"), game:GetService("TweenService")
local homes = workspace:WaitForChild("DreamBuilders"):WaitForChild("Homes")
local function toast(p, msg)
	local g = p:FindFirstChild("PlayerGui") and p.PlayerGui:FindFirstChild("DreamHUD"); if not g or not g:FindFirstChild("Toast") then return end
	g.Toast.Text = msg; g.Toast.Visible = true; task.delay(3, function() if g.Toast.Text == msg then g.Toast.Visible = false end end)
end
local function lastCar(p)
	for _, m in ipairs(workspace:GetChildren()) do
		if m:IsA("Model") and m:GetAttribute("LastDriver") == p.UserId and m:FindFirstChild("DriverSeat") then return m end
	end
end
local busy = {}
local function setup(villa, garage)
	local spot, door = garage:FindFirstChild("CarSpot"), garage:FindFirstChild("Door_Garage")
	if not spot or not door then return end
	local pp = Instance.new("ProximityPrompt"); pp.Name = "ParkPrompt"; pp.ActionText = "Park my car"; pp.ObjectText = "Garage"
	pp.KeyboardKeyCode = Enum.KeyCode.F; pp.HoldDuration = 0.5; pp.RequiresLineOfSight = false; pp.MaxActivationDistance = 14
	local anchor = Instance.new("Attachment"); anchor.Position = Vector3.new(0, 0, -16); anchor.Parent = spot -- prompt sits on the driveway
	pp.Parent = anchor
	pp.Triggered:Connect(function(p)
		if busy[garage] then return end
		if villa:GetAttribute("OwnerId") ~= p.UserId then toast(p, "Only the owner can park here. Buy a villa in Phone › Property"); return end
		local car = lastCar(p)
		if not car then toast(p, "Drive a car first, then park it here"); return end
		if car.DriverSeat.Occupant then toast(p, "Get out of the car first"); return end
		busy[garage] = true
		-- park: face the car out of the garage so it's easy to drive away
		local base = spot.CFrame * CFrame.new(0, -2, 0)
		local cf, size = car:GetBoundingBox()
		local lift = car:GetPivot().Position.Y - (cf.Position.Y - size.Y / 2)
		local look = door.CFrame.LookVector
		local pos = Vector3.new(base.X, garage.Floor.Position.Y + garage.Floor.Size.Y / 2 + lift + 0.2, base.Z)
		for _, d in ipairs(car:GetDescendants()) do if d:IsA("BasePart") then d.Anchored = true end end
		car:PivotTo(CFrame.lookAt(pos, pos + look))
		car:SetAttribute("ParkedAt", villa.Name)
		toast(p, "🚗 Parked in your garage")
		task.wait(1); busy[garage] = nil
	end)
end
for _, v in ipairs(homes:GetChildren()) do local g = v:FindFirstChild("Garage"); if g then setup(v, g) end end
