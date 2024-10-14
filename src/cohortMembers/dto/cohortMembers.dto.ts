import { Exclude, Expose } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class CohortMembersDto {
  //generated fields
  @Expose()
  tenantId: string;
  @Expose()
  cohortMembershipId: string;
  @Expose()
  createdAt: string;
  @Expose()
  updatedAt: string;
  @Expose()
  createdBy: string;
  @Expose()
  updatedBy: string;

  //cohortId
  @ApiProperty({
    type: String,
    description: "The cohortId of the cohort members",
    default: "",
  })
  @Expose()
  @IsNotEmpty()
  @IsUUID(undefined, { message: 'Cohort Id must be a valid UUID' })
  cohortId: string;

  cohortAcademicYearId: string;

  //userId
  @ApiProperty({
    type: String,
    description: "The userId of the cohort members",
    default: "",
  })
  @Expose()
  @IsNotEmpty()
  @IsUUID(undefined, { message: 'User Id must be a valid UUID' })
  userId: string;

  constructor(obj: any) {
    Object.assign(this, obj);
  }
}
