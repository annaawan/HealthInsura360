import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  database: {
    url: process.env.DATABASE_URL,
  },
})