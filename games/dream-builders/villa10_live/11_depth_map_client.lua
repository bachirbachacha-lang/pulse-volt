-- 11_depth_map_client.lua  (Revision 3, for the owner's acceptance sheet)
-- Play mode, CLIENT data model. Moves only the test player's character; changes nothing in the place.
-- Measures where in the Villa 10 pool a player SWIMS (deep) and where they STAND (shallow): the character is put at
-- every point of a 1-stud grid inside the pool walls, left to settle for 0.9 s with no key held, and its state is read.
-- Runs in the background; poll _G.DEPTH.done, then read _G.DEPTH.summary and _G.DEPTH.rows.
local plr = game:GetService("Players").LocalPlayer
local cx, cz = 344.18, -1040.42 -- pool centre (after Stage A)
local IX, IZ = 18.90, 6.30       -- inside faces of the pool walls, from the centre
local ch = plr.Character
local hum, hrp = ch:FindFirstChildOfClass("Humanoid"), ch.HumanoidRootPart
assert(hum.WalkSpeed >= 1, "finish the intro first")
assert(math.abs(workspace.DreamBuilders.Homes.Villa_PalmHills_10_Pearl.WorldPivot.Position.Y - 0.50001) < 1e-4, "Villa 10 is not lowered in this session")
_G.DEPTH = {done = false, rows = {}, summary = "running"}
task.spawn(function()
	local swim, stand, other, n = 0, 0, 0, 0
	local band = {} -- by distance to the nearest wall, in whole studs
	for dz = -IZ + 0.5, IZ - 0.5, 1 do
		local row = {}
		for dx = -IX + 0.5, IX - 0.5, 1 do
			local pos = Vector3.new(cx + dx, 5.2, cz + dz)
			ch:PivotTo(CFrame.new(pos))
			hrp.AssemblyLinearVelocity = Vector3.zero
			hum:Move(Vector3.zero, false)
			task.wait(0.9)
			local s = hum:GetState().Name
			local wall = math.min(IX - math.abs(dx), IZ - math.abs(dz))
			local b = math.floor(wall)
			band[b] = band[b] or {swim = 0, n = 0}
			band[b].n += 1
			n += 1
			if s == "Swimming" then swim += 1 band[b].swim += 1 table.insert(row, "S")
			elseif s == "Running" or s == "RunningNoPhysics" or s == "Landed" then stand += 1 table.insert(row, ".")
			else other += 1 table.insert(row, "?") end
		end
		table.insert(_G.DEPTH.rows, string.format("z%+5.1f %s", dz, table.concat(row)))
	end
	local bl = {}
	for b = 0, 7 do if band[b] then table.insert(bl, string.format("%d-%d studs from a wall: %d of %d swim", b, b + 1, band[b].swim, band[b].n)) end end
	_G.DEPTH.summary = string.format("%d grid points: SWIM %d (%.0f%%), STAND %d (%.0f%%), other %d | %s", n, swim, 100 * swim / n, stand, 100 * stand / n, other, table.concat(bl, "; "))
	_G.DEPTH.done = true
end)
return "depth map started (about 7 minutes)"
