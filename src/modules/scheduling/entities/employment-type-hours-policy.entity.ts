import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { SchedulingPolicy } from './scheduling-policy.entity';
import { EmploymentType } from '../../../common/enums/enums';

@Entity('employment_type_hours_policies')
@Unique('UQ_policy_employment_type', ['policy', 'employmentType'])
export class EmploymentTypeHoursPolicy extends BaseEntityCustom {
  @ManyToOne(() => SchedulingPolicy, (policy) => policy.employmentTypeRules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'policy_id' })
  policy: SchedulingPolicy;

  @Column({ type: 'enum', enum: EmploymentType })
  employmentType: EmploymentType;

  @Column({ name: 'min_hours_week', type: 'numeric', nullable: true })
  minHoursWeek?: number;

  @Column({ name: 'max_hours_week', type: 'numeric', nullable: true })
  maxHoursWeek?: number;
}
