import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { Store } from '../stores/entities/store.entity';
import { Station } from '../stations/entities/station.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Station)
    private readonly stationRepository: Repository<Station>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    // Verificar si el código externo ya existe
    const existingEmployee = await this.employeeRepository.findOne({
      where: { externalCode: createEmployeeDto.externalCode },
    });

    if (existingEmployee) {
      throw new ConflictException(
        `El empleado con código externo "${createEmployeeDto.externalCode}" ya existe`,
      );
    }

    // Verificar que la tienda existe
    const store = await this.storeRepository.findOne({
      where: { id: createEmployeeDto.defaultStoreId, isActive: true },
    });

    if (!store) {
      throw new NotFoundException(
        `Tienda con ID "${createEmployeeDto.defaultStoreId}" no encontrada`,
      );
    }

    // Verificar que la estación existe si se proporciona
    if (createEmployeeDto.defaultStationId) {
      const station = await this.stationRepository.findOne({
        where: { id: createEmployeeDto.defaultStationId, isActive: true },
      });

      if (!station) {
        throw new NotFoundException(
          `Estación con ID "${createEmployeeDto.defaultStationId}" no encontrada`,
        );
      }
    }

    const employee = this.employeeRepository.create({
      externalCode: createEmployeeDto.externalCode,
      firstName: createEmployeeDto.firstName,
      lastName: createEmployeeDto.lastName,
      employmentType: createEmployeeDto.employmentType,
      role: createEmployeeDto.role,
      defaultStore: { id: createEmployeeDto.defaultStoreId } as Store,
      defaultStation: createEmployeeDto.defaultStationId
        ? ({ id: createEmployeeDto.defaultStationId } as Station)
        : undefined,
    });

    return await this.employeeRepository.save(employee);
  }

  async findAll(): Promise<Employee[]> {
    return await this.employeeRepository.find({
      where: { isActive: true },
      relations: ['defaultStore', 'defaultStation'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id, isActive: true },
      relations: ['defaultStore', 'defaultStation'],
    });

    if (!employee) {
      throw new NotFoundException(`Empleado con ID "${id}" no encontrado`);
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);

    // Si se está actualizando el código externo, verificar que no exista otro
    if (updateEmployeeDto.externalCode && updateEmployeeDto.externalCode !== employee.externalCode) {
      const existingEmployee = await this.employeeRepository.findOne({
        where: { externalCode: updateEmployeeDto.externalCode },
      });

      if (existingEmployee) {
        throw new ConflictException(
          `El empleado con código externo "${updateEmployeeDto.externalCode}" ya existe`,
        );
      }
    }

    // Verificar tienda si se actualiza
    if (updateEmployeeDto.defaultStoreId) {
      const store = await this.storeRepository.findOne({
        where: { id: updateEmployeeDto.defaultStoreId, isActive: true },
      });

      if (!store) {
        throw new NotFoundException(
          `Tienda con ID "${updateEmployeeDto.defaultStoreId}" no encontrada`,
        );
      }
    }

    // Verificar estación si se actualiza
    if (updateEmployeeDto.defaultStationId !== undefined) {
      if (updateEmployeeDto.defaultStationId) {
        const station = await this.stationRepository.findOne({
          where: { id: updateEmployeeDto.defaultStationId, isActive: true },
        });

        if (!station) {
          throw new NotFoundException(
            `Estación con ID "${updateEmployeeDto.defaultStationId}" no encontrada`,
          );
        }
      }
    }

    if (updateEmployeeDto.externalCode !== undefined) {
      employee.externalCode = updateEmployeeDto.externalCode;
    }

    if (updateEmployeeDto.firstName !== undefined) {
      employee.firstName = updateEmployeeDto.firstName;
    }

    if (updateEmployeeDto.lastName !== undefined) {
      employee.lastName = updateEmployeeDto.lastName;
    }

    if (updateEmployeeDto.employmentType !== undefined) {
      employee.employmentType = updateEmployeeDto.employmentType;
    }

    if (updateEmployeeDto.role !== undefined) {
      employee.role = updateEmployeeDto.role;
    }

    if (updateEmployeeDto.defaultStoreId) {
      employee.defaultStore = { id: updateEmployeeDto.defaultStoreId } as Store;
    }

    if (updateEmployeeDto.defaultStationId !== undefined) {
      employee.defaultStation = updateEmployeeDto.defaultStationId
        ? ({ id: updateEmployeeDto.defaultStationId } as Station)
        : undefined;
    }

    return await this.employeeRepository.save(employee);
  }

  async remove(id: string): Promise<void> {
    const employee = await this.findOne(id);
    employee.isActive = false;
    await this.employeeRepository.save(employee);
  }
}

