<script lang="ts">
    export let data: {
      models: Array<{
        id: string;
        url: string;
        thumbnail_url: string;
        input_image: string;
        resolution: number;
        created_at: string;
      }>;
    };
  </script>
  
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Model Gallery</h1>
    {#if data.models.length === 0}
      <p>No models found. Try generating some 3D assets first!</p>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {#each data.models as model}
          <div class="border rounded p-2 hover:shadow-lg transition-shadow">
            <img src={model.thumbnail_url} alt="Model thumbnail" class="w-full h-40 object-cover mb-2" />
            <p class="text-sm font-medium">Model ID: {model.id}</p>
            <p class="text-xs text-gray-500">Resolution: {model.resolution}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  