// src/routes/api/predictions/+server.ts
import { json } from '@sveltejs/kit';
import { REPLICATE_API_TOKEN } from '$env/static/private';
import { checkAndStoreCompletedPredictions } from '$lib/supabase';

export async function GET() {
  try {
    const response = await fetch(
      "https://api.replicate.com/v1/predictions?deployment=cygnus-holding/hunyuan3d-2",
      { 
        headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
        cache: "no-store" 
      }
    );
    
    const { results } = await response.json();
    
    const predictions = (results || []).filter(
      (p) => p?.id && p?.status && p?.input?.image && 
             p.status !== "canceled" && 
             (p.status === "succeeded" 
               ? p.output?.mesh && new URL(p.output.mesh) 
               : !p.error && ["starting", "processing"].includes(p.status))
    ).sort((a, b) =>
      ["starting", "processing"].includes(a.status) !== ["starting", "processing"].includes(b.status)
        ? ["starting", "processing"].includes(a.status) ? -1 : 1
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Auto-save completed models in the background
    try {
      const unsavedCompletedModels = predictions.filter(
        p => p.status === "succeeded" && p.output?.mesh
      );
      
      if (unsavedCompletedModels.length > 0) {
        // Don't await this - let it run in the background
        checkAndStoreCompletedPredictions().catch(err => 
          console.error("Auto-save error:", err)
        );
      }
    } catch (saveError) {
      console.error("Auto-save attempt failed:", saveError);
    }
    
    return json(predictions);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return json([], { status: 200 });
  }
}