const asyncHandler = require('express-async-handler');
const axios = require('axios');
const Blog = require('../models/Blog');
const Faq = require('../models/Faq');

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ==================== BLOGS ====================

const getBlogs = asyncHandler(async (req, res) => {
    const blogs = await Blog.find({}).sort({ createdAt: -1 });
    res.json(blogs);
});

const createBlog = asyncHandler(async (req, res) => {
    const { title, category, content, authorName, image } = req.body;
    if (!title || !category || !content || !authorName) {
        res.status(400);
        throw new Error('Please fill all required fields');
    }
    const blog = await Blog.create({ title, category, content, authorName, image });
    res.status(201).json(blog);
});

const updateBlog = asyncHandler(async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
        res.status(404);
        throw new Error('Blog not found');
    }
    const updated = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
});

const deleteBlog = asyncHandler(async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
        res.status(404);
        throw new Error('Blog not found');
    }
    await blog.deleteOne();
    res.json({ message: 'Blog removed' });
});

const generateBlogContent = asyncHandler(async (req, res) => {
    const { title, category } = req.body;
    if (!title) {
        res.status(400);
        throw new Error('Blog title is required to generate content');
    }

    const prompt = `Write a comprehensive, professional healthcare blog post.
Title: "${title}"
Category: "${category || 'General Health'}"

Requirements:
- Make it 4-5 well-structured paragraphs.
- Use engaging, informative subheadings formatted as HTML <h3> tags.
- Use standard HTML for formatting (e.g., <p>, <ul>, <li>, <strong>).
- Do NOT wrap the response in markdown blocks like \`\`\`html, just output raw HTML directly.
- The tone should be authoritative yet accessible, suitable for a top-tier hospital or digital health platform.`;

    try {
        const response = await axios.post(
            `${GEMINI_API_BASE}/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000,
                },
            }
        );

        let htmlContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Clean up markdown wrapping if Gemini ignores instructions
        htmlContent = htmlContent.replace(/^```html\\s*/i, '').replace(/```\\s*$/i, '').trim();

        res.json({ content: htmlContent });
    } catch (error) {
        console.error('Gemini generation error:', error?.response?.data || error.message);
        res.status(500);
        throw new Error('Failed to generate blog content');
    }
});

// ==================== FAQS ====================

const getFaqs = asyncHandler(async (req, res) => {
    const faqs = await Faq.find({}).sort({ order: 1 });
    res.json(faqs);
});

const createFaq = asyncHandler(async (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) {
        res.status(400);
        throw new Error('Please provide both question and answer');
    }
    const count = await Faq.countDocuments();
    const faq = await Faq.create({ question, answer, order: count + 1 });
    res.status(201).json(faq);
});

const updateFaq = asyncHandler(async (req, res) => {
    const faq = await Faq.findById(req.params.id);
    if (!faq) {
        res.status(404);
        throw new Error('FAQ not found');
    }
    const updated = await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
});

const deleteFaq = asyncHandler(async (req, res) => {
    const faq = await Faq.findById(req.params.id);
    if (!faq) {
        res.status(404);
        throw new Error('FAQ not found');
    }
    await faq.deleteOne();
    res.json({ message: 'FAQ removed' });
});

module.exports = {
    getBlogs, createBlog, updateBlog, deleteBlog, generateBlogContent,
    getFaqs, createFaq, updateFaq, deleteFaq,
};
