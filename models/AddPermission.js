const { Schema, model } = require('mongoose');

const AddPermissionSchema = new Schema({
    inventoryId: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
    permissionSerial: { type: Number, required: true },
    supplier: {
        _id: { type: String, required: true },
        text: { type: String, required: true }
    },
    materials: [{
        material: { type: Schema.Types.ObjectId, ref: 'Material' },
        quantity: { type: Number, min: 0, required: true },
        price: { type: Number, min: 0, require: true },
        total: { type: Number, min: 0, require: true },
    }],
    total: { type: Number, required: true },
}, { timestamps: true })

module.exports = model('AddPermission', AddPermissionSchema)