import { Injectable } from '@nestjs/common';
import { DemandSlot } from '../domain/models';

@Injectable()
export class StoreDemandAgent {
  /**
   * Generates demand slots for a given store and date range.
   * This is a stub implementation that generates fictional demand slots.
   * TODO: Integrate with real store data, historical patterns, or LLM-based demand prediction
   */
  async generateDemandSlots(
    storeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DemandSlot[]> {
    const demandSlots: DemandSlot[] = [];
    const currentDate = new Date(startDate);

    // Base stations configuration
    const stations = ['KITCHEN', 'FRONT_COUNTER', 'DRIVE_THRU', 'MCCAFE'];

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendMultiplier = isWeekend ? 1.2 : 1.0;

      // Peak hours: 11:00-14:00 (lunch) and 17:00-21:00 (dinner)
      const lunchStart = new Date(currentDate);
      lunchStart.setHours(11, 0, 0, 0);
      const lunchEnd = new Date(currentDate);
      lunchEnd.setHours(14, 0, 0, 0);

      const dinnerStart = new Date(currentDate);
      dinnerStart.setHours(17, 0, 0, 0);
      const dinnerEnd = new Date(currentDate);
      dinnerEnd.setHours(21, 0, 0, 0);

      // Regular hours: 6:00-11:00 and 14:00-17:00 and 21:00-23:00
      const morningStart = new Date(currentDate);
      morningStart.setHours(6, 0, 0, 0);
      const morningEnd = new Date(currentDate);
      morningEnd.setHours(11, 0, 0, 0);

      const afternoonStart = new Date(currentDate);
      afternoonStart.setHours(14, 0, 0, 0);
      const afternoonEnd = new Date(currentDate);
      afternoonEnd.setHours(17, 0, 0, 0);

      const nightStart = new Date(currentDate);
      nightStart.setHours(21, 0, 0, 0);
      const nightEnd = new Date(currentDate);
      nightEnd.setHours(23, 0, 0, 0);

      // Generate slots for each time period
      const timeSlots = [
        { start: morningStart, end: morningEnd, baseDemand: 1 },
        { start: lunchStart, end: lunchEnd, baseDemand: 3 },
        { start: afternoonStart, end: afternoonEnd, baseDemand: 1 },
        { start: dinnerStart, end: dinnerEnd, baseDemand: 3 },
        { start: nightStart, end: nightEnd, baseDemand: 1 },
      ];

      for (const slot of timeSlots) {
        const requiredByStation: Record<string, number> = {};
        for (const station of stations) {
          // Different stations have different base requirements
          let baseRequirement = 1;
          if (station === 'KITCHEN') {
            baseRequirement = 2;
          } else if (station === 'MANAGER') {
            baseRequirement = 0.5; // Manager only needed during peak
            if (slot.baseDemand < 3) continue;
          }

          const finalRequirement = Math.ceil(
            baseRequirement * slot.baseDemand * weekendMultiplier,
          );
          if (finalRequirement > 0) {
            requiredByStation[station] = finalRequirement;
          }
        }

        if (Object.keys(requiredByStation).length > 0) {
          demandSlots.push({
            start: slot.start,
            end: slot.end,
            requiredByStation,
          });
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return demandSlots;
  }
}

