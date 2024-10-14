import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CohortAcademicYear } from 'src/cohortAcademicYear/entities/cohortAcademicYear.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CohortAcademicYearService {

  constructor(
  @InjectRepository(CohortAcademicYear)
  private readonly cohortAcademicYearRepository: Repository<CohortAcademicYear>
  ) { }

  async insertCohortAcademicYear(cohortId: string, academicYearId: string, createdBy: string, updatedBy: string) {
    const cohortAcademicYear = new CohortAcademicYear();
    cohortAcademicYear.cohortId = cohortId;
    cohortAcademicYear.academicYearId = academicYearId;
    cohortAcademicYear.createdBy = createdBy;
    cohortAcademicYear.updatedBy = updatedBy;
    return await this.cohortAcademicYearRepository.save(cohortAcademicYear);
    }

  async getCohortsAcademicYear(academicYearId : string, tenantId:  string) : Promise<CohortAcademicYear[]>{
  
    let query = `
      SELECT cay.*
      FROM public."CohortAcademicYear" cay
      INNER JOIN public."AcademicYears" ay
        ON cay."academicYearId" = ay."id"
      WHERE cay."academicYearId" = $1
        AND ay."tenantId" = $2`;

    return await this.cohortAcademicYearRepository.query(query, [academicYearId, tenantId]);
  }
}
