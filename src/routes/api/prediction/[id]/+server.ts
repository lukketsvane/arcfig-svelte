// src/routes/api/prediction/[id]/+server.ts
import { json } from '@sveltejs/kit';
import Replicate from 'replicate';
import { REPLICATE_API_TOKEN } from '$env/static/private';

export async function GET({ params }) {
  try {
    const predictionId = params.id;
    
    if (!predictionId) {
      return json({ error: 'Prediction ID is required' }, { status: 400 });
    }
    
    const replicate = new Replicate({
      auth: REPLICATE_API_TOKEN,
      baseURL: 'https://api.replicate.com'
    });
    
    const prediction = await replicate.predictions.get(predictionId);
    return json(prediction);
  } catch (error) {
    console.error('Error fetching prediction:', error);
    return json({ error: 'Failed to fetch prediction' }, { status: 500 });
  }
}