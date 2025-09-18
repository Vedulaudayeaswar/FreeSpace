
class PeacefulScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("threejs-canvas"),
      alpha: true,
      antialias: true,
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    this.init();
    this.animate();
    this.handleResize();
  }

  init() {
    
    this.camera.position.z = 50;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Directional light for depth
    const directionalLight = new THREE.DirectionalLight(0x667eea, 0.8);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);

    // Point light for dynamic lighting
    const pointLight = new THREE.PointLight(0x764ba2, 1, 100);
    pointLight.position.set(-10, -10, 10);
    this.scene.add(pointLight);

    this.createFloatingGeometry();
    this.createWaves();
    this.createParticleSystem();
    this.createReliabilityRings();
  }

  createFloatingGeometry() {
    this.crystals = [];

    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.OctahedronGeometry(2 + Math.random() * 2);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.7, 0.6),
        transparent: true,
        opacity: 0.3 + Math.random() * 0.4,
        shininess: 100,
      });

      const crystal = new THREE.Mesh(geometry, material);
      crystal.position.set(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40
      );

      crystal.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02,
        },
        floatSpeed: Math.random() * 0.02 + 0.01,
        floatOffset: Math.random() * Math.PI * 2,
      };

      this.crystals.push(crystal);
      this.scene.add(crystal);
    }
  }

  createWaves() {
    const waveGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
    const waveMaterial = new THREE.MeshPhongMaterial({
      color: 0x667eea,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      wireframe: true,
    });

    this.wave = new THREE.Mesh(waveGeometry, waveMaterial);
    this.wave.rotation.x = -Math.PI / 4;
    this.wave.position.y = -20;
    this.scene.add(this.wave);

    this.waveOriginalPositions = [];
    for (let i = 0; i < waveGeometry.attributes.position.count; i++) {
      this.waveOriginalPositions.push({
        x: waveGeometry.attributes.position.getX(i),
        y: waveGeometry.attributes.position.getY(i),
        z: waveGeometry.attributes.position.getZ(i),
      });
    }
  }

  createParticleSystem() {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      const color = new THREE.Color().setHSL(
        0.6 + Math.random() * 0.3,
        0.8,
        0.7
      );
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particles);
  }

  createReliabilityRings() {
    this.rings = [];

    for (let i = 0; i < 5; i++) {
      const ringGeometry = new THREE.TorusGeometry(15 + i * 8, 0.5, 8, 32);
      const ringMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(0.7, 0.8, 0.5 + i * 0.1),
        transparent: true,
        opacity: 0.4 - i * 0.05,
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.z = -30 + i * 2;
      ring.userData = {
        rotationSpeed: 0.005 + i * 0.002,
        originalZ: ring.position.z,
      };

      this.rings.push(ring);
      this.scene.add(ring);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // Animate floating crystals
    this.crystals.forEach((crystal) => {
      crystal.rotation.x += crystal.userData.rotationSpeed.x;
      crystal.rotation.y += crystal.userData.rotationSpeed.y;
      crystal.rotation.z += crystal.userData.rotationSpeed.z;

      crystal.position.y +=
        Math.sin(
          time * crystal.userData.floatSpeed + crystal.userData.floatOffset
        ) * 0.1;
    });

    // Animate wave
    if (this.wave) {
      const positions = this.wave.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = this.waveOriginalPositions[i].x;
        const y = this.waveOriginalPositions[i].y;
        const z =
          this.waveOriginalPositions[i].z +
          Math.sin(x * 0.1 + time) * 3 +
          Math.cos(y * 0.1 + time) * 2;
        positions.setZ(i, z);
      }
      positions.needsUpdate = true;
    }
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        positions.setY(i, positions.getY(i) + Math.sin(time + i * 0.1) * 0.05);
        positions.setX(i, positions.getX(i) + Math.cos(time + i * 0.05) * 0.02);
      }
      positions.needsUpdate = true;
    }

    // Animate reliability rings
    this.rings.forEach((ring, index) => {
      ring.rotation.y += ring.userData.rotationSpeed;
      ring.rotation.z += ring.userData.rotationSpeed * 0.5;
      ring.position.z = ring.userData.originalZ + Math.sin(time + index) * 2;
    });

    // Gentle camera movement for immersion
    this.camera.position.x = Math.sin(time * 0.2) * 5;
    this.camera.position.y = Math.cos(time * 0.3) * 3;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PeacefulScene();
});
