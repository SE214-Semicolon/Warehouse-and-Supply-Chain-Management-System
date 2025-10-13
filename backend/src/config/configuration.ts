export default () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  mongo: {
    url: process.env.MONGODB_URI,
  },
});
