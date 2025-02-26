<script lang="ts">
  import { onMount } from 'svelte';
  import { Upload, ChevronRight, Settings, Github, X, Loader2, Info, Plus, Check } from 'lucide-svelte';
  import { theme, currentProjectId, projects, pendingSubmissions, selectedModel, isDarkMode } from '$lib/store';
  import { uploadFile, apiPost } from '$lib/utils';
  import { getProjects } from '$lib/supabase';
  import { toast } from '$lib/toast';
  import type { ModelFormData, Prediction } from '$lib/utils';
  import ImageGeneration from '$lib/components/ImageGeneration.svelte';
  import ModelViewer from '$lib/components/ModelViewer.svelte';

  let loading = false;
  let imageUrls: string[] = [];
  let autoGenerateMeshes = false;
  let settingsOpen = false;
  let fileInput: HTMLInputElement;
  let formData: ModelFormData = {
    steps: 50,
    guidance_scale: 5.5,
    seed: Math.floor(Math.random() * 10000),
    octree_resolution: 256,
    remove_background: true,
  };

  onMount(async () => {
    try {
      const projectsList = await getProjects();
      projects.set(projectsList);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  });

  async function handleSubmit(e?: SubmitEvent) {
    if (e) e.preventDefault();
    if (!imageUrls.length) return;
    
    loading = true;
    try {
      // Create pending submissions for all images
      const newSubmissions = imageUrls.map((url, idx) => ({
        id: `pending-${Date.now()}-${idx}`,
        status: "starting",
        input: { image: url, octree_resolution: formData.octree_resolution },
        created_at: new Date().toISOString(),
        project_id: $currentProjectId || undefined,
      }));
      pendingSubmissions.update(prev => [...newSubmissions, ...prev]);
      
      // Generate models for all images
      for (const url of imageUrls) {
        try {
          const prediction = await apiPost<Prediction>('/api/generate-model', {
            image: url,
            ...formData,
            project_id: $currentProjectId || undefined
          });
          // For demo, simulate a successful prediction with a static model URL
          setTimeout(() => {
            selectedModel.set({
              url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
              inputImage: url,
              resolution: formData.octree_resolution
            });
          }, 2000);
        } catch (error) {
          console.error('Model generation error:', error);
          toast.error(`Failed to generate model for image`);
        }
      }
      
      toast.success("3D model generation started!");
      imageUrls = [];
    } catch (err: any) {
      toast.error("Error: " + (err.message || "Unknown error"));
    } finally {
      loading = false;
    }
  }

  function handleImagesGenerated(urls: string[]) {
    imageUrls = urls;
    if (urls.length > 0 && autoGenerateMeshes) {
      handleSubmit();
    }
  }

  function removeImage(url: string) {
    imageUrls = imageUrls.filter(img => img !== url);
  }

  async function handleFileUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files?.length) return;
    try {
      const file = target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid image format");
        return;
      }
      const result = await uploadFile(file, '/api/upload-image');
      if (result?.url) {
        imageUrls = [...imageUrls, result.url];
      }
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      target.value = '';
    }
  }
</script>

<div class="relative h-[100dvh] w-full overflow-hidden flex flex-col">
  <!-- Header -->
  <div class="border-b">
    <div class="flex h-12 items-center px-2 sm:px-4 max-w-screen-2xl mx-auto">
      <div class="flex items-center space-x-2 font-semibold text-lg">
        <!-- Using the same valid URL here as in Navbar -->
        <img
          src="https://i.ibb.co/v4wcBzGK/logo-default.png"
          alt="ArchiFigure Logo"
          class="h-7 w-auto"
        />
      </div>
      <div class="ml-auto flex items-center space-x-2">
        <a href="https://github.com/lukketsvane/archifigure/" target="_blank" rel="noreferrer" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Github class="h-4 w-4" />
        </a>
      </div>
    </div>
  </div>
  
  <!-- Main Content -->
  <div class="flex-1 flex flex-col lg:flex-row overflow-hidden">
    <!-- Left Column: Upload and Image Generation -->
    <div class="w-full lg:w-[320px] lg:min-w-[320px] p-3 overflow-y-auto border-r">
      <div class="p-3 border rounded-md space-y-3">
        <select 
          bind:value={$currentProjectId}
          class="w-full h-8 text-xs px-3 py-1 rounded-md border border-input bg-background"
        >
          <option value={null}>Velg prosjekt (valgfritt)</option>
          {#each $projects as project}
            <option value={project.id}>{project.name}</option>
          {/each}
        </select>
      
        <form on:submit={handleSubmit} class="space-y-3">
          <div class="space-y-2">
            <!-- File input triggered by a label (no event listeners on the label) -->
            <label
              for="fileInput"
              aria-label="Upload image"
              class="relative flex flex-col items-center justify-center w-full h-16 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5"
            >
              <input 
                id="fileInput"
                bind:this={fileInput}
                type="file"
                accept="image/*"
                class="hidden"
                on:change={handleFileUpload}
              />
              <Upload class="w-4 h-4 text-muted-foreground" />
              <p class="text-xs text-muted-foreground mt-1">Upload</p>
            </label>
            
            <div class="pt-1">
              <ImageGeneration 
                onImagesGenerated={handleImagesGenerated}
                forcedAspectRatio="1:1"
                useMostPermissiveSafetyLevel={true}
                useImagen3={true}
              />
            </div>
          </div>
          
          <div>
            <button 
              type="button"
              class="flex w-full justify-start px-2 text-xs text-muted-foreground hover:text-foreground h-7"
              on:click={() => settingsOpen = !settingsOpen}
            >
              <Settings class="h-3 w-3 mr-1" />
              <span>Avanserte innstillingar</span>
              <ChevronRight class={`h-3 w-3 ml-auto transition-transform ${settingsOpen ? "rotate-90" : ""}`} />
            </button>
            
            {#if settingsOpen}
              <div class="pt-2 space-y-2">
                <div class="space-y-1">
                  <input 
                    type="range"
                    min="20"
                    max="50"
                    step="1"
                    bind:value={formData.steps}
                    class="w-full h-2"
                  />
                  <div class="flex justify-between text-xs text-muted-foreground">
                    <span>Steg: {formData.steps}</span>
                  </div>
                </div>
                
                <div class="space-y-1">
                  <input 
                    type="range"
                    min="1"
                    max="20"
                    step="0.1"
                    bind:value={formData.guidance_scale}
                    class="w-full h-2"
                  />
                  <div class="flex justify-between text-xs text-muted-foreground">
                    <span>Rettleiing: {formData.guidance_scale.toFixed(1)}</span>
                  </div>
                </div>
                
                <div class="flex justify-between gap-2">
                  <div class="flex-1">
                    <div class="flex">
                      <input
                        type="number"
                        bind:value={formData.seed}
                        class="h-7 w-full rounded-l-md border border-input px-2 py-1 text-xs"
                      />
                      <button 
                        type="button"
                        class="h-7 w-7 rounded-r-md border border-input border-l-0 flex items-center justify-center"
                        on:click={() => formData.seed = Math.floor(Math.random() * 10000)}
                      >
                        🎲
                      </button>
                    </div>
                    <div class="text-xs text-muted-foreground mt-1">Seed</div>
                  </div>
                  
                  <div class="flex-1">
                    <select
                      bind:value={formData.octree_resolution}
                      class="h-7 w-full text-xs rounded-md border border-input px-2 py-1 bg-background"
                    >
                      <option value={256}>256 - rask</option>
                      <option value={384}>384 - Medium</option>
                      <option value={512}>512 - detaljert</option>
                    </select>
                    <div class="text-xs text-muted-foreground mt-1">Quality</div>
                  </div>
                </div>
                
                <div class="flex items-center space-x-2">
                  <input
                    id="background"
                    type="checkbox"
                    bind:checked={formData.remove_background}
                    class="h-4 w-4"
                  />
                  <label for="background" class="text-xs">Fjern Bakgrunn</label>
                </div>
                
                <div class="flex items-center space-x-2">
                  <input
                    id="autoGenerate"
                    type="checkbox"
                    bind:checked={autoGenerateMeshes}
                    class="h-4 w-4"
                  />
                  <label for="autoGenerate" class="text-xs">Automatisk generer figurar</label>
                </div>
              </div>
            {/if}
          </div>
          
          <button
            type="submit"
            class="w-full h-9 text-sm inline-flex items-center justify-center rounded-md disabled:opacity-50 {loading ? 'bg-gray-600' : 'bg-gradient-to-r from-[#1ABCFE] to-[#A259FF]'} text-white"
            disabled={loading || !imageUrls.length}
          >
            {#if loading}
              <span class="flex items-center">
                <span class="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Snekrar modell
              </span>
            {:else}
              Lag 3D modell
            {/if}
          </button>
        </form>
      </div>
    </div>
    
    <!-- Right Column: Model Viewer -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 p-3 overflow-y-auto relative">
        <div class="w-full h-full relative overflow-hidden border rounded-md">
          {#if $selectedModel?.url}
            <div class="absolute inset-0">
              <ModelViewer
                url={$selectedModel.url}
                inputImage={$selectedModel.inputImage}
                resolution={$selectedModel.resolution}
              />
            </div>
          {:else}
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-muted/30">
              {#if loading}
                <div class="flex flex-col items-center space-y-2">
                  <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p class="text-sm text-muted-foreground">Snekrar figur...</p>
                </div>
              {:else if imageUrls.length > 0}
                <div class="w-full h-full grid grid-cols-2 md:grid-cols-3 gap-2 p-3 overflow-auto">
                  {#each imageUrls as url}
                    <div class="relative border rounded aspect-square overflow-hidden">
                      <img
                        src={url}
                        alt="Input"
                        class="absolute inset-0 w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        class="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/70 inline-flex items-center justify-center"
                        on:click={() => removeImage(url)}
                      >
                        <X class="h-3 w-3" />
                      </button>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="flex flex-col items-center space-y-2 max-w-sm text-center p-4">
                  <div class="mt-4 border-t pt-3 w-full">
                    <div class="flex justify-center">
                      <img 
                        src="https://i.ibb.co/qzd8ZXp/vipps.jpg" 
                        alt="vipps" 
                        class="w-48 h-48 object-contain rounded-lg" 
                      />
                    </div>
                    <div class="mt-3">
                      <p class="text-xs text-muted-foreground">
                        Vær grei å vipps en kopp kaffi, det koster meg noen kroner hver gang du lager en modell
                      </p>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
