import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  Eye,
  Target,
  Zap,
  ShieldCheck,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Info,
} from 'lucide-react';
import { BounceEvent, SessionReport, ShotTrajectory } from '../types';

export interface Tennis3DVisualizerProps {
  session?: SessionReport | null;
  shots?: ShotTrajectory[];
  activeShotIndex?: number;
  onSelectShotIndex?: (index: number) => void;
  events?: BounceEvent[];
  selectedEvent?: BounceEvent | null;
  onSelectEvent?: (event: BounceEvent) => void;
}

interface InternalShot {
  id: string;
  shotNumber: number;
  name: string;
  strokeType: string;
  description: string;
  speedMph: number;
  call: 'IN' | 'OUT' | 'UNCERTAIN';
  marginCm: number;
  start: [number, number, number];
  apex: [number, number, number];
  bounce: [number, number, number];
  end: [number, number, number];
}

export const Tennis3DVisualizer: React.FC<Tennis3DVisualizerProps> = ({
  session,
  shots: propShots,
  activeShotIndex: propActiveIndex,
  onSelectShotIndex,
  events = [],
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [cameraMode, setCameraMode] = useState<'BROADCAST' | 'HAWKEYE' | 'UMPIRE' | 'BASELINE'>('BROADCAST');
  const [impactHappened, setImpactHappened] = useState<boolean>(false);
  const [ballSpeedDisplay, setBallSpeedDisplay] = useState<number>(90);
  const [scrubberValue, setScrubberValue] = useState<number>(0);
  const [internalActiveIndex, setInternalActiveIndex] = useState<number>(0);

  // Derive shots from props or session
  const rawShots = propShots || session?.shots || [];
  const activeShots: InternalShot[] = React.useMemo(() => {
    if (rawShots.length > 0) {
      return rawShots.map((s, idx) => ({
        id: `shot_${s.shot_number || idx + 1}`,
        shotNumber: s.shot_number || idx + 1,
        name: `Shot #${s.shot_number || idx + 1}`,
        strokeType: s.stroke_type || 'Groundstroke',
        description: s.description || `${s.speed_mph.toFixed(0)} MPH ${s.stroke_type}`,
        speedMph: s.speed_mph,
        call: s.call,
        marginCm: s.margin_cm,
        start: [s.start_pos.x, s.start_pos.y, s.start_pos.z],
        apex: [s.apex_pos.x, s.apex_pos.y, s.apex_pos.z],
        bounce: [s.bounce_pos.x, s.bounce_pos.y, s.bounce_pos.z],
        end: [s.end_pos.x, s.end_pos.y, s.end_pos.z],
      }));
    }
    return [];
  }, [rawShots]);

  const currentIndex = propActiveIndex !== undefined ? propActiveIndex : internalActiveIndex;
  const currentShot: InternalShot | null = activeShots[currentIndex] || activeShots[0] || null;

  const handleSelectShot = (idx: number) => {
    setInternalActiveIndex(idx);
    if (onSelectShotIndex) onSelectShotIndex(idx);
    progressRef.current = 0;
    trailCountRef.current = 0;
    setImpactHappened(false);
  };

  const handlePrevShot = () => {
    if (activeShots.length === 0) return;
    const nextIdx = Math.max(0, currentIndex - 1);
    handleSelectShot(nextIdx);
  };

  const handleNextShot = () => {
    if (activeShots.length === 0) return;
    const nextIdx = Math.min(activeShots.length - 1, currentIndex + 1);
    handleSelectShot(nextIdx);
  };

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
  const getTrajectoryPoint = (shot: InternalShot, t: number): THREE.Vector3 => {
    // Segment 1: start -> apex -> bounce (t: 0 to 0.75)
    // Segment 2: bounce -> rebound -> end (t: 0.75 to 1.0)
    if (t < 0.75) {
      const segT = t / 0.75;
      const p0 = new THREE.Vector3(...shot.start);
      const p1 = new THREE.Vector3(...shot.apex);
      const p2 = new THREE.Vector3(...shot.bounce);
      const oneMinusT = 1.0 - segT;
      const x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * segT * p1.x + segT * segT * p2.x;
      const y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * segT * p1.y + segT * segT * p2.y;
      const z = oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * segT * p1.z + segT * segT * p2.z;
      return new THREE.Vector3(x, Math.max(0.04, y), z);
    } else {
      const segT = (t - 0.75) / 0.25;
      const p0 = new THREE.Vector3(...shot.bounce);
      const reboundApex = new THREE.Vector3(
        shot.bounce[0] + (shot.end[0] - shot.bounce[0]) * 0.4,
        1.1,
        shot.bounce[2] + (shot.end[2] - shot.bounce[2]) * 0.4
      );
      const p2 = new THREE.Vector3(...shot.end);
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
    const height = container.clientHeight || 580;
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
    const innerGeo = new THREE.PlaneGeometry(10.97, 23.77);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
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

    // Baselines
    createLine(-HDW, -HL, HDW, -HL, 0.08);
    createLine(-HDW, HL, HDW, HL, 0.08);

    // Doubles Sidelines
    createLine(-HDW, -HL, -HDW, HL);
    createLine(HDW, -HL, HDW, HL);

    // Singles Sidelines
    createLine(-HW, -HL, -HW, HL);
    createLine(HW, -HL, HW, HL);

    // Service Lines
    createLine(-HW, -SL, HW, -SL);
    createLine(-HW, SL, HW, SL);

    // Center Service Line
    createLine(0, -SL, 0, SL);

    // Baseline Center Marks
    createLine(0, -HL, 0, -HL + 0.15);
    createLine(0, HL - 0.15, 0, HL);

    // --- Tennis Net ---
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 16);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const postLeft = new THREE.Mesh(postGeo, postMat);
    postLeft.position.set(-6.0, 0.55, 0);
    const postRight = new THREE.Mesh(postGeo, postMat);
    postRight.position.set(6.0, 0.55, 0);
    scene.add(postLeft);
    scene.add(postRight);

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

    const bandGeo = new THREE.PlaneGeometry(12.0, 0.08);
    const bandMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const bandMesh = new THREE.Mesh(bandGeo, bandMat);
    bandMesh.position.set(0, 0.98, 0);
    scene.add(bandMesh);

    const strapGeo = new THREE.PlaneGeometry(0.06, 0.98);
    const strapMesh = new THREE.Mesh(strapGeo, bandMat);
    strapMesh.position.set(0, 0.49, 0.01);
    scene.add(strapMesh);

    // --- 3D Tennis Ball ---
    const ballGeo = new THREE.SphereGeometry(0.065, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xccff00,
      roughness: 0.7,
      metalness: 0.05,
      emissive: 0x84cc16,
      emissiveIntensity: 0.3,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    ballMesh.position.set(0, 1.0, 0);
    scene.add(ballMesh);
    ballMeshRef.current = ballMesh;

    const ballGlow = new THREE.PointLight(0xccff00, 1.2, 3.5);
    ballMesh.add(ballGlow);
    ballGlowRef.current = ballGlow;

    // --- Dynamic Motion Trail ---
    const maxTrailPoints = 300;
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
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
    });
    const impactDisc = new THREE.Mesh(impactDiscGeo, impactDiscMat);
    impactDisc.rotation.x = -Math.PI / 2;
    impactDisc.position.set(0, 0.02, 0);
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

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

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

  // Update visual elements when active shot changes
  useEffect(() => {
    progressRef.current = 0;
    trailCountRef.current = 0;
    setImpactHappened(false);
    setScrubberValue(0);

    if (currentShot && impactDiscRef.current) {
      impactDiscRef.current.position.set(currentShot.bounce[0], 0.02, currentShot.bounce[2]);
      const mat = impactDiscRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setHex(currentShot.call === 'IN' ? 0x10b981 : 0xef4444);
      mat.opacity = 0;
    }
  }, [currentShot]);

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

      if (currentShot) {
        ball.visible = true;
        trail.visible = true;

        if (isPlaying) {
          const speedFactor = 0.55 * playbackSpeed;
          progressRef.current += deltaSec * speedFactor;

          if (progressRef.current > 1.35) {
            progressRef.current = 0;
            trailCountRef.current = 0;
            setImpactHappened(false);
            if (disc) {
              (disc.material as THREE.MeshBasicMaterial).opacity = 0;
            }
          }
        }

        const t = Math.min(1.0, Math.max(0, progressRef.current));
        setScrubberValue(t);

        const ballPos = getTrajectoryPoint(currentShot, t);
        ball.position.copy(ballPos);

        if (isPlaying) {
          ball.rotation.x += 0.25;
          ball.rotation.y += 0.15;
        }

        const currentSpeed = t < 0.75
          ? Math.round(currentShot.speedMph * (1.0 - t * 0.15))
          : Math.round(currentShot.speedMph * 0.65);
        setBallSpeedDisplay(currentSpeed);

        const trailPositions = trailPositionsRef.current;
        const count = trailCountRef.current;
        if (count < 300 && t < 1.0) {
          trailPositions[count * 3 + 0] = ballPos.x;
          trailPositions[count * 3 + 1] = ballPos.y;
          trailPositions[count * 3 + 2] = ballPos.z;
          trailCountRef.current += 1;
          trail.geometry.setDrawRange(0, trailCountRef.current);
          trail.geometry.attributes.position.needsUpdate = true;
        }

        // Hawk-Eye impact detection at t = 0.75
        if (t >= 0.74 && !impactHappened) {
          setImpactHappened(true);
          if (disc) {
            (disc.material as THREE.MeshBasicMaterial).opacity = 0.95;
          }
          if (chalk) {
            const posAttr = chalk.geometry.attributes.position as THREE.BufferAttribute;
            const arr = posAttr.array as Float32Array;
            for (let i = 0; i < 60; i++) {
              arr[i * 3 + 0] = currentShot.bounce[0] + (Math.random() - 0.5) * 0.35;
              arr[i * 3 + 1] = 0.05 + Math.random() * 0.3;
              arr[i * 3 + 2] = currentShot.bounce[2] + (Math.random() - 0.5) * 0.35;
            }
            posAttr.needsUpdate = true;
            (chalk.material as THREE.PointsMaterial).opacity = 0.8;
          }
        }

        if (chalk && (chalk.material as THREE.PointsMaterial).opacity > 0.01) {
          (chalk.material as THREE.PointsMaterial).opacity -= deltaSec * 0.9;
        }

        if (disc && impactHappened) {
          const discMat = disc.material as THREE.MeshBasicMaterial;
          discMat.opacity = 0.7 + 0.25 * Math.sin(currentTime * 0.01);
        }

        // Camera positioning
        if (!isDraggingRef.current) {
          if (cameraMode === 'BROADCAST') {
            camera.position.lerp(new THREE.Vector3(0, 7.5, -18.5), 0.08);
            camera.lookAt(0, 1.0, 2.0);
          } else if (cameraMode === 'HAWKEYE') {
            const targetCam = new THREE.Vector3(
              currentShot.bounce[0] + 0.8,
              1.6,
              currentShot.bounce[2] - 2.8
            );
            camera.position.lerp(targetCam, 0.08);
            camera.lookAt(currentShot.bounce[0], 0.1, currentShot.bounce[2]);
          } else if (cameraMode === 'UMPIRE') {
            camera.position.lerp(new THREE.Vector3(7.2, 3.8, 0), 0.08);
            camera.lookAt(0, 0.8, 0);
          } else if (cameraMode === 'BASELINE') {
            camera.position.lerp(new THREE.Vector3(0, 1.7, -13.5), 0.08);
            camera.lookAt(ball.position.x * 0.4, 1.2, ball.position.z);
          }
        }
      } else {
        // No current shot
        ball.visible = false;
        trail.visible = false;
        if (disc) (disc.material as THREE.MeshBasicMaterial).opacity = 0;
        if (!isDraggingRef.current) {
          camera.position.lerp(new THREE.Vector3(0, 8.5, -19.0), 0.08);
          camera.lookAt(0, 1.0, 0);
        }
      }

      if (isDraggingRef.current) {
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
  }, [isPlaying, playbackSpeed, currentShot, cameraMode, impactHappened]);

  // Frame-by-frame stepping controls
  const handleStepBack = () => {
    setIsPlaying(false);
    progressRef.current = Math.max(0, progressRef.current - 0.05);
    setScrubberValue(progressRef.current);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    progressRef.current = Math.min(1.0, progressRef.current + 0.05);
    setScrubberValue(progressRef.current);
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setIsPlaying(false);
    progressRef.current = val;
    setScrubberValue(val);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '620px',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#000000',
      }}
    >
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Empty State Banner if no shots detected */}
      {activeShots.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '30px 40px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxWidth: '480px',
            pointerEvents: 'none',
          }}
        >
          <Info size={36} color="#38bdf8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
            No Hawk-Eye Trajectories
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
            Upload or select a match video to reconstruct 3D ball flights, line call margins, and sub-pixel court bounces.
          </p>
        </div>
      )}

      {/* Top Left: Speed Meter & Hawk-Eye Verdict */}
      {currentShot && (
        <div
          style={{
            position: 'absolute',
            top: '18px',
            left: '18px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* Radar Speed */}
          <div className="liquid-glass-panel" style={{ padding: '8px 16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0a84ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ball Velocity
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>
                {ballSpeedDisplay}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>MPH</span>
            </div>
          </div>

          {/* Hawk-Eye Call Badge */}
          <div
            className="liquid-glass-panel"
            style={{
              padding: '8px 18px',
              background:
                currentShot.call === 'IN'
                  ? 'rgba(48, 209, 88, 0.15)'
                  : currentShot.call === 'OUT'
                  ? 'rgba(255, 69, 58, 0.15)'
                  : 'rgba(255, 159, 10, 0.15)',
              borderColor:
                currentShot.call === 'IN'
                  ? 'rgba(48, 209, 88, 0.4)'
                  : currentShot.call === 'OUT'
                  ? 'rgba(255, 69, 58, 0.4)'
                  : 'rgba(255, 159, 10, 0.4)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: currentShot.call === 'IN' ? '#30d158' : currentShot.call === 'OUT' ? '#ff453a' : '#ff9f0a',
                textTransform: 'uppercase',
              }}
            >
              Hawk-Eye Verdict
            </div>
            <div
              style={{
                fontSize: '19px',
                fontWeight: 800,
                color: currentShot.call === 'IN' ? '#30d158' : currentShot.call === 'OUT' ? '#ff453a' : '#ff9f0a',
                marginTop: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {currentShot.call === 'IN' ? <ShieldCheck size={18} /> : <Zap size={18} />}
              {currentShot.call}
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginLeft: '6px' }}>
                ({currentShot.marginCm > 0 ? `+${currentShot.marginCm}cm in` : `${Math.abs(currentShot.marginCm)}cm out`})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Right: Step-by-Step Shot Selector Pills */}
      {activeShots.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
            maxWidth: '340px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Step-by-Step Replay
            </span>
            <div className="glass-segmented" style={{ padding: '2px' }}>
              <button
                onClick={handlePrevShot}
                disabled={currentIndex === 0}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  border: 'none',
                  color: currentIndex === 0 ? '#475569' : '#ffffff',
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Previous Shot"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={handleNextShot}
                disabled={currentIndex === activeShots.length - 1}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  border: 'none',
                  color: currentIndex === activeShots.length - 1 ? '#475569' : '#ffffff',
                  cursor: currentIndex === activeShots.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Next Shot"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Shot Horizontal Capsule Bar */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {activeShots.map((s, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectShot(idx)}
                  style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: isSelected ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    borderRadius: '9999px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
                  }}
                >
                  <span>Shot #{s.shotNumber}</span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '9999px',
                      background:
                        s.call === 'IN'
                          ? 'rgba(48, 209, 88, 0.25)'
                          : s.call === 'OUT'
                          ? 'rgba(255, 69, 58, 0.25)'
                          : 'rgba(255, 159, 10, 0.25)',
                      color: s.call === 'IN' ? '#30d158' : s.call === 'OUT' ? '#ff453a' : '#ff9f0a',
                    }}
                  >
                    {s.call}
                  </span>
                </button>
              );
            })}
          </div>

          {currentShot && (
            <div
              style={{
                fontSize: '11px',
                color: '#cbd5e1',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '4px 10px',
                borderRadius: '8px',
                marginTop: '2px',
              }}
            >
              {currentShot.description}
            </div>
          )}
        </div>
      )}

      {/* Bottom Floating Control Dock (Apple Liquid Glass Capsule) */}
      <div
        className="liquid-glass-capsule"
        style={{
          position: 'absolute',
          bottom: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          maxWidth: '90%',
        }}
      >
        {/* Trajectory Scrubber Slider */}
        {currentShot && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', width: '38px', textAlign: 'right' }}>
              Launch
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={scrubberValue}
              onChange={handleScrubberChange}
              style={{
                flex: 1,
                accentColor: '#30d158',
                height: '4px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '10px', color: '#94a3b8', width: '38px' }}>
              Bounce
            </span>
          </div>
        )}

        {/* Transport & Camera Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Step Back 1 Frame */}
          <button
            onClick={handleStepBack}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Step Back (-1 Frame)"
          >
            <SkipBack size={13} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? 'rgba(255, 255, 255, 0.12)' : '#30d158',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>

          {/* Step Forward 1 Frame */}
          <button
            onClick={handleStepForward}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Step Forward (+1 Frame)"
          >
            <SkipForward size={13} />
          </button>

          {/* Replay Shot */}
          <button
            onClick={() => {
              progressRef.current = 0;
              trailCountRef.current = 0;
              setImpactHappened(false);
              setScrubberValue(0);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Restart Trajectory"
          >
            <RotateCcw size={13} />
          </button>

          <div style={{ width: 1, height: 18, background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Camera Views */}
          <div className="glass-segmented">
            {(
              [
                { id: 'BROADCAST', label: 'Broadcast', icon: Video },
                { id: 'HAWKEYE', label: 'Hawk-Eye', icon: Crosshair },
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
                  className={`glass-segmented-item ${isSelected ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  <Icon size={12} /> {c.label}
                </button>
              );
            })}
          </div>

          <div style={{ width: 1, height: 18, background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Speed Controls */}
          <div className="glass-segmented">
            {[0.25, 0.5, 1.0, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`glass-segmented-item ${playbackSpeed === s ? 'active' : ''}`}
                style={{ padding: '3px 8px', fontSize: '10px' }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
