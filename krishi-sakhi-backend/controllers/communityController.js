const { Op, ValidationError, UniqueConstraintError } = require('sequelize');
const { ForumPost, ForumComment, ForumLike, ExpertBooking } = require('../models');

const FORUM_CATEGORIES = ['crop-disease', 'organic-farming', 'irrigation', 'market-prices', 'general'];

const locationText = (loc) => {
  if (!loc) return null;
  if (typeof loc === 'string') return loc;
  return [loc.district, loc.state].filter(Boolean).join(', ') || null;
};

const toPostJSON = (post, commentCount) => {
  const p = post.toJSON();
  return {
    id: p.id,
    author: p.authorName,
    location: p.authorLocation || '',
    userId: p.userId,
    title: p.title,
    content: p.content,
    category: p.category,
    language: p.language,
    likes: p.likes,
    comments: commentCount != null ? commentCount : (p.comments ? p.comments.length : 0),
    replies: (p.comments || []).map((c) => ({ id: c.id, author: c.authorName, content: c.content, timestamp: c.created_at })),
    timestamp: p.created_at
  };
};

const getForumPosts = async (req, res) => {
  try {
    const { location, category, language, search } = req.query;
    const where = {};
    if (category && category !== 'all') where.category = category;
    if (language) where.language = language;
    if (location && location !== 'all') where.authorLocation = { [Op.like]: `%${location}%` };
    if (search) where[Op.or] = [{ title: { [Op.like]: `%${search}%` } }, { content: { [Op.like]: `%${search}%` } }];

    const posts = await ForumPost.findAll({
      where,
      include: [{ model: ForumComment, as: 'comments' }],
      order: [['created_at', 'DESC'], [{ model: ForumComment, as: 'comments' }, 'created_at', 'ASC']],
      limit: Math.min(parseInt(req.query.limit, 10) || 50, 100)
    });
    res.json({ success: true, data: posts.map((p) => toPostJSON(p)), total: posts.length });
  } catch (error) {
    console.error('Get forum posts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch forum posts' });
  }
};

const createForumPost = async (req, res) => {
  try {
    const { title, content, category = 'general', language = 'en' } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }
    if (!FORUM_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: `Category must be one of: ${FORUM_CATEGORIES.join(', ')}` });
    }
    const post = await ForumPost.create({
      userId: req.user.id,
      authorName: req.user.name,
      authorLocation: locationText(req.user.location),
      title: String(title).trim(),
      content: String(content).trim(),
      category,
      language: String(language).slice(0, 10)
    });
    res.status(201).json({ success: true, data: toPostJSON(post, 0), message: 'Post created successfully' });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, error: error.errors.map((e) => e.message).join(', ') });
    }
    console.error('Create forum post error:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
};

const likeContent = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    if (contentType !== 'forum') {
      return res.status(400).json({ success: false, error: 'Only forum posts can be liked' });
    }
    const post = await ForumPost.findByPk(contentId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const likerKey = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    let liked = true;
    try {
      await ForumLike.create({ postId: post.id, likerKey });
      await post.increment('likes');
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) throw error;
      liked = false; // already liked
    }
    await post.reload();
    res.json({ success: true, liked, likes: post.likes, message: liked ? 'Post liked' : 'You already liked this post' });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ success: false, error: 'Failed to like content' });
  }
};

const addComment = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { comment } = req.body || {};
    if (contentType !== 'forum') {
      return res.status(400).json({ success: false, error: 'Comments are only supported on forum posts' });
    }
    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ success: false, error: 'Comment text is required' });
    }
    const post = await ForumPost.findByPk(contentId);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const created = await ForumComment.create({
      postId: post.id,
      userId: req.user.id,
      authorName: req.user.name,
      content: String(comment).trim()
    });
    res.status(201).json({
      success: true,
      data: { id: created.id, author: created.authorName, content: created.content, timestamp: created.created_at },
      message: 'Comment added successfully'
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, error: error.errors.map((e) => e.message).join(', ') });
    }
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
};

// Expert directory and success stories are curated reference content.
const EXPERTS = [
  {
    id: 1,
    name: 'Dr. Rajesh Sharma',
    expertise: ['Crop Protection', 'Organic Farming'],
    languages: ['Hindi', 'English'],
    experience: '15 years',
    bio: 'Sustainable farming practices and integrated pest management.'
  }
];

const getExperts = async (req, res) => {
  const q = (req.query.expertise || '').toLowerCase();
  const experts = q ? EXPERTS.filter((e) => e.expertise.some((x) => x.toLowerCase().includes(q))) : EXPERTS;
  res.json({ success: true, data: experts, total: experts.length });
};

const bookExpertConsultation = async (req, res) => {
  try {
    const { expertId, date, time, consultationType = 'video', issue, name, phone } = req.body || {};
    const id = parseInt(expertId, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'A valid expertId is required' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) {
      return res.status(400).json({ success: false, error: 'Date (YYYY-MM-DD) and time are required' });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      return res.status(400).json({ success: false, error: 'Please choose today or a future date' });
    }
    const booking = await ExpertBooking.create({
      expertId: id,
      userId: req.user ? req.user.id : null,
      name: (req.user && req.user.name) || name || null,
      phone: (req.user && req.user.phone) || phone || null,
      date,
      time: String(time).slice(0, 20),
      consultationType,
      issue: issue ? String(issue).slice(0, 2000) : null,
      status: 'pending'
    });
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Consultation request saved. The expert will confirm the slot.'
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, error: error.errors.map((e) => e.message).join(', ') });
    }
    console.error('Booking error:', error);
    res.status(500).json({ success: false, error: 'Failed to book consultation' });
  }
};

const getMyBookings = async (req, res) => {
  const bookings = await ExpertBooking.findAll({ where: { userId: req.user.id }, order: [['created_at', 'DESC']] });
  res.json({ success: true, data: bookings });
};

const STORIES = [
  {
    id: 1,
    farmerName: 'Ramesh Kumar',
    location: 'Bhiwani, Haryana',
    title: 'From Loss to Profit: My Organic Farming Journey',
    summary: 'Switched to organic farming and increased profit over two years.',
    category: 'organic-farming',
    cropTypes: ['Vegetables', 'Wheat', 'Pulses']
  }
];

const getSuccessStories = async (req, res) => {
  const { category } = req.query;
  const stories = category ? STORIES.filter((s) => s.category === category) : STORIES;
  res.json({ success: true, data: stories, total: stories.length });
};

module.exports = {
  getForumPosts,
  createForumPost,
  getExperts,
  bookExpertConsultation,
  getMyBookings,
  getSuccessStories,
  likeContent,
  addComment,
  FORUM_CATEGORIES
};
