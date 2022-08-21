import { Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsIn, IsNotEmpty, IsString } from "class-validator";
import { VisitStatus } from "./visitStatus.enum";

export class MentorTrackingDto {
  @Expose()
  mentorTrackingId: string;

  @ApiProperty({})
  @Expose()
  mentorId: string;

  @ApiProperty({})
  @Expose()
  teacherId: string;

  @ApiProperty({})
  @Expose()
  schoolId: string;

  @ApiProperty({
    default: new Date().toISOString().split("T")[0],
  })
  @Expose()
  scheduleVisitDate: string;

  @ApiProperty({
    default: new Date().toISOString().split("T")[0],
  })
  @Expose()
  visitDate: string;

  @ApiProperty({})
  @Expose()
  feedback: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([VisitStatus.pending, VisitStatus.visited])
  @IsEnum(VisitStatus)
  @ApiProperty({
    enum: [VisitStatus.pending, VisitStatus.visited],
  })
  @Expose()
  status: string;

  @ApiProperty({ default: new Date().toISOString().split("T")[0] })
  @Expose()
  lastVisited: string;

  @Expose()
  createdAt: string;

  @Expose()
  updatedAt: string;

  @Expose()
  createdBy: string;

  @Expose()
  updatedBy: string;

  constructor(obj: any) {
    this.mentorTrackingId = obj?.mentorTrackingId
      ? `${obj.mentorTrackingId}`
      : "";
    this.mentorId = obj?.mentorId ? `${obj.mentorId}` : "";
    this.teacherId = obj?.teacherId ? `${obj.teacherId}` : "";
    this.schoolId = obj?.schoolId ? `${obj.schoolId}` : "";
    this.scheduleVisitDate = obj?.scheduleVisitDate
      ? `${obj.scheduleVisitDate}`
      : "";
    this.visitDate = obj?.visitDate ? `${obj.visitDate}` : "";
    this.feedback = obj?.feedback ? `${obj.feedback}` : "";
    this.status = obj?.status ? obj.status : "";
    this.lastVisited = obj?.lastVisited ? obj.lastVisited : "";
    this.createdAt = obj?.created_at ? `${obj.created_at}` : "";
    this.updatedAt = obj?.updated_at ? `${obj.updated_at}` : "";
  }
}
