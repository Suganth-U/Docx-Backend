const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    deleteMessage,
    editMessage,
    getContacts,
    getConversationEncryptionKeys,
    getConversationMessages,
    getEncryptionKey,
    getMessages,
    listConversations,
    openConversation,
    postConversationMessage,
    readConversation,
    searchMessages,
    sendMessage,
    setEncryptionKey,
} = require('../controllers/chatController');

router.get('/search', protect, searchMessages);
router.get('/encryption-key', protect, getEncryptionKey);
router.post('/encryption-key', protect, setEncryptionKey);
router.get('/conversations', protect, listConversations);
router.post('/conversations/open', protect, openConversation);
router.get('/conversations/:conversationId/encryption-keys', protect, getConversationEncryptionKeys);
router.get('/conversations/:conversationId/messages', protect, getConversationMessages);
router.post('/conversations/:conversationId/messages', protect, postConversationMessage);
router.put('/conversations/:conversationId/messages/:messageId', protect, editMessage);
router.delete('/conversations/:conversationId/messages/:messageId', protect, deleteMessage);
router.post('/conversations/:conversationId/read', protect, readConversation);
router.get('/contacts', protect, getContacts);
router.get('/:otherUserId', protect, getMessages);
router.post('/', protect, sendMessage);

module.exports = router;
