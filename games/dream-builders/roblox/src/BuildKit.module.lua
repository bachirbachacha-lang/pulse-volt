-- Small helpers for building venues in a local frame (origin = venue floor centre, -Z = front/street side).
local K = {}
function K.new(originCF, parent)
	local b = {o = originCF, parent = parent}
	function b.P(name, size, lp, color, mat, tr, rot, par)
		local p = Instance.new("Part"); p.Name = name; p.Anchored = true; p.Size = size
		p.CFrame = b.o * CFrame.new(lp) * (rot or CFrame.new())
		p.Color = color or Color3.fromRGB(235, 232, 226); p.Material = mat or Enum.Material.SmoothPlastic
		p.Transparency = tr or 0; p.TopSurface = 0; p.BottomSurface = 0; p.Parent = par or b.parent; return p
	end
	function b.seat(lp, faceLp, color, size, par)
		local s = Instance.new("Seat"); s.Name = "Seat"; s.Anchored = true; s.Size = size or Vector3.new(1.8, 0.5, 1.8)
		s.Color = color or Color3.fromRGB(60, 60, 66); s.Material = Enum.Material.Fabric
		local a, f = (b.o * CFrame.new(lp)).Position, (b.o * CFrame.new(faceLp)).Position
		s.CFrame = CFrame.lookAt(a, Vector3.new(f.X, a.Y, f.Z)); s.Parent = par or b.parent; return s
	end
	function b.label(part, face, text, color, font, bg)
		local g = Instance.new("SurfaceGui"); g.Face = face or Enum.NormalId.Front; g.PixelsPerStud = 25; g.LightInfluence = 0; g.Parent = part
		local l = Instance.new("TextLabel"); l.Size = UDim2.fromScale(1, 1); l.BackgroundTransparency = bg and 0 or 1; l.BackgroundColor3 = bg or Color3.new()
		l.Text = text; l.TextScaled = true; l.TextColor3 = color or Color3.new(1, 1, 1); l.Font = font or Enum.Font.GothamBold; l.Parent = g; return l
	end
	function b.light(part, range, color, brightness)
		local l = Instance.new("PointLight"); l.Range = range or 14; l.Color = color or Color3.fromRGB(255, 240, 220); l.Brightness = brightness or 1; l.Parent = part; return l
	end
	-- shell: floor, walls, glass front with a door opening, roof + trim, front sign
	function b.shell(W, D, H, st)
		local wall, trim = st.wall, st.trim
		b.P("Floor", Vector3.new(W, 0.6, D), Vector3.new(0, 0.3, 0), st.floor, st.floorMat)
		b.P("Roof", Vector3.new(W + 2, 1, D + 2), Vector3.new(0, H + 0.5, 0), st.roof or wall)
		b.P("RoofTrim", Vector3.new(W + 2.4, 0.5, 0.6), Vector3.new(0, H + 0.4, -D / 2 - 1.1), trim, Enum.Material.Metal)
		b.P("Ceiling", Vector3.new(W - 1, 0.3, D - 1), Vector3.new(0, H - 0.15, 0), st.ceiling or Color3.fromRGB(240, 238, 234))
		b.P("BackWall", Vector3.new(W, H, 1), Vector3.new(0, H / 2, D / 2 - 0.5), wall, st.wallMat)
		for _, s in ipairs({-1, 1}) do b.P("SideWall", Vector3.new(1, H, D), Vector3.new(s * (W / 2 - 0.5), H / 2, 0), wall, st.wallMat) end
		local door = st.door or 8
		local side = (W - door) / 2
		for _, s in ipairs({-1, 1}) do
			b.P("FrontGlass", Vector3.new(side - 1, H - 1.5, 0.4), Vector3.new(s * (door / 2 + (side - 1) / 2), (H - 1.5) / 2 + 0.6, -D / 2 + 0.3), Color3.fromRGB(160, 195, 210), Enum.Material.Glass, st.glassT or 0.55)
			b.P("FrontPier", Vector3.new(1, H, 1), Vector3.new(s * (W / 2 - 0.5), H / 2, -D / 2 + 0.5), wall, st.wallMat)
			b.P("DoorFrame", Vector3.new(0.6, H - 1.5, 0.8), Vector3.new(s * (door / 2 + 0.3), (H - 1.5) / 2 + 0.6, -D / 2 + 0.3), trim, Enum.Material.Metal)
		end
		b.P("FrontHeader", Vector3.new(W, 1.5, 1), Vector3.new(0, H - 0.75, -D / 2 + 0.5), wall, st.wallMat)
		b.P("Step", Vector3.new(door + 4, 0.5, 3), Vector3.new(0, 0.25, -D / 2 - 1.5), Color3.fromRGB(200, 196, 188), Enum.Material.Concrete)
		local sign = b.P("Sign", Vector3.new(math.min(W - 6, 34), 4, 0.6), Vector3.new(0, H + 3, -D / 2 - 0.6), st.signBg or Color3.fromRGB(20, 22, 28))
		b.label(sign, Enum.NormalId.Front, st.name, st.signColor or trim, st.font or Enum.Font.GothamBlack)
		local glow = b.P("SignGlow", Vector3.new(math.min(W - 6, 34) + 1, 0.3, 0.3), Vector3.new(0, H + 0.9, -D / 2 - 0.9), st.signColor or trim, Enum.Material.Neon)
		b.light(glow, 18, st.signColor or trim, 1.5)
		return sign
	end
	return b
end
return K
