const router = require("express").Router();
const Supplier = require("../models/Supplier");
const { errorModel } = require('../utils/errorModel')

// Get All Suppliers
router.get('/', async (req, res, next) => {
    try {
        const suppliers = await Supplier.find({}, ['-createdAt', '-updatedAt', '-__v']);
        res.status(200).json(suppliers);
    } catch (error) { next(error) }
});

// Create Supplier
router.post('/', async (req, res, next) => {
    const { name, phone, address } = req.body;
    const tradeSerial = req.body.tradeSerial || null;
    if(!name || !phone || !address) return next(errorModel(400, "Name, Phone and Address are reuiqred."))

    try {
        const supplier = await Supplier.create({ name, phone, address, tradeSerial });
        res.status(200).json(supplier);
    } catch (error) { next(error) }
});

module.exports = router