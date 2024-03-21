const { Schema, model } = require('mongoose');

const SupplierSchema = new Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    tradeSerial: { type: String, default: null }
}, { timestamps: true })

module.exports = model('Supplier', SupplierSchema)