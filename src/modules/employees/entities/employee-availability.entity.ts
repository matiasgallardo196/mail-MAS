import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';
import { SchedulePeriod } from '../../scheduling/entities/schedule-period.entity';
import { ShiftCode } from '../../scheduling/entities/shift-code.entity';
import { Station } from '../../stations/entities/station.entity';
import { Store } from '../../stores/entities/store.entity';

@Entity('employee_availability')
@Unique('UQ_employee_date_period', ['employee', 'schedulePeriod', 'date'])
export class EmployeeAvailability extends BaseEntityCustom {
  @ManyToOne(() => Employee, (employee) => employee.availabilities, {
    eager: true,
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(
    () => SchedulePeriod,
    (schedulePeriod) => schedulePeriod.availabilities,
  )
  @JoinColumn({ name: 'schedule_period_id' })
  schedulePeriod: SchedulePeriod;

  @ManyToOne(() => Store, (store) => store.availabilities, {
    eager: true,
  })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'date' })
  date: Date;

  @ManyToOne(() => ShiftCode, (shiftCode) => shiftCode.availabilities, {
    eager: true,
  })
  @JoinColumn({ name: 'shift_code_id' })
  shiftCode: ShiftCode;

  @ManyToOne(() => Station, (station) => station.availabilities, {
    nullable: true,
  })
  @JoinColumn({ name: 'station_id' })
  station?: Station;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}

