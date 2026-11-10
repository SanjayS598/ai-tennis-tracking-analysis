import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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

  // Procedural felt texture with curved seam
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
      for (let i = 0; i < 35000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const brightness = 210 + Math.floor(Math.random() * 45);
        ctx.fillStyle = `rgba(${brightness}, 255, ${Math.floor(Math.random() * 50)}, 0.12)`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      // Curved rubber seam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 5) {
        const normX = (x / canvas.width) * Math.PI * 2;
        const y = canvas.height / 2 + Math.sin(normX * 2) * (canvas.height * 0.38);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Shadow border along seam
      ctx.strokeStyle = 'rgba(90, 130, 0, 0.4)';
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
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf0fdf4, 2.4);
    keyLight.position.set(6, 7, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    rimLight.position.set(-6, -3, -4);
    scene.add(rimLight);

    const greenUnderglow = new THREE.PointLight(0x30d158, 1.8, 14);
    greenUnderglow.position.set(0, -4, 2);
    scene.add(greenUnderglow);

    // --- 3D Tennis Ball ---
    const ballGroup = new THREE.Group();
    scene.add(ballGroup);
    ballMeshRef.current = ballGroup;

    // Temporary procedural fallback while GLTF loads
    const ballTexture = createTennisBallTexture();
    const ballGeo = new THREE.SphereGeometry(1.65, 64, 64);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTexture,
      roughness: 0.72,
      metalness: 0.04,
      bumpMap: ballTexture,
      bumpScale: 0.035,
    });
    const fallbackMesh = new THREE.Mesh(ballGeo, ballMat);
    fallbackMesh.name = 'fallback_ball';
    ballGroup.add(fallbackMesh);

    // Load authentic 3D Tennis Ball Model (from tennis-ball.zip)
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/tennis_ball.glb',
      (gltf) => {
        const authenticBall = gltf.scene;
        // Radius is ~3.09, normalize to 1.65 radius
        authenticBall.scale.set(0.534, 0.534, 0.534);

        authenticBall.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            if (m.material) {
              const mat = m.material as THREE.MeshStandardMaterial;
              mat.roughness = 0.82;
              mat.metalness = 0.02;
              mat.needsUpdate = true;
            }
          }
        });

        // Remove the temporary fallback mesh and add the real 3D model
        const existingFallback = ballGroup.getObjectByName('fallback_ball');
        if (existingFallback) {
          ballGroup.remove(existingFallback);
        }
        ballGroup.add(authenticBall);
      },
      undefined,
      (err) => {
        console.warn('Note: Using fallback procedural tennis ball geometry:', err);
      }
    );

    // Ambient floating dust particles
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i + 0] = (Math.random() - 0.5) * 8;
      particlePos[i + 1] = (Math.random() - 0.5) * 8;
      particlePos[i + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x30d158,
      size: 0.04,
      transparent: true,
      opacity: 0.4,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    ballGroup.position.set(3.2, 0.4, 0);

    // Scroll mapping
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(1.0, Math.max(0.0, scrollY / (docHeight || 1)));

      if (progress < 0.25) {
        const localT = progress / 0.25;
        targetPosRef.current.set(3.0 - localT * 0.5, 0.4 - localT * 0.3, localT * 0.5);
      } else if (progress < 0.55) {
        const localT = (progress - 0.25) / 0.3;
        targetPosRef.current.set(2.5 - localT * 5.2, 0.1 - localT * 0.4, 0.5 - localT * 0.2);
      } else if (progress < 0.8) {
        const localT = (progress - 0.55) / 0.25;
        targetPosRef.current.set(-2.7 + localT * 5.6, -0.3 + localT * 0.6, 0.3 + localT * 0.4);
      } else {
        const localT = (progress - 0.8) / 0.2;
        targetPosRef.current.set(2.9 - localT * 2.9, 0.3 - localT * 0.3, 0.7 + localT * 0.8);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      targetRotRef.current.x = normY * 0.35;
      targetRotRef.current.y = normX * 0.5;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      if (ballGroup) {
        ballGroup.position.lerp(targetPosRef.current, 0.06);
        ballGroup.rotation.y += delta * 0.45 + targetRotRef.current.y * 0.05;
        ballGroup.rotation.x += delta * 0.25 + targetRotRef.current.x * 0.05;
        ballGroup.position.y += Math.sin(time * 2.0) * 0.003;
      }

      if (particles) {
        particles.rotation.y = time * 0.035;
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

  const isIPhoneConnected = devices?.iphone?.connected ?? false;
  const isWatchConnected = devices?.watch?.connected ?? false;
  const isSearching = !isIPhoneConnected && !isWatchConnected;

  return (
    <div style={{ position: 'relative', background: '#000000', color: '#f3f4f6', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Background 3D Tennis Ball Canvas */}
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

      {/* Floating Liquid Glass Navigation Capsule (Apple Style) */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 48px)',
          maxWidth: '1240px',
          zIndex: 40,
        }}
      >
        <nav
          className="liquid-glass-capsule"
          style={{
            height: '62px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.25) 0%, rgba(48, 209, 88, 0.05) 100%)',
                border: '1px solid rgba(48, 209, 88, 0.4)',
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              🎾
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px', color: '#ffffff' }}>
              Tennis AI
            </span>
          </div>

          {/* Center Links */}
          <div className="glass-segmented" style={{ display: 'flex' }}>
            <a href="#sessions" className="glass-segmented-item" style={{ textDecoration: 'none' }}>
              Sessions
            </a>
            <a href="#ecosystem" className="glass-segmented-item" style={{ textDecoration: 'none' }}>
              Watch & Phone
            </a>
            <a href="#hawkeye" className="glass-segmented-item" style={{ textDecoration: 'none' }}>
              Hawk-Eye
            </a>
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Device Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#cbd5e1',
              }}
            >
              <Smartphone size={13} color={isIPhoneConnected ? '#30d158' : '#ff9f0a'} />
              <Watch size={13} color={isWatchConnected ? '#30d158' : '#86868b'} />
              <span style={{ fontSize: '11px', color: isSearching ? '#ff9f0a' : '#30d158' }}>
                {isSearching ? 'Devices: Searching...' : (devices?.simulated_mode ? 'Demo Hardware' : 'Hardware Connected')}
              </span>
            </div>

            <button onClick={onLaunchApp} className="glass-btn-prominent">
              Launch App <ArrowRight size={15} />
            </button>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '160px 48px 80px',
          maxWidth: '1280px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          {/* Category Chip */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#30d158',
              marginBottom: '28px',
            }}
          >
            <Sparkles size={13} />
            <span>Apple Liquid Glass Edition</span>
          </div>

          <h1
            style={{
              fontSize: '60px',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-2px',
              margin: '0 0 20px 0',
              color: '#ffffff',
            }}
          >
            Tour-Level Vision. On Every Court.
          </h1>

          <p
            style={{
              fontSize: '19px',
              color: '#94a3b8',
              lineHeight: 1.55,
              margin: '0 0 40px 0',
              maxWidth: '540px',
              fontWeight: 400,
            }}
          >
            Transform a single stationary iPhone behind the baseline into sub-centimeter line calls, 3D Hawk-Eye ball trajectories, and real-time Apple Watch haptics.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={onLaunchApp} className="glass-btn-prominent" style={{ padding: '14px 32px', fontSize: '15px' }}>
              Launch Tennis AI Platform <ArrowRight size={17} />
            </button>

            <a href="#sessions" className="glass-btn" style={{ textDecoration: 'none' }}>
              View Capabilities <ChevronDown size={15} />
            </a>
          </div>

          {/* Metric Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
              marginTop: '60px',
              maxWidth: '560px',
            }}
          >
            <div className="apple-card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#30d158', fontFamily: 'system-ui, -apple-system' }}>
                &lt; 2.5 cm
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Uncertainty Margin</div>
            </div>

            <div className="apple-card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0a84ff', fontFamily: 'system-ui, -apple-system' }}>
                12 ms
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Transport Latency</div>
            </div>

            <div className="apple-card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', fontFamily: 'system-ui, -apple-system' }}>
                60 FPS
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>TrackNet 1080p</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Session Workflows */}
      <section
        id="sessions"
        style={{
          position: 'relative',
          padding: '100px 48px',
          maxWidth: '1280px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0a84ff', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ORGANIZED WORKFLOWS
          </div>
          <h2 style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-1px', margin: '8px 0 14px 0', color: '#ffffff' }}>
            Built for Match Play, Rallies, and Serve Practice.
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '580px', margin: '0 auto' }}>
            Structured intelligence categorizing every set, groundstroke drill, and service motion into actionable stats.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '22px' }}>
          {/* Card 1 */}
          <div className="apple-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'rgba(48, 209, 88, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Award size={24} color="#30d158" />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 10px 0', color: '#ffffff' }}>
              Tournament Matches
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0', flex: 1 }}>
              Full competitive match analysis. Real-time line calls on every shot, scorekeeper progression, breakpoint conversion, and winning baseline patterns.
            </p>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '16px', fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
              Three-State IN / OUT / UNCERTAIN
            </div>
          </div>

          {/* Card 2 */}
          <div className="apple-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'rgba(10, 132, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Activity size={24} color="#0a84ff" />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 10px 0', color: '#ffffff' }}>
              Rallies & Drills
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0', flex: 1 }}>
              Track rally length, court depth consistency, heavy topspin margins over the net, cross-court precision, and unforced error detection.
            </p>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '16px', fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
              Metric 2D Court Minimap
            </div>
          </div>

          {/* Card 3 */}
          <div className="apple-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'rgba(255, 159, 10, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Zap size={24} color="#ff9f0a" />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 10px 0', color: '#ffffff' }}>
              Serve Radar & Placement
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0', flex: 1 }}>
              Radar velocity tracking (MPH), first vs second serve percentages, wide / body / T service box dispersion, and kinetic chain biomechanics.
            </p>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '16px', fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
              Radar Velocity & Kinetic Normalization
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Ecosystem */}
      <section
        id="ecosystem"
        style={{
          position: 'relative',
          padding: '80px 48px',
          maxWidth: '1280px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div
          className="apple-card"
          style={{
            padding: '52px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '48px',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(10,14,23,0.85) 100%)',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#30d158', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              SEAMLESS HARDWARE
            </div>
            <h2 style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.8px', color: '#ffffff', margin: '0 0 16px 0' }}>
              Your iPhone On The Fence. Your Apple Watch On Your Wrist.
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', margin: '0 0 28px 0' }}>
              No eye contact required. When the ball lands near the boundary line, our three-state engine sends an immediate tactile pulse to your Apple Watch:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheck size={18} color="#30d158" />
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                  <strong>IN:</strong> Single crisp `.success` haptic tap
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Zap size={18} color="#ff453a" />
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                  <strong>OUT:</strong> Double alert `.failure` vibration + red flash
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Target size={18} color="#ff9f0a" />
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                  <strong>UNCERTAIN:</strong> Gentle `.retry` tap within ±2.5cm margin
                </span>
              </div>
            </div>

            <button onClick={onLaunchApp} className="glass-btn-prominent">
              Open Live Monitor <ArrowRight size={15} />
            </button>
          </div>

          {/* Floating Liquid Glass Telemetry Card */}
          <div className="liquid-glass-panel" style={{ padding: '28px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '18px' }}>
              Active Companion Telemetry
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Smartphone size={20} color="#30d158" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>iPhone 16 Pro</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>1080p @ 60 FPS HDR • Fence Mount</div>
                  </div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '9999px', background: 'rgba(48, 209, 88, 0.15)', color: '#30d158', fontSize: '11px', fontWeight: 700 }}>
                  Active (12ms)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Watch size={20} color="#30d158" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Apple Watch Ultra 2</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Haptics Armed • 142 BPM</div>
                  </div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '9999px', background: 'rgba(48, 209, 88, 0.15)', color: '#30d158', fontSize: '11px', fontWeight: 700 }}>
                  Ready (86%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          position: 'relative',
          padding: '80px 48px 140px',
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        <h2 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-1px', color: '#ffffff', margin: '0 0 16px 0' }}>
          Experience Tour-Level Intelligence.
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', margin: '0 0 36px 0' }}>
          Launch the platform, upload your match footage, and review line calls with 3D precision.
        </p>

        <button onClick={onLaunchApp} className="glass-btn-prominent" style={{ padding: '16px 40px', fontSize: '16px' }}>
          Launch Tennis AI Platform <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
};
