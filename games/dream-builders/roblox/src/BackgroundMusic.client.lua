-- StarterPlayer.StarterPlayerScripts.BackgroundMusic (copied from Studio 6 Nov)
-- Background music playlist (Roblox-licensed tracks from the Creator Store). Settings > MUSIC turns it off.
local SoundService = game:GetService("SoundService")
local plr = game:GetService("Players").LocalPlayer
local tracks = {
	{"OUD SUNSET", "rbxassetid://93504408848189"},
	{"Nice Day", "rbxassetid://112614120385658"},
	{"Holiday", "rbxassetid://1842752570"},
	{"Networking", "rbxassetid://1836349336"},
	{"Solar Wind", "rbxassetid://106400180212963"},
}
local s = Instance.new("Sound"); s.Name = "DreamMusic"; s.Volume = 0.3; s.Parent = SoundService
local i = math.random(1, #tracks)
local function enabled() return plr:GetAttribute("MusicEnabled") ~= false end
local function playNext()
	i = i % #tracks + 1
	s.SoundId = tracks[i][2]
	if enabled() then s:Play() end
end
s.Ended:Connect(playNext)
plr:GetAttributeChangedSignal("MusicEnabled"):Connect(function()
	if enabled() then if not s.IsPlaying then s:Resume() end else s:Pause() end
end)
task.wait(3)
playNext()
