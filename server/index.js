const express = require('express')
const bodyParser = require('body-parser')
const http = require('http')

const app = express()
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, {
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e8, /// 100 MB (cf. default = 1MB)
  pingTimeout: 60000,
  cors: {
    // origin: [
    // "http://localhost:3000",
    // "http://127.0.0.1:3000",
    // ]
    origin: '*',
  }
})

const crypto = require('crypto')
const randomId = () => crypto.randomBytes(8).toString("hex")

const { InMemorySessionStore } = require('./sessionStore')
const sessionStore = new InMemorySessionStore()

const { InMemoryMessageStore } = require('./messageStore')
const messageStore = new InMemoryMessageStore()

const userDb = require('./userDb')
const auth = require('./auth')
const { decode } = require('punycode')

// app.use(express.json())
app.use(bodyParser.json())

/// enable req.body while http post method.
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/login.html')
})

/// will be used for id/passwd authentication
app.post('/login', async (req, res) => {
  try {
    const {id, password} = req.body
    const user = userDb.findUser(id)
    console.log({id,password})
    if (!user) {
      console.log(`/login : unknown user id (${id})`)
      return res.status(401).json({ message: 'Invalid credentials.'})
    }

    /// TODO : naive compare... fix later
    if (password !== user.password) {
      console.log(`/login : invalid password for (${id})`)
      return res.status(401).json({ message: 'Invalid credentials.'})
    }

    /// ban multiple login by chekcing session
    if (sessionStore.connected(id)) {
    // if (sessionStore.findSession(id)) {
      console.log(`multiple login attempt.`)
      return res.status(401).json({ message: 'Multiple login attempt!'})
    }
    const token = auth.generateAccessToken(id)
    console.log(`token : ${token}`)
    console.log(`user ${id} is logged in.`)
    res.status(200).json({success: true, message: "Good to go", token})

  } catch (error) {
    console.log(error)
    res.status(401).send(error.message)
  }
})

app.post('/test', async (req, res) => {
  try {
    const {command} = req.body
    switch (command) {
      case 'users':
        const sockets = await io.fetchSockets()
        const users = sockets.map(s => s.userId)
    
        console.log(users)
        res.status(200).json({success: true, message: "good to go", users})
        break
      case 'sessions':
        res.status(200).json({success: true, sessions: sessionStore.findAllSession()})
        break;
      case 'messages':
        res.status(200).json(messageStore.test_getAllMessages())
        break;
      case 'mesg':
        const {to, content} = req.body
        const from = 'redmine'
        const socket = (await io.fetchSockets()).filter(s => s.userId === to)[0]
        const registeredMesg = messageStore.saveMessage({from, to, content})
        console.log(`* a new message (${registeredMesg.mid} : ${registeredMesg.from} -> ${registeredMesg.to})`)
        // console.log(socket)
        if (socket && to && content) {
          socket.emit('private message', registeredMesg)
          res.status(200).json({success: true, message: "delivered"})
        } else {
          res.status(200).json({success: true, message: "can't delivered for now."})
        }
        break;
      default:
        res.status(200).json({success: true, message: "no actions, no consequences"})
    }
  } catch (error) {
    console.log(error)
    res.status(401).send(error.message)
  }
})

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  const sessionId = socket.handshake.auth.sessionId
  const userId = socket.handshake.auth.userId
  console.log({token, userId, sessionId})

  if (sessionId) {
    const session = await sessionStore.findSession(sessionId)
    console.log({session})
    if (session) {
      socket.sessionId = sessionId
      socket.userId = session.userId
      socket.username = session.username
      socket.profileImage = session.profileImage
      return next()
    } else {
      console.log(`it's odd... submit sessionId(${sessionId}) which doesn't exist in session store.`)
      return next(new Error(`invalid session (${sessionId})`))
    }
  }

  /// at this point, user id verified and no session id means that it's a brand-new session. let's welcome...
  socket.sessionId = randomId()
  socket.userId = userId
  const user = userDb.findUser(userId)
  socket.username = user?.username
  socket.profileImage = user?.profileImage
  next()
})

io.on('connection', async (socket) => {
  console.log(`io.on connection (${socket.userId})`)
  /// persist session
  sessionStore.saveSession(socket.userId, {
    userId: socket.userId,
    username: socket.username,
    profileImage: socket.profileImage,
    sockId : socket.id,
    connected: true,
  })

  /// emit session details
  socket.emit('session', {
    sessionId: socket.sessionId,
    userId: socket.userId,
  })
  /// join the 'userId' room
  socket.join(socket.userId)

  const [messages, sessions] = await Promise.all([
    messageStore.findMessagesForUser(socket.userId),
    sessionStore.findAllSession(),
  ])
  console.log({messages, })
  const messagesPerUser = new Map()
  messages.forEach(message => {
    const { from, to } = message
    const otherUser = socket.userId === from ? to : from
    console.log(`otherUser = ${otherUser}`)
    if (messagesPerUser.has(otherUser)) {
      messagesPerUser.get(otherUser).push(message)
    } else {
      messagesPerUser.set(otherUser, [message])
    }
  })
  console.log(`mesgs for ${socket.userId} `, ...messagesPerUser.entries())

  const users = userDb.getRegisteredUsers().map(user => {
    if (sessions.findIndex(s => s.userId === user.userId)) {
      user.connected = sessions.connected
    }
    user.messages = messagesPerUser.get(user.userId) || []
    return user
  })
  // sessions.forEach(session => {
  //   const idx = users.findIndex(ele => ele.userId === session.userId)
  //   if (idx !== -1) {
  //     users[idx].connected = session.connected
  //     users[idx].messages = messagesPerUser.get(session.userId) || []
  //   } else {
  //     users[idx].connected = false
  //     users[idx].messages = messagesPerUser.get(users[idx].userId) || []
  //   }
  // })
  socket.emit('users', users)

  socket.broadcast.emit('user connected', {
    userId: socket.userId,
    username: socket.username,
    profileImage: socket.profileImage,
    connected: true,
    messages: []
  })

  /// won't be used for now
  // socket.auth = false
  // socket.on("authenticate", async ({id, password}) => {
  //   console.log(`🧢 authentication for (id: ${id})`)
  //   const user = users.findUser(id)
  //   if (user && user.password == password) {
  //     socket.auth = true
  //     socket.user = user
  //   } else {
  //     console.log({id, password})
  //     socket.emit('error', {message: 'auth failed!'})
  //   }
  // })
  // setTimeout(() => {
  //   /// if auth failed, disconnect socket
  //   if (!socket.auth) {
  //     console.log(`unauthorized: disconnecting socket ${socket.id}`)
  //     return socket.disconnect('unauthorized')
  //   }
  //   return socket.emit('authorized')
  // }, 1000)
  // console.log(`a user(${id}) connected on socket(${socket.id}).`)

  /// auth middleware
  socket.use((packet, next) => {
    console.log(`socket.use`)
    /// auth code
    console.log(packet)
    let decoded = auth.getDecodedToken(packet[1]?.token)
    if (!decoded) {
      socket.emit('error', 'invalid token')
      return next(new Error(`no good`))
    }
    socket.userId = decoded.userId
    return next()
  })


  /// forward the private message to the right recipient (and to other tabs of the sender)
  socket.on('private message', mesg => {
    console.log(mesg)
    
    const registeredMesg = messageStore.saveMessage(mesg)
    console.log(`* a new message (${registeredMesg.mid} : ${registeredMesg.from} -> ${registeredMesg.to})`)
    socket.to(registeredMesg.to).to(socket.userId).emit('private message', registeredMesg)
  })

  socket.on('disconnect', async () => {
    console.log(`disconnect event(${socket.userId})`)
    const matchingSockets = await io.in(socket.userId).fetchSockets()
    const isDisconnected = matchingSockets.length === 0
    // console.log(matchingSockets, isDisconnected)
    if (isDisconnected) {
      socket.broadcast.emit('user disconnected', socket.userId)
      /// update the connection status of the session
      sessionStore.saveSession(socket.userId, {
        userId: socket.userId,
        username: socket.username,
        profileImage: socket.profileImage,
        sockId : socket.id,
        connected: false,
      })
    }
  })

  // socket.on('getNotification', async (id) => {
  //   console.log(`🧢 getNotification`)
  // })

  // socket.on('getUser', () => {
  //   console.log(`🧢 getUser`)
  //   const user = socket.user || {id: 'anonymous', name: 'anonymous', password: ''}
  //   socket.emit('user', user)
  // })

  // socket.on('getMessage', (msg) => {
  //   console.log(`🧢 getMessage`)
  //   console.log('message: ' + msg)
  // })

  // socket.on('disconnect', () => {
  //   console.log(`🧢 disconnect`)
  //   console.log('user disconnected')
  // })
})

const port = 80
server.listen(port, () => {
    console.log(`✅ listening on *:${port}`)
})