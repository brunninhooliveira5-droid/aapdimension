import { useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Center } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

interface ModelSceneProps {
  geometry: THREE.BufferGeometry | null;
  slicePlanes?: { position: number; direction: "x" | "y" | "z" }[];
}

function ModelScene({ geometry, slicePlanes = [] }: ModelSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (geometry && meshRef.current) {
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      meshRef.current.position.set(-center.x, -center.y, -center.z);

      const maxDim = Math.max(size.x, size.y, size.z);
      (camera as THREE.PerspectiveCamera).position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
      (camera as THREE.PerspectiveCamera).lookAt(0, 0, 0);
    }
  }, [geometry, camera]);

  if (!geometry) return null;

  return (
    <>
      <Center>
        <mesh ref={meshRef} geometry={geometry}>
          <meshStandardMaterial
            color="#6b9bd2"
            metalness={0.3}
            roughness={0.5}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Center>
      {slicePlanes.map((plane, i) => {
        const rotation: [number, number, number] =
          plane.direction === "x"
            ? [0, 0, Math.PI / 2]
            : plane.direction === "z"
            ? [Math.PI / 2, 0, 0]
            : [0, 0, 0];
        const pos: [number, number, number] =
          plane.direction === "x"
            ? [plane.position, 0, 0]
            : plane.direction === "z"
            ? [0, 0, plane.position]
            : [0, plane.position, 0];

        return (
          <mesh key={i} position={pos} rotation={rotation}>
            <planeGeometry args={[200, 200]} />
            <meshBasicMaterial color="#ff6b35" transparent opacity={0.08} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </>
  );
}

interface ModelViewer3DProps {
  geometry: THREE.BufferGeometry | null;
  slicePlanes?: { position: number; direction: "x" | "y" | "z" }[];
  className?: string;
}

export function ModelViewer3D({ geometry, slicePlanes, className = "" }: ModelViewer3DProps) {
  return (
    <div className={`w-full h-full min-h-[300px] rounded-lg border border-border bg-muted/30 overflow-hidden ${className}`}>
      <Canvas camera={{ fov: 50, near: 0.1, far: 10000 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -5, -5]} intensity={0.3} />
        <ModelScene geometry={geometry} slicePlanes={slicePlanes} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
        <Grid args={[100, 100]} cellColor="#888" sectionColor="#666" fadeDistance={200} />
      </Canvas>
    </div>
  );
}

// ─── File Loader ─────────────────────────────────────────────

export function loadModelFile(file: File): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        if (ext === "stl") {
          const loader = new STLLoader();
          const arrayBuffer = e.target!.result as ArrayBuffer;
          const geometry = loader.parse(arrayBuffer);
          geometry.computeVertexNormals();
          resolve(geometry);
        } else if (ext === "obj") {
          const loader = new OBJLoader();
          const text = e.target!.result as string;
          const obj = loader.parse(text);
          let geo: THREE.BufferGeometry | null = null;
          obj.traverse((child) => {
            if (child instanceof THREE.Mesh && !geo) {
              geo = child.geometry as THREE.BufferGeometry;
              geo.computeVertexNormals();
            }
          });
          if (geo) resolve(geo);
          else reject(new Error("Nenhuma geometria encontrada no OBJ"));
        } else {
          reject(new Error("Formato não suportado: " + ext));
        }
      } catch (err) {
        reject(err);
      }
    };

    if (ext === "obj") {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}
