import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { Store } from './store.entity';
import { Station } from '../../stations/entities/station.entity';
import { PeriodType } from '../../../common/enums/enums';

@Entity('store_staff_requirements')
@Unique('UQ_store_period_station', ['store', 'periodType', 'station'])
export class StoreStaffRequirement extends BaseEntityCustom {
  @ManyToOne(() => Store, (store) => store.staffRequirements)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'enum', enum: PeriodType, name: 'period_type' })
  periodType: PeriodType; // NORMAL / PEAK

  @ManyToOne(() => Station, (station) => station.staffRequirements)
  @JoinColumn({ name: 'station_id' })
  station: Station;

  @Column({ name: 'required_staff', type: 'int' })
  requiredStaff: number;
}
