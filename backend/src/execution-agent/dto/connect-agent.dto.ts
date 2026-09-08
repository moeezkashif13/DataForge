import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectAgentDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
