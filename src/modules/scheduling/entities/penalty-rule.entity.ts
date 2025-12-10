import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';
import { EmploymentType } from '../../../common/enums/enums';

@Entity('penalty_rules')
export class PenaltyRule extends BaseEntityCustom {
  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store?: Store;

  @Column({ name: 'day_of_week', type: 'int', nullable: true })
  dayOfWeek: number | null;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string | null;

  @Column({ name: 'employment_type', type: 'enum', enum: EmploymentType, nullable: true })
  employmentType: EmploymentType | null;

  @Column({ type: 'numeric' })
  multiplier: number;

  @Column({ name: 'is_public_holiday', type: 'boolean', default: false })
  isPublicHoliday: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string | null;
}

