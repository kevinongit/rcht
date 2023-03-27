const userDb = [
  {
    userId: 'redmine',
    username: 'Redmine Admin',
    readonly: true,
    password: 'dont use actually',
    profileImage: 'img/redmine.png',
  },
  {
    userId: 'starload',
    username: 'Peter Quill',
    password: 'aa',
    profileImage: 'img/quill.jpg',
  },
  {
    userId: 'gamora',
    username: 'Zoe Saldana',
    password: 'aa',
    profileImage: 'img/gamora.jpg',
  },
  {
    userId: 'spiderman',
    username: 'Peter Parker',
    password: 'aa',
    profileImage: 'img/spiderman.jpg',
  },
  {
    userId: 'ironman',
    username: 'Tony Stark',
    password: 'aa',
    profileImage: 'img/ironman.jpg',
  },
  {
    userId: 'natasha',
    username: 'Scarllett Johansson',
    password: 'aa',
    profileImage: 'img/natasha.jpg',
  },
  {
    userId: 'test1',
    username: 'test1',
    password: 'aa',
    profileImage: 'img/natasha.jpg',
  },
  {
    userId: 'test2',
    username: 'test2',
    password: 'aa',
    profileImage: 'img/natasha.jpg',
  },
]

function findUser(userId) {
  return userDb.find(ele => ele.userId === userId)
}

function getRegisteredUsers() {
  return userDb.map(u => ({ ...u, password: undefined, connected: false }))
}


module.exports = {
  findUser,
  getRegisteredUsers,

}