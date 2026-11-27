import path from "path";
import dotenv from "dotenv";
import Fastify from "fastify";
import nunjucks from "nunjucks";
import { z } from "zod";
import formBody from "@fastify/formbody";
import cookie from "@fastify/cookie";
import staticFiles from "@fastify/static";
import { connect, newDb, SqliteUserRepository, SqliteSession } from "./db.js";

dotenv.config();

const environment = process.env.NODE_ENV;
const cookieScecret = process.env.COOKIE_SECRET;

if (cookieScecret === undefined) {
  console.error("must set COOKIE_SECRET in the environment variables");
  process.exit(1);
}

const template = new nunjucks.Environment(
  new nunjucks.FileSystemLoader("src/backend/templates"),
);
const USER_DB = "./users.sqlite";
const fastifys = Fastify({
  logger: true,
});

{
  fastifys.register(formBody);
  fastifys.register(cookie, { secret: cookieScecret });
  fastifys.register(staticFiles, { root: path.join(__dirname, "../../dist") });
}

fastifys.get("/", async (request, reply) => {
  return await reply.send("Hello, World!");
});

const start = async (): Promise<void> => {
  try {
    const db = await connect(USER_DB);
    newDb(db);
    await fastifys.listen({ port: 8989 });
  } catch (err) {
    fastifys.log.error(err);
    process.exit(1);
  }
};

start();
