import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccountStatusFields1769286627535 implements MigrationInterface {
    name = 'AddAccountStatusFields1769286627535'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`relay_emails\` DROP FOREIGN KEY \`fk_relay_emails_user_id\``);
        await queryRunner.query(`DROP INDEX \`UK_r43af9ap4edm43mmtq01oddj6\` ON \`users\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`status\` enum ('ACTIVE', 'DEACTIVATED', 'DELETED') NOT NULL DEFAULT 'ACTIVE'`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`deactivated_at\` datetime NULL`);
        await queryRunner.query(`DROP INDEX \`idx_primary_email\` ON \`relay_emails\``);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` DROP COLUMN \`primary_email\``);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` ADD \`primary_email\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` CHANGE \`is_active\` \`is_active\` tinyint(1) NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` CHANGE \`created_at\` \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`subscription_tier\` \`subscription_tier\` enum ('FREE', 'PRO') NOT NULL DEFAULT 'FREE'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`created_at\` \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`last_logined_at\` \`last_logined_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`CREATE INDEX \`idx_primary_email\` ON \`relay_emails\` (\`primary_email\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_fe0bb3f6520ee0469504521e71\` ON \`users\` (\`username\`)`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` ADD CONSTRAINT \`FK_c994626f9143f8e2cd72a6879c6\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`relay_emails\` DROP FOREIGN KEY \`FK_c994626f9143f8e2cd72a6879c6\``);
        await queryRunner.query(`DROP INDEX \`IDX_fe0bb3f6520ee0469504521e71\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`idx_primary_email\` ON \`relay_emails\``);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`last_logined_at\` \`last_logined_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`created_at\` \`created_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`subscription_tier\` \`subscription_tier\` enum ('FREE', 'PRO') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` CHANGE \`updated_at\` \`updated_at\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` CHANGE \`created_at\` \`created_at\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` DROP COLUMN \`primary_email\``);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` ADD \`primary_email\` varchar(512) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`CREATE INDEX \`idx_primary_email\` ON \`relay_emails\` (\`primary_email\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`deactivated_at\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`status\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UK_r43af9ap4edm43mmtq01oddj6\` ON \`users\` (\`username\`)`);
        await queryRunner.query(`ALTER TABLE \`relay_emails\` ADD CONSTRAINT \`fk_relay_emails_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
