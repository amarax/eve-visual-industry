
import { openDB } from "idb";
import { SCHEDULED_JOBS_OBJECTSTORE_NAME, CreateObjectStore as CreateScheduledJobs } from "./ScheduledJobs";

import type { DBSchema, IDBPDatabase } from "idb";
import type { ScheduledJobsObjectStore } from "./ScheduledJobs";

const EVI_DB_NAME = "EVIData"
const EVI_DB_VERSION = 1;

export interface EVI_DB_SCHEMA extends DBSchema {
    [SCHEDULED_JOBS_OBJECTSTORE_NAME]: ScheduledJobsObjectStore
}

// Consolidating upgrades so that version number corresponds to all upgrades required across multiple stores
function upgrade(db: IDBPDatabase<EVI_DB_SCHEMA>, oldVersion: number, newVersion: number, transaction) {
    console.log("idb upgrading");
    
    if(oldVersion) {
        db.deleteObjectStore(SCHEDULED_JOBS_OBJECTSTORE_NAME);
    }
    CreateScheduledJobs(db);
}

function blocked() {
    console.log("idb blocked");
  // …
}

function blocking() {
    console.log("idb blocking");
  // …
}

function terminated() {
    console.log("idb terminated");
  // …
}

export async function openEVIdb() {
    return await openDB<EVI_DB_SCHEMA>(EVI_DB_NAME, EVI_DB_VERSION, {upgrade, blocked, blocking, terminated});
}