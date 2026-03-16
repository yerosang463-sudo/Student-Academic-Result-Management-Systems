const express = require('express');
const requireAuth = require('../middleware/auth');
const departmentController = require('../controllers/departmentController');

const router = express.Router();

router.use(requireAuth);

router.get('/', departmentController.getAllDepartments);
router.post('/', departmentController.createDepartment);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;
