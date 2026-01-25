import { IsEmail } from 'class-validator';

export class ChangeUsernameDto {
  @IsEmail()
  newUsername: string;
}
