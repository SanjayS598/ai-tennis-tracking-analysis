import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Smartphone,
  Watch,
  Award,
  Video,
  Target,
  BarChart2,
  Cpu,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { DeviceStatusResponse } from '../types';

interface LandingPageProps {
  onLaunchApp: () => void;
  devices: DeviceStatusResponse | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp, devices }) => {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const ballMeshRef = useRef<THREE.Group | null>(null);
  const targetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(3.2, 0.4, 0));
  const targetRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scrollProgressRef = useRef<number>(0);

  // Generate Tennis Ball Procedural Felt Texture with Signature Seams
  const createTennisBallTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Optic fluorescent yellow base
      ctx.fillStyle = '#ccff00';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle felt fuzz noise
      for (let i = 0; i < 40000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const brightness = 200 + Math.floor(Math.random() * 55);
        ctx.fillStyle = `rgba(${brightness}, 255, ${Math.floor(Math.random() * 50)}, 0.12)`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      // Draw Tennis Ball Signature Curved Seam (White Rubber Rib)
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // First seam curve
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 5) {
        const normX = (x / canvas.width) * Math.PI * 2;
        const y = canvas.height / 2 + Math.sin(normX * 2) * (canvas.height * 0.38);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Shadow on seam edge for depth
      ctx.strokeStyle = 'rgba(100, 140, 0, 0.45)';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  };

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // --- Scene & Camera ---
    const scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xdcfce7, 2.2);
    keyLight.position.set(5, 6, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(-6, -3, -4);
    scene.add(rimLight);

    const courtGreenGlow = new THREE.PointLight(0x10b981, 1.5, 12);
    courtGreenGlow.position.set(0, -4, 2);
    scene.add(courtGreenGlow);

    // --- 3D Detailed Tennis Ball Group ---
    const ballGroup = new THREE.Group();
    scene.add(ballGroup);
    ballMeshRef.current = ballGroup;

    const ballTexture = createTennisBallTexture();
    const ballGeo = new THREE.SphereGeometry(1.65, 64, 64);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTexture,
      roughness: 0.75,
      metalness: 0.05,
      bumpMap: ballTexture,
      bumpScale: 0.035,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballGroup.add(ballMesh);

    // Subtle atmospheric aura particles
    const particleCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i + 0] = (Math.random() - 0.5) * 8;
      particlePos[i + 1] = (Math.random() - 0.5) * 8;
      particlePos[i + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x84cc16,
      size: 0.045,
      transparent: true,
      opacity: 0.45,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Initial ball position
    ballGroup.position.set(3.2, 0.4, 0);

    // --- Scroll & Mouse Move Handlers ---
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(1.0, Math.max(0.0, scrollY / (docHeight || 1)));
      scrollProgressRef.current = progress;

      // Choreograph 3D Tennis Ball Position across page sections
      if (progress < 0.25) {
        // Hero Section: Pinned right, slight floating tilt
        const localT = progress / 0.25;
        targetPosRef.current.set(3.0 - localT * 0.5, 0.4 - localT * 0.3, localT * 0.5);
      } else if (progress < 0.55) {
        // Sessions Section: Swoops across to left
        const localT = (progress - 0.25) / 0.3;
        targetPosRef.current.set(2.5 - localT * 5.2, 0.1 - localT * 0.4, 0.5 - localT * 0.2);
      } else if (progress < 0.8) {
        // Hardware Ecosystem Section: Centers near iPhone/Watch card
        const localT = (progress - 0.55) / 0.25;
        targetPosRef.current.set(-2.7 + localT * 5.6, -0.3 + localT * 0.6, 0.3 + localT * 0.4);
      } else {
        // Final CTA Section: Centered, dramatic close-up
        const localT = (progress - 0.8) / 0.2;
        targetPosRef.current.set(2.9 - localT * 2.9, 0.3 - localT * 0.3, 0.7 + localT * 0.8);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      targetRotRef.current.x = normY * 0.4;
      targetRotRef.current.y = normX * 0.6;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);

    // Handle Window Resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // --- Render Loop ---
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      if (ballGroup) {
        // Smooth position interpolation
        ballGroup.position.lerp(targetPosRef.current, 0.06);

        // Continuous spin + mouse interactive tilt
        ballGroup.rotation.y += delta * 0.45 + targetRotRef.current.y * 0.05;
        ballGroup.rotation.x += delta * 0.25 + targetRotRef.current.x * 0.05;
        ballGroup.rotation.z = Math.sin(time * 0.8) * 0.15;

        // Subtle levitation bob
        ballGroup.position.y += Math.sin(time * 2.0) * 0.003;
      }

      // Drift dust particles
      if (particles) {
        particles.rotation.y = time * 0.04;
      }

      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      ballGeo.dispose();
      ballMat.dispose();
      ballTexture.dispose();
    };
  }, []);

  const isIPhoneConnected = devices?.iphone?.connected ?? true;
  const isWatchConnected = devices?.watch?.connected ?? true;

  return (
    <div style={{ position: 'relative', background: '#030712', color: '#f3f4f6', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Pinned 3D Three.js Tennis Ball Canvas (Covers Entire Screen Behind Content) */}
      <div
        ref={canvasContainerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Glass Top Navigation Bar */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '70px',
          background: 'rgba(3, 7, 18, 0.75)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 36px',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.5)',
            }}
          >
            🎾
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.4px', color: '#ffffff' }}>
              Tennis AI <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>PRO</span>
            </span>
          </div>
        </div>

        {/* Live Hardware Ecosystem Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Smartphone size={14} color={isIPhoneConnected ? '#34d399' : '#94a3b8'} />
            <span>iPhone 16 Pro</span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isIPhoneConnected ? '#10b981' : '#6b7280',
                boxShadow: isIPhoneConnected ? '0 0 8px #10b981' : 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Watch size={14} color={isWatchConnected ? '#34d399' : '#94a3b8'} />
            <span>Apple Watch Ultra</span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isWatchConnected ? '#10b981' : '#6b7280',
                boxShadow: isWatchConnected ? '0 0 8px #10b981' : 'none',
              }}
            />
          </div>

          <button
            onClick={onLaunchApp}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.45)',
              transition: 'transform 0.2s',
            }}
          >
            Launch App <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* ============================================================== */}
      {/* SECTION 1: HERO                                                */}
      {/* ============================================================== */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '120px 48px 60px',
          maxWidth: '1360px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '6px 14px',
              borderRadius: '24px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#34d399',
              marginBottom: '24px',
            }}
          >
            <Sparkles size={14} /> TOUR-LEVEL INTELLIGENCE • ON EVERY COURT
          </div>

          <h1
            style={{
              fontSize: '56px',
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: '-1.5px',
              margin: '0 0 20px 0',
              background: 'linear-gradient(180deg, #ffffff 30%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            The Full-Stack AI Tennis Engine.
          </h1>

          <p
            style={{
              fontSize: '18px',
              color: '#94a3b8',
              lineHeight: 1.6,
              margin: '0 0 36px 0',
              maxWidth: '560px',
            }}
          >
            Transform stationary iPhone video into sub-centimeter line calling, 3D Hawk-Eye ball trajectories, and real-time Apple Watch wrist haptics.
          </p>

          {/* Primary Call to Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={onLaunchApp}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 34px',
                fontSize: '16px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 0 32px rgba(16, 185, 129, 0.55)',
                transition: 'transform 0.2s',
              }}
            >
              Launch Tennis AI Platform <ArrowRight size={18} />
            </button>

            <a
              href="#sessions-breakdown"
              style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Explore Sessions & Features <ChevronDown size={16} />
            </a>
          </div>

          {/* Metric Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              marginTop: '56px',
              maxWidth: '560px',
            }}
          >
            <div style={{ background: 'rgba(11, 15, 25, 0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>&lt; 2.5 cm</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Line Call Uncertainty</div>
            </div>
            <div style={{ background: 'rgba(11, 15, 25, 0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>0.03s</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Watch Haptic Latency</div>
            </div>
            <div style={{ background: 'rgba(11, 15, 25, 0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>60 FPS</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>TrackNet Neural Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 2: SESSION TYPES BREAKDOWN                             */}
      {/* ============================================================== */}
      <section
        id="sessions-breakdown"
        style={{
          position: 'relative',
          padding: '100px 48px',
          maxWidth: '1360px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ORGANIZED INTELLIGENCE
          </div>
          <h2 style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-1px', margin: '8px 0 16px 0', color: '#ffffff' }}>
            Structured by Your Tennis Workflows.
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            Whether you're battling in tournament sets, grooving groundstrokes, or dialing in your kick serve, Tennis AI categorizes and analyzes every rep.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {/* Card 1: Matches */}
          <div
            style={{
              background: 'rgba(11, 15, 25, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Award size={26} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px 0', color: '#ffffff' }}>
              Tournament & Practice Matches
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0', flex: 1 }}>
              Full competitive match tracking. Automatic line calls on every shot, scorekeeper, game/set progression, break point conversion, and winning patterns.
            </p>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
              ✓ Three-state IN/OUT engine • ✓ Video Review
            </div>
          </div>

          {/* Card 2: Rallies */}
          <div
            style={{
              background: 'rgba(11, 15, 25, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Activity size={26} color="#38bdf8" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px 0', color: '#ffffff' }}>
              Rallies & Baseline Drills
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0', flex: 1 }}>
              Track rally length, ball depth consistency, heavy topspin margins over the net, cross-court accuracy, and unforced error rates.
            </p>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
              ✓ Depth Minimap • ✓ Forehand/Backhand Split
            </div>
          </div>

          {/* Card 3: Serve Practice */}
          <div
            style={{
              background: 'rgba(11, 15, 25, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Zap size={26} color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px 0', color: '#ffffff' }}>
              Serve Practice & Radar
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0', flex: 1 }}>
              High-speed radar velocity tracking, first vs second serve percentages, wide / body / T placement dispersion, and kinetic chain biomechanics.
            </p>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
              ✓ Radar MPH • ✓ Service Box Heatmap
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 3: APPLE WATCH & IPHONE ECOSYSTEM                      */}
      {/* ============================================================== */}
      <section
        style={{
          position: 'relative',
          padding: '80px 48px',
          maxWidth: '1360px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(11, 15, 25, 0.95) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '24px',
            padding: '56px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '48px',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              CONNECTED HARDWARE
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.8px', color: '#ffffff', margin: '0 0 16px 0' }}>
              Your iPhone on the Fence. Your Apple Watch on Your Wrist.
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
              Tennis AI synchronizes via real-time WebSockets to deliver instant haptic feedback on close calls without taking your eyes off the ball:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="#34d399" />
                </div>
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                  <strong>IN Call:</strong> Single crisp `.success` haptic tap
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} color="#f87171" />
                </div>
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                  <strong>OUT Call:</strong> Double alert `.failure` vibration + red flash
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={16} color="#fbbf24" />
                </div>
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                  <strong>UNCERTAIN:</strong> Gentle `.retry` tap within ±2.5cm threshold
                </span>
              </div>
            </div>

            <button
              onClick={onLaunchApp}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              Open Live Monitor <ArrowRight size={16} />
            </button>
          </div>

          {/* Interactive Hardware Card */}
          <div
            style={{
              background: '#0b0f19',
              border: '1px solid #1f2937',
              borderRadius: '18px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px' }}>
              Live Companion Status
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#111827', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Smartphone size={20} color="#10b981" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>iPhone 16 Pro</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>1080p @ 60 FPS HDR • Fence Mount</div>
                  </div>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '11px', fontWeight: 700 }}>
                  Active (12ms)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#111827', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Watch size={20} color="#10b981" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Apple Watch Ultra 2</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Haptic Engine Armed • 142 BPM</div>
                  </div>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '11px', fontWeight: 700 }}>
                  Ready (86%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 4: CTA BANNER                                          */}
      {/* ============================================================== */}
      <section
        style={{
          position: 'relative',
          padding: '80px 48px 120px',
          maxWidth: '900px',
          margin: '0 auto',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        <h2 style={{ fontSize: '42px', fontWeight: 900, letterSpacing: '-1px', color: '#ffffff', margin: '0 0 16px 0' }}>
          Ready to Analyze Your Next Match?
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', margin: '0 0 32px 0' }}>
          Upload your tennis video, review your categorized session history, or launch the live on-court line monitor.
        </p>

        <button
          onClick={onLaunchApp}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '18px 42px',
            fontSize: '17px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            boxShadow: '0 0 36px rgba(16, 185, 129, 0.6)',
          }}
        >
          Launch Tennis AI Platform <ArrowRight size={20} />
        </button>
      </section>
    </div>
  );
};
