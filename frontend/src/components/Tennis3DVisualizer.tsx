import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, Video, Eye, Target, Zap, ShieldCheck, Crosshair } from 'lucide-react';
import { BounceEvent } from '../types';

interface Tennis3DVisualizerProps {
  events?: BounceEvent[];
  selectedEvent?: BounceEvent | null;
  onSelectEvent?: (event: BounceEvent) => void;
}

interface ShotPreset {
  id: string;
  name: string;
  description: string;
  speedMph: number;
  call: 'IN' | 'OUT' | 'UNCERTAIN';
  marginCm: number;
  start: [number, number, number];
  apex: [number, number, number];
  bounce: [number, number, number];
  end: [number, number, number];
}

const SHOT_PRESETS: ShotPreset[] = [
  {
    id: 'ace_center',
    name: "Ace Down the 'T'",
    description: '124 MPH Flat First Serve skimming the center service line',
    speedMph: 124,
    call: 'IN',
    marginCm: 4.2,
    start: [1.2, 2.7, -11.8],
    apex: [0.6, 1.5, -4.0],
    bounce: [0.08, 0.05, 6.35],
    end: [-0.4, 0.9, 11.2],
  },
  {
    id: 'crosscourt_forehand',
    name: 'Cross-Court Topspin Forehand',
    description: 'Heavy 3,100 RPM topspin dipping sharply into the corner',
    speedMph: 91,
    call: 'IN',
    marginCm: 8.5,
    start: [-3.8, 1.1, -11.5],
    apex: [-1.2, 2.1, 0.0],
    bounce: [3.85, 0.05, 10.6],
    end: [5.2, 1.2, 13.5],
  },
  {
    id: 'down_the_line_out',
    name: 'Down-the-Line Winner (Close Call)',
    description: 'Aggressive backhand landing 2.4cm past the singles sideline',
    speedMph: 88,
    call: 'OUT',
    marginCm: -2.4,
    start: [-3.5, 1.0, -11.0],
    apex: [-3.7, 1.7, 0.0],
    bounce: [-4.25, 0.05, 9.8],
    end: [-4.6, 0.8, 13.0],
  },
  {
    id: 'hawkeye_chalk',
    name: 'Hawk-Eye Line Paint (1.8mm IN)',
    description: 'Micro-footprint compression touching the outer edge of the sideline',
    speedMph: 96,
    call: 'IN',
    marginCm: 0.18,
    start: [2.5, 1.2, -11.2],
    apex: [3.2, 1.8, 0.0],
    bounce: [4.11, 0.05, 8.2],
    end: [4.7, 1.0, 12.5],
  },
];

export const Tennis3DVisualizer: React.FC<Tennis3DVisualizerProps> = ({
  events = [],
  selectedEvent,
  onSelectEvent,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [activePreset, setActivePreset] = useState<ShotPreset>(SHOT_PRESETS[0]);
  const [cameraMode, setCameraMode] = useState<'BROADCAST' | 'HAWKEYE' | 'UMPIRE' | 'BASELINE'>('BROADCAST');
  const [impactHappened, setImpactHappened] = useState<boolean>(false);
  const [ballSpeedDisplay, setBallSpeedDisplay] = useState<number>(124);

  // References across render loop
  const animFrameRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ballMeshRef = useRef<THREE.Mesh | null>(null);
  const ballGlowRef = useRef<THREE.PointLight | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const trailPositionsRef = useRef<Float32Array>(new Float32Array(300 * 3));
  const trailCountRef = useRef<number>(0);
  const impactDiscRef = useRef<THREE.Mesh | null>(null);
  const chalkParticlesRef = useRef<THREE.Points | null>(null);

  // Pointer drag controls state
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraRotationRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0,
    phi: Math.PI / 4,
    radius: 24,
  });

  // Calculate position along multi-segment trajectory curve
  const getTrajectoryPoint = (preset: ShotPreset, t: number): THREE.Vector3 => {
    // t from 0 to 1
    // Segment 1: start -> apex -> bounce (t: 0 to 0.75)
    // Segment 2: bounce -> rebound -> end (t: 0.75 to 1.0)
    if (t < 0.75) {
      const segT = t / 0.75;
      const p0 = new THREE.Vector3(...preset.start);
      const p1 = new THREE.Vector3(...preset.apex);
      const p2 = new THREE.Vector3(...preset.bounce);
      // Quadratic Bezier
      const oneMinusT = 1.0 - segT;
      const x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * segT * p1.x + segT * segT * p2.x;
      const y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * segT * p1.y + segT * segT * p2.y;
      const z = oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * segT * p1.z + segT * segT * p2.z;
      return new THREE.Vector3(x, Math.max(0.04, y), z);
    } else {
      const segT = (t - 0.75) / 0.25;
      const p0 = new THREE.Vector3(...preset.bounce);
      // Rebound apex
      const reboundApex = new THREE.Vector3(
        preset.bounce[0] + (preset.end[0] - preset.bounce[0]) * 0.4,
        1.1,
        preset.bounce[2] + (preset.end[2] - preset.bounce[2]) * 0.4
      );
      const p2 = new THREE.Vector3(...preset.end);
      const oneMinusT = 1.0 - segT;
      const x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * segT * reboundApex.x + segT * segT * p2.x;
      const y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * segT * reboundApex.y + segT * segT * p2.y;
      const z = oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * segT * reboundApex.z + segT * segT * p2.z;
      return new THREE.Vector3(x, Math.max(0.04, y), z);
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060b14);
    scene.fog = new THREE.FogExp2(0x060b14, 0.015);

    // --- Camera Setup ---
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(0, 10, -22);
    camera.lookAt(0, 1, 0);

    // --- Renderer Setup ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const floodLight1 = new THREE.DirectionalLight(0xe0f2fe, 1.4);
    floodLight1.position.set(12, 18, -12);
    floodLight1.castShadow = true;
    floodLight1.shadow.mapSize.width = 1024;
    floodLight1.shadow.mapSize.height = 1024;
    scene.add(floodLight1);

    const floodLight2 = new THREE.DirectionalLight(0xdcfce7, 1.1);
    floodLight2.position.set(-12, 18, 12);
    scene.add(floodLight2);

    // --- Court Construction (ITF Regulation in Meters) ---
    // Outer stadium apron (forest green)
    const outerGeo = new THREE.PlaneGeometry(24, 38);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.8,
      metalness: 0.1,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.rotation.x = -Math.PI / 2;
    outerMesh.receiveShadow = true;
    scene.add(outerMesh);

    // Inner playing court (deep US Open cobalt blue)
    // Doubles width: 10.97m, Length: 23.77m
    const innerGeo = new THREE.PlaneGeometry(10.97, 23.77);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Vibrant tournament blue
      roughness: 0.6,
      metalness: 0.15,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.rotation.x = -Math.PI / 2;
    innerMesh.position.y = 0.005;
    innerMesh.receiveShadow = true;
    scene.add(innerMesh);

    // White Court Boundary Lines Helper
    const createLine = (x1: number, z1: number, x2: number, z2: number, lineWidth = 0.06) => {
      const length = Math.hypot(x2 - x1, z2 - z1);
      const lineGeo = new THREE.PlaneGeometry(lineWidth, length);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.position.set((x1 + x2) / 2, 0.01, (z1 + z2) / 2);
      const angle = Math.atan2(x2 - x1, z2 - z1);
      lineMesh.rotation.z = -angle;
      scene.add(lineMesh);
    };

    const HW = 8.23 / 2; // singles half-width: 4.115m
    const HDW = 10.97 / 2; // doubles half-width: 5.485m
    const HL = 23.77 / 2; // half-length: 11.885m
    const SL = 6.40; // service line distance from net: 6.40m

    // Baselines (wider 0.08m)
    createLine(-HDW, -HL, HDW, -HL, 0.08);
    createLine(-HDW, HL, HDW, HL, 0.08);

    // Doubles Sidelines
    createLine(-HDW, -HL, -HDW, HL);
    createLine(HDW, -HL, HDW, HL);

    // Singles Sidelines
    createLine(-HW, -HL, -HW, HL);
    createLine(HW, -HL, HW, HL);

    // Service Lines (z = -SL and z = SL)
    createLine(-HW, -SL, HW, -SL);
    createLine(-HW, SL, HW, SL);

    // Center Service Line (z: -SL to +SL)
    createLine(0, -SL, 0, SL);

    // Baseline Center Marks (0.1m long)
    createLine(0, -HL, 0, -HL + 0.15);
    createLine(0, HL - 0.15, 0, HL);

    // --- Tennis Net ---
    // Net posts (cylinders at x = ±6.0m)
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 16);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const postLeft = new THREE.Mesh(postGeo, postMat);
    postLeft.position.set(-6.0, 0.55, 0);
    const postRight = new THREE.Mesh(postGeo, postMat);
    postRight.position.set(6.0, 0.55, 0);
    scene.add(postLeft);
    scene.add(postRight);

    // Net mesh surface
    const netGeo = new THREE.PlaneGeometry(12.0, 0.95, 32, 8);
    const netMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(0, 0.5, 0);
    scene.add(netMesh);

    // White top headband strap (0.914m at center to 1.07m at posts)
    const bandGeo = new THREE.PlaneGeometry(12.0, 0.08);
    const bandMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const bandMesh = new THREE.Mesh(bandGeo, bandMat);
    bandMesh.position.set(0, 0.98, 0);
    scene.add(bandMesh);

    // Center strap
    const strapGeo = new THREE.PlaneGeometry(0.06, 0.98);
    const strapMesh = new THREE.Mesh(strapGeo, bandMat);
    strapMesh.position.set(0, 0.49, 0.01);
    scene.add(strapMesh);

    // --- 3D Tennis Ball ---
    const ballGeo = new THREE.SphereGeometry(0.065, 32, 32); // 6.5cm tennis ball radius
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xccff00, // Optic fluorescent tennis yellow
      roughness: 0.7,
      metalness: 0.05,
      emissive: 0x84cc16,
      emissiveIntensity: 0.3,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    ballMesh.position.set(activePreset.start[0], activePreset.start[1], activePreset.start[2]);
    scene.add(ballMesh);
    ballMeshRef.current = ballMesh;

    // Ball Point Light (subtle moving neon illumination)
    const ballGlow = new THREE.PointLight(0xccff00, 1.2, 3.5);
    ballMesh.add(ballGlow);
    ballGlowRef.current = ballGlow;

    // --- Dynamic Motion Trail ---
    const maxTrailPoints = 250;
    const trailPositions = new Float32Array(maxTrailPoints * 3);
    trailPositionsRef.current = trailPositions;
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);
    trailLineRef.current = trailLine;

    // --- Hawk-Eye Impact Disc on Court Floor ---
    const impactDiscGeo = new THREE.CircleGeometry(0.08, 32);
    const impactDiscMat = new THREE.MeshBasicMaterial({
      color: activePreset.call === 'IN' ? 0x10b981 : 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
    });
    const impactDisc = new THREE.Mesh(impactDiscGeo, impactDiscMat);
    impactDisc.rotation.x = -Math.PI / 2;
    impactDisc.position.set(activePreset.bounce[0], 0.02, activePreset.bounce[2]);
    scene.add(impactDisc);
    impactDiscRef.current = impactDisc;

    // --- Chalk Dust Burst Particles ---
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      particlePos[i] = 0;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.0,
    });
    const chalkParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(chalkParticles);
    chalkParticlesRef.current = chalkParticles;

    // --- Pointer Drag Listeners for Orbit Camera ---
    const handlePointerDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

      const rot = cameraRotationRef.current;
      rot.theta -= deltaX * 0.008;
      rot.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, rot.phi + deltaY * 0.008));
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rot = cameraRotationRef.current;
      rot.radius = Math.max(4.0, Math.min(35.0, rot.radius + e.deltaY * 0.02));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    domElement.addEventListener('wheel', handleWheel, { passive: false });

    // Handle Resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      domElement.removeEventListener('wheel', handleWheel);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      renderer.dispose();
      outerGeo.dispose();
      innerGeo.dispose();
      ballGeo.dispose();
      ballMat.dispose();
    };
  }, []);

  // Update preset or camera view
  useEffect(() => {
    progressRef.current = 0;
    trailCountRef.current = 0;
    setImpactHappened(false);

    if (impactDiscRef.current) {
      impactDiscRef.current.position.set(activePreset.bounce[0], 0.02, activePreset.bounce[2]);
      const mat = impactDiscRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setHex(activePreset.call === 'IN' ? 0x10b981 : 0xef4444);
      mat.opacity = 0;
    }
  }, [activePreset]);

  // Main Render & Physics Animation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animFrameRef.current = requestAnimationFrame(animate);
      const deltaSec = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const ball = ballMeshRef.current;
      const trail = trailLineRef.current;
      const disc = impactDiscRef.current;
      const chalk = chalkParticlesRef.current;

      if (!camera || !scene || !renderer || !ball || !trail) return;

      if (isPlaying) {
        // Advance progress
        const speedFactor = 0.55 * playbackSpeed;
        progressRef.current += deltaSec * speedFactor;

        // Loop after complete
        if (progressRef.current > 1.35) {
          progressRef.current = 0;
          trailCountRef.current = 0;
          setImpactHappened(false);
          if (disc) {
            (disc.material as THREE.MeshBasicMaterial).opacity = 0;
          }
        }

        // Clamp current t for ball position
        const t = Math.min(1.0, progressRef.current);
        const ballPos = getTrajectoryPoint(activePreset, t);
        ball.position.copy(ballPos);

        // Spin ball
        ball.rotation.x += 0.25;
        ball.rotation.y += 0.15;

        // Dynamic speed calculation display
        const currentSpeed = t < 0.75
          ? Math.round(activePreset.speedMph * (1.0 - t * 0.15))
          : Math.round(activePreset.speedMph * 0.65);
        setBallSpeedDisplay(currentSpeed);

        // Update trail buffer
        const trailPositions = trailPositionsRef.current;
        const count = trailCountRef.current;
        if (count < 250 && t < 1.0) {
          trailPositions[count * 3 + 0] = ballPos.x;
          trailPositions[count * 3 + 1] = ballPos.y;
          trailPositions[count * 3 + 2] = ballPos.z;
          trailCountRef.current += 1;
          trail.geometry.setDrawRange(0, trailCountRef.current);
          trail.geometry.attributes.position.needsUpdate = true;
        }

        // Impact detection at t = 0.75
        if (t >= 0.74 && !impactHappened) {
          setImpactHappened(true);
          if (disc) {
            (disc.material as THREE.MeshBasicMaterial).opacity = 0.95;
          }
          // Chalk dust burst animation
          if (chalk) {
            const posAttr = chalk.geometry.attributes.position as THREE.BufferAttribute;
            const arr = posAttr.array as Float32Array;
            for (let i = 0; i < 60; i++) {
              arr[i * 3 + 0] = activePreset.bounce[0] + (Math.random() - 0.5) * 0.35;
              arr[i * 3 + 1] = 0.05 + Math.random() * 0.3;
              arr[i * 3 + 2] = activePreset.bounce[2] + (Math.random() - 0.5) * 0.35;
            }
            posAttr.needsUpdate = true;
            (chalk.material as THREE.PointsMaterial).opacity = 0.8;
          }
        }

        // Fade chalk particles after bounce
        if (chalk && (chalk.material as THREE.PointsMaterial).opacity > 0.01) {
          (chalk.material as THREE.PointsMaterial).opacity -= deltaSec * 0.9;
        }

        // Pulsing Hawk-Eye impact disc
        if (disc && impactHappened) {
          const discMat = disc.material as THREE.MeshBasicMaterial;
          discMat.opacity = 0.7 + 0.25 * Math.sin(currentTime * 0.01);
        }
      }

      // Camera Positioning Modes
      if (!isDraggingRef.current) {
        if (cameraMode === 'BROADCAST') {
          // Classic stationary behind-baseline camera
          camera.position.lerp(new THREE.Vector3(0, 7.5, -18.5), 0.08);
          camera.lookAt(0, 1.0, 2.0);
        } else if (cameraMode === 'HAWKEYE') {
          // Dynamic camera swooping close to bounce point
          const targetCam = new THREE.Vector3(
            activePreset.bounce[0] + 0.8,
            1.6,
            activePreset.bounce[2] - 2.8
          );
          camera.position.lerp(targetCam, 0.08);
          camera.lookAt(activePreset.bounce[0], 0.1, activePreset.bounce[2]);
        } else if (cameraMode === 'UMPIRE') {
          // Elevated sideline chair view
          camera.position.lerp(new THREE.Vector3(7.2, 3.8, 0), 0.08);
          camera.lookAt(0, 0.8, 0);
        } else if (cameraMode === 'BASELINE') {
          // Low on-court receiver perspective
          camera.position.lerp(new THREE.Vector3(0, 1.7, -13.5), 0.08);
          camera.lookAt(ball.position.x * 0.4, 1.2, ball.position.z);
        }
      } else {
        // Free orbit camera driven by mouse drag
        const rot = cameraRotationRef.current;
        const x = rot.radius * Math.sin(rot.phi) * Math.sin(rot.theta);
        const y = rot.radius * Math.cos(rot.phi);
        const z = rot.radius * Math.sin(rot.phi) * Math.cos(rot.theta);
        camera.position.set(x, Math.max(1.0, y), z);
        camera.lookAt(0, 1.0, 0);
      }

      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, activePreset, cameraMode, impactHappened]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '580px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1f2937', background: '#060b14' }}>
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Top Overlay: Speed Meter & Hawk-Eye Verdict */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Speed HUD */}
        <div
          style={{
            background: 'rgba(11, 15, 25, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '10px 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Radar Velocity
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>
              {ballSpeedDisplay}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>MPH</span>
          </div>
        </div>

        {/* Live Call Decision Badge */}
        <div
          style={{
            background:
              activePreset.call === 'IN'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
            backdropFilter: 'blur(10px)',
            border:
              activePreset.call === 'IN'
                ? '1px solid rgba(16, 185, 129, 0.5)'
                : '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '10px',
            padding: '10px 18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: activePreset.call === 'IN' ? '#34d399' : '#f87171', textTransform: 'uppercase' }}>
            Hawk-Eye Verdict
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 900,
              color: activePreset.call === 'IN' ? '#34d399' : '#f87171',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {activePreset.call === 'IN' ? <ShieldCheck size={22} /> : <Zap size={22} />}
            {activePreset.call}
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginLeft: '6px' }}>
              ({activePreset.marginCm > 0 ? `+${activePreset.marginCm}cm inside` : `${Math.abs(activePreset.marginCm)}cm wide`})
            </span>
          </div>
        </div>
      </div>

      {/* Top Right: Preset Selector */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px', textAlign: 'right' }}>
          Shot Trajectory Presets
        </div>
        {SHOT_PRESETS.map((p) => {
          const isActive = activePreset.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActivePreset(p)}
              style={{
                background: isActive ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(17, 24, 39, 0.8)',
                backdropFilter: 'blur(8px)',
                border: isActive ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.4)' : 'none',
              }}
            >
              <span>{p.name}</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: p.call === 'IN' ? 'rgba(52, 211, 153, 0.25)' : 'rgba(248, 113, 113, 0.25)',
                  color: p.call === 'IN' ? '#34d399' : '#f87171',
                }}
              >
                {p.call}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Floating Control Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(11, 15, 25, 0.92)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        }}
      >
        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: isPlaying ? '#1f2937' : '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        {/* Replay */}
        <button
          onClick={() => {
            progressRef.current = 0;
            trailCountRef.current = 0;
            setImpactHappened(false);
          }}
          style={{
            background: '#1f2937',
            color: '#94a3b8',
            border: 'none',
            borderRadius: '8px',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Replay Shot"
        >
          <RotateCcw size={16} />
        </button>

        <div style={{ width: 1, height: 24, background: '#374151' }} />

        {/* Camera Views */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginRight: '4px', fontWeight: 600 }}>Camera:</span>
          {(
            [
              { id: 'BROADCAST', label: 'Broadcast', icon: Video },
              { id: 'HAWKEYE', label: 'Hawk-Eye Close', icon: Crosshair },
              { id: 'UMPIRE', label: 'Umpire', icon: Eye },
              { id: 'BASELINE', label: 'POV', icon: Target },
            ] as const
          ).map((c) => {
            const isSelected = cameraMode === c.id;
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => setCameraMode(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: isSelected ? '#10b981' : '#1f2937',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <Icon size={13} /> {c.label}
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 24, background: '#374151' }} />

        {/* Speed Controls */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginRight: '4px', fontWeight: 600 }}>Speed:</span>
          {[0.25, 0.5, 1.0, 2.0].map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              style={{
                background: playbackSpeed === s ? '#3b82f6' : '#1f2937',
                color: playbackSpeed === s ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
