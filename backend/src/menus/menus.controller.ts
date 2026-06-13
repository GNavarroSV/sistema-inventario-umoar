import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { MenusService } from './menus.service';
import { AssignMenuToRoleDto, CreateMenuDto, ReorderMenusDto, UpdateMenuDto } from './dto';

@Controller('menus')
@UseGuards(JwtAuthGuard)
export class MenusController {
  constructor(private menusService: MenusService) {}

  @Post()
  createMenu(@Body() createMenuDto: CreateMenuDto) {
    return this.menusService.createMenu(createMenuDto);
  }

  @Patch('reorder')
  reorderMenus(@Body() dto: ReorderMenusDto) {
    return this.menusService.reorderMenus(dto);
  }

  @Patch(':id')
  updateMenu(@Param('id', ParseIntPipe) id: number, @Body() updateMenuDto: UpdateMenuDto) {
    return this.menusService.updateMenu(id, updateMenuDto);
  }

  @Delete(':id')
  deleteMenu(@Param('id', ParseIntPipe) id: number) {
    return this.menusService.deleteMenu(id);
  }

  @Get()
  getAllMenus() {
    return this.menusService.getAllMenus();
  }

  @Get('role/:roleId')
  getMenusByRole(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.menusService.getMenusByRole(roleId);
  }

  @Post('role/:roleId/assign')
  assignMenusToRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() assignDto: AssignMenuToRoleDto,
  ) {
    return this.menusService.assignMenusToRole(roleId, assignDto);
  }
}
