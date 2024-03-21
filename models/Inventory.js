const { Schema, model } = require('mongoose');

const InventorySchema = new Schema({
    name: { type: String, required: true },
    logUser: { type: String, required: true },
    password: { type: String, required: true },
    addPermissionSerial: { type: Number, default: 1, min: 1 },
    outPermissionSerial: { type: Number, default: 1, min: 1 }
}, { timestamps: true })

module.exports = model('Inventory', InventorySchema)