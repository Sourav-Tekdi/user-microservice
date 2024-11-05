import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  SerializeOptions,
  Req,
  Headers,
  Res,
  Patch,
  UseGuards,
  Query,
  UsePipes,
  ValidationPipe,
  Delete,
  ParseUUIDPipe,
  UseFilters,
  BadRequestException,
} from "@nestjs/common";

import {
  ApiTags,
  ApiBody,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
  ApiBasicAuth,
  ApiQuery,
  ApiHeader,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from "@nestjs/swagger";

import { UserSearchDto } from "./dto/user-search.dto";
import { UserAdapter } from "./useradapter";
import { UserCreateDto } from "./dto/user-create.dto";
import { UserUpdateDTO } from "./dto/user-update.dto";
import { JwtAuthGuard } from "src/common/guards/keycloak.guard";
import { Request, Response } from "express";
import { AllExceptionsFilter } from "src/common/filters/exception.filter";
import { APIID } from "src/common/utils/api-id.config";
import {
  ForgotPasswordDto,
  ResetUserPasswordDto,
  SendPasswordResetLinkDto,
} from "./dto/passwordReset.dto";
import { isUUID } from "class-validator";
export interface UserData {
  context: string;
  tenantId: string;
  userId: string;
  fieldValue: boolean;
}

@ApiTags("User")
@Controller()
export class UserController {
  constructor(private userAdapter: UserAdapter) { }

  @UseFilters(new AllExceptionsFilter(APIID.USER_GET))
  @Get("read/:userId")
  @ApiBasicAuth("access-token")
  @ApiOkResponse({ description: "User details Fetched Successfully" })
  @ApiNotFoundResponse({ description: "User Not Found" })
  @ApiInternalServerErrorResponse({ description: "Internal Server Error" })
  @ApiBadRequestResponse({ description: "Bad Request" })
  @SerializeOptions({ strategy: "excludeAll" })
  @ApiHeader({ name: "tenantid" })
  @ApiQuery({
    name: "fieldvalue",
    description: "Send True to Fetch Custom Field of User",
    required: false,
  })
  public async getUser(
    @Headers() headers,
    @Req() request: Request,
    @Res() response: Response,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Query("fieldvalue") fieldvalue: string | null = null
  ) {
    const tenantId = headers["tenantid"];
    if (!tenantId) {
      return response
        .status(400)
        .json({ statusCode: 400, error: "Please provide a tenantId." });
    }
    const fieldValueBoolean = fieldvalue === "true";
    // Context and ContextType can be taken from .env later
    const userData: UserData = {
      context: "USERS",
      tenantId: tenantId,
      userId: userId,
      fieldValue: fieldValueBoolean,
    };
    const result = await this.userAdapter
      .buildUserAdapter()
      .getUsersDetailsById(userData, response);

    return response.status(result.statusCode).json(result);
  }

  @UseFilters(new AllExceptionsFilter(APIID.USER_CREATE))
  @Post("/create")
  @UsePipes(new ValidationPipe())
  @ApiCreatedResponse({ description: "User has been created successfully." })
  @ApiBody({ type: UserCreateDto })
  @ApiForbiddenResponse({ description: "User Already Exists" })
  @ApiInternalServerErrorResponse({ description: "Internal Server Error" })
  @ApiConflictResponse({ description: "Duplicate data." })
  @ApiHeader({
    name: "academicyearid",
  })
  @ApiQuery({
    name: "userId",
    required: false,
  })
  async createUser(
    @Headers() headers,
    @Req() request: Request,
    @Body() userCreateDto: UserCreateDto,
    @Res() response: Response,
    @Query("userId") userId: string | null = null
  ) {
    const academicYearId = headers["academicyearid"];
    userCreateDto.userId = userId;
    // if (!academicYearId || !isUUID(academicYearId)) {
    //   throw new BadRequestException(
    //     "academicYearId is required and academicYearId must be a valid UUID."
    //   );
    // }
    return await this.userAdapter
      .buildUserAdapter()
      .createUser(request, userCreateDto, academicYearId, response);
  }

  @UseFilters(new AllExceptionsFilter(APIID.USER_UPDATE))
  @Patch("update/:userid")
  @UsePipes(new ValidationPipe())
  @ApiBody({ type: UserUpdateDTO })
  @ApiCreatedResponse({ description: "User has been updated successfully." })
  @ApiForbiddenResponse({ description: "Forbidden" })
  @ApiHeader({
    name: "tenantid",
  })
  public async updateUser(
    @Headers() headers,
    @Param("userid") userId: string,
    @Req() request: Request,
    @Body() userUpdateDto: UserUpdateDTO,
    @Res() response: Response
  ) {
    // userDto.tenantId = headers["tenantid"];
    userUpdateDto.userId = userId;
    return await this.userAdapter
      .buildUserAdapter()
      .updateUser(userUpdateDto, response);
  }

  @UseFilters(new AllExceptionsFilter(APIID.USER_LIST))
  @Post("/list")
  @ApiCreatedResponse({ description: "User list." })
  @ApiBody({ type: UserSearchDto })
  @UsePipes(ValidationPipe)
  @SerializeOptions({
    strategy: "excludeAll",
  })
  @ApiHeader({
    name: "tenantid",
  })
  public async searchUser(
    @Headers() headers,
    @Req() request: Request,
    @Res() response: Response,
    @Body() userSearchDto: UserSearchDto
  ) {
    const tenantId = headers["tenantid"];
    return await this.userAdapter
      .buildUserAdapter()
      .searchUser(tenantId, request, response, userSearchDto);
  }

  @Post("/password-reset-link")
  @ApiOkResponse({ description: "Password reset link sent successfully." })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: SendPasswordResetLinkDto })
  public async sendPasswordResetLink(
    @Req() request: Request,
    @Res() response: Response,
    @Body() reqBody: SendPasswordResetLinkDto
  ) {
    return await this.userAdapter.buildUserAdapter().sendPasswordResetLink(request, reqBody.username, reqBody.redirectUrl, response)
  }

  @Post("/forgot-password")
  @ApiOkResponse({ description: "Forgot password reset successfully." })
  @UsePipes(new ValidationPipe({ transform: true }))
  public async forgotPassword(
    @Req() request: Request,
    @Res() response: Response,
    @Body() reqBody: ForgotPasswordDto
  ) {
    return await this.userAdapter
      .buildUserAdapter()
      .forgotPassword(request, reqBody, response);
  }

  @UseFilters(new AllExceptionsFilter(APIID.USER_RESET_PASSWORD))
  @Post("/reset-password")
  @ApiOkResponse({ description: "Password reset successfully." })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiForbiddenResponse({ description: "Forbidden" })
  @ApiBody({ type: Object })
  public async resetUserPassword(
    @Req() request: Request,
    @Res() response: Response,
    @Body() reqBody: ResetUserPasswordDto
  ) {
    return await this.userAdapter
      .buildUserAdapter()
      .resetUserPassword(
        request,
        reqBody.userName,
        reqBody.newPassword,
        response
      );
  }

  // required for FTL
  @Post("/check")
  async checkUser(@Body() body, @Res() response: Response) {
    const result = await this.userAdapter
      .buildUserAdapter()
      .checkUser(body, response);
    return response.status(result.statusCode).json(result);
  }

  //delete
  @UseFilters(new AllExceptionsFilter(APIID.USER_DELETE))
  @Delete("delete/:userId")
  @ApiOkResponse({ description: "User deleted successfully" })
  @ApiNotFoundResponse({ description: "Data not found" })
  @SerializeOptions({
    strategy: "excludeAll",
  })
  public async deleteUserById(
    @Headers() headers,
    @Param("userId") userId: string,
    @Req() request: Request,
    @Res() response: Response
  ) {
    return await this.userAdapter
      .buildUserAdapter()
      .deleteUserById(userId, response);
  }
}
