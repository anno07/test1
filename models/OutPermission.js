const { Schema, model } = require('mongoose');

const OutPermissionSchema = new Schema({
    inventoryId: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
    permissionSerial: { type: Number, required: true },
    materials: [{
        material: { type: Schema.Types.ObjectId, ref: 'Material' },
        quantity: { type: Number, min: 0, required: true },
        median: { type: Number, min: 0, require: true },
        costCenter: {
            _id: { type: String, required: true },
            text: { type: String, required: true },
        },
        total: { type: Number, min: 0, require: true },
    }],
    total: { type: Number, required: true },
}, { timestamps: true })

module.exports = model('OutPermission', OutPermissionSchema)