const router = require("express").Router();
const OutPermission = require("../models/OutPermission");
const Inventory = require("../models/Inventory");
const InventoryMaterial = require("../models/InventoryMaterial");
const Material = require("../models/Material");
const AddPermission = require("../models/AddPermission");

const { errorModel } = require('../utils/errorModel');
const calcMedian = require('../utils/calcMedian');


// Get All Out Permissions
router.get('/all/:invId', async (req, res, next) => {
    const { invId } = req.params;
    try {
        const permissions = await OutPermission.find({ inventoryId: invId }, ['permissionSerial', 'createdAt']).sort('-permissionSerial');
        res.status(200).json(permissions)
    } catch (error) { next(error) }
});

// Get Out Permission Details
router.get('/:permissionId', async (req, res, next) => {
    const { permissionId } = req.params;
    try {
        const { inventoryId, materials, createdAt } = await OutPermission.findById(permissionId, ['inventoryId', 'materials', 'createdAt']).populate('materials.material', ['name', 'code', 'unit']);
        const arr = [];
        const qts = [];
        console.log(materials);

        for (const item of materials) {
            const { quantity } = await InventoryMaterial.findOne({ inventoryId, materialId: item.material._id }, ['quantity']);
            const data = {
                boxId: item._id,
                materialId: item.material._id,
                code: item.material.code,
                name: item.material.name,
                unit: item.material.unit,
                median: item.median,
                costCenter: item.costCenter,
                quantity: item.quantity,
                total: item.total
            };
            arr.push(data);

            const isExist = qts.findIndex(ele => ele.code === item.material.code);
            if (isExist !== -1) qts[isExist].quantity += item.quantity;
            else qts.push({ code: item.material.code, quantity: item.quantity + quantity });
        }

        res.status(200).json({ arr, qts, createdAt });
    } catch (error) { next(error) }
});

// Create Out Permission
router.post('/', async (req, res, next) => {
    const { inventoryId, items } = req.body;
    if (!inventoryId || items.length == 0) return next(errorModel(400, "All fields are required."));

    try {
        // Main Vars
        const inv = await Inventory.findById(inventoryId);
        let total = 0;
        // ----------------------------------------------------

        // Convert Receved Data To Fit OutPermission Materials Requirements
        const mats = items.map(ele => {
            const data = {
                material: ele._id,
                quantity: ele.quantity,
                median: ele.median,
                costCenter: ele.costCenter,
                total: ele.total
            };
            total += ele.total;
            return data;
        })
        // ----------------------------------------------------

        // Create OutPermission
        const addPer = await OutPermission.create({
            inventoryId,
            permissionSerial: inv.outPermissionSerial,
            materials: mats,
            total,
        })
        // ----------------------------------------------------


        // Update Inventory OutPermissionSerial
        inv.outPermissionSerial += 1;
        await inv.save();
        // ----------------------------------------------------

        // Update Materials In Inventory
        for (const ele of items) {
            const materialId = ele._id
            const invMat = await InventoryMaterial.findOne({ inventoryId, materialId });
            invMat.quantity -= ele.quantity;
            await invMat.save();
        }
        // ----------------------------------------------------

        res.status(200).json(addPer);
    } catch (error) { next(error) }
});

// Edit Out Permission
router.put('/:permissionId', async (req, res, next) => {
    const { permissionId } = req.params;
    const { items } = req.body;
    try {
        const permission = await OutPermission.findById(permissionId);
        const inventoryId = permission.inventoryId;

        // Calc Old Quantitys
        const oldQtys = [];
        for (const item of permission.materials) {
            const isExist = oldQtys.findIndex(ele => ele._id === item.material.toString());
            if (isExist === -1) oldQtys.push({ _id: item.material.toString(), quantity: +item.quantity })
            else oldQtys[isExist].quantity += +item.quantity;
        }

        // Calc New Quantitys
        const newQtys = [];
        for (const item of items) {
            const isExist = newQtys.findIndex(ele => ele._id === item.materialId);
            if (isExist === -1) newQtys.push({ _id: item.materialId, quantity: +item.quantity })
            else newQtys[isExist].quantity += +item.quantity;
        }

        // Checking If Quantitys Are Valid In Inventory Stock
        for (const item of permission.materials) {
            const invMat = await InventoryMaterial.findOne({ inventoryId, materialId: item.material });
            let quantity = invMat.quantity;

            for (const ele of oldQtys)
                if (ele._id === item.material.toString()) {
                    quantity += ele.quantity
                    break;
                }

            for (const ele of newQtys)
                if (ele._id === item.material.toString()) {
                    quantity -= ele.quantity
                    break;
                }
            if (quantity < 0) {
                const mat = await Material.findById(invMat.materialId, 'name');
                return next(errorModel(400, `خامة [${mat.name}] الكميه اكبر من الموجود فى المخزن.`));
            }
        }

        let permissionTotal = 0;
        const mats = items.map(ele => {
            const data = {
                material: ele.materialId,
                quantity: +ele.quantity,
                median: +ele.median,
                costCenter: ele.costCenter,
                total: +ele.total
            };
            permissionTotal += +ele.total;
            return data;
        })

        // Add Old Quantitys Back
        for (const item of permission.materials) {
            const invMat = await InventoryMaterial.findOne({ inventoryId, materialId: item.material });
            const oldVal = oldQtys.find(ele => ele._id === item.material.toString());
            invMat.quantity += oldVal.quantity;
            await invMat.save();
        }

        // Remove New Quantitys From Stock
        for (const item of mats) {
            const invMat = await InventoryMaterial.findOne({ inventoryId, materialId: item.material });
            invMat.quantity -= item.quantity;
            await invMat.save();
        }

        permission.materials = mats;
        permission.total = permissionTotal;
        await permission.save();
        res.status(200).json({ success: true });
    } catch (error) { next(error) }
});

// Material Search
router.post('/search/:inventoryId', async (req, res, next) => {
    const { inventoryId } = req.params;
    const { searchBy, search } = req.body;
    const filter = ['name', 'code', 'unit'];
    try {
        let material;
        if (searchBy === "name") material = await Material.findOne({ name: search }, filter);
        else if (searchBy === "code") material = await Material.findOne({ code: search }, filter);
        else return next(errorModel(400, "Wrong Search Schema Must Be [ Name | Code ]"));

        if(!material) return next(errorModel(404, "لا يوجد بالمخزن عنصر بهذا الاسم او الكود"))

        const invMaterial = await InventoryMaterial.findOne({ inventoryId, materialId: material._id })
        if (!invMaterial) return next(errorModel(404, "هذه الخامه غير موجوده بالمخزن"))

        const data = { ...material._doc, median: invMaterial.median, inventoryQuantity: invMaterial.quantity };

        res.status(200).json(data)
    } catch (error) { next(error) }
})

// Material Search For Edit
router.post('/edit/search/:inventoryId', async (req, res, next) => {
    const { inventoryId } = req.params;
    const { searchBy, search, createDate } = req.body;
    const filter = ['name', 'code', 'unit'];
    try {
        let material;
        if (searchBy === "name") material = await Material.findOne({ name: search }, filter);
        else if (searchBy === "code") material = await Material.findOne({ code: search }, filter);
        else return next(errorModel(400, "Wrong Search Schema Must Be [ Name | Code ]"));

        if(!material) return next(errorModel(404, "لا يوجد بالمخزن عنصر بهذا الاسم او الكود"))

        const invMaterial = await InventoryMaterial.findOne({ inventoryId, materialId: material._id });
        if (!invMaterial) return next(errorModel(404, "هذه الخامه غير موجوده بالمخزن"));

        const Year = new Date().getFullYear().toString();
        const currentDate = new Date(createDate);

        let data = await AddPermission.find({
            inventoryId,
            createdAt: {
                $gte: Year,
                $lte: currentDate
            },
            'materials.material': material._id
        }, 'materials')
        const median = calcMedian(data, material._id);

        res.status(200).json({
            ...material._doc,
            median,
            inventoryQuantity: invMaterial.quantity
        })
    } catch (error) { next(error) }
})

module.exports = router