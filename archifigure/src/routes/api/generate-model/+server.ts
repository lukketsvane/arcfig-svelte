import { json } from '@sveltejs/kit';
import type { Prediction } from '$lib/utils';

export async function POST({ request }) {
  try {
    const data = await request.json();
    
    if (!data.image) {
      return json({ error: 'Image URL is required' }, { status: 400 });
    }
    
    // Mock response for demo
    const mockPrediction: Prediction = {
      id: `pred-${Date.now()}`,
      status: 'processing',
      input: { 
        image: data.image,
        octree_resolution: data.octree_resolution || 256,
        steps: data.steps || 50,
        guidance_scale: data.guidance_scale || 5.5,
        seed: data.seed || Math.floor(Math.random() * 10000),
        remove_background: data.remove_background === undefined ? true : data.remove_background
      },
      created_at: new Date().toISOString()
    };
    
    return json(mockPrediction);
  } catch (error) {
    console.error('Error generating model:', error);
    return json({ error: 'Failed to start generation' }, { status: 500 });
  }
}
