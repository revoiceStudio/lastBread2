require("json-dotenv")(".config.json");
require("json-dotenv")("./controller/redisConfig.json");
require("dotenv").config({ path: "credential.env" });
const express = require("express");
const request = require("request");
const router = require("./router");
const redis = require("redis");
const client = redis.createClient();
client.auth(process.env.redisOAuth);
const Redlock = require("redlock");
const redlock = new Redlock([client], {
  driftFactor: 0.01, // the expected clock drift
  retryCount: 3, // the max number of times Redlock will attempt
  retryDelay: 200, // the time in ms between attempts
  retryJitter: 200 // the max time in ms randomly added to retries (to improve performance)
});
const app = express();
app.use(express.json());

app.use("/lastbread/health", (req, res) => {
  console.log("health request : ", req.headers);
  res.status(200);
  return res.send("OK");
});
app.use("/lastbread", (req, res, next) => {
  req.user = req.body.context.session;
  req.cache = client;
  req.redlock = redlock;
  //req.expire =(60*60)*24*7
  req.expire = 60 * 60;
  next();
});

app.use("/lastbread", router);

app.listen(process.env.PORT, () => {
  console.log("port is " + process.env.PORT);
});
