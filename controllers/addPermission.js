const router = require("express").Router();
const AddPermission = require("../models/AddPermission");
const Inventory = require("../models/Inventory");
const InventoryMaterial = require("../models/InventoryMaterial");
const Material = require("../models/Material");
const calcMedian = require('../utils/calcMedian')
const { errorModel } = require('../utils/errorModel')

// Get All Add Permissions
router.get('/all/:invId', async (req, res, next) => {
    const { invId } = req.params;
    try {
        const permissions = await AddPermission.find({ inventoryId: invId }, ['permissionSerial', 'createdAt']).sort('-permissionSerial');
        res.status(200).json(permissions)
    } catch (error) { next(error) }
});

// Get Permission Details
router.get('/:permissionId', async (req, res, next) => {
    const { permissionId } = req.params;
    try {
        const { inventoryId, materials, supplier } = await AddPermission.findById(permissionId, ['materials', 'inventoryId', 'supplier']).populate('materials.material', ['_id', 'name', 'code', 'unit']);
        const arr = [];
        const qts = []
        for (const item of materials) {
            const data = {
                boxId: item._id,
                materialId: item.material._id,
                code: item.material.code,
                name: item.material.name,
                unit: item.material.unit,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
            }
            arr.push(data);

            const invItem = await InventoryMaterial.findOne({ inventoryId, materialId: item.material._id }, 'quantity');
            const qtsData = {
                code: item.material.code,
                quantity: invItem.quantity
            }
            qts.push(qtsData);
        }
        res.status(200).json({ supplier, arr, qts });
    } catch (error) { next(error) }
});

// Create Add Permission
router.post('/:inventoryId', async (req, res, next) => {
    const { inventoryId } = req.params;
    const { items, supplier } = req.body;
    if (!items || !supplier._id) return next(errorModel(400, "All fields are required."));

    try {
        const inv = await Inventory.findById(inventoryId);
        if (!inv) return next(errorModel(404, "Inventory not found"));
        let total = 0;
        const permissionMats = items.map(ele => {
            const data = {
                material: ele._id,
                quantity: ele.quantity,
                price: ele.price,
                total: ele.total
            }
            total += ele.total;
            return data;
        })
        const permissionData = {
            inventoryId,
            supplier,
            permissionSerial: inv.addPermissionSerial,
            materials: permissionMats,
            total
        }
        const addPer = await AddPermission.create(permissionData)
        inv.addPermissionSerial += 1;
        await inv.save();

        for (const item of permissionMats) {
            const materialId = item.material
            const invMat = await InventoryMaterial.findOne({ inventoryId, materialId });
            const permissions = await AddPermission.find({ inventoryId, 'materials.material': materialId })
            const median = calcMedian(permissions, materialId);
            if (!invMat) {
                await InventoryMaterial.create({
                    inventoryId,
                    materialId,
                    quantity: item.quantity,
                    median,
                    lastPrice: item.price
                })
            } else {
                invMat.quantity = +invMat.quantity + +item.quantity;
                invMat.median = median;
                invMat.lastPrice = item.price;
                await invMat.save();
            }
        }
        res.status(200).json(addPer);
    } catch (error) { next(error) }
});

// Edit Add Permission
router.put('/:permissionId', async (req, res, next) => {
    const { permissionId } = req.params;
    const { supplier, newItems } = req.body;
    try {
        const permission = await AddPermission.findById(permissionId);
        const inventoryId = permission.inventoryId

        for (const item of permission.materials) {
            const invMat = await InventoryMaterial.findOne({ inventoryId, materialId: item.material });
            let quantity = invMat.quantity - +item.quantity;

            const isExist = newItems.find(ele => ele.materialId == item.material)
            if (isExist) quantity += +isExist.quantity;
            if (quantity < 0) return next(errorModel(400, "خطأ فى الكميات. لا يمكن ان تكون اقل من صفر"));
        }

        for (const item of permission.materials) {
            const invMat = await InventoryMaterial.findOne({ inventoryId, materialId: item.material });
            invMat.quantity -= item.quantity;
            await invMat.save();
        }
        permission.total = 0;
        const permissionMats = newItems.map(ele => {
            const data = {
                material: ele.materialId,
                quantity: +ele.quantity,
                price: +ele.price,
                total: +ele.total
            }
            permission.total += +ele.total;
            return data;
        })

        permission.materials = permissionMats;
        permission.supplier = supplier;
        await permission.save();

        for (const item of permission.materials) {
            const invMat = await InventoryMaterial.findOne({ inventoryId, materialId: item.material });
            if (invMat) {
                let permissions = await AddPermission.find({ inventoryId, 'materials.material': item.material });
                const median = calcMedian(permissions, item.material);

                invMat.quantity += item.quantity;
                invMat.median = median;
                await invMat.save();
            } else {
                await InventoryMaterial.create({
                    inventoryId,
                    materialId: item.material,
                    lastPrice: item.price,
                    median: item.price,
                    quantity: item.quantity
                })
            }
        }
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
        res.status(200).json({...material._doc, lastPrice: invMaterial?.lastPrice || 0})
    } catch (error) { next(error) }
})

// Material Search For Edit
router.post('/edit/search/:inventoryId', async (req, res, next) => {
    const { inventoryId } = req.params;
    const { searchBy, search } = req.body;
    const filter = ['name', 'code', 'unit'];
    try {
        let material;
        if (searchBy === "name") material = await Material.findOne({ name: search }, filter);
        else if (searchBy === "code") material = await Material.findOne({ code: search }, filter);
        else return next(errorModel(400, "Wrong Search Schema Must Be [ Name | Code ]"));

        if(!material) return next(errorModel(404, "لا يوجد بالمخزن عنصر بهذا الاسم او الكود"))

        // const invMaterial = await InventoryMaterial.findOne({ inventoryId, materialId: material._id });
        // if (!invMaterial) return next(errorModel(404, "هذه الخامه غير موجوده بالمخزن"));

        // createDate = new Date(createDate);

        // const data = await AddPermission.findOne({
        //     inventoryId,
        //     createdAt: { $lte: createDate },
        //     'materials.material': material._id
        // }, 'materials')

        // const lastPrice = data.materials.find(ele => ele._id === material._id).price;

        res.status(200).json(material)
    } catch (error) { next(error) }
})

module.exports = router