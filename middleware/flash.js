const flash = require('connect-flash');

module.exports = {
    flashMessage: (req, res, next) => {
        res.locals.success_msg = req.flash('success_msg');
        res.locals.error_msg = req.flash('error_msg');
        next();
    }
}
