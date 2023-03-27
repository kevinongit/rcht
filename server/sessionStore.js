
class SessionStore {
  findSession(id) {} // not useful
  connected(userId) {} // used for checking multiple login
  saveSession(id, session) {}
  findAllSession() {}
}

class InMemorySessionStore extends SessionStore {
  constructor() {
    super()
    this.sessions = new Map()
  }

  findSession(id) {
    const found = this.sessions.get(id)
    console.log('findSession : ', {id, found})
    return this.sessions.get(id)
  }

  connected(userId) {
    const session = this.sessions.get(userId)
    console.log(`connected : `, session?.connected)
    return session?.connected
  }

  saveSession(id, session) {
    // if (this.findSession(id)) {
    //   console.log(`s(${id}) : already in session`)
    //   return
    // }
    console.log('saveSession : ', {id, session})
    this.sessions.set(id, session)
  }

  findAllSession() {
    return [...this.sessions.values()]
  }
}

module.exports = {
  InMemorySessionStore,
}