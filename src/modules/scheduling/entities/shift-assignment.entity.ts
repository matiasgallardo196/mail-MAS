import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { SchedulePeriod } from './schedule-period.entity';
import { ShiftCode } from './shift-code.entity';
import { Station } from '../../stations/entities/station.entity';
import { Store } from '../../stores/entities/store.entity';

@Entity('shift_assignments')
@Unique('UQ_employee_date_assignment', [
  'employee',
  'date',
  'shiftCode',
  'station',
])
export class ShiftAssignment extends BaseEntityCustom {
  @ManyToOne(() => Employee, (employee) => employee.assignments, {
    eager: true,
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(
    () => SchedulePeriod,
    (schedulePeriod) => schedulePeriod.assignments,
  )
  @JoinColumn({ name: 'schedule_period_id' })
  schedulePeriod: SchedulePeriod;

  @ManyToOne(() => Store, (store) => store.assignments, {
    eager: true,
  })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'date' })
  date: Date;

  @ManyToOne(() => ShiftCode, (shiftCode) => shiftCode.assignments, {
    eager: true,
  })
  @JoinColumn({ name: 'shift_code_id' })
  shiftCode: ShiftCode;

  @ManyToOne(() => Station, (station) => station.assignments, {
    eager: true,
  })
  @JoinColumn({ name: 'station_id' })
  station: Station;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string; // id del planner / sistema
}

