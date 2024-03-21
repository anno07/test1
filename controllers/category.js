const router = require("express").Router();
const Category = require("../models/Category");
const { errorModel } = require('../utils/errorModel')

// Get All Categorys
router.get('/', async (req, res, next) => {
    try {
        const categorys = await Category.find({}, ['name', 'createdAt']);
        res.status(200).json(categorys);
    } catch (error) { next(error) }
});

// Create Category
router.post('/', async (req, res, next) => {
    const { name } = req.body;
    if(!name) return next(errorModel(400, "Name are required."));
    
    try {
        const category = await Category.create({ name });
        res.status(200).json(category)
    } catch (error) { next(error) }
});

module.exports = router