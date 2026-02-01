import { Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { CacheRepository } from "./cache.repository";
import { CustomEnvService } from "src/config/custom-env.service";
import { SetRelayMailCacheDto } from "src/relay-emails/dto/set-relay-mail-cache.dto";
import { RelayEmail } from "src/relay-emails/entities/relay-email.entity";

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    constructor(
        private readonly cacheRepository: CacheRepository,
        private readonly customEnvService: CustomEnvService
    ) {}

    // cache for relay email address
    async setRelayMailCache(setRelayMailCacheDto: SetRelayMailCacheDto): Promise<void> {
        const key = this.getRelayMailCacheKey(setRelayMailCacheDto.relayMail);
        await this.cacheRepository.set(
            key, 
            {
                to: setRelayMailCacheDto.primaryMail,
                note: setRelayMailCacheDto?.note || null
            }
        )
        this.logger.log("new relay mail mapped cache");
    }

    async getPrimaryMailFromCache(relayMail: string): Promise<string> {
        const key = this.getRelayMailCacheKey(relayMail);
        const primaryMail = await this.cacheRepository.get<string>(key);
        if (!primaryMail) {
            throw new NotFoundException("No cache for relay mail address");
        }
        return primaryMail;
    }

    async deleteRelayMailMappingCache(relayMail: string): Promise<void> {
        const key = this.getRelayMailCacheKey(relayMail);
        this.cacheRepository
        .del(key)
        .then((res) => res)
        .catch((err) => {
            this.logger.error(err, 'failed to delete relay mail mapping cache');
        });
    }

    // Session (Refresh Token) operations

    async getSession(token: string): Promise<string> {
        const key = this.getSessionKey(token);
        const session = await this.cacheRepository.get<string>(key);
        if (!session) {
            throw new UnauthorizedException("Not found session");
        }
        return session;
    }

    async setSession(accessToken: string, refreshToken: string): Promise<void> {
        const key = this.getSessionKey(accessToken);
        const ttl = this.customEnvService.get<number>('JWT_REFRESH_TOKEN_EXPIRATION');
        await this.cacheRepository.set(key, refreshToken, ttl);
    }

    async delSession(token: string): Promise<void> {
        const key = this.getSessionKey(token);
        await this.cacheRepository.del(key);
    }

    async hasSession(token: string): Promise<boolean> {
        const key = this.getSessionKey(token);
        return this.cacheRepository.exists(key);
    }

    private getSessionKey(token: string): string {
        return `auth:refresh:token:${token}`;
    }

    // Verification Code Operations

    async setVerificationCode(usernameHash: string, code: string): Promise<void> {
        const key = this.getVerificationCodeKey(usernameHash);
        const ttl = this.customEnvService.get<number>('VERIFICATION_CODE_EXPIRATION');
        await this.cacheRepository.set(key, code, ttl);
    }

    async getVerificationCode(usernameHash: string): Promise<string> {
        const key = this.getVerificationCodeKey(usernameHash);
        const code = await this.cacheRepository.get<string>(key);
        if (!code) {
            throw new UnauthorizedException('Not found code');
        }
        return code;
    }

    async deleteVerificationCode(usernameHash: string): Promise<void> {
        const key = this.getVerificationCodeKey(usernameHash);
        await this.cacheRepository.del(key);
    }

    private getVerificationCodeKey(usernameHash: string): string {
        return `verification:code:${usernameHash}`;
    }

    // Verification Code Attempts Limit Operations

    async getVerificationAttempts(usernameHash: string): Promise<number> {
        const key = this.getVerificationAttemptsKey(usernameHash);
        const attempts = await this.cacheRepository.get<number>(key);
        return attempts || 0;
    }

    async incrementVerificationAttempts(usernameHash: string): Promise<number> {
        const key = this.getVerificationAttemptsKey(usernameHash);
        const ttl = this.customEnvService.getWithDefault(
            'VERIFICATION_CODE_EXPIRATION',
            300000,
          );
        const previous = await this.getVerificationAttempts(usernameHash);
        const current = previous + 1; 
        await this.cacheRepository.set(key, current, ttl);
        return current;
    }

    async resetVerificationAttempts(usernameHash: string): Promise<void> {
        const key = this.getVerificationAttemptsKey(usernameHash);
        await this.cacheRepository.del(key);
    }

    private getVerificationAttemptsKey(usernameHash: string): string {
        return `verfication:attempts:${usernameHash}`;
    }

    private getRelayMailCacheKey(relayMail: string): string {
        return `primary:mail:${RelayEmail}`;
    }
}