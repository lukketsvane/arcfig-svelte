// src/routes/api/generate-image/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import Replicate from 'replicate';
import { REPLICATE_API_TOKEN } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Expect the client to send a JSON body with an "input" object.
		// For example:
		// { "input": { "prompt": "Your prompt here", ... } }
		const { input } = await request.json();

		if (!input || !input.prompt) {
			return json({ error: 'Input prompt is required' }, { status: 400 });
		}

		// Create a Replicate client with an absolute baseURL.
		// This prevents the client from trying to resolve relative paths (e.g. /auth/postback/tunnel).
		const replicate = new Replicate({
			auth: REPLICATE_API_TOKEN,
			baseURL: 'https://api.replicate.com'
		});

		// Run the google/imagen-3 model synchronously.
		// The model will process the input and return its output.
		const prediction = await replicate.run("google/imagen-3", {
			input
		});

		// Return the prediction response.
		return json(prediction);
	} catch (error: any) {
		console.error('Error generating prediction:', error);
		return json({ error: 'Failed to generate prediction', details: error.message }, { status: 500 });
	}
};
