-- Dream City Academy: a bell timetable (lesson 120 s, break 30 s), an AI teacher and a few AI students (kept small for performance),
-- maths quiz questions on the board (players answer with prompts), attendance pay for sitting in class, and a Teacher job.
local Players = game:GetService("Players")
local K = require(game.ServerStorage.DB_Tools.NpcKit)
local school = workspace:WaitForChild("DreamBuilders"):WaitForChild("School")
local maths = school:WaitForChild("Maths")
local board = maths:WaitForChild("Whiteboard")
local lessonText = board:FindFirstChildWhichIsA("SurfaceGui"):FindFirstChild("Lesson")
local timetable = school.Reception.Timetable:FindFirstChildWhichIsA("TextLabel", true)
local bellPart = school.Reception.Bell
local bell = Instance.new("Sound"); bell.SoundId = "rbxasset://sounds/electronicpingshort.wav"; bell.Volume = 1; bell.PlaybackSpeed = 0.7; bell.RollOffMaxDistance = 300; bell.Parent = bellPart
local SUBJECTS = {"Maths", "Science", "Computers", "History", "Art"}
local state = {lesson = false, subject = "Maths", q = nil, answered = {}, taught = false}
---------------------------------------------------------------- AI people (1 teacher + 5 students)
local npcs = Instance.new("Folder"); npcs.Name = "People"; npcs.Parent = school
local seats = {}; for _, d in ipairs(maths:GetChildren()) do if d.Name == "StudentSeat" then seats[#seats + 1] = d end end
local teacher = K.spawn(board.CFrame * CFrame.new(-6, -4, -3), {parent = npcs, shirt = Color3.fromRGB(240, 240, 238), pants = Color3.fromRGB(40, 42, 48)})
if teacher then teacher.Name = "Ms " .. K.name(); teacher.HumanoidRootPart.Anchored = true end
local students = {}
for i = 1, 5 do
	local st = seats[i * 2]
	if st then local m, hum = K.spawn(st.CFrame * CFrame.new(0, 2, 2), {parent = npcs, shirt = Color3.fromRGB(30, 80, 140)}); if m then students[#students + 1] = {m = m, hum = hum, seat = st} end end
end
---------------------------------------------------------------- quiz on the board
local quizPrompts = {}
local function newQuestion()
	local a, b = math.random(3, 12), math.random(3, 12)
	local right = a * b
	local opts = {right, right + math.random(1, 6), right - math.random(1, 6)}
	for i = #opts, 2, -1 do local j = math.random(i); opts[i], opts[j] = opts[j], opts[i] end
	state.q = {text = a .. " × " .. b .. " = ?", right = right, opts = opts}; state.answered = {}
	lessonText.Text = state.subject .. " lesson\n" .. state.q.text
	for i, pp in ipairs(quizPrompts) do pp.ActionText = "Answer " .. opts[i]; pp.Enabled = true end
end
for i = 1, 3 do
	local pp = K.prompt(board, "Answer", "Quiz", 0.3, 26); pp.UIOffset = Vector2.new(0, -55 * (i - 1)); pp.Exclusivity = Enum.ProximityPromptExclusivity.AlwaysShow
	pp.KeyboardKeyCode = ({Enum.KeyCode.One, Enum.KeyCode.Two, Enum.KeyCode.Three})[i]; pp.Enabled = false
	quizPrompts[i] = pp
	pp.Triggered:Connect(function(p)
		if not state.lesson or not state.q or state.answered[p] then return end
		state.answered[p] = true
		if state.q.opts[i] == state.q.right then
			K.pay(p, 10, "correct answer! (+1 grade)"); p:SetAttribute("Grades", (p:GetAttribute("Grades") or 0) + 1)
		else K.toast(p, "Not quite. It was " .. state.q.right .. ". Try the next one!") end
	end)
end
---------------------------------------------------------------- Teacher job
local tdesk = maths:WaitForChild("TeacherDesk")
local tp = K.prompt(tdesk, "Teach the lesson", "Dream City Academy", 4, 10)
tp.Triggered:Connect(function(p)
	if K.job(p) ~= "Teacher" then K.toast(p, "Pick the Teacher job first (Phone › Jobs)"); return end
	if not state.lesson then K.toast(p, "Wait for the bell. Lessons start soon"); return end
	if state.taught then K.toast(p, "This lesson has already been taught. Wait for the next bell"); return end
	state.taught = true
	K.pay(p, 45, "taught a " .. state.subject .. " lesson")
	newQuestion()
	if teacher then K.bubble(teacher, "Thank you for teaching! 👩‍🏫") ; task.delay(4, function() K.bubble(teacher, nil) end) end
end)
---------------------------------------------------------------- attendance: sit in class during a lesson
task.spawn(function()
	while true do
		task.wait(30)
		if state.lesson then
			for _, p in ipairs(Players:GetPlayers()) do
				local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid")
				local seat = hum and hum.SeatPart
				if seat and seat.Name == "StudentSeat" and seat:IsDescendantOf(maths) then K.pay(p, 5, "attending class") end
			end
		end
	end
end)
---------------------------------------------------------------- bell timetable
while true do
	state.subject = SUBJECTS[math.random(#SUBJECTS)]; state.lesson = true; state.taught = false
	timetable.Text = "NOW: " .. state.subject .. " (Room: Maths)\nNext bell in 2 minutes"
	bell:Play(); for _, st in ipairs(students) do if st.m.Parent and not st.seat.Occupant then st.seat:Sit(st.hum) end end
	if teacher then K.bubble(teacher, "Good morning, class! 📚"); task.delay(4, function() K.bubble(teacher, nil) end) end
	newQuestion()
	task.wait(60); if state.lesson then newQuestion() end
	task.wait(60)
	state.lesson = false; state.q = nil
	for _, pp in ipairs(quizPrompts) do pp.Enabled = false end
	timetable.Text = "BREAK · 30 s\nNext: lesson"; lessonText.Text = "Break time! 🍎"
	bell:Play(); for _, st in ipairs(students) do if st.m.Parent then st.hum.Sit = false end end
	task.wait(30)
end
