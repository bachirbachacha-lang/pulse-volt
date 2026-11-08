-- 08_keyboard_helpers_client.lua
-- Play mode, CLIENT data model. Helpers for the REAL key-press tests (keys are sent with the Studio keyboard tool;
-- these helpers only place the character, point the camera and record states). Changes nothing in the place.
--   _G.KB_PLACE(cx, cz, rx, ry, rz, dx, dz)  put the character at pool-relative (rx, rz), facing (dx, dz), camera behind
--   _G.KB_CAM(dx, dz)                        turn the camera so W walks toward (dx, dz)
--   _G.KB_SAMPLE(seconds)                    record state, position and speed every 0.1 s in the background
--   _G.KB_SUM()                              summary: states while moving, deck-swim samples, stuck-swim samples, state changes
local plr = game:GetService("Players").LocalPlayer
_G.KB_PLACE = function(cx, cz, rx, ry, rz, dx, dz)
	local ch = plr.Character
	local hrp = ch.HumanoidRootPart
	local dir = Vector3.new(dx, 0, dz).Unit
	local pos = Vector3.new(cx + rx, ry, cz + rz)
	ch:PivotTo(CFrame.lookAt(pos, pos + dir))
	hrp.AssemblyLinearVelocity = Vector3.zero
	workspace.CurrentCamera.CFrame = CFrame.lookAt(pos - dir * 12 + Vector3.new(0, 6, 0), pos + dir * 6)
	_G.KB_C = {cx, cz}
end
_G.KB_CAM = function(dx, dz)
	local hrp = plr.Character.HumanoidRootPart
	local dir = Vector3.new(dx, 0, dz).Unit
	workspace.CurrentCamera.CFrame = CFrame.lookAt(hrp.Position - dir * 12 + Vector3.new(0, 6, 0), hrp.Position + dir * 6)
end
_G.KB_SAMPLE = function(dur)
	local ch = plr.Character
	local hum, hrp = ch:FindFirstChildOfClass("Humanoid"), ch.HumanoidRootPart
	_G.KB_LOG = {}
	local cx, cz = _G.KB_C[1], _G.KB_C[2]
	task.spawn(function()
		local t0 = os.clock()
		while os.clock() - t0 < dur do
			local p = hrp.Position
			table.insert(_G.KB_LOG, {t = os.clock() - t0, x = p.X - cx, y = p.Y, z = p.Z - cz, s = hum:GetState().Name,
				v = (hrp.AssemblyLinearVelocity * Vector3.new(1, 0, 1)).Magnitude})
			task.wait(0.1)
		end
	end)
end
_G.KB_SUM = function()
	local L = _G.KB_LOG
	local counts, moving, stuck, run3, deck, prev, ch = {}, false, 0, 0, 0, nil, {}
	for _, e in ipairs(L) do
		if e.v > 2 then moving = true end
		local inPool = math.abs(e.x) < 18.9 and math.abs(e.z) < 6.3
		if moving then counts[e.s] = (counts[e.s] or 0) + 1 end
		if moving and e.s == "Swimming" and not inPool then deck += 1 end
		if e.s == "Swimming" and e.v < 1 then run3 += 1 if run3 >= 3 then stuck += 1 end else run3 = 0 end
		local tag = e.s .. (inPool and "@pool" or "@deck")
		if tag ~= prev then table.insert(ch, string.format("t%.1f %s(%.1f,%.1f,%.1f)", e.t, tag, e.x, e.y, e.z)) prev = tag end
	end
	local c = {}
	for k, n in pairs(counts) do table.insert(c, k .. "=" .. n) end
	return string.format("%d samples | moving: %s | deck-swim %d | stuck-swim %d | %s", #L, table.concat(c, ","), deck, stuck, table.concat(ch, " ; "))
end
return "keyboard helpers ready"
