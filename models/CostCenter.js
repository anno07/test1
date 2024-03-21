const { Schema, model } = require('mongoose');

const CostCenterSchema = new Schema({
    name: { type: String, required: true },
    inventory: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
}, { timestamps: true })

module.exports = model('CostCenter', CostCenterSchema)