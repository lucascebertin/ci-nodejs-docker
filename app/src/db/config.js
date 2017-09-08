// this should be commonjs module compatible (migration tooling compatible)
module.exports = {
  client: 'pg',
  connection: {
    database: process.env.POSTGRES_DB || 'db_articles',
    host: process.env.POSTGRES_HOST || 'localhost',
    user: process.env.POSTGRES_USER || 'root',
    password: process.env.POSTGRES_PASSWORD || 'password',
    charset: 'utf8'
  },
  pool: {
    min: process.env.POSTGRES_POOL_MIN || 1,
    max: process.env.POSTGRES_POOL_MAX || 1
  }
}
