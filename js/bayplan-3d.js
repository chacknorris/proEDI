/**
 * 3D Bayplan Visualizer using Three.js
 * Renders container stowage plan in 3D
 */

class BayplanVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.containers = [];
        this.containerMeshes = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredContainer = null;
        this.center = { x: 0, y: 0, z: 0 };  // Center of containers
        this.viewDistance = 60;  // Distance for camera views

        // Port colors
        this.portColors = {};
        this.colorPalette = [
            0xff6b6b, // Red
            0x4ecdc4, // Teal
            0xffe66d, // Yellow
            0x95e1d3, // Mint
            0xf38181, // Pink
            0xaa96da, // Purple
            0xfcbad3, // Light Pink
            0xa8e6cf, // Light Green
        ];

        this.init();
    }

    /**
     * Initialize Three.js scene
     */
    init() {
        console.log('Initializing 3D Bayplan Visualizer...');
        console.log('Canvas element:', this.canvas);
        console.log('THREE.js available:', typeof THREE !== 'undefined');

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f4f8);
        this.scene.fog = new THREE.Fog(0xf0f4f8, 100, 500);

        // Create camera
        const width = this.canvas.parentElement.clientWidth;
        const height = this.canvas.parentElement.clientHeight || 600;
        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(50, 40, 50);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Add lights
        this.addLights();

        // Add grid
        this.addGrid();

        // Add orbit controls (manual implementation)
        this.setupControls();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Handle mouse move for tooltips
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Start animation loop
        this.animate();
    }

    /**
     * Add lights to scene
     */
    addLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // Directional light (sun)
        const directional = new THREE.DirectionalLight(0xffffff, 0.6);
        directional.position.set(50, 100, 50);
        directional.castShadow = true;
        directional.shadow.camera.left = -100;
        directional.shadow.camera.right = 100;
        directional.shadow.camera.top = 100;
        directional.shadow.camera.bottom = -100;
        this.scene.add(directional);

        // Hemisphere light for better ambiance
        const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.4);
        this.scene.add(hemisphere);
    }

    /**
     * Add grid to scene
     */
    addGrid() {
        const gridHelper = new THREE.GridHelper(200, 40, 0x888888, 0xcccccc);
        gridHelper.position.y = -0.5;
        this.scene.add(gridHelper);
    }

    /**
     * Setup camera controls
     */
    setupControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        const rotationSpeed = 0.005;
        const zoomSpeed = 0.1;

        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            // Get current center point
            const center = new THREE.Vector3(this.center.x, this.center.y, this.center.z);

            // Rotate camera around center point
            const offset = new THREE.Vector3().subVectors(this.camera.position, center);
            const spherical = new THREE.Spherical();
            spherical.setFromVector3(offset);
            spherical.theta -= deltaX * rotationSpeed;
            spherical.phi -= deltaY * rotationSpeed;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

            offset.setFromSpherical(spherical);
            this.camera.position.copy(center).add(offset);
            this.camera.lookAt(center);

            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const center = new THREE.Vector3(this.center.x, this.center.y, this.center.z);
            const delta = e.deltaY * zoomSpeed;
            const direction = new THREE.Vector3().subVectors(this.camera.position, center).normalize();
            this.camera.position.add(direction.multiplyScalar(delta));
        });
    }

    /**
     * Load containers and render them
     */
    loadContainers(containers) {
        console.log('Loading containers into 3D view...', containers.length);

        // Clear previous containers
        this.clearContainers();

        this.containers = containers;

        // Debug: log first few containers to check positions
        console.log('Sample container positions:', containers.slice(0, 5).map(c => ({
            number: c.containerNumber,
            position: c.bayPosition,
            bay: c.bay,
            row: c.row,
            tier: c.tier
        })));

        // Assign colors to ports
        this.assignPortColors();

        // Create container meshes
        this.containers.forEach(container => {
            if (container.bay && container.row && container.tier) {
                this.createContainerMesh(container);
            }
        });

        // Center camera on containers
        this.centerCameraOnContainers();

        // Update legend
        this.updateLegend();

        console.log(`Loaded ${this.containerMeshes.length} containers in 3D view`);
    }

    /**
     * Assign colors to different destination ports
     */
    assignPortColors() {
        const uniquePorts = [...new Set(this.containers.map(c => c.portDestination).filter(Boolean))];

        uniquePorts.forEach((port, index) => {
            this.portColors[port] = this.colorPalette[index % this.colorPalette.length];
        });
    }

    /**
     * Create 3D mesh for a container
     */
    createContainerMesh(container) {
        // Container dimensions (scaled down for visualization)
        const containerWidth = 2.4;   // Standard container width (scaled)
        const containerHeight = 2.6;  // Standard container height (scaled)
        const containerLength = container.containerType?.startsWith('45') ? 4.5 :
                               container.containerType?.startsWith('40') ? 4.0 : 2.0;

        // Create container geometry
        const geometry = new THREE.BoxGeometry(containerWidth, containerHeight, containerLength);

        // Get color based on destination
        const color = this.portColors[container.portDestination] || 0x888888;

        // Create material
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.1,
            shininess: 30,
            specular: 0x333333
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Calculate position based on bay, row, tier
        // In BAPLIE format:
        // Bay: numbered in sequence (001, 003, 005... or 002, 004, 006...)
        // Row: numbered from centerline (00=center, 01/02=port, 03/04=starboard, etc.)
        // Tier: numbered from bottom (02, 04, 06... 82=deck level, 84, 86, 88 above deck)

        // Convert BAPLIE numbers to actual position indices
        // Bays are usually odd numbers (001, 003, 005...) so divide by 2
        const bayIndex = Math.floor(container.bay / 2);

        // Rows: even = starboard (right), odd = port (left)
        // Center around 0, with rows spreading outward
        const rowSide = container.row % 2 === 0 ? 1 : -1;  // Even = positive, Odd = negative
        const rowIndex = Math.floor(container.row / 2);

        // Tiers: divide by 2 to get actual stack level
        // 02 = level 1, 04 = level 2, etc.
        const tierIndex = Math.floor(container.tier / 2);

        // Spacing between containers (much smaller for compact view)
        const rowSpacing = containerWidth + 0.1;
        const tierSpacing = containerHeight + 0.05;
        const baySpacing = containerLength + 0.3;

        // Position calculation
        const x = rowSide * rowIndex * rowSpacing;
        const y = tierIndex * tierSpacing;
        const z = bayIndex * baySpacing;

        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Store container data with mesh
        mesh.userData = container;

        this.scene.add(mesh);
        this.containerMeshes.push(mesh);
    }

    /**
     * Clear all containers from scene
     */
    clearContainers() {
        this.containerMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.containerMeshes = [];
    }

    /**
     * Center camera on all containers
     */
    centerCameraOnContainers() {
        if (this.containerMeshes.length === 0) return;

        // Calculate bounding box of all containers
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        this.containerMeshes.forEach(mesh => {
            const pos = mesh.position;
            minX = Math.min(minX, pos.x);
            maxX = Math.max(maxX, pos.x);
            minY = Math.min(minY, pos.y);
            maxY = Math.max(maxY, pos.y);
            minZ = Math.min(minZ, pos.z);
            maxZ = Math.max(maxZ, pos.z);
        });

        // Calculate center point
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        // Store center for camera views
        this.center = { x: centerX, y: centerY, z: centerZ };

        // Calculate size
        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const maxSize = Math.max(sizeX, sizeY, sizeZ);

        // Position camera at a distance based on size
        this.viewDistance = maxSize * 1.5;

        // Set camera to isometric view
        this.camera.position.set(
            centerX + this.viewDistance * 0.7,
            centerY + this.viewDistance * 0.7,
            centerZ + this.viewDistance * 0.7
        );
        this.camera.lookAt(centerX, centerY, centerZ);

        // Update grid position to center
        const gridHelper = this.scene.children.find(child => child.type === 'GridHelper');
        if (gridHelper) {
            gridHelper.position.set(centerX, minY - 1, centerZ);
        }

        console.log('Camera centered on containers:', { centerX, centerY, centerZ, distance });
    }

    /**
     * Update legend with port colors
     */
    updateLegend() {
        const legendItems = document.getElementById('legendItems');
        if (!legendItems) return;

        legendItems.innerHTML = '';

        Object.keys(this.portColors).forEach(port => {
            const color = '#' + this.portColors[port].toString(16).padStart(6, '0');
            const portInfo = EDICodes.formatPort(port);

            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-color" style="background-color: ${color}"></span>
                <span class="legend-text">${portInfo.formatted}</span>
            `;
            legendItems.appendChild(item);
        });
    }

    /**
     * Handle mouse move for tooltips
     */
    onMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast to find intersected containers
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.containerMeshes);

        const tooltip = document.getElementById('bayplanTooltip');

        if (intersects.length > 0) {
            const intersected = intersects[0].object;
            const container = intersected.userData;

            // Highlight hovered container
            if (this.hoveredContainer !== intersected) {
                // Reset previous
                if (this.hoveredContainer) {
                    const prevColor = this.portColors[this.hoveredContainer.userData.portDestination] || 0x888888;
                    this.hoveredContainer.material.color.setHex(prevColor);
                    this.hoveredContainer.material.emissiveIntensity = 0.1;
                }

                // Highlight new
                this.hoveredContainer = intersected;
                intersected.material.emissiveIntensity = 0.4;
            }

            // Show tooltip
            const portDest = EDICodes.formatPort(container.portDestination);
            tooltip.style.display = 'block';
            tooltip.style.left = (event.clientX - rect.left + 10) + 'px';
            tooltip.style.top = (event.clientY - rect.top + 10) + 'px';
            tooltip.innerHTML = `
                <strong>${container.containerNumber}</strong><br>
                <strong>Destino:</strong> ${portDest.formatted}<br>
                <strong>Bahía:</strong> ${container.bayPosition}<br>
                <strong>Peso:</strong> ${container.weight ? container.weight.toLocaleString() + ' KG' : '-'}<br>
                ${container.temperature !== null ? `<strong>Temp:</strong> ${container.temperature.toFixed(1)}°C<br>` : ''}
                <strong>Carga:</strong> ${EDICodes.getCargoType(container.cargoType)}
            `;
        } else {
            // Reset highlight
            if (this.hoveredContainer) {
                const prevColor = this.portColors[this.hoveredContainer.userData.portDestination] || 0x888888;
                this.hoveredContainer.material.color.setHex(prevColor);
                this.hoveredContainer.material.emissiveIntensity = 0.1;
                this.hoveredContainer = null;
            }

            // Hide tooltip
            tooltip.style.display = 'none';
        }
    }

    /**
     * Set camera view
     */
    setView(viewType) {
        const d = this.viewDistance;
        const c = this.center;

        switch(viewType) {
            case 'top':
                this.camera.position.set(c.x, c.y + d, c.z);
                this.camera.lookAt(c.x, c.y, c.z);
                break;
            case 'front':
                this.camera.position.set(c.x, c.y + d * 0.3, c.z + d);
                this.camera.lookAt(c.x, c.y, c.z);
                break;
            case 'side':
                this.camera.position.set(c.x + d, c.y + d * 0.3, c.z);
                this.camera.lookAt(c.x, c.y, c.z);
                break;
            case 'iso':
            default:
                this.camera.position.set(
                    c.x + d * 0.7,
                    c.y + d * 0.7,
                    c.z + d * 0.7
                );
                this.camera.lookAt(c.x, c.y, c.z);
                break;
        }
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const width = this.canvas.parentElement.clientWidth;
        const height = this.canvas.parentElement.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Focus camera on specific container
     */
    focusOnContainer(containerNumber) {
        // Find the container mesh
        const mesh = this.containerMeshes.find(m => m.userData.containerNumber === containerNumber);

        if (!mesh) {
            console.warn('Container not found:', containerNumber);
            return;
        }

        // Get container position
        const pos = mesh.position;

        // Calculate camera position (closer zoom)
        const distance = 15;
        const cameraPos = new THREE.Vector3(
            pos.x + distance * 0.7,
            pos.y + distance * 0.5,
            pos.z + distance * 0.7
        );

        // Animate camera to position
        this.animateCameraTo(cameraPos, pos);

        console.log('Focused on container:', containerNumber, 'at position:', pos);
    }

    /**
     * Animate camera to target position
     */
    animateCameraTo(targetPosition, lookAtPosition) {
        const startPosition = this.camera.position.clone();
        const startTime = Date.now();
        const duration = 1000; // 1 second animation

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-in-out)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            // Interpolate position
            this.camera.position.lerpVectors(startPosition, targetPosition, eased);
            this.camera.lookAt(lookAtPosition);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Highlight specific container and dim others
     */
    highlightContainer(containerNumber) {
        if (!containerNumber) {
            // Reset all to normal
            this.resetHighlight();
            return;
        }

        this.containerMeshes.forEach(mesh => {
            if (mesh.userData.containerNumber === containerNumber) {
                // Highlighted container - full opacity and slight glow
                mesh.material.opacity = 1.0;
                mesh.material.transparent = false;
                mesh.material.emissiveIntensity = 0.3;
            } else {
                // Dimmed containers - more transparent
                mesh.material.opacity = 0.08;
                mesh.material.transparent = true;
                mesh.material.emissiveIntensity = 0.02;
            }
        });
    }

    /**
     * Reset all containers to normal appearance
     */
    resetHighlight() {
        this.containerMeshes.forEach(mesh => {
            mesh.material.opacity = 1.0;
            mesh.material.transparent = false;
            mesh.material.emissiveIntensity = 0.1;
        });
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

// Export for use in app.js (browser global)
if (typeof window !== 'undefined') {
    window.BayplanVisualizer = BayplanVisualizer;
}

// Export for Node.js/CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BayplanVisualizer;
}
