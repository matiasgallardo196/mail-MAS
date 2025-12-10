import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulingPolicy, PolicyScope } from './entities/scheduling-policy.entity';
import { EmploymentTypeHoursPolicy } from './entities/employment-type-hours-policy.entity';
import { Store } from '../stores/entities/store.entity';

@Injectable()
export class SchedulingPolicyService {
  constructor(
    @InjectRepository(SchedulingPolicy)
    private readonly policyRepository: Repository<SchedulingPolicy>,
    @InjectRepository(EmploymentTypeHoursPolicy)
    private readonly employmentRuleRepository: Repository<EmploymentTypeHoursPolicy>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {}

  async getPolicyForStore(storeId?: string): Promise<SchedulingPolicy> {
    if (storeId) {
      const store = await this.storeRepository.findOne({
        where: { id: storeId },
      });
      if (store) {
        const storePolicy = await this.policyRepository.findOne({
          where: { scope: PolicyScope.STORE, store: { id: store.id } },
          relations: ['employmentTypeRules', 'store'],
        });
        if (storePolicy) {
          return storePolicy;
        }
      }
    }

    const globalPolicy = await this.policyRepository.findOne({
      where: { scope: PolicyScope.GLOBAL },
      relations: ['employmentTypeRules'],
      order: { createdAt: 'ASC' },
    });

    if (!globalPolicy) {
      throw new NotFoundException('No scheduling policy configured (GLOBAL)');
    }

    return globalPolicy;
  }

  async getPolicyByName(name: string): Promise<SchedulingPolicy | null> {
    return this.policyRepository.findOne({
      where: { name },
      relations: ['employmentTypeRules', 'store'],
    });
  }
}
