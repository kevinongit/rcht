const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
dotenv.config()

module.exports = {

  generateAccessToken: function (userId) {
    return jwt.sign({userId}, process.env.TOKEN_SECRET, { expiresIn: '30d' })
  },

  getDecodedToken: function (token) {
    let decoded = null
    try {
      decoded = jwt.verify(token, process.env.TOKEN_SECRET)
    } catch (e) {
      console.log(`Error while verifying token : ${e}`)
      return null
    }
    console.log(decoded)

    return decoded
  },

  /// express middleware version => need to be moved?
  authenticateToken: function (req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) return res.sendStatus(401)

    jwt.verify(token, process.env.TOEKN_SECRET, (err, user) => {
      if (err) {
        console.log(err)
        return res.sendStatus(403)
      }
      req.user = user
      next()
    })
  },

  /// socket.io middleware version
  verifyToken_no: function(socket, next) {
    try {
      const token = socket.handshake.query?.token
      console.log({token})
    } catch (err) {
      return next (new Error('Permission denied.'))
    }
    
  }
}