import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';
import { EmploymentTypeHoursPolicy } from './employment-type-hours-policy.entity';

export enum PolicyScope {
  GLOBAL = 'GLOBAL',
  STORE = 'STORE',
}

export enum ConstraintHardness {
  HARD = 'HARD',
  SOFT = 'SOFT',
}

@Entity('scheduling_policies')
export class SchedulingPolicy extends BaseEntityCustom {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: PolicyScope, default: PolicyScope.GLOBAL })
  scope: PolicyScope;

  @ManyToOne(() => Store, (store) => store.schedulingPolicies, {
    nullable: true,
  })
  @JoinColumn({ name: 'store_id' })
  store?: Store;

  // Core Scheduling Parameters
  @Column({ name: 'max_shifts_per_day', type: 'int', default: 1 })
  maxShiftsPerDay: number;

  @Column({ name: 'max_segments_per_shift', type: 'int', default: 2 })
  maxSegmentsPerShift: number;

  @Column({ name: 'min_hours_per_shift', type: 'numeric', default: 3 })
  minHoursPerShift: number;

  @Column({ name: 'max_gap_between_segments', type: 'numeric', default: 3 })
  maxGapBetweenSegments: number;

  @Column({ name: 'min_hours_between_shifts', type: 'numeric', default: 10 })
  minHoursBetweenShifts: number;

  @Column({
    name: 'max_consecutive_working_days',
    type: 'int',
    default: 6,
  })
  maxConsecutiveWorkingDays: number;

  @Column({ name: 'monthly_standard_hours', type: 'numeric', default: 152 })
  monthlyStandardHours: number;

  // Workforce Composition & Scheduling
  @Column({ name: 'full_time_ratio', type: 'numeric', default: 0.35 })
  fullTimeRatio: number;

  @Column({ name: 'part_time_casual_ratio', type: 'numeric', default: 0.65 })
  partTimeCasualRatio: number;

  @Column({ name: 'min_staff_on_duty', type: 'int', default: 2 })
  minStaffOnDuty: number;

  @Column({ name: 'min_full_time_on_duty', type: 'int', default: 1 })
  minFullTimeOnDuty: number;

  @Column({ name: 'breakfast_start', type: 'time', nullable: true })
  breakfastStart?: string;

  @Column({ name: 'breakfast_end', type: 'time', nullable: true })
  breakfastEnd?: string;

  @Column({ name: 'close_service_start', type: 'time', nullable: true })
  closeServiceStart?: string;

  @Column({ name: 'close_service_end', type: 'time', nullable: true })
  closeServiceEnd?: string;

  // Metadata / flags
  @Column({
    name: 'hard_constraints_enabled',
    type: 'boolean',
    default: true,
  })
  hardConstraintsEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => EmploymentTypeHoursPolicy, (rule) => rule.policy)
  employmentTypeRules: EmploymentTypeHoursPolicy[];
}
