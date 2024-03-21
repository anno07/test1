const router = require("express").Router();
const Inventory = require("../models/Inventory");
const CostCenter = require("../models/CostCenter");
const InventoryMaterial = require("../models/InventoryMaterial");
const AddPermission = require("../models/AddPermission");
const OutPermission = require("../models/OutPermission");
require("../models/Material");

const { errorModel } = require('../utils/errorModel');

// Get All Inventorys
router.get('/', async (req, res, next) => {
    try {
        const invs = await Inventory.find({}, ['name', 'createdAt']);
        res.status(200).json(invs);
    } catch (error) { next(error) }
});

// Get Single Inventory
router.get('/:inventoryId', async (req, res, next) => {
    const { inventoryId } = req.params;
    try {

        const inv = await Inventory.findById(inventoryId, ['-createdAt', '-updatedAt', '-__v']);

        const materials = await InventoryMaterial.find({ inventoryId }).populate('materialId', ['name', 'code', 'unit'])

        const addPermissions = await AddPermission.find({ inventoryId }, ['permissionSerial', 'createdAt']).sort("-permissionSerial");

        const outPermissions = await OutPermission.find({ inventoryId }, ['permissionSerial', 'createdAt']).sort("-permissionSerial");

        const costCenters = await CostCenter.find({ inventory: inventoryId }, ['name', 'createdAt']);

        const data = {
            ...inv._doc,
            materials,
            costCenters,
            addPermissions,
            outPermissions
        }

        res.status(200).json(data);
    } catch (error) { next(error) }
})

// Create Inventory
router.post('/', async (req, res, next) => {
    const { name, logUser, password } = req.body;
    if (!name || !logUser || !password) return next(errorModel(400, "Name logUser and password Id are required."))

    try {
        const { _id, createdAt } = await Inventory.create({ name, logUser, password });
        res.status(200).json({ _id, name, createdAt });
    } catch (error) { next(error) }
});

// Update Inventory
router.put('/:invId', async (req, res, next) => {
    const { invId } = req.params;
    const { name, logUser, password } = req.body;
    if (!_id && !name && !logUser && !password) return next(errorModel(400, "Provide at least one field."))

    try {
        const inv = await Inventory.findById(invId);
        if (name) inv.name = name;
        if (logUser) inv.logUser = logUser;
        if (password) inv.password = logUser;
        await inv.save();
        res.status(200).json(inv);
    } catch (error) { next(error) }
});

module.exports = router