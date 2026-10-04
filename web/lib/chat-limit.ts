import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';

const DAILY_LIMIT = Number(process.env.ANIAH_DAILY_LIMIT || 100);
const MINUTE_LIMIT = Number(process.env.ANIAH_MINUTE_LIMIT || 10);

type MemoryBucket = { day: string; daily: number; minute: string; perMinute: number };
const memoryBuckets = new Map<string, MemoryBucket>();

function identityKey(email: string) {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

function redisClient() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return Redis.fromEnv();
}

export async function consumeAniahQuota(email: string) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const minute = now.toISOString().slice(0, 16);
  const key = identityKey(email);
  const redis = redisClient();

  if (redis) {
    const dailyKey = `aniah:daily:${key}:${day}`;
    const minuteKey = `aniah:minute:${key}:${minute}`;
    const [daily, perMinute] = await Promise.all([
      redis.incr(dailyKey),
      redis.incr(minuteKey),
    ]);
    if (daily === 1) await redis.expire(dailyKey, 60 * 60 * 48);
    if (perMinute === 1) await redis.expire(minuteKey, 60 * 2);
    return {
      allowed: daily <= DAILY_LIMIT && perMinute <= MINUTE_LIMIT,
      dailyRemaining: Math.max(0, DAILY_LIMIT - daily),
    };
  }

  if (process.env.NODE_ENV === 'production') {
    return { allowed: false, dailyRemaining: 0, configurationError: true };
  }

  const previous = memoryBuckets.get(key);
  const bucket = previous?.day === day && previous.minute === minute
    ? previous
    : { day, daily: previous?.day === day ? previous.daily : 0, minute, perMinute: 0 };
  bucket.daily += 1;
  bucket.perMinute += 1;
  memoryBuckets.set(key, bucket);
  return {
    allowed: bucket.daily <= DAILY_LIMIT && bucket.perMinute <= MINUTE_LIMIT,
    dailyRemaining: Math.max(0, DAILY_LIMIT - bucket.daily),
  };
}
