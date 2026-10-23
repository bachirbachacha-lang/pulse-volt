# Showreel de motion graphics — decisiones

**Entrega:** `pixelandco-showreel-1080p60.mp4` · 1920×1080 · 60 fps · 15,0 s · H.264 + AAC 256 kbps
**Fuentes:** `reel.html` (animación), `music.py` (música)
**Tiempo total:** unos 7 minutos de reloj (411 s), desde ver el vídeo de referencia hasta el MP4 final. El render de los 900 fotogramas tardó 1 min 49 s, y la síntesis de la música 3 s.

## La regla que marcó todo

Todo es código. No usé ningún modelo de imagen, vídeo ni audio, ni fotos, samples o vídeos de stock. Cada píxel sale de un `<canvas>` 2D y cada sonido de osciladores, ruido y envolventes calculados con NumPy.

## Qué decidí

**1. Una función pura del tiempo.** Toda la pieza es `render(t)`: dado un segundo, dibuja ese fotograma exacto. Así puedo grabar a 60 fps reales, fotograma a fotograma, sin depender de la velocidad del navegador. Una grabación de pantalla habría salido con saltos.

**2. La música manda.** Fijé 120 BPM antes de animar nada: 1 pulso = 0,5 s y 1 compás = 2 s. Cada escena dura un compás de 2 s y corta justo cuando entra el bombo o un impacto. Los efectos que dependen del ritmo (el «punch» de cámara, el ecualizador y el tamaño de las formas) leen la misma función `pulse(t)` que usa la música, así que la sincronía es matemática, no a ojo.

**3. Siete escenas, siete habilidades.** Cada escena muestra una técnica distinta de motion design:

| t (s) | Escena | Qué demuestra |
|---|---|---|
| 0–2 | **Easing** | Una curva cubic-bezier se dibuja con sus manejadores y un punto la recorre. Es la base del oficio. |
| 2–4 | **Kinetic type** | «MOTION» entra letra a letra con overshoot (easeOutBack), y luego cada letra se corta en dos mitades que se separan. |
| 4–6 | **Sistemas** | Una retícula de 364 formas se propaga en onda desde el centro y pasa de círculo a cuadrado a cruz. |
| 6–8 | **Fluido** | Metaballs naranjas que se funden y revelan la palabra «FLUID» solo dentro del líquido. |
| 8–10 | **Profundidad** | Una retícula isométrica de 256 bloques extruidos en 3D, dibujada a mano sin librería 3D, con un punto de calor que la recorre. |
| 10–12 | **Ritmo** | Maquetación suiza: un contador 00→60 fps, el texto «EVERY FRAME IS CODE.» con máscaras, y un ecualizador que sigue a la batería. |
| 12–15 | **Identidad** | Un salto a hiperespacio con 420 líneas y un flash, el logo de Pixel & Co. que se arma con cuatro piezas, y el nombre que aparece con una máscara mientras el tracking se cierra. |

**4. La paleta de la marca.** Negro tinta `#07060F`, violeta `#7C6CFF` (el del logo) y un naranja `#FF5A36` como golpe de energía. Las escenas alternan fondo oscuro, violeta, blanco y naranja para que cada corte se note aunque el vídeo esté sin sonido.

**5. La tipografía.** *Unbounded 900* para los titulares, ancha y con mucha presencia, y *JetBrains Mono* para el HUD. El HUD imita un timecode, un contador de fotogramas, los BPM, el número de escena y una línea de tiempo, para que parezca el «monitor de un editor».

**6. El acabado.** Separación RGB en los dos fotogramas de cada corte, grano animado, viñeta, micro-zoom en cada pulso, y temblor de cámara en la subida antes del hiperespacio.

**7. La música (todo sintetizado).** La menor, con la progresión Am – F – C – G.
- **0–2 s:** un pad de sierras desafinadas con filtro y «ticks» de reloj bajo la curva de easing.
- **2 s, el drop:** bombo (seno con barrido de tono), palmas (ráfagas de ruido filtrado), hi-hats en semicorcheas, y un bajo con sidechain que sigue la fundamental.
- **4–12 s:** un arpegio de pulsos cuadrados con delay de corchea con puntillo en ping-pong. Se abre de brillo en cada compás.
- **10–12 s:** un redoble de caja que acelera (corcheas → semicorcheas → fusas), una subida de ruido con filtro de 300 a 9000 Hz, y un barrido de seno.
- **12 s:** un impacto grande (sub-boom + crash) y un acorde final Am(add9) con cola larga.
- **Master:** saturación suave con `tanh`, normalizado a −1 dBFS y fundido en los últimos 0,6 s.

## Qué descarté

- **WebGL / three.js:** demasiado para 15 s. La isometría a mano en Canvas 2D da el mismo efecto de «3D», pesa menos y es 100 % determinista al grabar.
- **Grabar la pantalla en tiempo real:** daba fotogramas irregulares. Lo cambié por render fotograma a fotograma.
- **Una voz o texto narrado:** el reto pide no usar modelos de audio, y además un showreel funciona mejor solo con música.
- **Samples de batería:** prohibidos por el reto. Todos los golpes se generan con fórmulas.
- **Una escena de partículas 3D formando el logo:** demasiado ruidosa junto al hiperespacio. Me quedé con piezas que encajan, que se leen mejor.
- **Más de 7 escenas:** a 2 s por escena ya va rápido. Con más, nada se habría podido leer.

## Iteraciones

1. **Primer render de prueba (11 fotogramas sueltos):** todas las escenas funcionaban. El problema estaba en «FLUID»: los metaballs se dibujaban como una retícula de puntos y se veía pixelado.
2. **Fluido v2:** calculé el campo de metaballs en un búfer a 1/4 de resolución, con umbral suave, y lo escalé. Desapareció el pixelado, pero los bordes quedaron demasiado borrosos.
3. **Fluido v3:** subí la pendiente del umbral (×6 → ×26) para tener bordes líquidos nítidos. También quité los brillos especulares, porque quedaban fuera de las gotas.
4. **Mezcla v1:** analicé la energía por segundo. La intro estaba a −31 dB y el resto a −12 dB, así que el salto era demasiado brusco. En el espectrograma, además, los hi-hats llenaban mucho los agudos.
5. **Mezcla v2:** subí el pad y los ticks de la intro y bajé los hi-hats un 30 %.
6. **Render final:** 900 fotogramas JPEG al 94 %, codificados con x264 CRF 16 y unidos al audio. Comprobé con ffprobe: 1920×1080, 60/1 fps, 15,000 s.

## Cómo reproducirlo

```bash
python3 music.py music.wav                 # sintetiza la música (48 kHz estéreo)
# abre reel.html#rec en Chromium y llama a render(f/60) para f = 0…899, guardando cada fotograma
ffmpeg -framerate 60 -i frames/%04d.jpg -i music.wav -c:v libx264 -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest showreel.mp4
```
