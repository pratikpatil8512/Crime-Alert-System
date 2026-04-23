const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');
const {
  listUsers,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
} = require('../controllers/adminUserController');

router.use(authenticateToken, authorizeRole('admin'));

router.get('/users', listUsers);
router.post('/users', createUserByAdmin);
router.patch('/users/:id', updateUserByAdmin);
router.delete('/users/:id', deleteUserByAdmin);

module.exports = router;
