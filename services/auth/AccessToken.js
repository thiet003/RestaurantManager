const JWT = require('jsonwebtoken');

const signAccessToken = async (payload) => {
   return new Promise((resolve, reject) => {
       const secret = process.env.ACCESS_TOKEN_SECRET;
       const options = {
           expiresIn: '1h',
       };
       JWT.sign(payload, secret, options, (err, token) => {
           if (err) {
               reject(err);
           }
           resolve(token);
       });
   });
}
const verifyAccessToken = async (req, res, next) => {
    if (!req.headers['authorization']) {
        return res.status(401).json({ message: "Do not have access token!" });
    }
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader.split(' ');
    const token = bearerToken[1];
    // Start verifying token
    JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if (err) {
            return res.status(403).json({ message: "Access token may be expired or invalid!" });
        }
        req.user = payload;
        next();
    });
}
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "You do not have permission!" });
    }
    next();
}
module.exports = {
    signAccessToken,
    verifyAccessToken,
    isAdmin
}