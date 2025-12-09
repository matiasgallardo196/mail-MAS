import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { StoreLocationType } from '../../../common/enums/enums';
import { StoreStation } from './store-station.entity';
import { StoreStaffRequirement } from './store-staff-requirement.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { SchedulePeriod } from '../../scheduling/entities/schedule-period.entity';
import { EmployeeAvailability } from '../../employees/entities/employee-availability.entity';
import { ShiftAssignment } from '../../scheduling/entities/shift-assignment.entity';

@Entity('stores')
export class Store extends BaseEntityCustom {
  @Column({ unique: true })
  code: string; // 'Store_1', 'Store_2'

  @Column()
  name: string; // "CBD Core Area", etc.

  @Column({ type: 'enum', enum: StoreLocationType })
  locationType: StoreLocationType;

  @Column({ name: 'revenue_level', nullable: true })
  revenueLevel?: string; // 'High', 'Medium'

  @Column({ name: 'store_type', nullable: true })
  storeType?: string; // 'Non-24H'

  @Column({ type: 'time', name: 'opening_time', nullable: true })
  openingTime?: string;

  @Column({ type: 'time', name: 'closing_time', nullable: true })
  closingTime?: string;

  @OneToMany(() => StoreStation, (ss) => ss.store)
  storeStations: StoreStation[];

  @OneToMany(() => StoreStaffRequirement, (req) => req.store)
  staffRequirements: StoreStaffRequirement[];

  @OneToMany(() => Employee, (emp) => emp.defaultStore)
  employees: Employee[];

  @OneToMany(() => SchedulePeriod, (sp) => sp.store)
  schedulePeriods: SchedulePeriod[];

  @OneToMany(() => EmployeeAvailability, (ea) => ea.store)
  availabilities: EmployeeAvailability[];

  @OneToMany(() => ShiftAssignment, (sa) => sa.store)
  assignments: ShiftAssignment[];
}

