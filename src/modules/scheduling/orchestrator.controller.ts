import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SchedulingOrchestrator, OrchestrationResult } from '../../agents/orchestrator.service';
import { IsString, IsISO8601, IsNotEmpty } from 'class-validator';

class GenerateRosterDto {
    @IsString()
    @IsNotEmpty()
    storeId: string;

    @IsISO8601()
    @IsNotEmpty()
    weekStart: string;
}

@ApiTags('orchestrator')
@Controller('scheduling/orchestrator')
export class SchedulingOrchestratorController {
    constructor(private readonly orchestrator: SchedulingOrchestrator) { }

    @Post('generate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Generar un roster optimizado con cumplimiento estricto' })
    @ApiResponse({ status: 200, description: 'Proceso de orquestación completado (puede requerir revisión)' })
    @ApiBody({ type: GenerateRosterDto })
    async generateRoster(@Body() dto: GenerateRosterDto): Promise<OrchestrationResult> {
        return this.orchestrator.generateRoster(dto.storeId, new Date(dto.weekStart));
    }
}
