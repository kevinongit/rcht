class MessageStore {
  saveMessage(message) {}
  findMessagesForUser(userId) {}
}

class InMemoryMessageStore extends MessageStore {
  constructor() {
    super()
    this.messages = []
    // this.mids = new Map()
  }

  
  getMid(mesg) {
    function getCurrrentTimeString() {
      const p2 = n => n < 10 ? ('0' + n) : ('' + n)
      const p3 = n => n < 10 ? ('00' + n) : ( n < 100 ? ('0' + n) : ('' + n))
      const now = new Date()
      /// mid YYMMDDHHmmSSsss: 230320133301037
      return (now.getFullYear() + '').substring(2) + p2(now.getMonth()+1) + p2(now.getDate()) + p2(now.getHours()) + p2(now.getMinutes() + p2(now.getSeconds()) + p3(now.getMilliseconds()))
    }
    // let's generate mid by its creator + timestr
    const mid = mesg.from + getCurrrentTimeString()

    return mid
  }

  saveMessage(message) {
    message.mid = this.getMid(message)
    this.messages.push(message)
    return message
  }

  findMessagesForUser(userId) {
    console.log({userId, thismessages: this.messages})
    // this.messages.filter(({from, to}) => from === userId || to === userId)
    return this.messages.filter(({from, to}) => from === userId || to === userId)
  }

  test_getAllMessages() {
    return this.messages
  }
}

module.exports = {
  InMemoryMessageStore,
}