import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';
import { Station } from '../../stations/entities/station.entity';
import { EmploymentType, EmployeeRole } from '../../../common/enums/enums';
import { EmployeeAvailability } from './employee-availability.entity';
import { ShiftAssignment } from '../../scheduling/entities/shift-assignment.entity';

@Entity('employees')
export class Employee extends BaseEntityCustom {
  @Column({ name: 'external_code', type: 'int', unique: true })
  externalCode: number; // 1001, 1002, etc.

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ type: 'enum', enum: EmploymentType, name: 'employment_type' })
  employmentType: EmploymentType;

  @Column({ type: 'enum', enum: EmployeeRole, name: 'role' })
  role: EmployeeRole; // CREW / MANAGER

  @ManyToOne(() => Store, (store) => store.employees, { eager: true })
  @JoinColumn({ name: 'default_store_id' })
  defaultStore: Store;

  @ManyToOne(() => Station, (station) => station.defaultEmployees, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'default_station_id' })
  defaultStation?: Station;

  @OneToMany(
    () => EmployeeAvailability,
    (availability) => availability.employee,
  )
  availabilities: EmployeeAvailability[];

  @OneToMany(() => ShiftAssignment, (assignment) => assignment.employee)
  assignments: ShiftAssignment[];
}

