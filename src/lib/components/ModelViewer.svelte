<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { theme, currentProjectId } from '$lib/store';
  import { toast } from 'sonner';
  import { Layers, Download, Save, Expand, X } from 'lucide-svelte';
  import { tempToColor } from '$lib/utils';
  import { saveModelToProject } from '$lib/supabase';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  
  export let url: string;
  export let inputImage: string | undefined = undefined;
  export let resolution: number | undefined = undefined;

  let container: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let model: THREE.Group | null = null;
  let matteMaterial: THREE.MeshStandardMaterial;
  let originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  
  let isMobile = false;
  let isFullscreen = false;
  let saving = false;
  let saveSuccess = false;
  let lightState = {
    position: [2, 2, 2] as [number, number, number],
    intensity: 1,
    temperature: 6500
  };

  $: isDarkMode = $theme === 'dark';
  $: bg = isDarkMode ? '#000' : '#fff';

  onMount(() => {
    isMobile = window.innerWidth < 768;
    window.addEventListener('resize', () => {
      isMobile = window.innerWidth < 768;
      if (renderer) handleResize();
    });
    
    initScene();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      disposeScene();
    };
  });

  function initScene() {
    if (!container) return;
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(bg);
    
    // Create camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Create controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 2;
    controls.maxDistance = 10;
    
    // Create matte material
    matteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.0,
    });
    
    // Add lights
    const directionalLight = new THREE.DirectionalLight(
      tempToColor(lightState.temperature), 
      lightState.intensity
    );
    directionalLight.position.set(...lightState.position);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add ground plane
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.ShadowMaterial({ transparent: true, opacity: 0.4 })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    
    // Load model if URL exists
    if (url) loadModel();
    
    // Start animation loop
    animate();
  }

  function handleResize() {
    if (!container || !camera || !renderer) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
  }

  function animate() {
    if (!renderer || !scene || !camera) return;
    
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  function loadModel() {
    if (!url || !scene) return;
    
    // Remove previous model if exists
    if (model) {
      scene.remove(model);
      originalMaterials.clear();
      model = null;
    }
    
    const loader = new GLTFLoader();
    
    loader.load(
      url,
      (gltf) => {
        model = gltf.scene;
        
        // Apply matte material and store original materials
        model.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            originalMaterials.set(obj, obj.material);
            obj.material = matteMaterial;
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });
        
        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const offsetY = -box.min.y;
        model.position.y += offsetY;
        
        scene.add(model);
      },
      undefined,
      (err) => console.error('Error loading model:', err)
    );
  }

  function toggleTextures() {
    if (!model) return;
    
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.material === matteMaterial) {
          obj.material = originalMaterials.get(obj) || obj.material;
        } else {
          obj.material = matteMaterial;
        }
      }
    });
  }

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    // Need to update renderer size after toggling fullscreen
    setTimeout(handleResize, 100);
  }

  function downloadModel() {
    if (!url) return;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'model.glb';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleSaveModel() {
    if (!url || !inputImage || !resolution || !$currentProjectId) return;
    
    saving = true;
    
    try {
      const result = await saveModelToProject(
        $currentProjectId,
        url,
        inputImage,
        inputImage,
        resolution,
        `Model ${new Date().toLocaleString()}`
      );
      
      if (result) {
        saveSuccess = true;
        toast.success('Model saved to project');
      } else {
        toast.error('Failed to save model');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save model');
    } finally {
      saving = false;
    }
  }

  function disposeScene() {
    if (renderer) {
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    }
    
    if (model && scene) {
      scene.remove(model);
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
    }
  }

  $: if (url && scene) loadModel();
</script>

<div class={isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-full w-full"}>
  {#if isFullscreen}
    <div class="absolute top-0 left-0 right-0 z-10 p-2 flex justify-between items-center bg-background/80 backdrop-blur-sm">
      <h2 class="text-lg font-medium">3D Model Viewer</h2>
      <button class="p-2 rounded-full hover:bg-accent" on:click={toggleFullscreen}>
        <X class="h-5 w-5" />
      </button>
    </div>
  {/if}

  <div bind:this={container} class={isMobile ? "min-h-[350px] h-[70vh]" : "h-full w-full"}></div>

  {#if isMobile && !isFullscreen}
    <button
      class="absolute top-2 right-2 h-7 inline-flex items-center bg-background/50 backdrop-blur-sm z-10 px-3 py-1 rounded-md border text-xs"
      on:click={toggleFullscreen}
    >
      <Expand class="h-3 w-3 mr-1" />
      Fullscreen
    </button>
  {/if}

  <div class={`${isFullscreen ? 'absolute bottom-4' : 'absolute bottom-2'} left-0 right-0 flex justify-center gap-1 z-10 px-2`}>
    <div class="flex gap-1 overflow-x-auto pb-1 max-w-full bg-background/40 backdrop-blur-sm rounded-lg p-1">
      <button
        class="h-7 bg-background/50 backdrop-blur-sm whitespace-nowrap px-3 py-1 rounded-md border text-xs inline-flex items-center"
        on:click={toggleTextures}
      >
        <Layers class="h-3 w-3 mr-1" />
        Toggle Textures
      </button>

      <button
        class="h-7 bg-background/50 backdrop-blur-sm whitespace-nowrap px-3 py-1 rounded-md border text-xs inline-flex items-center"
        on:click={downloadModel}
      >
        <Download class="h-3 w-3 mr-1" />
        Download
      </button>

      {#if inputImage && resolution && $currentProjectId}
        <button
          class="h-7 {saveSuccess ? 'bg-primary text-primary-foreground' : 'bg-background/50 border'} backdrop-blur-sm whitespace-nowrap px-3 py-1 rounded-md text-xs inline-flex items-center"
          on:click={handleSaveModel}
          disabled={saving}
        >
          <Save class={`h-3 w-3 mr-1 ${saving ? "animate-spin" : ""}`} />
          {saving ? "Saving..." : saveSuccess ? "Saved" : "Save"}
        </button>
      {/if}
    </div>
  </div>
</div>
