import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';
import { EmployeeAvailability } from '../../employees/entities/employee-availability.entity';
import { ShiftAssignment } from './shift-assignment.entity';

@Entity('schedule_periods')
export class SchedulePeriod extends BaseEntityCustom {
  @ManyToOne(() => Store, (store) => store.schedulePeriods, { eager: true })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ nullable: true })
  name?: string; // "Dec 9-22 2024", etc.

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @OneToMany(
    () => EmployeeAvailability,
    (availability) => availability.schedulePeriod,
  )
  availabilities: EmployeeAvailability[];

  @OneToMany(() => ShiftAssignment, (assignment) => assignment.schedulePeriod)
  assignments: ShiftAssignment[];
}

