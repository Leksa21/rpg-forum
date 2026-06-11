import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Soft low-poly clouds drifting over the map — pairs visually with the
// moving cloud shadows baked into the terrain shader. One instanced mesh.
const CLOUD_COUNT = 20;
const PUFFS_PER_CLOUD = 4;
const AREA = 880;
const DRIFT_SPEED = 1.6; // world units per second

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

export default function Clouds({ seed = 42 }) {
  const groupRef = useRef();

  const { mesh, width } = useMemo(() => {
    const rand = rng(seed * 7919);
    const geo  = new THREE.IcosahedronGeometry(1, 0);
    const mat  = new THREE.MeshLambertMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });

    const mesh = new THREE.InstancedMesh(geo, mat, CLOUD_COUNT * PUFFS_PER_CLOUD);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();

    let i = 0;
    for (let c = 0; c < CLOUD_COUNT; c++) {
      const cx = (rand() - 0.5) * AREA;
      const cz = (rand() - 0.5) * AREA;
      const cy = 78 + rand() * 26;
      const cs = 5 + rand() * 7;
      for (let p = 0; p < PUFFS_PER_CLOUD; p++) {
        const px = cx + (rand() - 0.5) * cs * 2.2;
        const pz = cz + (rand() - 0.5) * cs * 1.1;
        const py = cy + (rand() - 0.5) * cs * 0.4;
        const ps = cs * (0.5 + rand() * 0.6);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI);
        m.compose(
          new THREE.Vector3(px, py, pz),
          q,
          new THREE.Vector3(ps, ps * 0.45, ps * 0.75)
        );
        mesh.setMatrixAt(i++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    return { mesh, width: AREA };
  }, [seed]);

  // Drift the whole cloud layer east; wrap around seamlessly
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.x += delta * DRIFT_SPEED;
    if (groupRef.current.position.x > width / 2) {
      groupRef.current.position.x -= width;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={mesh} />
      {/* Second copy offset by one full width so the wrap is invisible */}
      <primitive object={mesh.clone()} position={[-width, 0, 0]} />
    </group>
  );
}
