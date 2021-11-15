import type { Activity_Id } from "./EveIndustry";

export type EveJobDetailsStatus = 'active' | 'cancelled' | 'delivered' | 'paused' | 'ready' | 'reverted';

export type EveJobDetails = {
    activity_id,
    blueprint_id,
    blueprint_location_id,
    blueprint_type_id,
    cost,
    duration,
    end_date,
    facility_id,
    installer_id,
    job_id: EveJobId,
    licensed_runs,
    output_location_id,
    probability,
    product_type_id,
    runs,
    start_date,
    station_id,
    status,
}

export type EveBlueprint = {
    item_id,
    location_flag,
    location_id,
    material_efficiency,
    quantity,
    runs,
    time_efficiency,
    type_id 
}


export type EveLocationId = number;

export type EveItemId = number;
export type EveJobId = number;

export type EveIndustryActivityId = Activity_Id;