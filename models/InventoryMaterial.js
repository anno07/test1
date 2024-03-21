const { Schema, model } = require('mongoose');

const InventoryMaterialSchema = new Schema({
    inventoryId: { type: Schema.Types.ObjectId, ref: 'Inventory' },
    materialId: { type: Schema.Types.ObjectId, ref: 'Material' },
    quantity: { type: Number, default: 0 },
    median: { type: Number, default: 0, min: 0 },
    lastPrice: { type: Number, default: 0, min: 0 }
}, { timestamps: true })

module.exports = model('InventoryMaterial', InventoryMaterialSchema)