
import { DBSchema, IDBPDatabase, IDBPTransaction, openDB } from "idb";
import { ScheduledJobsObjectStore, SCHEDULED_JOBS_OBJECTSTORE_NAME, CreateObjectStore as ScheduledJobs } from "./ScheduledJobs";

const EVI_DB_NAME = "EVIData"
const EVI_DB_VERSION = 1;

export interface EVI_DB_SCHEMA extends DBSchema {
    [SCHEDULED_JOBS_OBJECTSTORE_NAME]: ScheduledJobsObjectStore
}


function upgrade(db: IDBPDatabase<EVI_DB_SCHEMA>, oldVersion: number, newVersion: number, transaction) {
    console.log("idb upgrading");
    
    if(oldVersion) {
        db.deleteObjectStore(SCHEDULED_JOBS_OBJECTSTORE_NAME);
    }
    ScheduledJobs(db);
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