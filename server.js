const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const cors = require('cors');
const dotEnv = require('dotenv');
const DataLoader = require('dataloader');
const http = require('http');

const resolvers = require('./resolvers');
const typeDefs = require('./typeDefs');
const { connection } = require('./database/util');
const { verifyUser } = require('./helper/context');
const loaders = require('./loaders');

dotEnv.config();

const app = express();

connection();

app.use(cors());

app.use(express.json());

let apolloServer;

async function startServer() {
  apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req, connection }) => {
      const contextObj = {};
      if (req) {
        await verifyUser(req);
        contextObj.email = req.email;
        contextObj.loggedInUserId = req.loggedInUserId;
      }
      contextObj.loaders = {
        user: new DataLoader((keys) => loaders.user.batchUsers(keys)),
      };
      return contextObj;
    },
    formatError: (error) => {
      console.error(error);
      return {
        message: error.message,
      };
    },
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: '/graphql' });
  try {
    apolloServer.installSubscriptionHandlers(httpServer);
  } catch (error) {
    console.log(error);
  }
}

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);

httpServer.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
  console.log(`GraphQL endpoint: ${apolloServer.graphqlPath}`);
});

startServer();
