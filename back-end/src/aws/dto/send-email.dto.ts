import { IsEmail, IsOptional, IsString, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class EmailAttachment {
    filename: string;
    content: Buffer;
    contentType: string;
    contentDisposition?: string;
    cid?: string;
}

export class SendEmailDto {
    @IsEmail()
    to: string;

    @IsString()
    from: string;

    @IsString()
    subject: string;

    @IsOptional()
    @IsString()
    htmlBody?: string;

    @IsOptional()
    @IsString()
    textBody?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EmailAttachment)
    attachments?: EmailAttachment[];

    /**
     * @deprecated Use htmlBody and/or textBody instead for better email client compatibility
     */
    @IsOptional()
    @IsString()
    body?: string;
}