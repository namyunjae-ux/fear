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
import { 
  Heart, 
  MessageSquare, 
  ArrowRight, 
  Clock, 
  Flame, 
  CornerDownRight 
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
  const [selectedType, setSelectedType] = useState('fear'); // 'fear' | 'overcome'
  const [inputText, setInputText] = useState('');
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'fear' | 'overcome'
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

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content) return;

    setLoading(true);
    const newPost = {
      id: isSupabaseConfigured ? undefined : `local-${Date.now()}`,
      type: selectedType,
      content,
      hearts_count: 0,
      created_at: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('posts').insert([{
          type: selectedType,
          content,
          hearts_count: 0,
        }]);
        if (error) throw error;
      } else {
        const updated = saveLocalPost(newPost);
        setPosts(updated);
      }

      setInputText('');
      showToast(selectedType === 'fear' ? 'Your shadow has been archived.' : 'Your courage has been archived.');
    } catch (err) {
      console.error('Failed to post entry:', err);
      const updated = saveLocalPost(newPost);
      setPosts(updated);
      setInputText('');
      showToast('Archived locally.');
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

  const toggleComments = (postId) => {
    setExpandedComments(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

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
      showToast('Reflection note attached.');
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
  const filteredPosts = posts.filter(p => {
    if (activeFilter === 'fear') return p.type === 'fear';
    if (activeFilter === 'overcome') return p.type === 'overcome';
    return true;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'top') {
      const diffHearts = (b.hearts_count || 0) - (a.hearts_count || 0);
      if (diffHearts !== 0) return diffHearts;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="editorial-wrapper">
      {/* Top minimal bar */}
      <header className="editorial-topbar">
        <div className="topbar-brand">Shadows & Light — Anonymous Archive</div>
        <div className="topbar-meta">{posts.length} entries preserved</div>
      </header>

      {/* Main 2-Column Grid */}
      <main className="editorial-grid">
        {/* Left Pinned Panel */}
        <aside className="pinned-panel">
          <h1 className="panel-title">Shadows<br />& Light</h1>
          <p className="panel-subtitle">
            An anonymous human archive of unspoken fears and earned courage.
          </p>

          <form onSubmit={handleSubmitPost} className="authoring-form">
            <div className="type-selector-label">I want to archive</div>
            
            <div className="type-selector">
              <button
                type="button"
                className={`type-btn ${selectedType === 'fear' ? 'active' : ''}`}
                onClick={() => setSelectedType('fear')}
              >
                Current Fear
              </button>
              <button
                type="button"
                className={`type-btn ${selectedType === 'overcome' ? 'active' : ''}`}
                onClick={() => setSelectedType('overcome')}
              >
                Earned Courage
              </button>
            </div>

            <textarea
              className="authoring-textarea"
              placeholder={
                selectedType === 'fear'
                  ? "Describe your unspoken fear... (Anonymous, untraceable, real)"
                  : "Describe the courage you found or how you overcame it..."
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
              rows={5}
            />

            <div className="authoring-footer">
              <span className="char-indicator">
                {inputText.length}/{MAX_CHARS}
              </span>
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="btn-editorial-submit"
              >
                <span>Submit</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </aside>

        {/* Right Feed Panel */}
        <section className="feed-column-archive">
          {/* Feed Controls */}
          <div className="archive-controls">
            <div className="archive-status-line">
              Showing {sortedPosts.length} reflections
            </div>

            <div className="archive-filter-group">
              {/* Type Filter Pills */}
              <div className="filter-pills">
                <button
                  className={`pill-btn ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  All
                </button>
                <button
                  className={`pill-btn ${activeFilter === 'fear' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('fear')}
                >
                  Fears
                </button>
                <button
                  className={`pill-btn ${activeFilter === 'overcome' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('overcome')}
                >
                  Courage
                </button>
              </div>

              {/* Sort Selector */}
              <button
                className="sort-selector-btn"
                onClick={() => setSortBy(sortBy === 'latest' ? 'top' : 'latest')}
                title="Toggle sort order"
              >
                {sortBy === 'latest' ? <Clock size={12} /> : <Flame size={12} />}
                <span>{sortBy === 'latest' ? 'Latest' : 'Most Resonant'}</span>
              </button>
            </div>
          </div>

          {/* Entries Feed */}
          <div className="archive-list">
            {sortedPosts.length === 0 ? (
              <div className="empty-archive">
                No entries found in this section. Be the first to record.
              </div>
            ) : (
              sortedPosts.map((item, index) => {
                const postComments = comments.filter(c => c.post_id === item.id);
                const isExpanded = expandedComments.includes(item.id);
                const isLiked = likedPosts.includes(item.id);
                const entryIndex = String(posts.length - index).padStart(3, '0');

                return (
                  <article key={item.id} className="archive-entry">
                    {/* Header */}
                    <div className="entry-header">
                      <div className="entry-meta-left">
                        <span className="entry-index">{entryIndex}.</span>
                        <span className={`entry-type-tag ${item.type === 'overcome' ? 'tag-overcome' : 'tag-fear'}`}>
                          {item.type === 'overcome' ? 'Courage' : 'Fear'}
                        </span>
                      </div>
                      <time className="entry-time">{formatRelativeTime(item.created_at)}</time>
                    </div>

                    {/* Content */}
                    <p className="entry-body">{item.content}</p>

                    {/* Actions */}
                    <div className="entry-footer">
                      <button
                        onClick={() => handleHeartClick(item.id, item.hearts_count)}
                        className={`editorial-action-btn ${isLiked ? 'liked' : ''}`}
                        title="Empathy"
                      >
                        <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
                        <span>{item.hearts_count || 0}</span>
                      </button>

                      <button
                        onClick={() => toggleComments(item.id)}
                        className={`editorial-action-btn ${isExpanded ? 'active' : ''}`}
                        title="Reflections"
                      >
                        <MessageSquare size={13} />
                        <span>{postComments.length}</span>
                      </button>
                    </div>

                    {/* Expanded Reflections / Comments */}
                    {isExpanded && (
                      <div className="entry-comments-block">
                        <div className="comments-timeline">
                          {postComments.length === 0 ? (
                            <div className="no-comments-prompt">
                              No words attached yet. Leave a quiet reflection.
                            </div>
                          ) : (
                            postComments.map(c => (
                              <div key={c.id} className="single-comment">
                                <div>{c.content}</div>
                                <span className="single-comment-time">
                                  {formatRelativeTime(c.created_at)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Comment Input */}
                        <form
                          onSubmit={(e) => handleCommentSubmit(item.id, e)}
                          className="comment-authoring-row"
                        >
                          <input
                            type="text"
                            placeholder="Leave a word of warmth or understanding..."
                            maxLength={MAX_COMMENT_CHARS}
                            value={commentInputs[item.id] || ''}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [item.id]: e.target.value })}
                            className="comment-input-editorial"
                          />
                          <button
                            type="submit"
                            disabled={commentSubmitting[item.id] || !(commentInputs[item.id] || '').trim()}
                            className="comment-btn-editorial"
                          >
                            <CornerDownRight size={13} />
                          </button>
                        </form>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="editorial-footer">
        <p>© 2026 Shadows & Light. Anonymous public human archive.</p>
        <p>
          Feedback & Inquiries:{' '}
          <a href="mailto:nyjnam774@gmail.com" className="footer-email-link">
            nyjnam774@gmail.com
          </a>
        </p>
      </footer>

      {/* Toast */}
      {toastMessage && (
        <div className="editorial-toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
