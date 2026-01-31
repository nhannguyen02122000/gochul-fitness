const perms = {
  attrs: {
    allow: {
      create: 'false'
    }
  },
  contract: {
    allow: {
      view: 'true',
      create: 'false',
      delete: 'false',
      update: 'false'
    }
  },
  history: {
    allow: {
      view: 'true',
      create: 'false',
      delete: 'false',
      update: 'false'
    }
  },
  user_setting: {
    allow: {
      view: 'true',
      create: 'false',
      delete: 'false',
      update: 'false'
    }
  }
}

export default JSON.parse(JSON.stringify(perms, null, 2))
