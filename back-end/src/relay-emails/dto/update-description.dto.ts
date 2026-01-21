import { IsString, MaxLength } from 'class-validator';

export class UpdateDescriptionDto {
  @IsString()
  @MaxLength(20, { message: 'Description must be less than 20 characters' })
  description: string;
}
