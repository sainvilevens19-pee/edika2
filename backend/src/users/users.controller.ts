import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserByAdminDto, LinkChildDto, AssignTeacherDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * GET /users
   * DIRECTOR, CENSOR, SECRETARY, SUPER_ADMIN peuvent lister les users de leur école.
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.CENSOR, Role.SECRETARY)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAllBySchool(user, page, limit, search);
  }

  /**
   * GET /users/unassigned-teachers
   * Professeurs sans assignation dans l'école du directeur.
   */
  @Get('unassigned-teachers')
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  findUnassigned(@CurrentUser() user: JwtPayload) {
    return this.usersService.findUnassignedTeachers(user);
  }

  /**
   * GET /users/:id
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.CENSOR, Role.SECRETARY)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(id, user);
  }

  /**
   * POST /users
   * Création d'un user (STUDENT, DIRECTOR, CENSOR, SECRETARY) par un admin.
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  create(@Body() dto: CreateUserByAdminDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.createByAdmin(dto, user);
  }

  /**
   * PATCH /users/:id
   */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.TEACHER, Role.PARENT, Role.STUDENT)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, dto, user);
  }

  /**
   * POST /users/me/link-child
   * PARENT : lier un enfant via son numéro de dossier.
   */
  @Post('me/link-child')
  @Roles(Role.PARENT)
  linkChild(@Body() dto: LinkChildDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.linkChild(user.sub, dto);
  }

  /**
   * POST /users/assign-teacher
   * DIRECTOR/SUPER_ADMIN : assigner un professeur à une école.
   */
  @Post('assign-teacher')
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  assignTeacher(@Body() dto: AssignTeacherDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.assignTeacher(dto, user);
  }
}
