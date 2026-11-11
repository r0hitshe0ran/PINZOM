"use strict";

const http = require("node:http");
const { createReadStream } = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomBytes, randomUUID, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const { BAKERIES, findCatalogBakery } = require("./bakery-catalog.js");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.PINZOM_DATA_DIR || path.join(__dirname, "data"));
const SESSION_COOKIE = "pinzom_session";
const SESSION_SECONDS = 24 * 60 * 60;
const MAX_BODY_BYTES = 16 * 1024;
const deriveKey = promisify(scrypt);
const sessions = new Map();
const pages = new Set([
  "index.html", "how-it-works.html", "explore.html", "categories.html",
  "reviews.html", "bakery.html", "login.html", "signup.html",
  "forgot-password.html", "profile.html", "bakery-catalog.js", "script.js", "style.css",
]);
const fileTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

class RequestError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

function sendJson(response, status, data, headers) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(data));
}

async function readBody(request) {
  if (request.headers.origin && request.headers.origin !== "http://" + request.headers.host) {
    throw new RequestError(403, "Submit this form from the Pinzom site.");
  }
  if (request.headers["content-type"]?.split(";")[0].trim() !== "application/json") {
    throw new RequestError(415, "Expected JSON form data.");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      request.resume();
      throw new RequestError(413, "The submitted form is too large.");
    }
    chunks.push(chunk);
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "Could not read the submitted form.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RequestError(400, "Expected a JSON object.");
  }
  return body;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateEmail(email) {
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new RequestError(400, "Please enter a valid email address.", "email");
  }
}

function validatePassword(password) {
  if (
    typeof password !== "string" || password.length < 8 || password.length > 128 ||
    !/[a-z]/i.test(password) || !/\d/.test(password)
  ) {
    throw new RequestError(400, "Use 8 to 128 characters, with a letter and a number.", "password");
  }
}

async function hashSecret(secret) {
  const salt = randomBytes(16).toString("hex");
  const hash = await deriveKey(secret, salt, 64);
  return { salt, hash: hash.toString("hex") };
}

async function verifySecret(secret, stored) {
  if (!stored || typeof secret !== "string" || secret.length > 128) return false;
  const hash = await deriveKey(secret, stored.salt, 64);
  return timingSafeEqual(hash, Buffer.from(stored.hash, "hex"));
}

function publicUser({ id, fullName, email, acceptedTerms, favorites, createdAt }) {
  return { id, fullName, email, acceptedTerms, favorites, createdAt };
}

function sessionToken(request) {
  const match = (request.headers.cookie || "").match(/(?:^|;\s*)pinzom_session=([a-f0-9]{64})(?:;|$)/);
  return match?.[1];
}

function currentUser(request) {
  const token = sessionToken(request);
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return users.find((user) => user.id === session.userId) || null;
}

function requireUser(request) {
  const user = currentUser(request);
  if (!user) throw new RequestError(401, "Please log in to continue.");
  return user;
}

function sessionCookie(token, age) {
  return SESSION_COOKIE + "=" + token + "; Path=/; Max-Age=" + age + "; HttpOnly; SameSite=Strict";
}

function startSession(request, user) {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
  sessions.delete(sessionToken(request));
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, expiresAt: now + SESSION_SECONDS * 1000 });
  return { "Set-Cookie": sessionCookie(token, SESSION_SECONDS) };
}

let users = [];
let reviews = [];
let pendingWrite = Promise.resolve();

// Serialize read/modify/write operations so concurrent submissions retain both records.
function updateData(operation) {
  const result = pendingWrite.then(operation);
  pendingWrite = result.catch(() => {});
  return result;
}

async function writeData(filename, records) {
  const destination = path.join(DATA_DIR, filename);
  const temporary = destination + "." + randomUUID() + ".tmp";
  try {
    await fs.writeFile(temporary, JSON.stringify(records, null, 2) + "\n", { mode: 0o600 });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

async function loadData(filename) {
  let raw;
  try {
    raw = await fs.readFile(path.join(DATA_DIR, filename), "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeData(filename, []);
    return [];
  }
  const records = JSON.parse(raw);
  if (!Array.isArray(records)) throw new Error(filename + " must contain a JSON array.");
  return records;
}

async function signup(request, response, body) {
  const fullName = cleanText(body.fullName).replace(/\s+/g, " ");
  const email = cleanText(body.email).toLowerCase();
  if (fullName.length < 2 || fullName.length > 120 || !/^\p{L}[\p{L}\p{M} .'-]*$/u.test(fullName)) {
    throw new RequestError(400, "Please enter a valid full name.", "fullName");
  }
  validateEmail(email);
  validatePassword(body.password);
  if (body.acceptedTerms !== true) {
    throw new RequestError(400, "Please accept the Terms and Privacy Policy.", "terms");
  }

  const recoveryCode = randomBytes(16).toString("hex").match(/.{8}/g).join("-");
  const [password, recovery] = await Promise.all([
    hashSecret(body.password), hashSecret(recoveryCode),
  ]);
  const user = await updateData(async () => {
    if (users.some((entry) => entry.email === email)) {
      throw new RequestError(409, "An account with this email already exists.", "email");
    }
    const entry = {
      id: randomUUID(), fullName, email, password, recovery,
      acceptedTerms: true, favorites: [], createdAt: new Date().toISOString(),
    };
    const next = [...users, entry];
    await writeData("users.json", next);
    users = next;
    return entry;
  });
  sendJson(response, 201, { user: publicUser(user), recoveryCode }, startSession(request, user));
}

async function login(request, response, body) {
  const identifier = cleanText(body.identifier).toLowerCase();
  const emailMatch = users.find((user) => user.email === identifier);
  const candidates = emailMatch ? [emailMatch] : users.filter(
    (user) => user.fullName.toLowerCase() === identifier,
  );
  for (const user of candidates) {
    const matches = await verifySecret(body.password, user.password);
    const current = users.find((entry) => entry.id === user.id);
    if (matches && current?.password === user.password) {
      sendJson(response, 200, { user: publicUser(current) }, startSession(request, current));
      return;
    }
  }
  throw new RequestError(401, "The email or name and password did not match an account.");
}

async function resetPassword(request, response, body) {
  const email = cleanText(body.email).toLowerCase();
  const recoveryCode = cleanText(body.recoveryCode).toLowerCase();
  validateEmail(email);
  validatePassword(body.password);
  const user = users.find((entry) => entry.email === email);
  if (!user || !await verifySecret(recoveryCode, user.recovery)) {
    throw new RequestError(400, "The email and recovery code did not match an account.", "recoveryCode");
  }

  const password = await hashSecret(body.password);
  await updateData(async () => {
    const next = users.map((entry) => entry.id === user.id
      ? { ...entry, password, updatedAt: new Date().toISOString() }
      : entry);
    await writeData("users.json", next);
    users = next;
    for (const [token, session] of sessions) {
      if (session.userId === user.id) sessions.delete(token);
    }
  });
  const headers = sessions.has(sessionToken(request)) ? {} : { "Set-Cookie": sessionCookie("", 0) };
  sendJson(response, 200, {}, headers);
}

async function favorite(request, response, body) {
  const bakeryId = body.bakeryId;
  if (typeof bakeryId !== "string" || !BAKERIES.some((bakery) => bakery.id === bakeryId)) {
    throw new RequestError(400, "Choose a bakery to save.", "bakeryId");
  }
  const result = await updateData(async () => {
    const user = requireUser(request);
    const saved = !user.favorites.includes(bakeryId);
    const favorites = saved ? [...user.favorites, bakeryId] : user.favorites.filter((id) => id !== bakeryId);
    const updated = { ...user, favorites };
    const next = users.map((entry) => entry.id === user.id ? updated : entry);
    await writeData("users.json", next);
    users = next;
    return { user: publicUser(updated), saved };
  });
  sendJson(response, 200, result);
}

async function postReview(request, response, body) {
  const bakery = body.bakeryId === undefined
    ? findCatalogBakery(body.bakery)
    : BAKERIES.find((entry) => entry.id === body.bakeryId);
  const text = cleanText(body.text);
  const rating = body.rating;
  if (!bakery) {
    throw new RequestError(400, "Choose a bakery from Explore.", "bakeryId");
  }
  if (text.length < 10 || text.length > 2000) {
    throw new RequestError(400, "Write a review between 10 and 2000 characters.", "text");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new RequestError(400, "Please choose a star rating.", "rating");
  }
  const review = await updateData(async () => {
    const user = requireUser(request);
    const entry = {
      id: randomUUID(), bakeryId: bakery.id, bakery: bakery.name,
      category: bakery.category, rating, text, author: user.fullName,
      createdAt: new Date().toISOString(), userId: user.id,
    };
    const next = [...reviews, entry];
    await writeData("reviews.json", next);
    reviews = next;
    return entry;
  });
  sendJson(response, 201, { review });
}

const postHandlers = new Map([
  ["/api/signup", signup],
  ["/api/login", login],
  ["/api/logout", (request, response) => {
    sessions.delete(sessionToken(request));
    sendJson(response, 200, {}, { "Set-Cookie": sessionCookie("", 0) });
  }],
  ["/api/reset-password", resetPassword],
  ["/api/favorites", favorite],
  ["/api/reviews", postReview],
]);

async function serveApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/session") {
    const user = currentUser(request);
    return sendJson(response, 200, { user: user ? publicUser(user) : null });
  }
  if (request.method === "GET" && pathname === "/api/reviews") {
    const viewer = currentUser(request);
    const visibleReviews = reviews.flatMap((review) => {
      const bakery = findCatalogBakery(review.bakeryId || review.bakery);
      if (bakery) {
        return [{ ...review, bakeryId: bakery.id, bakery: bakery.name, category: bakery.category }];
      }
      // Older free-text reviews remain available to the author in their profile.
      return viewer && viewer.id === review.userId ? [{ ...review, bakeryId: null }] : [];
    });
    return sendJson(response, 200, { reviews: visibleReviews });
  }
  const handler = request.method === "POST" && postHandlers.get(pathname);
  if (!handler) throw new RequestError(404, "This API route was not found.");
  await handler(request, response, await readBody(request));
}

async function servePage(request, response, pathname) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    throw new RequestError(405, "Only GET and HEAD are supported here.");
  }
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const extension = path.extname(relative).toLowerCase();
  const isImage = /^images\/(?:[\w ().-]+\/)*[\w ().-]+\.(?:png|jpe?g|webp|svg)$/i.test(relative)
    && !relative.split("/").some((part) => part === ".." || part === ".");
  if (!pages.has(relative) && !isImage) throw new RequestError(404, "Page not found.");

  const filename = path.join(__dirname, relative);
  const info = await fs.stat(filename).catch((error) => {
    if (error.code === "ENOENT") throw new RequestError(404, "Page not found.");
    throw error;
  });
  if (!info.isFile()) throw new RequestError(404, "Page not found.");
  response.writeHead(200, { "Content-Type": fileTypes[extension], "Content-Length": info.size });
  if (request.method === "HEAD") {
    response.end();
  } else {
    const file = createReadStream(filename);
    response.on("close", () => file.destroy());
    file.on("error", () => response.destroy());
    file.pipe(response);
  }
}

async function start() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  [users, reviews] = await Promise.all([loadData("users.json"), loadData("reviews.json")]);
  const server = http.createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(request.headers.host || "")) {
        throw new RequestError(403, "Open Pinzom on localhost.");
      }
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      } catch {
        throw new RequestError(400, "Invalid URL.");
      }
      if (pathname.startsWith("/api/")) {
        await serveApi(request, response, pathname);
      } else {
        await servePage(request, response, pathname);
      }
    } catch (error) {
      if (error instanceof RequestError) {
        sendJson(response, error.status, { message: error.message, field: error.field });
      } else {
        console.error(error);
        sendJson(response, 500, { message: "Could not complete the request. Please try again." });
      }
    }
  });
  server.listen(PORT, HOST, () => {
    console.log("Pinzom is running at http://" + HOST + ":" + server.address().port);
  });
}

start().catch((error) => {
  console.error("Could not start Pinzom:", error.message);
  process.exitCode = 1;
});
