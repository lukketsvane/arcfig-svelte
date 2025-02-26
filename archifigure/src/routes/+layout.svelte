<script lang="ts">
  import "../app.css";
  import Navbar from "$lib/components/Navbar.svelte";
  import { Toaster } from "sonner";
  import { browser } from "$app/environment";
</script>

<div class="min-h-screen flex flex-col">
  <Navbar />
  <main class="flex-1">
    <slot />
  </main>
</div>

{#if browser}
  <Toaster position="top-right" />
{/if}
