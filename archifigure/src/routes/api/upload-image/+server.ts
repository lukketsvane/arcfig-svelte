import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    
    if (!image || !(image instanceof File)) {
      return json({ error: 'No image file provided' }, { status: 400 });
    }
    
    // For demo, generate a placeholder URL
    const url = `https://picsum.photos/800/800?random=${Math.floor(Math.random() * 1000)}`;
    
    return json({ url });
  } catch (error) {
    console.error('Error uploading image:', error);
    return json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
