# Reels source (Reels Editor)
One HTML page renders each reel frame by frame (`?cut=ritual|nails|pixel`).
1. Source frames go in `frames/` (not committed): 3D spin crop, massager store photos, phone scroll frames of sample sites (samra, torq-atelier, sukkar).
2. `node record.js <cut> <outDir>` -> JPEG frames at 30 fps.
3. `ffmpeg -framerate 30 -i <outDir>/f%05d.jpg -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart ads/video/<name>.mp4`
Silent on purpose: sound is added in CapCut/TikTok.
