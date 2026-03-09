import { Redis } from "@upstash/redis";
import { User } from "./types";

let _redis: Redis | null = null;
function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars"
    );
  }
  if (!_redis) _redis = new Redis({ url, token });
  return _redis;
}

const USER_PREFIX = "nm:user:";
const USER_LIST_KEY = "nm:users";

export async function createUser(user: User): Promise<void> {
  await getRedis().set(`${USER_PREFIX}${user.id}`, JSON.stringify(user));
  await getRedis().sadd(USER_LIST_KEY, user.id);
}

export async function getUser(userId: string): Promise<User | null> {
  const data = await getRedis().get<string>(`${USER_PREFIX}${userId}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function updateUser(user: User): Promise<void> {
  await getRedis().set(`${USER_PREFIX}${user.id}`, JSON.stringify(user));
}

export async function getAllUsers(): Promise<User[]> {
  const userIds = await getRedis().smembers(USER_LIST_KEY);
  if (!userIds.length) return [];

  const users: User[] = [];
  for (const id of userIds) {
    const user = await getUser(id as string);
    if (user) users.push(user);
  }
  return users;
}

export async function clearAllUsers(): Promise<void> {
  const userIds = await getRedis().smembers(USER_LIST_KEY);
  for (const id of userIds) {
    await getRedis().del(`${USER_PREFIX}${id}`);
  }
  await getRedis().del(USER_LIST_KEY);
}
