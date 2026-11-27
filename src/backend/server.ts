import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Fastify from "fastify";
import nunjucks from "nunjucks";
import { z } from "zod";
import { hashPassword } from "./auth.js";
import formBody from "@fastify/formbody";
import cookie from "@fastify/cookie";
import staticFiles from "@fastify/static";
import {
  connect,
  newDb,
  SqliteUserRepository,
  SqliteSession,
  User,
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const environment = process.env.NODE_ENV;
const cookieScecret = process.env.COOKIE_SECRET;

if (cookieScecret === undefined) {
  console.error("must set COOKIE_SECRET in the environment variables");
  process.exit(1);
}

const templates = new nunjucks.Environment(
  new nunjucks.FileSystemLoader("src/backend/templates"),
);
const USER_DB = "./users.sqlite";
const fastifys = Fastify({
  logger: true,
});

const accountCreateRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  agreedToTerms: z.string().optional(),
});

type AccountCreateRequest = z.infer<typeof accountCreateRequestSchema>;

{
  fastifys.register(formBody);
  fastifys.register(cookie, { secret: cookieScecret });
  fastifys.register(staticFiles, { root: path.join(__dirname, "../../dist") });
}

fastifys.get("/", async (request, reply) => {
  return await reply.redirect("/signin");
});

fastifys.get("/signup", async (request, reply) => {
  const rendered = templates.render("signup.njk", {
    environment,
  });
  return await reply
    .header("Content-Type", "text/html; charset=utf-8")
    .send(rendered);
});

fastifys.post("/account/signup", async (request, reply) => {
  let requestData: AccountCreateRequest;

  try {
    requestData = accountCreateRequestSchema.parse(request.body);
  } catch (error) {
    return await reply.redirect("/signup");
  }

  if (requestData.agreedToTerms !== "on") {
    return await reply.redirect("/signup");
  }

  const db = await connect(USER_DB);
  const userRepository = new SqliteUserRepository(db);

  const hashedPassword = await hashPassword(requestData.password);

  try {
    const newUser: User = {
      id: 0,
      email: requestData.email,
      agreedToTerms: true,
      hashedPassword, // TODO: replace with actual hashed password
    };
    const user = await userRepository.create(newUser);
    console.log("Created user -->> :", user);
    return await reply.redirect("/welcome");
  } catch (error) {
    //  TODO :show error message to the user
    console.error("Error creating user -->> :", error);
    return await reply.redirect("/signup");
  }
});

fastifys.get("/signin", async (request, reply) => {
  const rendered = templates.render("signin.njk", {
    environment,
  });
  return await reply
    .header("Content-Type", "text/html; charset=utf-8")
    .send(rendered);
});

const start = async (): Promise<void> => {
  try {
    const db = connect(USER_DB);
    newDb(db);
    await fastifys.listen({ port: 8989 });
  } catch (err) {
    fastifys.log.error(err);
    process.exit(1);
  }
};

start();
