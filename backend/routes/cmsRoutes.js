const express = require('express');
const router = express.Router();
const {
    getBlogs, createBlog, updateBlog, deleteBlog, generateBlogContent,
    getFaqs, createFaq, updateFaq, deleteFaq,
} = require('../controllers/cmsController');

// Blog Routes
router.post('/blogs/generate', generateBlogContent);
router.route('/blogs').get(getBlogs).post(createBlog);
router.route('/blogs/:id').put(updateBlog).delete(deleteBlog);

// FAQ Routes
router.route('/faqs').get(getFaqs).post(createFaq);
router.route('/faqs/:id').put(updateFaq).delete(deleteFaq);

module.exports = router;
