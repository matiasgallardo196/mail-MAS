import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { EmployeeAvailability } from '../../employees/entities/employee-availability.entity';
import { ShiftAssignment } from './shift-assignment.entity';

@Entity('shift_codes')
export class ShiftCode extends BaseEntityCustom {
  @Column({ unique: true })
  code: string; // 'S', '1F', '2F', '3F', 'SC', 'M', '/', 'NA'

  @Column({ name: 'shift_name' })
  shiftName: string; // "Day Shift", "First Half", etc.

  @Column({ type: 'time', name: 'start_time', nullable: true })
  startTime?: string;

  @Column({ type: 'time', name: 'end_time', nullable: true })
  endTime?: string;

  @Column({ type: 'numeric', nullable: true })
  hours?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean; // false para '/', 'NA'

  @Column({ name: 'is_management', type: 'boolean', default: false })
  isManagement: boolean;

  @OneToMany(() => EmployeeAvailability, (ea) => ea.shiftCode)
  availabilities: EmployeeAvailability[];

  @OneToMany(() => ShiftAssignment, (sa) => sa.shiftCode)
  assignments: ShiftAssignment[];
}

