import type {EveJobDetailsStatus} from "$lib/eve-data/ESI";
import type {IndustryJobStore} from "$lib/IndustryJob"
import type { EveCharacterId } from "./eve-data/EveCharacter";

export type JobDetailsStatus = EveJobDetailsStatus | 'scheduled';
export interface JobDetails {
    job_id,
    activity_id,
    blueprint_id,
    blueprint_type_id,
    facility_id,
    end_date,
    start_date,
    status: JobDetailsStatus,
    runs,
    product_type_id,
    industryJob?: IndustryJobStore,
    installer_id: EveCharacterId,
}