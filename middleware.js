// "Pehra-daar": login ke baghair aage nahi jane deta
module.exports = {
  requireLogin: function (req, res, next) {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect("/login");
    }
    next();
  },

  requireAdmin: function (req, res, next) {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect("/login");
    }
    if (req.session.user.role !== "admin") {
      return res.status(403).render("403");
    }
    next();
  }
};
