<!-- src/routes/gallery/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { ChevronDown, Plus, Trash, Pencil, Grid, List, Search, X, ArrowUpDown } from 'lucide-svelte';
    import { currentProjectId, projects } from '$lib/store';
    import { getProjects, getProjectModels, createProject, deleteProject, deleteModelsByIds, moveModelsToProject, renameModels } from '$lib/supabase';
    import ModelViewer from '$lib/components/ModelViewer.svelte';
    import { toast } from '$lib/toast';
    import type { Project, ProjectModel } from '$lib/utils';
  
    let loading = true;
    let projectModels: ProjectModel[] = [];
    let filteredModels: ProjectModel[] = [];
    let searchTerm = '';
    let isGridView = true;
    let selectedModelIds: string[] = [];
    let newProjectName = '';
    let isCreatingProject = false;
    let isRenaming = false;
    let newModelName = '';
    let selectedModel: ProjectModel | null = null;
    let dropdownOpen = false;
    let moveToProjectId: string | null = null;
    let sortBy: 'created' | 'name' | 'resolution' = 'created';
    let sortDirection: 'asc' | 'desc' = 'desc';
  
    // Load projects and models
    onMount(async () => {
      try {
        const projectsList = await getProjects();
        projects.set(projectsList);
        
        if ($currentProjectId) {
          await loadProjectModels($currentProjectId);
        }
      } catch (error) {
        console.error("Failed to load projects:", error);
        toast.error("Failed to load projects");
      } finally {
        loading = false;
      }
    });
  
    async function loadProjectModels(projectId: string) {
      loading = true;
      try {
        projectModels = await getProjectModels(projectId);
        applyFiltersAndSort();
      } catch (error) {
        console.error("Failed to load models:", error);
        toast.error("Failed to load models");
      } finally {
        loading = false;
      }
    }
  
    function applyFiltersAndSort() {
      // Filter by search term
      let results = [...projectModels];
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        results = results.filter(model => 
          model.name?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply sorting
      results.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'created') {
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else if (sortBy === 'name') {
          comparison = (a.name || '').localeCompare(b.name || '');
        } else if (sortBy === 'resolution') {
          comparison = a.resolution - b.resolution;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      
      filteredModels = results;
    }
    
    function toggleSort(field: 'created' | 'name' | 'resolution') {
      if (sortBy === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy = field;
        sortDirection = 'desc';
      }
      applyFiltersAndSort();
    }
  
    async function handleProjectChange(id: string | null) {
      currentProjectId.set(id);
      selectedModelIds = [];
      
      if (id) {
        await loadProjectModels(id);
      } else {
        projectModels = [];
        filteredModels = [];
      }
    }
  
    async function handleCreateProject() {
      if (!newProjectName.trim()) return;
      
      isCreatingProject = true;
      try {
        const project = await createProject(newProjectName);
        if (project) {
          projects.update(current => [project, ...current]);
          currentProjectId.set(project.id);
          await loadProjectModels(project.id);
          newProjectName = '';
          toast.success("Project created");
        } else {
          toast.error("Failed to create project");
        }
      } catch (error) {
        console.error("Create project error:", error);
        toast.error("Failed to create project");
      } finally {
        isCreatingProject = false;
      }
    }
  
    async function handleDeleteProject() {
      if (!$currentProjectId) return;
      
      const confirmed = confirm("Are you sure you want to delete this project and all its models?");
      if (!confirmed) return;
      
      loading = true;
      try {
        const success = await deleteProject($currentProjectId);
        if (success) {
          projects.update(current => current.filter(p => p.id !== $currentProjectId));
          currentProjectId.set(null);
          projectModels = [];
          filteredModels = [];
          toast.success("Project deleted");
        } else {
          toast.error("Failed to delete project");
        }
      } catch (error) {
        console.error("Delete project error:", error);
        toast.error("Failed to delete project");
      } finally {
        loading = false;
      }
    }
  
    async function handleDeleteSelectedModels() {
      if (!selectedModelIds.length) return;
      
      const confirmed = confirm(`Are you sure you want to delete ${selectedModelIds.length} selected model(s)?`);
      if (!confirmed) return;
      
      loading = true;
      try {
        const success = await deleteModelsByIds(selectedModelIds);
        if (success) {
          projectModels = projectModels.filter(model => !selectedModelIds.includes(model.id));
          applyFiltersAndSort();
          selectedModelIds = [];
          toast.success("Models deleted");
        } else {
          toast.error("Failed to delete models");
        }
      } catch (error) {
        console.error("Delete models error:", error);
        toast.error("Failed to delete models");
      } finally {
        loading = false;
      }
    }
  
    async function handleMoveModels() {
      if (!selectedModelIds.length || !moveToProjectId) return;
      
      loading = true;
      try {
        const success = await moveModelsToProject(selectedModelIds, moveToProjectId);
        if (success) {
          projectModels = projectModels.filter(model => !selectedModelIds.includes(model.id));
          applyFiltersAndSort();
          selectedModelIds = [];
          moveToProjectId = null;
          dropdownOpen = false;
          toast.success("Models moved to project");
        } else {
          toast.error("Failed to move models");
        }
      } catch (error) {
        console.error("Move models error:", error);
        toast.error("Failed to move models");
      } finally {
        loading = false;
      }
    }
  
    async function handleRenameModels() {
      if (!selectedModelIds.length || !newModelName.trim()) return;
      
      loading = true;
      try {
        const success = await renameModels(selectedModelIds, newModelName);
        if (success) {
          if ($currentProjectId) {
            await loadProjectModels($currentProjectId);
          }
          selectedModelIds = [];
          isRenaming = false;
          newModelName = '';
          toast.success("Models renamed");
        } else {
          toast.error("Failed to rename models");
        }
      } catch (error) {
        console.error("Rename models error:", error);
        toast.error("Failed to rename models");
      } finally {
        loading = false;
      }
    }
  
    function toggleModelSelection(id: string) {
      if (selectedModelIds.includes(id)) {
        selectedModelIds = selectedModelIds.filter(modelId => modelId !== id);
      } else {
        selectedModelIds = [...selectedModelIds, id];
      }
    }
  
    function selectAllModels() {
      if (selectedModelIds.length === filteredModels.length) {
        selectedModelIds = [];
      } else {
        selectedModelIds = filteredModels.map(model => model.id);
      }
    }
  
    function openModel(model: ProjectModel) {
      selectedModel = model;
    }
  
    function closeModelViewer() {
      selectedModel = null;
    }
  
    $: if ($currentProjectId) loadProjectModels($currentProjectId);
    $: if (searchTerm !== undefined) applyFiltersAndSort();
  </script>
  
  <div class="max-w-screen-2xl mx-auto px-4 py-8">
    <header class="mb-8">
      <h1 class="text-3xl font-bold mb-2">3D Model Gallery</h1>
      <p class="text-muted-foreground">Browse and manage your 3D models</p>
    </header>
  
    <div class="flex flex-col md:flex-row gap-8">
      <!-- Sidebar -->
      <div class="w-full md:w-64 space-y-4">
        <div class="p-4 border rounded-lg space-y-4">
          <h2 class="font-semibold text-lg">Projects</h2>
          
          <!-- Create project form -->
          <div class="space-y-2">
            <input
              type="text"
              placeholder="New project name"
              bind:value={newProjectName}
              class="w-full px-3 py-2 text-sm border rounded-md"
            />
            <button
              on:click={handleCreateProject}
              disabled={!newProjectName.trim() || isCreatingProject}
              class="w-full bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm inline-flex items-center justify-center"
            >
              {#if isCreatingProject}
                <span class="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {:else}
                <Plus class="h-4 w-4 mr-2" />
              {/if}
              Create Project
            </button>
          </div>
          
          <!-- Project list -->
          <div class="space-y-1 mt-4">
            <button
              class={`w-full px-3 py-2 text-sm rounded-md text-left transition ${$currentProjectId === null ? 'bg-muted' : 'hover:bg-muted'}`}
              on:click={() => handleProjectChange(null)}
            >
              All Projects
            </button>
            
            {#if $projects && $projects.length > 0}
              {#each $projects as project}
                <button
                  class={`w-full px-3 py-2 text-sm rounded-md text-left transition ${$currentProjectId === project.id ? 'bg-muted' : 'hover:bg-muted'}`}
                  on:click={() => handleProjectChange(project.id)}
                >
                  {project.name}
                </button>
              {/each}
            {:else}
              <div class="px-3 py-2 text-sm text-muted-foreground">
                No projects yet
              </div>
            {/if}
          </div>
          
          <!-- Project actions -->
          {#if $currentProjectId}
            <div class="pt-2 border-t">
              <button
                on:click={handleDeleteProject}
                class="text-red-500 hover:text-red-600 text-sm inline-flex items-center"
              >
                <Trash class="h-4 w-4 mr-1" />
                Delete Project
              </button>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Main content -->
      <div class="flex-1">
        <!-- Toolbar -->
        <div class="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div class="flex items-center gap-2">
            <div class="relative">
              <Search class="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search models..."
                bind:value={searchTerm}
                class="pl-9 pr-3 py-2 w-full sm:w-auto min-w-[200px] text-sm border rounded-md"
              />
              {#if searchTerm}
                <button 
                  on:click={() => { searchTerm = ''; applyFiltersAndSort(); }}
                  class="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X class="h-4 w-4 text-muted-foreground" />
                </button>
              {/if}
            </div>
            
            <div class="flex items-center border rounded-md overflow-hidden">
              <button
                class={`px-3 py-2 ${isGridView ? 'bg-muted' : ''}`}
                title="Grid view"
                on:click={() => isGridView = true}
              >
                <Grid class="h-4 w-4" />
              </button>
              <button
                class={`px-3 py-2 ${!isGridView ? 'bg-muted' : ''}`}
                title="List view"
                on:click={() => isGridView = false}
              >
                <List class="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <!-- Selection actions -->
          <div class="flex items-center gap-2">
            {#if selectedModelIds.length > 0}
              <span class="text-sm text-muted-foreground">
                {selectedModelIds.length} selected
              </span>
              
              <button
                on:click={() => isRenaming = !isRenaming}
                class="px-3 py-1 text-sm border rounded-md inline-flex items-center"
              >
                <Pencil class="h-4 w-4 mr-1" />
                Rename
              </button>
              
              <div class="relative">
                <button
                  on:click={() => dropdownOpen = !dropdownOpen}
                  class="px-3 py-1 text-sm border rounded-md inline-flex items-center"
                >
                  Move to
                  <ChevronDown class="h-4 w-4 ml-1" />
                </button>
                
                {#if dropdownOpen}
                  <div class="absolute right-0 z-10 mt-1 w-56 origin-top-right rounded-md bg-background border shadow-lg">
                    <div class="p-2 max-h-60 overflow-auto">
                      {#each $projects.filter(p => p.id !== $currentProjectId) as project}
                        <button
                          class="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted"
                          on:click={() => { moveToProjectId = project.id; handleMoveModels(); }}
                        >
                          {project.name}
                        </button>
                      {/each}
                      
                      {#if !$projects.filter(p => p.id !== $currentProjectId).length}
                        <div class="px-3 py-2 text-sm text-muted-foreground">
                          No other projects available
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
              
              <button
                on:click={handleDeleteSelectedModels}
                class="px-3 py-1 text-sm bg-red-500 text-white rounded-md inline-flex items-center"
              >
                <Trash class="h-4 w-4 mr-1" />
                Delete
              </button>
            {/if}
          </div>
        </div>
        
        {#if isRenaming}
          <div class="mb-4 p-3 border rounded-md flex items-center gap-2">
            <input
              type="text"
              placeholder="New name for selected models"
              bind:value={newModelName}
              class="flex-1 px-3 py-2 text-sm border rounded-md"
            />
            <button
              on:click={handleRenameModels}
              disabled={!newModelName.trim()}
              class="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md"
            >
              Rename
            </button>
            <button
              on:click={() => { isRenaming = false; newModelName = ''; }}
              class="px-4 py-2 border text-sm rounded-md"
            >
              Cancel
            </button>
          </div>
        {/if}
        
        {#if loading}
          <div class="flex items-center justify-center h-64">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        {:else if filteredModels.length === 0}
          <div class="flex flex-col items-center justify-center h-64 text-center">
            <div class="text-muted-foreground mb-2">
              {searchTerm 
                ? "No models match your search"
                : $currentProjectId 
                  ? "No models in this project yet" 
                  : "Select a project to view models"}
            </div>
            {#if searchTerm}
              <button
                on:click={() => { searchTerm = ''; applyFiltersAndSort(); }}
                class="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md"
              >
                Clear search
              </button>
            {/if}
          </div>
        {:else}
          <!-- Grid view -->
          {#if isGridView}
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {#each filteredModels as model}
                <div class="relative border rounded-md overflow-hidden group">
                  <div class="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedModelIds.includes(model.id)}
                      on:change={() => toggleModelSelection(model.id)}
                      class="h-4 w-4 rounded"
                    />
                  </div>
                  
                  <div class="aspect-square relative cursor-pointer" on:click={() => openModel(model)}>
                    <img
                      src={model.thumbnail_url || model.input_image}
                      alt={model.name || "3D Model"}
                      class="w-full h-full object-cover"
                    />
                    
                    <!-- Status Overlay -->
                    {#if model.status === "pending" || model.status === "processing" || model.status === "starting"}
                      <div class="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div class="text-white text-center">
                          <div class="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto mb-2"></div>
                          <span class="text-sm">Processing</span>
                        </div>
                      </div>
                    {:else if model.status === "failed"}
                      <div class="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                        <div class="text-white text-center">
                          <span class="text-sm">Generation Failed</span>
                        </div>
                      </div>
                    {:else}
                      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span class="text-white text-sm font-medium">Click to view</span>
                      </div>
                    {/if}
                  </div>
                  
                  <div class="p-3">
                    <div class="font-medium text-sm truncate" title={model.name || "Unnamed Model"}>
                      {model.name || "Unnamed Model"}
                    </div>
                    <div class="text-xs text-muted-foreground mt-1">
                      {new Date(model.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <!-- List view -->
            <div class="border rounded-md overflow-hidden">
              <table class="w-full">
                <thead>
                  <tr class="bg-muted">
                    <th class="px-4 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedModelIds.length === filteredModels.length && filteredModels.length > 0}
                        on:change={selectAllModels}
                        class="h-4 w-4 rounded"
                      />
                    </th>
                    <th class="px-4 py-2 text-left text-sm font-medium">
                      <button on:click={() => toggleSort('name')} class="inline-flex items-center">
                        Name
                        <ArrowUpDown class={`h-3 w-3 ml-1 ${sortBy === 'name' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </th>
                    <th class="px-4 py-2 text-left text-sm font-medium">
                      <button on:click={() => toggleSort('created')} class="inline-flex items-center">
                        Created
                        <ArrowUpDown class={`h-3 w-3 ml-1 ${sortBy === 'created' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </th>
                    <th class="px-4 py-2 text-left text-sm font-medium">
                      <button on:click={() => toggleSort('resolution')} class="inline-flex items-center">
                        Resolution
                        <ArrowUpDown class={`h-3 w-3 ml-1 ${sortBy === 'resolution' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </th>
                    <th class="px-4 py-2 text-left text-sm font-medium">Status</th>
                    <th class="px-4 py-2 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each filteredModels as model}
                    <tr class="border-t hover:bg-muted/50">
                      <td class="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedModelIds.includes(model.id)}
                          on:change={() => toggleModelSelection(model.id)}
                          class="h-4 w-4 rounded"
                        />
                      </td>
                      <td class="px-4 py-3 text-sm">{model.name || "Unnamed Model"}</td>
                      <td class="px-4 py-3 text-sm">{new Date(model.created_at).toLocaleDateString()}</td>
                      <td class="px-4 py-3 text-sm">{model.resolution}</td>
                      <td class="px-4 py-3 text-sm">
                        {#if model.status === "failed"}
                          <span class="text-red-500">Failed</span>
                        {:else if model.status === "pending" || model.status === "processing" || model.status === "starting"}
                          <span class="text-amber-500">Processing</span>
                        {:else}
                          <span class="text-green-500">Complete</span>
                        {/if}
                      </td>
                      <td class="px-4 py-3">
                        <button
                          on:click={() => openModel(model)}
                          class="text-sm text-primary"
                          disabled={model.status !== "succeeded" && !model.model_url}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Model Viewer Modal -->
  {#if selectedModel}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-auto p-4">
      <div class="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between p-4 border-b">
          <h3 class="font-medium">{selectedModel.name || "3D Model"}</h3>
          <button on:click={closeModelViewer} class="p-2 rounded-full hover:bg-muted">
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="flex-1 min-h-[60vh] overflow-hidden">
          {#if selectedModel.model_url}
            <ModelViewer 
              url={selectedModel.model_url} 
              inputImage={selectedModel.input_image} 
              resolution={selectedModel.resolution}
            />
          {:else}
            <div class="flex items-center justify-center h-full">
              <p class="text-muted-foreground">Model not available or still processing</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}