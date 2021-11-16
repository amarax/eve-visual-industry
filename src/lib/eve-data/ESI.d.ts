import type { Activity_Id } from "./EveIndustry";
import type { Quantity } from "./EveMarkets";
import type { EveTypeId } from "./EveTypes";

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

export type EveAsset = {
    is_blueprint_copy?: boolean,
    is_singleton: boolean,
    item_id: EveItemId,
    location_flag: string,
    location_id: EveLocationId,
    location_type: string,
    quantity: Quantity,
    type_id: EveTypeId
}


export type EveLocationId = number;

export type EveItemId = number;
export type EveJobId = number;

export type EveIndustryActivityId = Activity_Id;