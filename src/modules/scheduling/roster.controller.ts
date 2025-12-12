import { Controller, Post, Body, Get, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SchedulingOrchestrator, OrchestrationResult } from '../../agents/orchestrator.service';

@ApiTags('Roster Generation (MAS)')
@Controller('roster')
export class RosterController {
  private readonly logger = new Logger(RosterController.name);

  constructor(private readonly orchestrator: SchedulingOrchestrator) {}

  /**
   * POST /roster/generate
   * 
   * Genera un roster usando el Multi-Agent System.
   * 
   * @param mode - 'dynamic' (default) para LLM-driven, 'fallback' para deterministic
   */
  @Post('generate')
  @ApiOperation({ summary: 'Genera un roster optimizado usando el MAS' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', example: 'store-1' },
        weekStart: { type: 'string', example: '2024-12-09' },
        mode: { 
          type: 'string', 
          enum: ['dynamic', 'fallback'], 
          default: 'dynamic',
          description: 'dynamic = LLM-driven orchestration, fallback = deterministic flow'
        },
      },
      required: ['storeId', 'weekStart'],
    },
  })
  @ApiResponse({ status: 200, description: 'Roster generado exitosamente' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 500, description: 'Error interno' })
  async generateRoster(
    @Body() body: { storeId: string; weekStart: string; mode?: 'dynamic' | 'fallback' }
  ): Promise<OrchestrationResult> {
    this.logger.log(`Received body: ${JSON.stringify(body)}`);
    
    const { storeId, weekStart, mode = 'dynamic' } = body || {};
    
    this.logger.log(`Generating roster for store ${storeId} starting ${weekStart} (mode: ${mode})`);

    // Validar input
    if (!storeId) {
      throw new HttpException('storeId is required', HttpStatus.BAD_REQUEST);
    }
    if (!weekStart) {
      throw new HttpException('weekStart is required', HttpStatus.BAD_REQUEST);
    }

    // Parsear fecha
    const weekStartDate = new Date(weekStart);
    if (isNaN(weekStartDate.getTime())) {
      throw new HttpException('weekStart must be a valid ISO date (YYYY-MM-DD)', HttpStatus.BAD_REQUEST);
    }

    try {
      let result: OrchestrationResult;
      
      if (mode === 'dynamic') {
        this.logger.log('Using DYNAMIC mode (LLM-driven orchestration)');
        result = await this.orchestrator.generateRosterDynamic(storeId, weekStartDate);
      } else {
        this.logger.log('Using FALLBACK mode (deterministic flow)');
        result = await this.orchestrator.generateRoster(storeId, weekStartDate);
      }
      
      this.logger.log(`Roster generated: status=${result.status}, shifts=${result.roster.roster.length}, mode=${mode}`);
      
      return result;
    } catch (error) {
      this.logger.error('Failed to generate roster', error);
      throw new HttpException(
        {
          message: 'Failed to generate roster',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /roster/health
   * 
   * Verifica que el orchestrator está disponible.
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check del MAS' })
  @ApiResponse({ status: 200, description: 'MAS está activo' })
  getHealth() {
    return {
      status: 'ok',
      service: 'SchedulingOrchestrator',
      workers: ['RosterWorker', 'ComplianceWorker', 'ConflictWorker', 'OptimizationWorker'],
      modes: ['dynamic', 'fallback'],
      timestamp: new Date().toISOString(),
    };
  }
}
