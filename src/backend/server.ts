import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Fastify, { FastifyRequest } from "fastify";
import type { FastifyReply } from "fastify/types/reply.js";
import nunjucks from "nunjucks";
import { z } from "zod";
import { comparePassword, hashPassword } from "./auth.js";
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
dotenv.config();

// key:value
// SESSION_ID : <id>
const SESSION_COOKIE = "SESSION_ID";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const accountLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type AccountCreateRequest = z.infer<typeof accountCreateRequestSchema>;
type AccountLoginRequest = z.infer<typeof accountLoginRequestSchema>;

{
  fastifys.register(formBody);
  fastifys.register(cookie, { secret: cookieScecret });
  fastifys.register(staticFiles, { root: path.join(__dirname, "../../dist") });
}

function setSessionCookie(reply: FastifyReply, sessionId: string) {
  reply.setCookie(SESSION_COOKIE, sessionId, {
    path: "/",
  });
}

function readSessionCookie(request: FastifyRequest): string | undefined {
  return request.cookies[SESSION_COOKIE];
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
    const sessions = new SqliteSession(db);
    const sessionId = await sessions.create(user.id);
    setSessionCookie(reply, sessionId);

    console.log("Created user -->> :", user);
    return await reply.redirect("/welcome");
  } catch (error) {
    //  TODO :show error message to the user
    console.error("Error creating user -->> :", error);
    return await reply.redirect("/signup");
  }
});

fastifys.post("/account/signin", async (request, reply) => {
  let requestData: AccountLoginRequest;

  try {
    requestData = accountLoginRequestSchema.parse(request.body);
  } catch (error) {
    return await reply.redirect("/signin");
  }

  const db = await connect(USER_DB);
  const userRepository = new SqliteUserRepository(db);

  try {
    const user = await userRepository.findByEmail(requestData.email);
    if (user === undefined) {
      // TODO :show error message

      return await reply.redirect("/signin");
    }
    const passwordMatches = await comparePassword(
      requestData.password,
      user.hashedPassword,
    );
    if (!passwordMatches) {
      // TODO :show error message
      return await reply.redirect("/signin");
    }
    const sessions = new SqliteSession(db);
    const sessionId = await sessions.create(user.id);
    setSessionCookie(reply, sessionId); // TODO: replace with actual session ID logic

    return await reply.redirect("/welcome");
  } catch (error) {
    // TODO :show error message to the user
    return await reply.redirect("/signin");
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
