export const checkRole = (roles) => (req, res, next) => {
  try {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Недостатньо прав" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Помилка перевірки ролі" });
  }
};

export const checkAdminOrCurator = checkRole(["admin", "curator"]);

export const checkCuratorOrStudent = checkRole(["curator", "student"]);

export const checkAllUsers = checkRole(["admin", "curator", "student"]);
