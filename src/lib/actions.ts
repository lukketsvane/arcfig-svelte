// src/routes/gallery/+page.server.ts
import type { PageServerLoad } from './$types';
import { getSavedModels } from '$lib/actions';

export const load: PageServerLoad = async () => {
  const models = await getSavedModels();
  return { models };
};
