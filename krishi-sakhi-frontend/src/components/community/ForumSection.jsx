import React, { useState, useEffect } from 'react';
import { FaComments, FaPlus, FaSearch, FaMapMarkerAlt, FaLanguage, FaThumbsUp, FaComment, FaImage, FaFilter } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { communityAPI } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import { getUser } from '../../utils/auth';

const ForumSection = () => {
  const { translate, currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general',
    image: null
  });

  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [openComments, setOpenComments] = useState(null);
  const [commentText, setCommentText] = useState('');
  const user = getUser();

  const categories = [
    { id: 'all', label: translate('allCategories', 'All Categories') },
    { id: 'crop-disease', label: translate('cropDisease', 'Crop Diseases') },
    { id: 'organic-farming', label: translate('organicFarming', 'Organic Farming') },
    { id: 'irrigation', label: translate('irrigation', 'Irrigation') },
    { id: 'market-prices', label: translate('marketPrices', 'Market Prices') },
    { id: 'general', label: translate('general', 'General Discussion') }
  ];

  const locations = [
    { id: 'all', label: translate('allLocations', 'All Locations') },
    { id: 'bhiwani', label: 'Bhiwani, Haryana' },
    { id: 'rohtak', label: 'Rohtak, Haryana' },
    { id: 'hisar', label: 'Hisar, Haryana' },
    { id: 'karnal', label: 'Karnal, Haryana' }
  ];

  const toPost = (p) => ({ ...p, timestamp: new Date(p.timestamp), replies: p.replies || [] });

  useEffect(() => {
    communityAPI.getPosts()
      .then((res) => setPosts(res.data.map(toPost)))
      .catch((err) => setLoadError(getErrorMessage(err, 'Could not load forum posts.')));
  }, []);

  const requireLogin = () => {
    if (getUser()) return true;
    navigate('/login', { state: { from: '/community' } });
    return false;
  };

  const handleLike = async (postId) => {
    setActionError(null);
    try {
      const res = await communityAPI.likePost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: res.likes } : p)));
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not like the post.'));
    }
  };

  const handleComment = async (e, postId) => {
    e.preventDefault();
    if (!commentText.trim() || !requireLogin()) return;
    setActionError(null);
    try {
      const res = await communityAPI.addComment(postId, commentText.trim());
      setPosts((prev) => prev.map((p) => (p.id === postId
        ? { ...p, comments: p.comments + 1, replies: [...p.replies, res.data] }
        : p)));
      setCommentText('');
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not add the comment.'));
    }
  };

  useEffect(() => {
    // Filter posts based on search, location, and category
    let filtered = posts;

    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedLocation !== 'all') {
      filtered = filtered.filter(post =>
        post.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    setFilteredPosts(filtered);
  }, [searchTerm, selectedLocation, selectedCategory, posts]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!requireLogin()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await communityAPI.createPost({
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        category: newPost.category,
        language: currentLanguage,
      });
      setPosts((prev) => [toPost(res.data), ...prev]);
      setNewPost({ title: '', content: '', category: 'general', image: null });
      setShowCreatePost(false);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not publish the post.'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return translate('today', 'Today');
    if (diffDays === 1) return translate('yesterday', 'Yesterday');
    return `${diffDays} ${translate('daysAgo', 'days ago')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Post Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {translate('hyperLocalForum', 'Hyperlocal Community Forum')}
          </h2>
          <p className="text-gray-600">
            {translate('forumDescription', 'Connect with farmers in your area and share knowledge')}
          </p>
        </div>
        <button
          onClick={() => { if (requireLogin()) setShowCreatePost(true); }}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <FaPlus />
          {translate('createPost', 'Create Post')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <FaFilter />
          <span className="font-semibold">{translate('filterPosts', 'Filter Posts')}</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={translate('searchPosts', 'Search posts...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Location Filter */}
          <div className="relative">
            <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 appearance-none"
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.label}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">{translate('createNewPost', 'Create New Post')}</h3>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{translate('title', 'Title')}</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">{translate('category', 'Category')}</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {categories.filter(cat => cat.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{translate('content', 'Content')}</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 h-32"
                  required
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreatePost(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {translate('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {translate('post', 'Post')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(loadError || actionError) && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg" role="alert">
          {loadError || actionError}
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">{translate('noPosts', 'No posts found')}</p>
          </div>
        ) : (
          filteredPosts.map(post => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              {/* Post Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{post.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                    <span className="font-medium">{post.author}</span>
                    <span className="flex items-center gap-1">
                      <FaMapMarkerAlt className="text-xs" />
                      {post.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaLanguage className="text-xs" />
                      {post.language.toUpperCase()}
                    </span>
                    <span>{formatDate(post.timestamp)}</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full">
                  {categories.find(cat => cat.id === post.category)?.label || post.category}
                </span>
              </div>

              {/* Post Content */}
              <p className="text-gray-700 mb-4">{post.content}</p>

              {/* Post Image */}
              {post.image && (
                <img 
                  src={post.image} 
                  alt="Post attachment" 
                  className="w-full max-w-md rounded-lg mb-4"
                />
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-6 pt-4 border-t">
                <button onClick={() => handleLike(post.id)} aria-label="Like post" className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
                  <FaThumbsUp />
                  <span>{post.likes}</span>
                </button>
                <button
                  onClick={() => { setOpenComments(openComments === post.id ? null : post.id); setCommentText(''); }}
                  aria-label="Show comments"
                  className="flex items-center gap-2 text-gray-600 hover:text-primary-600"
                >
                  <FaComment />
                  <span>{post.comments}</span>
                </button>
              </div>

              {/* Replies: first one always, all when expanded */}
              {(openComments === post.id ? post.replies : post.replies.slice(0, 1)).map((reply) => (
                <div key={reply.id} className="mt-4 ml-8 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">{reply.author}</p>
                  <p className="text-sm text-gray-600 mt-1">{reply.content}</p>
                </div>
              ))}

              {openComments === post.id && (
                <form onSubmit={(e) => handleComment(e, post.id)} className="mt-4 ml-8 flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={user ? translate('writeComment', 'Write a reply…') : translate('loginToComment', 'Log in to reply')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    maxLength={2000}
                  />
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    {translate('reply', 'Reply')}
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ForumSection;