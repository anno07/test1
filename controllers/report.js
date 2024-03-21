const router = require("express").Router();
const AddPermission = require("../models/AddPermission");
const Category = require("../models/Category");
const Material = require("../models/Material");
const OutPermission = require("../models/OutPermission");
const { errorModel } = require("../utils/errorModel");

// Supplier Report
router.post('/supplier/:inventoryId', async (req, res, next) => {
    const { inventoryId } = req.params;
    let { supplier, from, to } = req.body;

    if (!supplier || !from || !to) return next(errorModel(400, "All Fields Are Required"))
    try {
        from = new Date(from);
        to = new Date(`${to} 23:59:59`);

        let data = await AddPermission.find({
            createdAt: {
                $gte: from,
                $lte: to
            },
            inventoryId,
            'supplier._id': supplier
        }).populate('materials.material', ['name', 'code']);

        let arr = [];
        for (const item of data) {
            for (const ele of item.materials) {
                arr.push({
                    serial: item.permissionSerial,
                    name: ele.material.name,
                    code: ele.material.code,
                    quantity: ele.quantity,
                    price: ele.price,
                    total: ele.total
                })
            }
        }
        res.status(200).json(arr);
    } catch (error) { next(error) }
})

// Cost Center Report
router.post('/costcenter/:inventoryId', async (req, res, next) => {
    const { inventoryId } = req.params;
    let { costCenter, from, to } = req.body;

    if (!costCenter || !from || !to) return next(errorModel(400, "All Fields Are Required"))

    try {
        from = new Date(from);
        to = new Date(`${to} 23:59:59`);

        let data = await OutPermission.find({
            inventoryId,
            createdAt: {
                $gte: from,
                $lte: to
            },
            "materials.costCenter._id": costCenter
        }).populate('materials.material', ['name', 'code']);

        let arr = [];
        for (const item of data) {
            for (const ele of item.materials) {
                arr.push({
                    serial: item.permissionSerial,
                    name: ele.material.name,
                    code: ele.material.code,
                    quantity: ele.quantity,
                    median: ele.median,
                    total: ele.total
                })
            }
        }

        res.status(200).json(arr);
    } catch (error) { next(error) }
})

// Balances Report
router.post('/balances/:inventoryId', async (req, res, next) => {
    const { inventoryId } = req.params;
    let { from, to } = req.body;

    if (!from || !to) return next(errorModel(400, "Start and End Date Are Required"));
    from = new Date(from);
    to = new Date(`${to} 23:59:59`);

    try {
        const allCategorys = await Category.find({}, 'name');
        let reportData = [];

        for (const category of allCategorys) {
            let categoryHead = {
                name: category.name,
                addTotal: 0,
                outTotal: 0,
                remainingTotal: 0
            };
            let materialsDetails = [];

            const materials = await Material.find({ category: category.name });

            // Calc Materials Details
            for (const material of materials) {
                let details = {
                    name: material.name,
                    code: material.code
                }

                // -------------------------------------------------------------------------------------

                // Calc Add
                let add = {
                    quantity: 0,
                    median: 0,
                    total: 0
                }

                // Get Permissions Data
                const addPermissions = await AddPermission.find({
                    inventoryId,
                    createdAt: {
                        $gte: from,
                        $lte: to
                    },
                    'materials.material': material._id
                })

                // Calc Quantity Abd Median
                let addTQ = 0;
                for (const item of addPermissions) {
                    const ele = item.materials.find(ele => ele.material.toString() === material._id.toString());
                    add.quantity += ele.quantity;
                    addTQ += ele.total;
                }
                if (add.quantity) {
                    add.median = +(addTQ / add.quantity).toFixed(2);
                    add.total = add.median * add.quantity;
                    categoryHead.addTotal += add.total;
                }

                // -------------------------------------------------------------------------------------

                // Calc Out
                let out = {
                    quantity: 0,
                    median: 0,
                    total: 0
                }

                // Get Permissions Data
                const outPermissions = await OutPermission.find({
                    inventoryId,
                    createdAt: {
                        $gte: from,
                        $lte: to
                    },
                    'materials.material': material._id
                })

                // Calc Quantity Out Median
                let outTQ = 0;
                for (const item of outPermissions) {
                    for (const ele of item.materials) {
                        if (ele.material.toString() === material._id.toString()) {
                            out.quantity += ele.quantity;
                            outTQ += ele.total;
                        }
                    }
                }
                if (out.quantity) {
                    out.median = +(outTQ / out.quantity).toFixed(2);
                    out.total = out.median * out.quantity;
                    categoryHead.outTotal += out.total;
                }

                // -------------------------------------------------------------------------------------

                // Calc Remaining
                let remaining = {
                    quantity: 0,
                    median: 0,
                    total: 0
                }
                if (add.quantity) {
                    remaining.quantity = add.quantity - out.quantity;
                    remaining.total = add.total - out.total;
                    remaining.median = +(remaining.total / remaining.quantity).toFixed(2);
                    categoryHead.remainingTotal += remaining.total
                }
                if (!add.quantity && !out.quantity) continue;
                materialsDetails.push({ details, add, out, remaining });
            }

            if (materialsDetails.length === 0) continue;
            reportData.push({ categoryHead, materialsDetails });
        }

        res.status(200).json(reportData);
    } catch (error) { next(error) }
})

router.post('/materialLifeCycle/:inventoryId', async (req, res, next) => {
    const { inventoryId } = req.params;
    let { materialId, from, to } = req.body;
    from = new Date(from);
    to = new Date(`${to} 23:59:59`);
    let dataArr = [];

    try {
        // Get Add Permissions Data
        const addPermissions = await AddPermission.find({
            inventoryId,
            createdAt: {
                $gte: from,
                $lte: to
            },
            'materials.material': materialId
        })

        for (const item of addPermissions) {
            const obj = item.materials.find(ele => ele.material.toString() === materialId);
            dataArr.push({
                quantity: obj.quantity,
                value: obj.total,
                out: 0,
                add: obj.quantity,
                price: obj.price,
                to: item.supplier.text,
                createdAt: item.createdAt,
                serial: item.permissionSerial,
            })
        }

        // Get Out Permissions Data
        const outPermissions = await OutPermission.find({
            inventoryId,
            createdAt: {
                $gte: from,
                $lte: to
            },
            'materials.material': materialId
        })

        for (const item of outPermissions) {
            for (const ele of item.materials) {
                if (ele.material.toString() === materialId)
                    dataArr.push({
                        quantity: ele.quantity,
                        value: ele.total,
                        out: ele.quantity,
                        add: 0,
                        price: ele.median,
                        to: ele.costCenter.text,
                        createdAt: item.createdAt,
                        serial: item.permissionSerial,
                    })
            }
        }

        dataArr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        res.status(200).json(dataArr);
    } catch (error) { next(error) }
})

router.post('/costTransaction/:inventoryId', async (req, res, next) => {
    const { inventoryId } = req.params;
    let { from, to } = req.body;
    from = new Date(from);
    to = new Date(`${to} 23:59:59`);

    let dataArr = [];

    try {
        const outPermissions = await OutPermission.find({
            inventoryId,
            createdAt: {
                $gte: from,
                $lte: to
            }
        }).populate('materials.material', ['name', 'code'])

        for (const item of outPermissions) {
            let tempArr = [];
            let total = 0
            for (const ele of item.materials) {
                total += ele.total;
                tempArr.push({
                    serial: item.permissionSerial,
                    createdAt: item.createdAt,
                    code: ele.material.code,
                    name: ele.material.name,
                    to: ele.costCenter.text,
                    quantity: ele.quantity,
                    price: ele.median,
                    value: ele.total
                })
            }
            dataArr.push({ data: tempArr, total })
        }

        res.status(200).json(dataArr);
    } catch (error) { next(error) }
})

module.exports = router;