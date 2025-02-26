// src/lib/utils.ts
// Combined types and utilities in one file for fewer imports
export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectModel {
  id: string;
  project_id: string;
  model_url: string;
  thumbnail_url: string;
  input_image: string;
  resolution: number;
  name?: string;
  status?: string;
  prediction_id?: string;
  created_at: string;
}

export interface SavedModel {
  id: string;
  url: string;
  thumbnail_url: string;
  created_at: string;
  input_image: string;
  resolution: number;
  model_hash: string;
}

export interface Prediction {
  id: string;
  status: string;
  error?: string;
  input: { 
    image?: string; 
    octree_resolution?: number;
    steps?: number;
    guidance_scale?: number;
    seed?: number;
    remove_background?: boolean;
  };
  output?: { mesh?: string };
  created_at: string;
  metrics?: { predict_time: number };
}

export interface ModelFormData {
  steps: number;
  guidance_scale: number;
  seed: number;
  octree_resolution: number;
  remove_background: boolean;
}

export interface PendingSubmission {
  id: string;
  status: string;
  input: { image: string; octree_resolution?: number };
  created_at: string;
  prompt?: string;
  project_id?: string;
}

export function tempToColor(kelvin: number): string {
  kelvin /= 100;
  let red, green, blue;
  
  if (kelvin <= 66) {
    red = 255;
    green = Math.min(255, Math.max(0, 99.4708025861 * Math.log(kelvin) - 161.1195681661));
    blue = kelvin <= 19 ? 0 : Math.min(255, Math.max(0, 138.5177312231 * Math.log(kelvin - 10) - 305.0447927307));
  } else {
    red = Math.min(255, Math.max(0, 329.698727446 * Math.pow(kelvin - 60, -0.1332047592)));
    green = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(kelvin - 60, -0.0755148492)));
    blue = 255;
  }
  
  return `rgb(${red}, ${green}, ${blue})`;
}

export function isAuthenticated(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem("passwordAuthenticated") === "true";
}

export function setAuthenticated(value: boolean): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem("passwordAuthenticated", value ? "true" : "false");
  }
}

// API helpers for more compact code
export async function apiPost<T>(url: string, data: any): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function uploadFile(file: File, url: string): Promise<any> {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch(url, { method: 'POST', body: formData });
  if (!response.ok) throw new Error(`Upload error: ${response.status}`);
  return response.json();
}
