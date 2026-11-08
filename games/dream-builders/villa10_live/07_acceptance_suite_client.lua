-- 07_acceptance_suite_client.lua
-- Play mode, CLIENT data model. Moves only the test player's character (nothing in the place is changed; Play
-- sessions are thrown away when Play stops). Finish the game's intro first (job picked, WalkSpeed 16).
-- Drives the character exactly like holding a movement key (Humanoid:Move every frame) and samples its state
-- every 0.1 s. Runs in the background; poll _G.ACC.done / _G.ACC.res / _G.ACC.verdict.
--   Part 1  26 straight walks: all 4 sides at 1.0 / 1.5 / 2.2 studs from the outside of the pool wall (garden side
--           also 3.0), both directions
--   Part 2  8 corner walks: around each of the 4 corners, both ways
--   Part 3  6 laps (3 each way) at 1.3 studs out
--   Part 4  escape test at 9 points next to the walls: from each point, hold each of 4 directions for 1 s
--   Part 5  swim test: in over the steps, deep middle, each wall, back to the middle, out over the steps
-- PASS: parts 1-4 have 0 samples swimming on the deck and 0 stuck samples; every escape point can leave in at least
-- 2 directions (>= 3 studs in 1 s); part 5 reaches every target, swims in the middle, exits onto the deck, 0 stuck.
local Players = game:GetService("Players")
local RS = game:GetService("RunService")
local plr = Players.LocalPlayer
local cx, cz = 344.18, -1040.42 -- Villa 10 pool centre (after Stage A)
local OX, OZ = 20.16, 7.56 -- outside faces of the pool walls, from the centre
local IX, IZ = 18.90, 6.30 -- inside faces
local W, E, N, S = Vector3.new(-1, 0, 0), Vector3.new(1, 0, 0), Vector3.new(0, 0, -1), Vector3.new(0, 0, 1)
local function C() local c = plr.Character return c, c:FindFirstChildOfClass("Humanoid"), c.HumanoidRootPart end
do
	local _, hum = C()
	assert(hum and hum.WalkSpeed >= 1, "finish the intro first (WalkSpeed is 0)")
	assert(math.abs(workspace.DreamBuilders.Homes.Villa_PalmHills_10_Pearl.WorldPivot.Position.Y - 0.50001) < 1e-4, "Villa 10 is not lowered in this session")
end
local function inPool(p) return math.abs(p.X - cx) < IX and math.abs(p.Z - cz) < IZ end
local function place(pos, dir)
	local c, _, hrp = C()
	c:PivotTo(CFrame.lookAt(pos, pos + dir))
	hrp.AssemblyLinearVelocity = Vector3.zero
	task.wait(0.7)
end
-- run steps; each step holds a fixed direction (dir) or steers to a target; returns the samples
local function run(steps)
	local _, hum, hrp = C()
	local log = {}
	for _, st in ipairs(steps) do
		local t0 = os.clock()
		local lowSince
		pcall(function() RS:UnbindFromRenderStep("AccHold") end)
		RS:BindToRenderStep("AccHold", Enum.RenderPriority.Input.Value + 5, function()
			if st.target then
				local d = (st.target - hrp.Position) * Vector3.new(1, 0, 1)
				if d.Magnitude > 0.6 then hum:Move(d.Unit, false) else hum:Move(Vector3.zero, false) end
			else hum:Move(st.dir, false) end
		end)
		while os.clock() - t0 < st.dur do
			task.wait(0.1)
			local v = (hrp.AssemblyLinearVelocity * Vector3.new(1, 0, 1)).Magnitude
			table.insert(log, {s = hum:GetState().Name, v = v, p = hrp.Position, step = st.tag})
			if st.jump then
				if v < 1 then lowSince = lowSince or os.clock() if os.clock() - lowSince > 0.8 then hum.Jump = true lowSince = nil end else lowSince = nil end
			end
			if st.target and ((st.target - hrp.Position) * Vector3.new(1, 0, 1)).Magnitude <= 0.6 then break end
		end
		RS:UnbindFromRenderStep("AccHold")
	end
	hum:Move(Vector3.zero, false)
	return log
end
-- stuck = 3 or more consecutive samples swimming at under 1 stud/s while a direction is held
local function count(log)
	local deck, stuck, run3 = 0, 0, 0
	for _, e in ipairs(log) do
		if e.s == "Swimming" and not inPool(e.p) then deck += 1 end
		if e.s == "Swimming" and e.v < 1 then run3 += 1 if run3 >= 3 then stuck += 1 end else run3 = 0 end
	end
	return deck, stuck
end

local walks = {}
local function add(part, name, start, steps) table.insert(walks, {part = part, name = name, start = start, steps = steps}) end
local function V(x, z) return Vector3.new(cx + x, 5.6, cz + z) end
for _, d in ipairs({1.0, 1.5, 2.2}) do
	add(1, string.format("house side %.1f out E>W", d), V(22, OZ + d), {{dir = W, dur = 2.7}})
	add(1, string.format("house side %.1f out W>E", d), V(-21, OZ + d), {{dir = E, dur = 2.7}})
end
for _, d in ipairs({1.0, 1.5, 2.2, 3.0}) do
	add(1, string.format("garden side %.1f out E>W", d), V(22, -OZ - d), {{dir = W, dur = 2.7}})
	add(1, string.format("garden side %.1f out W>E", d), V(-22, -OZ - d), {{dir = E, dur = 2.7}})
end
for _, d in ipairs({1.0, 1.5, 2.2}) do
	add(1, string.format("west end %.1f out N>S", d), V(-OX - d, -9.5), {{dir = S, dur = 1.2}})
	add(1, string.format("west end %.1f out S>N", d), V(-OX - d, 9.5), {{dir = N, dur = 1.2}})
	add(1, string.format("steps end %.1f out N>S", d), V(OX + d, -9.5), {{dir = S, dur = 1.2}})
	add(1, string.format("steps end %.1f out S>N", d), V(OX + d, 9.5), {{dir = N, dur = 1.2}})
end
local a, b = OX + 1.3, OZ + 1.3
for _, cnr in ipairs({{1, 1, "south-east (house/steps)"}, {-1, 1, "south-west (house/west)"}, {-1, -1, "north-west (garden/west)"}, {1, -1, "north-east (garden/steps)"}}) do
	local sx, sz, label = cnr[1], cnr[2], cnr[3]
	local endSide, corner, endFront = V(sx * a, sz * (b - 8)), V(sx * a, sz * b), V(sx * (a - 8), sz * b)
	add(2, "corner " .. label .. " (end side first)", endSide, {{target = corner, dur = 2.5}, {target = endFront, dur = 2}})
	add(2, "corner " .. label .. " (long side first)", endFront, {{target = corner, dur = 2}, {target = endSide, dur = 2.5}})
end
local c1, c2, c3, c4 = V(a, b), V(-a, b), V(-a, -b), V(a, -b)
for i = 1, 3 do
	add(3, "lap clockwise " .. i, c1, {{target = c2, dur = 4}, {target = c3, dur = 2.5}, {target = c4, dur = 4}, {target = c1, dur = 2.5}})
	add(3, "lap counter-clockwise " .. i, c1, {{target = c4, dur = 2.5}, {target = c3, dur = 4}, {target = c2, dur = 2.5}, {target = c1, dur = 4}})
end

_G.ACC = {done = false, res = {}, totals = {}, verdict = "running"}
task.spawn(function()
	local fails = {}
	local deckAll, stuckAll, samplesAll = 0, 0, 0
	-- parts 1-3
	for _, w in ipairs(walks) do
		local first = w.steps[1]
		local dir = first.dir or ((first.target - w.start) * Vector3.new(1, 0, 1)).Unit
		local ok, log = pcall(function() place(w.start, dir) return run(w.steps) end)
		if not ok then table.insert(fails, w.name .. ": error " .. tostring(log)) log = {} end
		local deck, stuck = count(log)
		deckAll += deck stuckAll += stuck samplesAll += #log
		local moved = #log > 1 and (log[#log].p - log[1].p).Magnitude or 0
		table.insert(_G.ACC.res, string.format("P%d | %-40s | samples %3d | deck-swim %d | stuck %d | moved %.1f", w.part, w.name, #log, deck, stuck, moved))
		if deck > 0 or stuck > 0 then table.insert(fails, w.name) end
		if moved < 3 and w.part ~= 3 then table.insert(fails, w.name .. " (did not move)") end
	end
	-- part 4: escape test
	local escapePts = {
		{"house-side corner E", V(OX + 1.1, OZ + 1.1)}, {"house-side corner W", V(-OX - 1.1, OZ + 1.1)},
		{"garden corner W", V(-OX - 1.1, -OZ - 1.1)}, {"garden corner E", V(OX + 1.1, -OZ - 1.1)},
		{"house path x-12", V(-12, OZ + 1.1)}, {"house path x0", V(0, OZ + 1.1)}, {"house path x+12", V(12, OZ + 1.1)},
		{"garden side x-10", V(-10, -OZ - 1.1)}, {"garden side x+10", V(10, -OZ - 1.1)},
	}
	for _, ep in ipairs(escapePts) do
		local free, deck, stuck, n = 0, 0, 0, 0
		for _, dir in ipairs({W, E, N, S}) do
			local ok, log = pcall(function() place(ep[2], dir) return run({{dir = dir, dur = 1.0}}) end)
			if ok and #log > 0 then
				local d1, s1 = count(log)
				deck += d1 stuck += s1 n += #log
				local moved = ((log[#log].p - ep[2]) * Vector3.new(1, 0, 1)).Magnitude
				if moved >= 3 then free += 1 end
			end
		end
		deckAll += deck stuckAll += stuck samplesAll += n
		table.insert(_G.ACC.res, string.format("P4 | escape %-33s | free directions %d of 4 | deck-swim %d | stuck %d", ep[1], free, deck, stuck))
		if free < 2 or deck > 0 or stuck > 0 then table.insert(fails, "escape " .. ep[1]) end
	end
	-- part 5: swim test
	local targets = {
		{"walk in over the steps", nil, W, 2.2, true}, {"deep middle", V(0, 0)}, {"house-side wall", V(0, IZ - 0.8)},
		{"middle", V(0, 0)}, {"garden-side wall", V(0, -IZ + 0.8)}, {"middle", V(-4, 0)}, {"west wall", V(-IX + 0.8, 0)},
		{"middle", V(4, 0)}, {"steps", V(IX - 1.5, 0)},
	}
	place(V(25, 0), W)
	local swimLog, reached = {}, {}
	for _, t in ipairs(targets) do
		local step = t[2] and {target = t[2], dur = 4, tag = t[1]} or {dir = t[3], dur = t[4], jump = t[5], tag = t[1]}
		local log = run({step})
		local _, _, hrp = C()
		local okReach = not t[2] or ((hrp.Position - t[2]) * Vector3.new(1, 0, 1)).Magnitude < 1.5
		local states = {}
		for _, e in ipairs(log) do states[e.s] = (states[e.s] or 0) + 1 table.insert(swimLog, e) end
		local st = {}
		for k, v in pairs(states) do table.insert(st, k .. "=" .. v) end
		table.insert(reached, string.format("%s: %s (%s)", t[1], okReach and "reached" or "NOT reached", table.concat(st, ",")))
		if not okReach then table.insert(fails, "swim target " .. t[1]) end
	end
	local outLog = run({{dir = E, dur = 3.0, jump = true, tag = "climb out"}, {dir = E, dur = 0.8, tag = "on the deck"}})
	for _, e in ipairs(outLog) do table.insert(swimLog, e) end
	local _, hum, hrp = C()
	local exited = (hrp.Position.X - cx) > OX and not inPool(hrp.Position) and hum:GetState().Name ~= "Swimming"
	local middleSwims = 0
	for _, e in ipairs(swimLog) do
		if e.s == "Swimming" and math.abs(e.p.X - cx) < 15 and math.abs(e.p.Z - cz) < 3 then middleSwims += 1 end
	end
	local _, swimStuck = count(swimLog)
	table.insert(_G.ACC.res, "P5 | swim test | " .. table.concat(reached, " ; ") .. string.format(" | swimming samples in the deep middle %d | exited onto the deck: %s | stuck %d", middleSwims, tostring(exited), swimStuck))
	if middleSwims == 0 then table.insert(fails, "no swimming in the deep middle") end
	if not exited then table.insert(fails, "did not get out over the steps") end
	if swimStuck > 0 then table.insert(fails, "stuck while swimming") end
	_G.ACC.totals = {samples = samplesAll, deck = deckAll, stuck = stuckAll}
	_G.ACC.verdict = #fails == 0 and "PASS" or ("FAIL: " .. table.concat(fails, "; "))
	_G.ACC.done = true
end)
return "acceptance suite started: " .. #walks .. " walks/corners/laps, 9 escape points, 1 swim test"
