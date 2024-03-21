const { Schema, model } = require('mongoose');

const AdminSchema = new Schema({
    name: { type: String, require: true },
    logUser: { type: String, require: true },
    password: { type: String, require: true },
}, { timestamps: true });

module.exports = model('Admin', AdminSchema);