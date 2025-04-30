module.exports = {
    checkLogin: (req, res, next) => {
        // Cek apakah user sudah login
        if (req.session && req.session.user) {
            if (req.session.user.role === 'admin') {
                return res.redirect('/admin');
            }
            if (req.session.user.role === 'alumni') {
                return res.redirect('/alumni');
            }
        }
        // Jika belum login, lanjutkan ke halaman login
        next();
    },
    isAdmin: (req, res, next) => {
        if (req.session.user && req.session.user.role === 'admin') {
            return next(); // Akses diizinkan, lanjutkan ke rute berikutnya
        }
        return res.redirect('/loginPage'); // Akses ditolak, redirect ke halaman login
    }, isAlumni: (req, res, next) => {
        if (req.session.user && req.session.user.role === 'alumni') {
            return next(); // Akses diizinkan, lanjutkan ke rute berikutnya
        }
        return res.redirect('/loginPage'); // Akses ditolak, redirect ke halaman login
    }
}