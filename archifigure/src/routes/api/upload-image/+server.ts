// src/routes/api/upload-image/+server.ts
import { json } from '@sveltejs/kit';
import { IMGBB_API_KEY } from '$env/static/private';

export async function POST({ request }) {
	try {
		// Parse the incoming form data.
		const formData = await request.formData();
		const image = formData.get('image');

		if (!image || !(image instanceof File)) {
			return json({ error: 'No image file provided' }, { status: 400 });
		}

		// Read the file into an ArrayBuffer and convert it to base64.
		const buffer = await image.arrayBuffer();
		const base64Image = Buffer.from(buffer).toString('base64');

		// Prepare form data for imgbb API.
		const imgbbFormData = new FormData();
		imgbbFormData.append('key', IMGBB_API_KEY);
		imgbbFormData.append('image', base64Image);
		// Optionally, you can add a 'name' or 'expiration' parameter:
		// imgbbFormData.append('name', image.name);
		// imgbbFormData.append('expiration', '0');

		// Call imgbb API using POST.
		const response = await fetch('https://api.imgbb.com/1/upload', {
			method: 'POST',
			body: imgbbFormData
		});

		const data = await response.json();
		if (!data.success) {
			return json({ error: 'Failed to upload image to imgbb' }, { status: 500 });
		}

		// Return the image URL and delete URL (if needed)
		return json({ 
			url: data.data.url, 
			delete_url: data.data.delete_url 
		});
	} catch (error) {
		console.error('Error uploading image:', error);
		return json({ error: 'Failed to upload image' }, { status: 500 });
	}
}
