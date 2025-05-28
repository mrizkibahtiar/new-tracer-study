const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

adminSchema.pre('save', async function (next) {
    // Hanya hash password jika password field dimodifikasi (baru dibuat atau diganti)
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;