<script lang="ts">
  // You can use SvelteKit's <a href="..."> links for navigation.
</script>

<nav class="flex items-center justify-between p-4 bg-gray-800 text-white">
  <div class="flex items-center space-x-2">
    <img src="/logo.png" alt="ArchiFigure Logo" class="h-8 w-auto" />
    <span class="font-bold">ArchiFigure</span>
  </div>
  <div class="flex items-center space-x-4">
    <a href="/" class="hover:underline">Home</a>
    <!-- Gallery link with grid icon -->
    <a href="/gallery" class="hover:underline flex items-center space-x-1">
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
           xmlns="http://www.w3.org/2000/svg">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
           d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>
      <span>Gallery</span>
    </a>
    <a href="https://github.com/lukketsvane/archifigure" target="_blank" rel="noreferrer" class="hover:underline">
      GitHub
    </a>
  </div>
</nav>
