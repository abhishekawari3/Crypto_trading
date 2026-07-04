const authService = require("../services/auth.service");

const register = async (req, res) => {
  try {
    result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res) => {
  try {
    result = await authService.login(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res) => {
  try {
    result = await authService.refresh(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res) => {
  try {
    result = await authService.logout(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
    register,
    login,
    refresh,
    logout,
}



