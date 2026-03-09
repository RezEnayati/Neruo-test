"use client";
import { useState, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

interface EmbeddingPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  matchId: string | null;
  status: string;
}

interface MatchLine {
  from: string;
  to: string;
}

const COLORS = [
  "#E8C872", "#4ADE80", "#38BDF8", "#FB923C", "#C084FC",
  "#2DD4BF", "#F87171", "#FBBF24", "#67E8F9", "#F472B6",
  "#A78BFA", "#34D399", "#FACC15", "#7DD3FC", "#818CF8",
  "#86EFAC", "#FDE68A", "#93C5FD", "#F9A8D4", "#A5F3FC",
];

function GridFloor() {
  return (
    <group>
      <gridHelper args={[4, 12, "#252422", "#1A1918"]} position={[0, -2, 0]} />
      <gridHelper args={[4, 12, "#252422", "#1A1918"]} position={[0, 0, -2]} rotation={[Math.PI / 2, 0, 0]} />
      <gridHelper args={[4, 12, "#252422", "#1A1918"]} position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
    </group>
  );
}

function AxisLabels() {
  return (
    <group>
      <Text position={[2.4, -2, 0]} fontSize={0.12} color="#5C5955" anchorX="center" font={undefined}>
        PC1
      </Text>
      <Text position={[0, 2.4, 0]} fontSize={0.12} color="#5C5955" anchorX="center" font={undefined}>
        PC2
      </Text>
      <Text position={[0, -2, 2.4]} fontSize={0.12} color="#5C5955" anchorX="center" font={undefined}>
        PC3
      </Text>
    </group>
  );
}

function DataPoint({
  position,
  color,
  name,
  isMatched,
}: {
  position: [number, number, number];
  color: string;
  name: string;
  isMatched: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0] * 3) * 0.02;
    }
  });

  return (
    <group position={position}>
      {/* Soft glow */}
      <mesh>
        <sphereGeometry args={[hovered ? 0.2 : 0.12, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.15 : 0.07} />
      </mesh>

      {/* Core sphere */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[hovered ? 0.08 : 0.055, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isMatched ? 0.5 : 0.25}
          roughness={0.25}
          metalness={0.2}
        />
      </mesh>

      {/* Name label */}
      <Text
        position={[0, hovered ? 0.22 : 0.16, 0]}
        fontSize={hovered ? 0.1 : 0.07}
        color="#E8E6E1"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.012}
        outlineColor="#111110"
        font={undefined}
      >
        {name}
      </Text>
    </group>
  );
}

function MatchConnection({
  start,
  end,
}: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  return (
    <Line
      points={[start, end]}
      color="#E8E6E1"
      lineWidth={1}
      dashed
      dashSize={0.08}
      gapSize={0.06}
      opacity={0.2}
      transparent
    />
  );
}

function AutoRotate() {
  const { camera } = useThree();
  const angle = useRef(0);

  useFrame((_, delta) => {
    angle.current += delta * 0.05;
    const radius = 5.5;
    camera.position.x = Math.sin(angle.current) * radius;
    camera.position.z = Math.cos(angle.current) * radius;
    camera.position.y = 2.5 + Math.sin(angle.current * 0.25) * 0.5;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function EmbeddingScene({
  points,
  matchLines,
  autoRotate,
}: {
  points: EmbeddingPoint[];
  matchLines: MatchLine[];
  autoRotate: boolean;
}) {
  const scale = 1.8;

  return (
    <Canvas
      camera={{ position: [4, 2.5, 4], fov: 42 }}
      style={{ background: "#111110" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 5]} intensity={0.5} color="#FFF8EE" />
      <pointLight position={[-4, 4, -4]} intensity={0.15} color="#E8C872" />

      <GridFloor />
      <AxisLabels />

      {points.map((point, i) => (
        <DataPoint
          key={point.id}
          position={[point.x * scale, point.y * scale, point.z * scale]}
          color={COLORS[i % COLORS.length]}
          name={point.name}
          isMatched={point.status === "matched"}
        />
      ))}

      {matchLines.map((line, i) => {
        const p1 = points.find((p) => p.id === line.from);
        const p2 = points.find((p) => p.id === line.to);
        if (!p1 || !p2) return null;
        return (
          <MatchConnection
            key={i}
            start={[p1.x * scale, p1.y * scale, p1.z * scale]}
            end={[p2.x * scale, p2.y * scale, p2.z * scale]}
          />
        );
      })}

      {autoRotate ? (
        <AutoRotate />
      ) : (
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={10}
          enablePan={false}
        />
      )}
    </Canvas>
  );
}
