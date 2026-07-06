// Must run AFTER authMiddleware, since it relies on req.user being populated
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required',
    });
  }

  next();
};

module.exports = adminMiddleware;
