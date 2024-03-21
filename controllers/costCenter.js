const router = require("express").Router();
const CostCenter = require("../models/CostCenter");
const { errorModel } = require('../utils/errorModel')

// Get All Cost Centers
router.get('/', async (req, res, next) => {
    try {
        const costCenters = await CostCenter.find({}, ['-createdAt', '-updatedAt', '-__v']).populate('inventory')
        res.status(200).json(costCenters);
    } catch (error) { next(error) }
});

// Get Cost Centers For Single Inventory
router.get('/:invId', async (req, res, next) => {
    const { invId } = req.params;
    try {
        const costCenters = await CostCenter.find({ inventory: invId }, 'name')
        res.status(200).json(costCenters);
    } catch (error) { next(error) }
})

// Create Cost Center
router.post('/', async (req, res, next) => {
    const { name, inventory } = req.body;
    if (!name || !inventory) return next(errorModel(400, "Name and Invntory Id are required."))

    try {
        const costCenter = await CostCenter.create({ name, inventory });
        res.status(200).json({ name: costCenter.name });
    } catch (error) { next(error) }
});

module.exports = router