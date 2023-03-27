const params = new URLSearchParams(document.location.search)
const token = params.get('token')
const myUserId = params.get('uid')
console.log(`token = ${token}`)
let form = document.getElementById('form')
let input = document.getElementById('input')

document.title = myUserId + '@RedChat'

// const uid = document.getElementById('currentUsername')
// uid.innerText = myUserId

function init() {
  const friendsList = document.getElementById('friendsList')
  const list = friendsList.querySelectorAll('discussion')

  console.log({list})
}

function changeFriendConnectivity({userId, readonly, connected}) {
  let friend = document.getElementById(userId)
  if (!friend) {
    console.log(`abort: ${userId} is unknown.`)
    return
  }
  const status = friend.querySelector("div.photo div")
  if (status.classList.contains("online") || status.classList.contains("offline")) {
    status.classList.toggle("online")
    status.classList.toggle("offline")
  }
}

/// make sure that only one friend message be active.
function changeFriendActivity({userId, activity}) {
  const friendsList = document.querySelectorAll('#friendsList > div.discussion')
  console.log({friendsList})
  friendsList.forEach(friend => {
    if (friend.id === userId) {
      friend.classList.add(activity)
    } else {
      friend.classList.remove(activity)
    }
  })
}

function onFriendSelect(selected, userId) {
  console.log({selected, userId})
  changeFriendActivity({userId, activity: "message-active"})
  selectedUser = allUsers.filter(u => u.userId === userId)[0]
  
  /// load message
  const chatSection = document.getElementById('chat')
  chatSection.innerHTML = getMessagesChat(selectedUser)
  console.log(selectedUser.messages)
  
  /// remove badge
  const userBadge = document.getElementById(`${userId + "_badge"}`)
  userBadge.innerText = 0
  userBadge.style.display = 'none'
  
  /// save last mid (only from peer message)
  const peerMessages = selectedUser.messages?.filter(m => m.from === userId) || []
  if (peerMessages.length) {
    const chatKey = 'chatmsg_' + userId
    const lastMid = peerMessages[peerMessages.length-1].mid
    console.log({chatKey, lastMid})
    localStorage.setItem(chatKey, lastMid)
  }
}

function onMessageSend() {
  const inMessage = document.getElementById('inMessage')
  if (inMessage.value === '') {
    return;
  }
  const mesg = {
    from: myUserId,
    to: selectedUser?.userId || 'nobody',
    content: inMessage.value,
  }
  socket.emit('private message', {
    token,
    ...mesg,
  })
  addToChatList(mesg.to, mesg)
  inMessage.value = ''
}

function onInputKeyDown(e) {
  // console.log(e)
  if (e.keyCode === 13 && e.ctrlKey) {
    e.preventDefault()
    const letItGo = document.getElementById('letItGo')
    // console.log(letItGo)
    letItGo.dispatchEvent(new Event('click'))
  }
}

function getOneFriendHtml(user, opts={messageActive: false}) {
  const {userId, username, profileImage, readonly, connected, messages } = user
  const connClass = "connectivity" + (readonly ? " midline" : (connected ? " online" : " offline"))
  const peerMessages = messages?.filter(m => m.from === userId) || []
  let newCount = peerMessages.length

  {
    /// let's find out the number of new messages
    const lastMid = localStorage.getItem('chatmsg_' + userId)
    if (lastMid) {
      const idx = peerMessages.findIndex(m => m.mid === lastMid) || -1
      if (idx !== -1) { 
        newCount = peerMessages.length - (idx + 1)
      }
    }
  }
  return `
      <div id="${userId}" class="discussion ${opts.messageActive ? "message-active" : ""}" onclick='onFriendSelect(this,"${userId}")'>
        <div class="photo" style="background-image: url(${profileImage});">
          <div class="${connClass}"></div>
        </div>
        <div class="desc-contact">
          <p class="name">${userId}</p>
          <p class="message">${messages?.length ? messages[messages.length - 1].content : ""}</p>
        </div>
        <div class="desc-misc">
          <p class="timer"> 오후 1:10</p>
          <p id="${userId + "_badge"}" class="badge" style="display: ${newCount ? 'block' : 'none'}"> ${newCount} </p>
        </div>
      </div>
    `
}

function addToChatList(uid, mesg) {
  ///1. add to users message
  const idx = allUsers.findIndex(u => u.userId === uid)
  if (idx !== -1) {
    let messages = allUsers[idx].messages
    if (messages) {
      allUsers[idx].messages.push(mesg)
    } else {
      allUsers[idx].messages = [mesg]
    }
  }

  // console.log({selectedUser})
  ///2.if current selected user then add the message to the chat window
  if (uid === selectedUser?.userId) {
    const chatList = document.getElementById('chatList')
// console.log({chatList})
    if (chatList) {
      const div = document.createElement('div')
      div.innerHTML = getOneChatHtml(mesg)
      // console.log({div})
      chatList.appendChild(div)

      // let chatHtml = getOneChatHtml(mesg)
      // console.log({chatHtml})
      // const ele = (new DOMParser()).parseFromString(chatHtml, 'text/html')
      // chatList.appendChild(ele)
    }
  } else {
    /// TODO: update badge
    const userBadge = document.getElementById(`${uid + '_badge'}`)
    // console.log({userBadge, uid})
    const count = Number(userBadge?.innerText) || 0
    userBadge.innerText = '' + (count + 1)
    userBadge.style.display = 'block'
  }

  /// TODO: update friendlist (last chat message)
  
}

function getOneChatHtml(message) {
  const {from, to, content} = message
  const isResponse = from === myUserId
  return `
    <div class="message text-only">
    ${isResponse ? '<div class="response">' : '' }
    <p class="text"> ${content} </p>
    ${isResponse ? '</div>' : ''}
    </div>
  `
}

function getMessagesChat({username, readonly, messages, profileImage}) {
  let contents = `
    <div class="header-chat">
      <!-- i class="icon fa fa-user" aria-hidden="true"></i -->
      <i class="photo" style="margin-left: 30px; background-image: url(${profileImage}); background-position: center; background-size: cover; background-repeat: no-repeat; display: block; width: 40px; height: 40px; border-radius: 45px;"></i>
      <p id="currentUsername" class="name">${username}</p>
      <i class="icon clickable fa fa-ellipsis-h right" aria-hidden="true"></i>
    </div>
  `
  contents += '<div id="chatList" class="messages-chat">'
  if (messages) {
    contents +=  messages.map(message => getOneChatHtml(message)).join('')
  }

  contents += '</div>'
  if (!readonly) {
    contents += `
      <div class="footer-chat">
        <i class="icon fa fa-envelope clickable" style="font-size:25pt;" aria-hidden="true"></i>
        <input id="inMessage" type="text" class="write-message" onkeyup="onInputKeyDown(event)" placeholder="Type your message here"></input>
        <i id="letItGo" class="icon send fa fa-paper-plane clickable" aria-hidden="true" onclick="onMessageSend()"></i>
        <!-- <i class="icon send fa fa-paper-plane-o"></i> -->
      </div>
    `
  }
  return contents
}

const socket = io('http://127.0.0.1')

let allUsers = [];

let selectedUser;


socket.onAny((e, ...args) => {
    console.log(e, args)
})

// let sessionId = localStorage.getItem('sessionId')
let sessionId
socket.auth = { /* sessionId,*/ userId: myUserId, token }

socket.on('session', (obj) => {
  /// attach the session ID to the next reconnection attempts
  sessionId = obj.sessionId
  /// store it in the localStorage
  localStorage.setItem('sessionId', obj.sessionId)
  /// save the ID of the user
  socket.userId = obj.userId
})

socket.on('connect_error', err => {
  console.log('connect_error', err.message) 
})

socket.on('error', err => {
  console.log('socket error:', err) 
  location.href = 'login.html'
})

socket.on('users', users => {
  console.log({users})

  allUsers = users.filter(u => u.userId !== myUserId)

  const friendsList = document.getElementById('friendsList')
  friendsList.innerHTML = allUsers.map(user => {
    return getOneFriendHtml(user)
  }).join('')
})

socket.on('private message', mesg => {
  console.log('private message', mesg)
  addToChatList(mesg.from, mesg)
  new Notification(mesg.from, { body: mesg.content }).onclick = () => console.log('clicked')
})
// socket.on('private message', (mesg, cb) => {
//   console.log('private message', mesg)
//   try {
//     addToChatList(mesg.from, mesg)
//     new Notification(mesg.from, { body: mesg.content }).onclick = () => console.log('clicked')
//     cb({status: 'OK'})
//   } catch (e) {
//     cb({status: 'NOK'})
//   }
// })

socket.on('user connected', user => {
  changeFriendConnectivity({userId: user.userId, readonly: user.readonly, connected: true})
})

socket.on('user disconnected', userId => {
  changeFriendConnectivity({userId, connected: false})
})

// form.addEventListener('submit', function (e) {
//     e.preventDefault()
//     if (input.value) {
//         socket.emit('authenticate', input.value)
//         input.value = ''
//     }
//     console.log('aaa')
//     socket.emit('test', {
//         token,
//         userId,
//         sessionId,
//     })
// })
