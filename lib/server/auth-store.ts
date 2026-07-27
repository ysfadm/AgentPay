import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "auth.json");

export interface StoredUser {
  id: string;
  username: string;
  pinHash?: string;
  pinSalt?: string;
}

interface AuthState {
  users: Record<string, StoredUser>;
}

function readState(): AuthState {
  try {
    if (!fs.existsSync(FILE)) return { users: {} };
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return { users: {} };
  }
}

function writeState(state: AuthState): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
}

export function getOrCreateUser(username: string): StoredUser {
  const normalized = username.trim().toLowerCase() || "demo";
  const state = readState();
  const existing = state.users[normalized];
  if (existing) return existing;

  const user: StoredUser = {
    id: crypto.createHash("sha256").update(normalized).digest("base64url"),
    username: normalized,
  };
  state.users[normalized] = user;
  writeState(state);
  return user;
}

const PIN_MIN_LEN = 4;
const PIN_MAX_LEN = 32;

function hashPin(pin: string, salt: Buffer): Buffer {
  return crypto.scryptSync(pin, salt, 32);
}

export function userHasPin(username: string): boolean {
  const user = readState().users[username.trim().toLowerCase()];
  return Boolean(user?.pinHash && user?.pinSalt);
}

export function setUserPin(username: string, pin: string): StoredUser {
  const normalized = username.trim().toLowerCase() || "demo";
  if (pin.length < PIN_MIN_LEN || pin.length > PIN_MAX_LEN) {
    throw new Error(`PIN must be ${PIN_MIN_LEN}–${PIN_MAX_LEN} characters`);
  }
  const state = readState();
  const user = state.users[normalized] ?? getOrCreateUser(normalized);
  const salt = crypto.randomBytes(16);
  user.pinSalt = salt.toString("base64url");
  user.pinHash = hashPin(pin, salt).toString("base64url");
  state.users[normalized] = user;
  writeState(state);
  return user;
}

export function verifyUserPin(username: string, pin: string): boolean {
  const normalized = username.trim().toLowerCase() || "demo";
  const user = readState().users[normalized];
  if (!user?.pinHash || !user.pinSalt) return false;
  const salt = Buffer.from(user.pinSalt, "base64url");
  const expected = Buffer.from(user.pinHash, "base64url");
  const actual = hashPin(pin, salt);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}
