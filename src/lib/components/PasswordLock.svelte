<script lang="ts">
  import { browser } from '$app/environment';
  import { Send } from 'lucide-svelte';
  
  let password = "";
  let authenticated = false;
  
  if (browser) {
    authenticated = localStorage.getItem("passwordAuthenticated") === "true";
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (password === "jegvilha3d") {
      authenticated = true;
      if (browser) {
        localStorage.setItem("passwordAuthenticated", "true");
      }
    } else {
      alert("Incorrect password");
    }
  }
</script>

{#if !authenticated}
  <div class="flex min-h-screen items-center justify-center bg-background">
    <form on:submit={handleSubmit} class="flex items-center gap-2 border rounded p-4 bg-background">
      <input
        type="password"
        bind:value={password}
        placeholder="Skriv inn passord"
        class="px-4 py-2 border rounded focus:outline-none bg-background"
      />
      <button type="submit" class="p-2 border rounded"><Send class="w-5 h-5" /></button>
    </form>
  </div>
{:else}
  <slot />
{/if}
