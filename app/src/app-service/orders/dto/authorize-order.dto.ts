import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class AuthorizeOrderDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'amount must be a numeric string with max 2 decimals',
  })
  amount!: string;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsBoolean()
  simulateUnavailableOnce?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  simulateAuthorizeDelayMs?: number;
}
