const router = require("express").Router();

const Material = require("../models/Material");
const InventoryMaterial = require("../models/InventoryMaterial");
const AddPermission = require("../models/AddPermission");
const OutPermission = require("../models/OutPermission");

const { calcMedian } = require('../utils/calcMedian');
const { errorModel } = require("../utils/errorModel");

// Get All Materials
router.get('/', async (req, res, next) => {
    try {
        const materials = await Material.find({}, ['-createdAt', '-updatedAt', '-__v']);
        res.status(200).json(materials);
    } catch (error) { next(error) }
})

// Create Material
router.post('/', async (req, res, next) => {
    const { name, code, unit, category } = req.body;
    if (!name || !code || !unit || !category) return next(errorModel(400, "All fields are required."));

    try {
        const material = await Material.create({ name, code, unit, category });
        res.status(200).json(material);
    } catch (error) { next(error) }
})

module.exports = router;