import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial mock data matching landing_design_v2.jpg feel
const DEFAULT_POSTS = [
  {
    id: 'mock-f1',
    type: 'fear',
    content: 'Terrified of failure in my new lead role. What if everyone realizes I don’t know what I’m doing?',
    hearts_count: 14,
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12m ago
  },
  {
    id: 'mock-f2',
    type: 'fear',
    content: 'The constant anxiety about the future is overwhelming. It feels like every decision could be a mistake.',
    hearts_count: 28,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
  },
  {
    id: 'mock-f3',
    type: 'fear',
    content: 'Fear of loss... I am terrified of losing the people I love, and it stops me from enjoying the present.',
    hearts_count: 35,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3h ago
  },
  {
    id: 'mock-f4',
    type: 'fear',
    content: 'Fear that I am running out of time while everyone around me seems to have it all figured out.',
    hearts_count: 42,
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6h ago
  },
  {
    id: 'mock-o1',
    type: 'overcome',
    content: 'Faced my severe public speaking fear by doing small 1-minute daily presentations. Now I actually look forward to it.',
    hearts_count: 56,
    created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8m ago
  },
  {
    id: 'mock-o2',
    type: 'overcome',
    content: 'Learned that vulnerability is not weakness, but strength. Admitting my struggles saved my mental health.',
    hearts_count: 64,
    created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(), // 50m ago
  },
  {
    id: 'mock-o3',
    type: 'overcome',
    content: 'Pushed through the fear of sudden career change. Took 6 months of uncertainty, but it was the best decision of my life.',
    hearts_count: 89,
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4h ago
  },
  {
    id: 'mock-o4',
    type: 'overcome',
    content: 'Letting go of perfectionism and aiming for "good enough to start" ended years of paralyzing dread.',
    hearts_count: 112,
    created_at: new Date(Date.now() - 1000 * 60 * 480).toISOString(), // 8h ago
  }
];

const LOCAL_STORAGE_KEY = 'echoes_anonymous_posts_v1';

export function getLocalPosts() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_POSTS));
      return DEFAULT_POSTS;
    }
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load local posts', e);
    return DEFAULT_POSTS;
  }
}

export function saveLocalPost(newPost) {
  try {
    const existing = getLocalPosts();
    const updated = [newPost, ...existing];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save local post', e);
    return [];
  }
}

export function incrementLocalHeart(id) {
  try {
    const existing = getLocalPosts();
    const updated = existing.map(item => {
      if (item.id === id) {
        return { ...item, hearts_count: (item.hearts_count || 0) + 1 };
      }
      return item;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to update heart', e);
    return [];
  }
}

// Comments Local Storage & Helpers
const COMMENTS_STORAGE_KEY = 'echoes_anonymous_comments_v1';

const DEFAULT_COMMENTS = [
  {
    id: 'mock-c1',
    post_id: 'mock-f1',
    content: 'You are not alone in this feeling. Perfection is an illusion—give yourself grace.',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'mock-c2',
    post_id: 'mock-o1',
    content: 'One minute a day is such pure wisdom. Thank you for sharing this courage.',
    created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  }
];

export function getLocalComments() {
  try {
    const saved = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(DEFAULT_COMMENTS));
      return DEFAULT_COMMENTS;
    }
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load local comments', e);
    return DEFAULT_COMMENTS;
  }
}

export function saveLocalComment(newComment) {
  try {
    const existing = getLocalComments();
    const updated = [...existing, newComment];
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save local comment', e);
    return [];
  }
}

