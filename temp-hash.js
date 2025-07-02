const bcrypt = require('bcryptjs')

async function generateHash() {
  const hash = await bcrypt.hash('Alan6716', 12)
  console.log(hash)
}

generateHash() 