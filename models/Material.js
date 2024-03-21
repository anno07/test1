const { Schema, model } = require('mongoose');

const MaterialSchema = new Schema({
    name: { type: String, required: true },
    code: { type: String, required: true },
    unit: { type: String, required: true },
    category: { type: String, required: true },
}, { timestamps: true })

module.exports = model('Material', MaterialSchema)