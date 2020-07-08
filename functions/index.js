const functions = require('firebase-functions');

const express = require("express");
const jsonServer = require("json-server");
const chokidar = require('chokidar');
const cors = require("cors");
const fs = require("fs");
const { buildSchema } = require("graphql");
const graphqlHTTP = require("express-graphql");
const queryResolvers  = require("./graphql/resolvers/QueriesResolver");
const mutationResolvers = require("./graphql/resolvers/MutationsResolver");
const auth = require("./authMiddleware");

const fileName = "./data.js"
const PORT = 3500;

let router = undefined;
let graph = undefined;

const app = express();

app.get('/hello', (req, res, next) => {
  console.info('GET /hello success');
  res.send('Welcome to the IRI-STORE')
});

const createServer = () => {
  delete require.cache[require.resolve(fileName)];
  setTimeout(() => {
      router = jsonServer.router(fileName.endsWith(".js") 
              ? require(fileName)() : fileName);
      let schema =  fs.readFileSync("./graphql/schemas/QueriesSchema.graphql", "utf-8")
          + fs.readFileSync("./graphql/schemas/MutationsSchema.graphql", "utf-8");
      let resolvers = { ...queryResolvers, ...mutationResolvers };
      graph = graphqlHTTP({
          schema: buildSchema(schema), rootValue: resolvers, 
          graphiql: true, context: { db: router.db }
      })
  }, 100)
}

createServer();

app.use(cors());
app.use(jsonServer.bodyParser)
app.use(auth);
app.use("/api", (req, resp, next) => router(req, resp, next));
app.use("/graphql", (req, resp, next) => graph(req, resp, next));

chokidar.watch(fileName).on("change", () => {
    console.log("Reloading web service data...");
    createServer();
    console.log("Reloading web service data complete.");
});

app.listen(PORT, () => {
  console.log('Server is running on Port', PORT);
});

exports.app = functions.https.onRequest(app);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
