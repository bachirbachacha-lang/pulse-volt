import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/** Interactive viewer for STL, OBJ, GLB/GLTF files (drag to orbit, pinch/scroll to zoom). */
export default function ModelViewer({ url, name }: { url: string; name: string }) {
  const mount = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string>("");

  useEffect(() => {
    const el = mount.current!;
    setError(null);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.01, 10000);
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0b0f18, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 4);
    scene.add(key);
    const grid = new THREE.GridHelper(10, 20, 0x22d3ee, 0x1e293b);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const frame = (obj: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 4 / maxDim;
      obj.scale.setScalar(scale);
      obj.position.sub(center.multiplyScalar(scale));
      obj.position.y += (size.y * scale) / 2;
      camera.position.set(5, 4, 6);
      controls.target.set(0, (size.y * scale) / 2, 0);
      setInfo(`${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} (file units)`);
    };
    const material = new THREE.MeshStandardMaterial({ color: 0x9fb4cc, metalness: 0.35, roughness: 0.45 });
    const ext = name.split(".").pop()?.toLowerCase();
    const onErr = (e: unknown) => setError(e instanceof Error ? e.message : "Could not load model");
    if (ext === "stl") {
      new STLLoader().load(url, (geo) => { geo.computeVertexNormals(); const m = new THREE.Mesh(geo, material); m.rotation.x = -Math.PI / 2; const g = new THREE.Group(); g.add(m); scene.add(g); frame(g); }, undefined, onErr);
    } else if (ext === "obj") {
      new OBJLoader().load(url, (obj) => { obj.traverse((c) => { if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).material = material; }); scene.add(obj); frame(obj); }, undefined, onErr);
    } else if (ext === "glb" || ext === "gltf") {
      new GLTFLoader().load(url, (g) => { scene.add(g.scene); frame(g.scene); }, undefined, onErr);
    } else setError("Preview supports STL, OBJ, GLB and GLTF. Open other CAD files in their app.");

    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [url, name]);

  return (
    <div className="relative h-full w-full">
      <div ref={mount} className="h-full w-full touch-none" aria-label={`3D preview of ${name}. Drag to rotate, scroll or pinch to zoom.`} role="img" />
      {error && <p className="absolute inset-x-4 top-4 rounded-lg border border-danger/30 bg-card/90 p-2 text-sm text-danger">{error}</p>}
      {info && !error && <p className="absolute bottom-2 left-3 font-mono text-[11px] text-muted">{info}</p>}
    </div>
  );
}
