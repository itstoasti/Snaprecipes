import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface PublicRecipe {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  servings: number | null;
  prep_time: string | null;
  cook_time: string | null;
  ingredients: { text: string; quantity?: string; unit?: string; name: string }[];
  steps: { text: string; stepNumber: number }[];
  tags: string[];
  source_url: string | null;
  source_domain: string | null;
  quality_score: number;
  save_count: number;
  content_hash: string;
  created_at: string;
}
