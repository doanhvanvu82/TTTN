import jwt from "jsonwebtoken";

const createJWT = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false, // Luôn false khi phát triển local (HTTP)
    sameSite: "lax", // "lax" hoặc "strict" khi phát triển local
    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 ngày
  });
};

export default createJWT;
