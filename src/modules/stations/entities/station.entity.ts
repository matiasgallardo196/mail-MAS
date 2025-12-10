import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { StoreStation } from '../../stores/entities/store-station.entity';
import { StoreStaffRequirement } from '../../stores/entities/store-staff-requirement.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { EmployeeAvailability } from '../../employees/entities/employee-availability.entity';
import { ShiftAssignment } from '../../scheduling/entities/shift-assignment.entity';

@Entity('stations')
export class Station extends BaseEntityCustom {
  @Column({ unique: true })
  code: string; // 'KITCHEN', 'COUNTER', 'MCCAFE', 'DESSERT', 'OFFLINE_DESSERT'

  @Column()
  name: string; // "Kitchen", etc.

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => StoreStation, (ss) => ss.station)
  storeStations: StoreStation[];

  @OneToMany(() => StoreStaffRequirement, (req) => req.station)
  staffRequirements: StoreStaffRequirement[];

  @OneToMany(() => Employee, (emp) => emp.defaultStation)
  defaultEmployees: Employee[];

  @OneToMany(() => EmployeeAvailability, (ea) => ea.station)
  availabilities: EmployeeAvailability[];

  @OneToMany(() => ShiftAssignment, (sa) => sa.station)
  assignments: ShiftAssignment[];
}
