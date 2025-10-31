import { Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Standard Role Response DTO
 * Used across all APIs for consistent role format
 */
export class RoleDto {
  @ApiProperty({
    type: String,
    description: "Role ID (UUID)",
    example: "123e4567-e89b-12d3-a456-426614174000"
  })
  @Expose()
  id: string;

  @ApiProperty({
    type: String,
    description: "Role Name",
    example: "Admin"
  })
  @Expose()
  name: string;
}
