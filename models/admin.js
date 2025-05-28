const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    nama: {
        type: String,
        optional: true,
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;