import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { GenerateRosterDto } from './dto/generate-roster.dto';
import { GenerateRosterResult } from './domain/models';

@ApiTags('scheduling')
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('generate-roster')
  @ApiOperation({ summary: 'Generate a roster for a store' })
  @ApiResponse({
    status: 200,
    description: 'Roster generated successfully',
    type: Object,
  })
  async generateRoster(
    @Body() dto: GenerateRosterDto,
  ): Promise<GenerateRosterResult> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    return this.schedulingService.generateRoster(
      dto.storeId,
      startDate,
      endDate,
    );
  }
}

