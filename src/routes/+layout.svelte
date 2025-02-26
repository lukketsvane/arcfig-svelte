<script>
  import "../app.css";
</script>

<div style="background-color: #FFFFFF !important; min-height: 100vh;">
  <header style="background-color: #FFFFFF !important; padding: 1rem; border-bottom: 1px solid #DDDDDD;">
    <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center;">
      <img src="/favicon.png" alt="Logo" style="height: 2rem; margin-right: 0.5rem;" />
      <h1 style="font-size: 1.5rem; font-weight: bold; margin: 0;">ArchiFigure</h1>
    </div>
  </header>
  
  <main style="background-color: #FFFFFF !important; padding: 1rem; max-width: 1200px; margin: 0 auto;">
    <slot />
  </main>
</div>
