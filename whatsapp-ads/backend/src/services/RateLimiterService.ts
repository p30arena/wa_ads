import { EventEmitter } from 'events';

interface RateLimitConfig {
  messagesPerMinute: number;
  burstSize: number;
  cooldownMinutes: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  cooldownUntil?: number;
}

export class RateLimiterService extends EventEmitter {
  private buckets: Map<string, TokenBucket> = new Map();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    super();
    this.config = {
      messagesPerMinute: config.messagesPerMinute || 30, // WhatsApp's default rate limit
      burstSize: config.burstSize || 10,
      cooldownMinutes: config.cooldownMinutes || 15,
    };
  }

  public async canSendMessage(phoneNumber: string): Promise<boolean> {
    const bucket = this.getBucket(phoneNumber);
    
    // Check if in cooldown
    if (bucket.cooldownUntil && Date.now() < bucket.cooldownUntil) {
      return false;
    }

    // Refill tokens based on time elapsed
    this.refillTokens(bucket);

    // Check if we have tokens available
    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    // No tokens available, enter cooldown
    bucket.cooldownUntil = Date.now() + (this.config.cooldownMinutes * 60 * 1000);
    this.emit('cooldown:start', { phoneNumber, cooldownUntil: bucket.cooldownUntil });
    return false;
  }

  private getBucket(phoneNumber: string): TokenBucket {
    if (!this.buckets.has(phoneNumber)) {
      this.buckets.set(phoneNumber, {
        tokens: this.config.burstSize,
        lastRefill: Date.now(),
      });
    }
    return this.buckets.get(phoneNumber)!;
  }

  private refillTokens(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((timePassed / 60000) * this.config.messagesPerMinute);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.tokens + tokensToAdd, this.config.burstSize);
      bucket.lastRefill = now;
    }
  }

  public getRemainingTokens(phoneNumber: string): number {
    const bucket = this.getBucket(phoneNumber);
    this.refillTokens(bucket);
    return bucket.tokens;
  }

  public getCooldownTime(phoneNumber: string): number | null {
    const bucket = this.getBucket(phoneNumber);
    if (bucket.cooldownUntil && Date.now() < bucket.cooldownUntil) {
      return bucket.cooldownUntil - Date.now();
    }
    return null;
  }
}
