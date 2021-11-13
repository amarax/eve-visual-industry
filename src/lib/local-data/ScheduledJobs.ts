import type { EveItemId, EveJobId, EveLocationId } from "$lib/eve-data/ESI";
import type { IDBPDatabase } from "idb";
import { EVI_DB_SCHEMA, openEVIdb } from "./EVIDatabase";



export type EVIJobId = EveJobId | number;

export interface ScheduledJob {
    jobId: EVIJobId,
    startDate: number,
    blueprintId: EveItemId,
    runs: number,
    locationId: EveLocationId
}


export const SCHEDULED_JOBS_OBJECTSTORE_NAME = "ScheduledJobs";
export interface ScheduledJobsObjectStore {
    key: EVIJobId,
    value: ScheduledJob;
}

export function CreateObjectStore(db: IDBPDatabase<EVI_DB_SCHEMA>) {
    db.createObjectStore(SCHEDULED_JOBS_OBJECTSTORE_NAME);
}


export async function GetScheduledJobs() {
    const db = await openEVIdb();

}

export async function SaveScheduledJobs(jobs) {

}