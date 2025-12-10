import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntityCustom } from '../../../common/entities/base.entity';
import { Store } from './store.entity';
import { Station } from '../../stations/entities/station.entity';

@Entity('store_stations')
@Unique('UQ_store_station', ['store', 'station'])
export class StoreStation extends BaseEntityCustom {
  @ManyToOne(() => Store, (store) => store.storeStations)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Station, (station) => station.storeStations)
  @JoinColumn({ name: 'station_id' })
  station: Station;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;
}
