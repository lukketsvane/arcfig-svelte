<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Loader2, X, Info, Plus, Check } from 'lucide-svelte';
  import { pendingSubmissions } from '$lib/store';
  import { apiPost } from '$lib/utils';
  import { toast } from '$lib/toast';

  export let onImagesGenerated: (urls: string[]) => void;
  export let forcedAspectRatio = "1:1";
  export let useMostPermissiveSafetyLevel = true;
  export let useImagen3 = true;

  let generatingImages = false;
  let generatedImages: { url: string, prompt: string, pendingId: string }[] = []
  let progress = { current: 0, total: 0 };
  
  // Prompt generation
  const defaultPrompt = "full frame image of a {person} scandinavian {pose}";
  const promptSuffix = ", head to toe view, studio lighting, set stark against a solid white background";
  let basePrompt = defaultPrompt;
  let lists: Record<string, string[]> = {};
  let detectedLists: string[] = []
  let newTag = "";
  let activeListId: string | null = null;
  
  // Fixed type definition to allow string and number types
  let editingTag: { listId: string | null, index: number | null, value: string } = { listId: null, index: null, value: "" };

  const negativePrompt = "blurry, distorted, low quality, low resolution, deformed, " + 
    "out of frame, cropped, missing limbs, partial body, head only, close-up, " +
    "watermark, signature, text, environment, props, objects, " + 
    "cluttered background, distracting details, multiple people, group, crowd";

  // Find placeholders in prompt
  $: {
    const regex = /\{([^}]+)\}/g;
    const matches = [...basePrompt.matchAll(regex)];
    const listIds = [...new Set(matches.map(match => match[1].trim()))];
    
    detectedLists = listIds;
    
    // Initialize and clean up lists object
    const newLists = { ...lists };
    listIds.forEach(id => {
      if (!newLists[id]) newLists[id] = [];
    });
    
    Object.keys(newLists).forEach(key => {
      if (!listIds.includes(key)) delete newLists[key];
    });
    
    lists = newLists;
  }

  // Add example tags for default prompt
  $: if (basePrompt === defaultPrompt && 
      detectedLists.includes("person") && detectedLists.includes("pose") &&
      (!lists["person"]?.length && !lists["pose"]?.length)) {
    lists = {
      "person": ["woman", "man"],
      "pose": ["standing", "walking"]
    };
  }

  function addTag(listId: string, tagText: string) {
    if (!tagText?.trim()) return;
    
    // Process multipliers (tag*n syntax)
    const match = tagText.match(/^(.+)\*(\d+)$/);
    const tags = match 
      ? Array(parseInt(match[2])).fill(match[1].trim())
      : [tagText.trim()];
    
    lists = {
      ...lists,
      [listId]: [...(lists[listId] || []), ...tags]
    };
  }

  function removeTag(listId: string, index: number) {
    lists = {
      ...lists,
      [listId]: lists[listId].filter((_, i) => i !== index)
    };
  }

  function startEditTag(listId: string, index: number, value: string) {
    editingTag = { listId, index, value };
  }

  function completeTagEdit() {
    if (editingTag.listId !== null && editingTag.index !== null && editingTag.value.trim()) {
      lists = {
        ...lists,
        [editingTag.listId]: lists[editingTag.listId].map((tag, i) => 
          i === editingTag.index ? editingTag.value.trim() : tag
        )
      };
    }
    editingTag = { listId: null, index: null, value: "" };
  }

  function generatePrompts(): string[] {
    // Check if all lists have at least one tag
    if (!detectedLists.every(list => lists[list]?.length > 0)) {
      toast.error("All placeholders need at least one tag");
      return [];
    }
    
    function generateAllPermutations(prompt: string, remainingLists: string[], currentPermutations: string[] = []): string[] {
      if (remainingLists.length === 0) {
        return currentPermutations.length ? 
          currentPermutations.map(p => p + promptSuffix) : 
          [prompt + promptSuffix];
      }
      
      const listId = remainingLists[0];
      const tags = lists[listId];
      const nextLists = remainingLists.slice(1);
      
      // For first list, initialize permutations
      if (currentPermutations.length === 0) {
        const initialPerms = tags.map(tag => 
          prompt.replace(new RegExp(`\\{${listId}\\}`, 'g'), tag)
        );
        return generateAllPermutations(prompt, nextLists, initialPerms);
      }
      
      // For subsequent lists, create permutations for each existing one
      const newPerms: string[] = [];
      currentPermutations.forEach(perm => {
        tags.forEach(tag => {
          newPerms.push(
            perm.replace(new RegExp(`\\{${listId}\\}`, 'g'), tag)
          );
        });
      });
      
      return generateAllPermutations(prompt, nextLists, newPerms);
    }
    
    return generateAllPermutations(basePrompt, [...detectedLists]);
  }

  function getTagColor(listId: string, index: number): string {
    const colors = [
      "bg-[#A259FF] text-white", // Purple
      "bg-[#F24E1E] text-white", // Red
      "bg-[#1ABCFE] text-white", // Blue
      "bg-[#0ACF83] text-white", // Green
    ];
    
    const colorIndex = (listId.charCodeAt(0) + index) % colors.length;
    return colors[colorIndex];
  }

  async function generateImages(prompts?: string[]) {
    if (!prompts) prompts = generatePrompts();
    if (!prompts.length) return;
    
    generatingImages = true;
    progress = { current: 0, total: prompts.length };
    const images: { url: string, prompt: string, pendingId: string }[] = [];
    const newPendingSubmissions: any[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      progress = { current: i + 1, total: prompts.length };
      
      // Create a pending submission
      const pendingId = `pending-${Date.now()}-${i}`;
      const pendingSubmission = {
        id: pendingId,
        status: "starting",
        input: { image: "" },
        created_at: new Date().toISOString(),
        prompt: prompt.replace(/, full standing body, head to toe view, studio lighting.+/g, "")
      };
      newPendingSubmissions.push(pendingSubmission);
      
      try {
        const data = await apiPost<{ imageUrl: string }>('/api/generate-image', {
          prompt, 
          aspect_ratio: forcedAspectRatio,
          negative_prompt: negativePrompt,
          safety_filter_level: useMostPermissiveSafetyLevel ? "block_only_high" : "block_medium_and_above",
          use_imagen3: useImagen3
        });
        
        if (data.imageUrl) {
          images.push({
            url: data.imageUrl,
            prompt,
            pendingId
          });
          pendingSubmission.input.image = data.imageUrl;
        } else {
          toast.error(`No image generated for prompt: "${prompt}"`);
        }
      } catch (err) {
        console.error("Error generating image:", err);
        toast.error(`Error for prompt: "${prompt}"`);
      }
    }

    // Update pending submissions
    pendingSubmissions.update(prev => [...newPendingSubmissions, ...prev]);
    generatedImages = images;
    
    if (images.length > 0) {
      onImagesGenerated(images.map(img => img.url));
      toast.success(`Generated ${images.length} images`);
    }
    
    generatingImages = false;
  }

  function removeImage(index: number) {
    generatedImages = generatedImages.filter((_, i) => i !== index);
    onImagesGenerated(generatedImages.map(img => img.url));
  }

  function handleKeyDown(event: KeyboardEvent, callback: () => void) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  }
</script>

<div class="space-y-4">
  <!-- Prompt Generator -->
  <div class="space-y-2">
    <div class="flex items-center">
      <label for="prompt" class="text-xs">Leietekst</label>
      <Info class="h-3.5 w-3.5 ml-1 text-muted-foreground" />
    </div>
    <textarea
      id="prompt"
      placeholder="Enter prompt with &#123;placeholders&#125; in curly braces"
      bind:value={basePrompt}
      class="w-full min-h-[80px] p-2 rounded-md border border-input bg-background"
    ></textarea>
  </div>

  {#if detectedLists.length > 0}
    <div class="space-y-3">
      {#each detectedLists as listId}
        <div class="p-3 border rounded-md space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium">{listId} ({lists[listId]?.length || 0})</span>
          </div>
          
          <div class="flex flex-wrap gap-2 min-h-[40px] items-center">
            {#each lists[listId] || [] as tag, index}
              <div class="relative">
                {#if editingTag.listId === listId && editingTag.index === index}
                  <div class="flex items-center">
                    <input
                      type="text"
                      class="h-7 px-2 py-0 text-xs border rounded-full focus:outline-none w-[120px]"
                      bind:value={editingTag.value}
                      on:keydown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          completeTagEdit();
                        } else if (e.key === 'Escape') {
                          editingTag = { listId: null, index: null, value: "" };
                        }
                      }}
                      on:blur={completeTagEdit}
                    />
                    <button
                      class="h-5 w-5 ml-1 inline-flex items-center justify-center rounded-full hover:bg-accent"
                      on:click={completeTagEdit}
                    >
                      <Check class="h-3 w-3" />
                    </button>
                  </div>
                {:else}
                  <button 
                    class={`px-3 py-1 text-xs rounded-full ${getTagColor(listId, index)} cursor-pointer group inline-flex items-center`}
                    on:click={() => startEditTag(listId, index, tag)}
                  >
                    <span class="group-hover:underline">{tag}</span>
                    <span
                      role="button"
                      tabindex="0"
                      class="h-4 w-4 ml-1 -mr-1 text-white/90 hover:text-white hover:bg-transparent opacity-70 group-hover:opacity-100 cursor-pointer"
                      on:click|stopPropagation={() => removeTag(listId, index)}
                      on:keydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          removeTag(listId, index);
                        }
                      }}
                    >
                      <X class="h-3 w-3" />
                    </span>
                  </button>
                {/if}
              </div>
            {/each}
            
            <button
              class="bg-muted text-muted-foreground hover:bg-muted/80 px-2 py-1 rounded-full cursor-pointer h-6 w-6 flex items-center justify-center"
              on:click={() => activeListId = listId}
              on:keydown={(e) => handleKeyDown(e, () => activeListId = listId)}
            >
              <Plus class="h-3 w-3" />
            </button>
            
            {#if activeListId === listId}
              <div class="flex items-center">
                <input
                  type="text"
                  class="h-7 px-2 py-0 text-xs border rounded-full focus:outline-none w-[120px]"
                  placeholder="Add tag or tag*n..."
                  bind:value={newTag}
                  on:keydown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(listId, newTag);
                      newTag = "";
                    } else if (e.key === 'Escape') {
                      activeListId = null;
                      newTag = "";
                    }
                  }}
                  on:blur={() => {
                    if (newTag.trim()) addTag(listId, newTag);
                    activeListId = null;
                    newTag = "";
                  }}
                />
              </div>
            {/if}
          </div>
        </div>
      {/each}
      
      <button 
        class="w-full justify-start h-8 bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm inline-flex items-center disabled:opacity-50"
        disabled={!detectedLists.every(list => lists[list]?.length > 0)}
        on:click={() => generateImages()}
      >
        <span class="mr-auto">
          Generate {detectedLists.reduce((acc, list) => acc * (lists[list]?.length || 1), 1)} Images
        </span>
      </button>
    </div>
  {/if}

  <!-- Loading and Generated Images -->
  {#if generatingImages}
    <div class="flex items-center justify-center p-3 border rounded-md">
      <div class="text-center">
        <Loader2 class="h-7 w-7 animate-spin mx-auto mb-1" />
        <p class="text-xs">Generating image {progress.current} of {progress.total}...</p>
      </div>
    </div>
  {/if}
  
  {#if generatedImages.length > 0 && !generatingImages}
    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
      {#each generatedImages as image, index}
        <div class="overflow-hidden border rounded-md">
          <div class="relative aspect-square">
            <img
              src={image.url}
              alt={`Generated image ${index + 1}`}
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <button 
              class="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/70 inline-flex items-center justify-center"
              on:click={() => removeImage(index)}
            >
              <X class="h-3 w-3" />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
