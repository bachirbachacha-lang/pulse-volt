-- Readability: outlines (UIStroke) on buttons/labels draw around the box only, never on the letters
-- (stroked text was the blurry "VEHICLES" look). Applies to every GUI, including ones created later.
local pg = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")
local function fix(d)
	if d:IsA("UIStroke") and (d.Parent:IsA("TextButton") or d.Parent:IsA("TextLabel") or d.Parent:IsA("TextBox")) then d.ApplyStrokeMode = Enum.ApplyStrokeMode.Border end
	if (d:IsA("TextLabel") or d:IsA("TextButton")) and d.Font == Enum.Font.FredokaOne then d.Font = Enum.Font.GothamBlack end
end
for _, d in ipairs(pg:GetDescendants()) do fix(d) end
pg.DescendantAdded:Connect(function(d) task.defer(fix, d) end)
