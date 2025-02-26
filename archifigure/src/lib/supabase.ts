// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Project, ProjectModel } from './utils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Project functions
export async function getProjects(): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export async function createProject(name: string): Promise<Project | null> {
  try {
    // Check for existing project with same name
    const { data: existingProject } = await supabase
      .from("projects")
      .select("*")
      .ilike("name", name)
      .maybeSingle();
    
    if (existingProject) {
      await supabase
        .from("projects")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", existingProject.id);
      return existingProject;
    }
    
    // Create new project
    const { data, error } = await supabase
      .from("projects")
      .insert({ name })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating project:", error);
    return null;
  }
}

export async function saveModelToProject(
  projectId: string,
  modelUrl: string,
  thumbnailUrl: string,
  inputImage: string,
  resolution: number,
  name?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("project_models").insert({
      project_id: projectId,
      model_url: modelUrl,
      thumbnail_url: thumbnailUrl,
      input_image: inputImage,
      resolution,
      name: name || `Model-${new Date().toISOString().slice(0, 10)}`,
      created_at: new Date().toISOString()
    });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error saving model to project:", error);
    return false;
  }
}
