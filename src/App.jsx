import React, { useState, useEffect } from 'react';
import { 
  supabase, 
  isSupabaseConfigured, 
  getLocalPosts, 
  saveLocalPost, 
  incrementLocalHeart,
  getLocalComments,
  saveLocalComment
} from './lib/supabase';
import confetti from 'canvas-confetti';
import { 
  Heart, 
  Send, 
  Sparkles, 
  Shield, 
  MessageCircle, 
  Flame, 
  Clock 
} from 'lucide-react';

const MAX_CHARS = 1000;
const MAX_COMMENT_CHARS = 300;

function formatRelativeTime(dateString) {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
  } catch (e) {
    return 'recently';
  }
}

export default function App() {
  const [fearInput, setFearInput] = useState('');
  const [overcomeInput, setOvercomeInput] = useState('');
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'fear' | 'overcome'
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'top'
  const [toastMessage, setToastMessage] = useState(null);
  
  // Comments interaction state
  const [expandedComments, setExpandedComments] = useState([]);
  const [commentInputs, setCommentInputs] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});

  const [likedPosts, setLikedPosts] = useState(() => {
    try {
      const saved = localStorage.getItem('echoes_user_likes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch initial posts & comments, and subscribe to Supabase Realtime
  useEffect(() => {
    fetchPosts();
    fetchComments();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('public:fear_app')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
          setPosts(prev => [payload.new, ...prev]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, payload => {
          setPosts(prev => prev.map(p => (p.id === payload.new.id ? payload.new : p)));
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
          setComments(prev => [...prev, payload.new]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  async function fetchPosts() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          setPosts(data);
          return;
        }
      } catch (err) {
        console.error('Error fetching Supabase posts:', err);
      }
    }
    // Fallback to local
    setPosts(getLocalPosts());
  }

  async function fetchComments() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data) {
          setComments(data);
          return;
        }
      } catch (err) {
        console.error('Error fetching Supabase comments:', err);
      }
    }
    setComments(getLocalComments());
  }

  function showToast(msg, isWarm = false) {
    setToastMessage({ text: msg, isWarm });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }

  const handleShareFear = async (e) => {
    e.preventDefault();
    const content = fearInput.trim();
    if (!content) return;

    setLoading(true);
    const newPost = {
      id: isSupabaseConfigured ? undefined : `local-${Date.now()}`,
      type: 'fear',
      content,
      hearts_count: 0,
      created_at: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('posts').insert([{
          type: 'fear',
          content,
          hearts_count: 0,
        }]);
        if (error) throw error;
      } else {
        const updated = saveLocalPost(newPost);
        setPosts(updated);
      }

      setFearInput('');
      showToast('Your fear has been released into the space.');
    } catch (err) {
      console.error('Failed to post fear:', err);
      showToast('Failed to post. Saved locally instead.');
      const updated = saveLocalPost(newPost);
      setPosts(updated);
      setFearInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleShareOvercome = async (e) => {
    e.preventDefault();
    const content = overcomeInput.trim();
    if (!content) return;

    setLoading(true);
    const newPost = {
      id: isSupabaseConfigured ? undefined : `local-${Date.now()}`,
      type: 'overcome',
      content,
      hearts_count: 0,
      created_at: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('posts').insert([{
          type: 'overcome',
          content,
          hearts_count: 0,
        }]);
        if (error) throw error;
      } else {
        const updated = saveLocalPost(newPost);
        setPosts(updated);
      }

      // Sparkle / Confetti celebration on sharing courage
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.75 },
        colors: ['#e59b43', '#f5b76c', '#ffffff', '#dc7b20']
      });

      setOvercomeInput('');
      showToast('Thank you for lighting the way with your courage.', true);
    } catch (err) {
      console.error('Failed to post overcome story:', err);
      showToast('Failed to post. Saved locally instead.');
      const updated = saveLocalPost(newPost);
      setPosts(updated);
      setOvercomeInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleHeartClick = async (postId, currentHearts) => {
    const alreadyLiked = likedPosts.includes(postId);
    const newLiked = alreadyLiked
      ? likedPosts.filter(id => id !== postId)
      : [...likedPosts, postId];

    setLikedPosts(newLiked);
    try {
      localStorage.setItem('echoes_user_likes', JSON.stringify(newLiked));
    } catch {}

    const delta = alreadyLiked ? -1 : 1;
    const nextCount = Math.max(0, (currentHearts || 0) + delta);

    // Optimistic UI update
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, hearts_count: nextCount } : p)));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('posts')
          .update({ hearts_count: nextCount })
          .eq('id', postId);
      } catch (err) {
        console.error('Failed to update heart in Supabase:', err);
      }
    } else {
      incrementLocalHeart(postId);
    }
  };

  // Toggle comment section for a post
  const toggleComments = (postId) => {
    setExpandedComments(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  // Submit a comment/reply
  const handleCommentSubmit = async (postId, e) => {
    e.preventDefault();
    const commentText = (commentInputs[postId] || '').trim();
    if (!commentText) return;

    setCommentSubmitting(prev => ({ ...prev, [postId]: true }));
    const newComment = {
      id: isSupabaseConfigured ? undefined : `comment-${Date.now()}`,
      post_id: postId,
      content: commentText,
      created_at: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('comments').insert([{
          post_id: postId,
          content: commentText,
        }]);
        if (error) throw error;
      } else {
        const updated = saveLocalComment(newComment);
        setComments(updated);
      }

      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      showToast('Your warm words have been added.');
    } catch (err) {
      console.error('Failed to post comment:', err);
      const updated = saveLocalComment(newComment);
      setComments(updated);
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } finally {
      setCommentSubmitting(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Sorting & Filtering
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'top') {
      const diffHearts = (b.hearts_count || 0) - (a.hearts_count || 0);
      if (diffHearts !== 0) return diffHearts;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const fearsList = sortedPosts.filter(p => p.type === 'fear');
  const overcomeList = sortedPosts.filter(p => p.type === 'overcome');

  // Helper to render individual story card
  const renderStoryCard = (item, isOvercome = false) => {
    const postComments = comments.filter(c => c.post_id === item.id);
    const isExpanded = expandedComments.includes(item.id);
    const isLiked = likedPosts.includes(item.id);

    return (
      <div key={item.id} className={`story-card ${isOvercome ? 'story-overcome' : 'story-fear'}`}>
        <p className="story-content">{item.content}</p>
        
        <div className="story-meta">
          <span>{formatRelativeTime(item.created_at)}</span>
          
          <div className="meta-actions">
            {/* Comment Toggle Button */}
            <button
              onClick={() => toggleComments(item.id)}
              className={`comment-toggle-btn ${isExpanded ? 'active' : ''}`}
              title="View comments & reply"
            >
              <MessageCircle size={14} />
              <span>{postComments.length}</span>
            </button>

            {/* Heart Reaction Button */}
            <button
              onClick={() => handleHeartClick(item.id, item.hearts_count)}
              className={`heart-button ${isLiked ? 'reacted' : ''}`}
              title={isOvercome ? "Inspired" : "Send empathy"}
            >
              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
              <span>{item.hearts_count || 0}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Comments Section */}
        {isExpanded && (
          <div className="comments-container">
            {/* Comment List */}
            <div className="comments-list">
              {postComments.length === 0 ? (
                <div className="no-comments-text">No words shared yet. Leave a kind thought.</div>
              ) : (
                postComments.map(c => (
                  <div key={c.id} className="comment-item">
                    <p className="comment-text">{c.content}</p>
                    <span className="comment-time">{formatRelativeTime(c.created_at)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input Form */}
            <form onSubmit={(e) => handleCommentSubmit(item.id, e)} className="comment-form">
              <input
                type="text"
                placeholder="Leave a word of warmth or empathy..."
                maxLength={MAX_COMMENT_CHARS}
                value={commentInputs[item.id] || ''}
                onChange={(e) => setCommentInputs({ ...commentInputs, [item.id]: e.target.value })}
                className="comment-input"
              />
              <button
                type="submit"
                disabled={commentSubmitting[item.id] || !(commentInputs[item.id] || '').trim()}
                className="comment-submit-btn"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Background Ambient Glows */}
      <div className="ambient-glow-wrapper">
        <div className="ambient-glow-center"></div>
        <div className="ambient-glow-top"></div>
        <div className="ambient-glow-left"></div>
      </div>

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <a href="/" className="brand-logo">
            <span className="brand-symbol"></span>
            <span>Echoes</span>
          </a>
        </header>

        {/* Hero Section */}
        <section className="hero-section">
          <h1 className="hero-title">Share Your Shadows, Light the Way</h1>
          <p className="hero-subtext">No accounts, no titles. Just pure thoughts.</p>
        </section>

        {/* 2-Column Side-by-Side Input Section */}
        <section className="dual-input-grid">
          {/* Left: Current Fears */}
          <div className="input-card fear-card">
            <h2 className="card-header-title">Current Fears</h2>
            <form onSubmit={handleShareFear}>
              <textarea
                className="custom-textarea"
                placeholder="What fear are you facing right now?"
                value={fearInput}
                onChange={(e) => setFearInput(e.target.value.slice(0, MAX_CHARS))}
                rows={4}
              />
              <div className="textarea-footer">
                <span className={`char-counter ${fearInput.length >= MAX_CHARS ? 'warning' : ''}`}>
                  {fearInput.length}/{MAX_CHARS}
                </span>
              </div>
              <button
                type="submit"
                disabled={loading || !fearInput.trim()}
                className="btn-submit btn-fear"
              >
                <Send size={16} />
                <span>Share Fear</span>
              </button>
            </form>
          </div>

          {/* Right: Overcoming Stories */}
          <div className="input-card overcome-card">
            <h2 className="card-header-title">Overcoming Stories</h2>
            <form onSubmit={handleShareOvercome}>
              <textarea
                className="custom-textarea"
                placeholder="How did you overcome fear in the past?"
                value={overcomeInput}
                onChange={(e) => setOvercomeInput(e.target.value.slice(0, MAX_CHARS))}
                rows={4}
              />
              <div className="textarea-footer">
                <span className={`char-counter ${overcomeInput.length >= MAX_CHARS ? 'warning' : ''}`}>
                  {overcomeInput.length}/{MAX_CHARS}
                </span>
              </div>
              <button
                type="submit"
                disabled={loading || !overcomeInput.trim()}
                className="btn-submit btn-overcome"
              >
                <Sparkles size={16} />
                <span>Share Story</span>
              </button>
            </form>
          </div>
        </section>

        {/* Public Feed Section */}
        <section className="feed-section">
          <div className="feed-header">
            <div className="feed-title-wrap">
              <h2 className="feed-title">Community Reflections</h2>
              <span className="feed-badge">{posts.length} shared</span>
            </div>

            <div className="feed-controls-wrap">
              {/* Sort Options: Latest vs Most Empathetic */}
              <div className="sort-tabs">
                <button
                  className={`sort-btn ${sortBy === 'latest' ? 'active' : ''}`}
                  onClick={() => setSortBy('latest')}
                  title="Sort by newest"
                >
                  <Clock size={13} />
                  <span>Latest</span>
                </button>
                <button
                  className={`sort-btn ${sortBy === 'top' ? 'active' : ''}`}
                  onClick={() => setSortBy('top')}
                  title="Sort by most empathetic hearts"
                >
                  <Flame size={13} />
                  <span>Top Empathy</span>
                </button>
              </div>

              {/* Type Filter Tabs */}
              <div className="filter-tabs">
                <button
                  className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </button>
                <button
                  className={`tab-btn ${activeTab === 'fear' ? 'active' : ''}`}
                  onClick={() => setActiveTab('fear')}
                >
                  Fears ({fearsList.length})
                </button>
                <button
                  className={`tab-btn ${activeTab === 'overcome' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overcome')}
                >
                  Overcoming ({overcomeList.length})
                </button>
              </div>
            </div>
          </div>

          {/* Dual Feed Grid */}
          <div className="dual-feed-grid">
            {/* Left Column: Fears */}
            {(activeTab === 'all' || activeTab === 'fear') && (
              <div className="feed-column">
                <div className="column-label">Current Fears</div>
                {fearsList.length === 0 ? (
                  <div className="empty-state">No fears shared yet. Be the first to express.</div>
                ) : (
                  fearsList.map((item) => renderStoryCard(item, false))
                )}
              </div>
            )}

            {/* Right Column: Overcoming */}
            {(activeTab === 'all' || activeTab === 'overcome') && (
              <div className="feed-column">
                <div className="column-label overcome-label">Overcoming Stories</div>
                {overcomeList.length === 0 ? (
                  <div className="empty-state">No stories yet. Share your experience to guide others.</div>
                ) : (
                  overcomeList.map((item) => renderStoryCard(item, true))
                )}
              </div>
            )}
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="app-footer">
          <p>© 2026 Echoes. All shared words are anonymous and public.</p>
          <p className="footer-privacy-note">A sanctuary for honest vulnerability and collective courage.</p>
          <p className="footer-feedback">
            Feedback & Inquiries: <a href="mailto:nyjnam774@gmail.com" className="feedback-email">nyjnam774@gmail.com</a>
          </p>
        </footer>
      </div>

      {/* Toast Popups */}
      {toastMessage && (
        <div className="toast-container">
          <div className={`toast ${toastMessage.isWarm ? 'toast-warm' : ''}`}>
            {toastMessage.isWarm ? <Sparkles size={18} color="#e59b43" /> : <Shield size={18} color="#94a3b8" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </>
  );
}
