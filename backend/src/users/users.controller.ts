import { Body, Controller, Get, Param, Patch, Post, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserRoleDto, UpdateUserStatusDto } from './dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id/role')
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() updateUserRoleDto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, updateUserRoleDto.roleId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @Req() req: any,
  ) {
    return this.usersService.updateStatus(id, updateUserStatusDto.isActive, req?.user?.id ? Number(req.user.id) : undefined);
  }
}
