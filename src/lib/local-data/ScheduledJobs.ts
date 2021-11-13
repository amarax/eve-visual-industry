import type { EveIndustryActivityId, EveItemId, EveJobId, EveLocationId } from "$lib/eve-data/ESI";
import type { EveCharacterId } from "$lib/eve-data/EveCharacter";
import type { IDBPDatabase } from "idb";
import type { UTCms } from "$lib/local-data/EVI";
import { openEVIdb } from "./EVIDatabase";
import type { EVI_DB_SCHEMA } from "./EVIDatabase";
import { dev } from "$app/env";



export type EVIJobId = EveJobId | number;

export interface EVIScheduledJob {
    job_id: EVIJobId,
    start_date: UTCms,
    blueprint_id: EveItemId,
    activity_id: EveIndustryActivityId,
    runs: number,
    location_id: EveLocationId,
}

interface EVIScheduledJobStored extends EVIScheduledJob {
    characterId: EveCharacterId,
    
}


export const SCHEDULED_JOBS_OBJECTSTORE_NAME = "ScheduledJobs";
export interface ScheduledJobsObjectStore {
    key: EVIJobId,
    value: EVIScheduledJobStored,

    // Currently we only need the character id 
    // because we will need all the records to do the subsequent processing
    indexes: {
        characterId: EveCharacterId,   
    }
}

export function CreateObjectStore(db: IDBPDatabase<EVI_DB_SCHEMA>) {
    const store = db.createObjectStore(SCHEDULED_JOBS_OBJECTSTORE_NAME);
    store.createIndex('characterId', 'characterId', {unique: false});
    
    return store;
}


export async function GetScheduledJobs(characterId: EveCharacterId): Promise<Array<EVIScheduledJob>> {
    const db = await openEVIdb();
    
    return await db.getAllFromIndex('ScheduledJobs', 'characterId', characterId);
}

// This replace all jobs for this character with the jobs side the array
export async function OverwriteScheduledJobs(characterId: EveCharacterId, jobs: Array<EVIScheduledJob>) {
    const db = await openEVIdb();

    const jobKeys = new Set<EVIJobId>( jobs.map(j=>j.job_id) );
    let dbJobKeys = await db.getAllKeysFromIndex('ScheduledJobs', 'characterId', characterId);
    let exit = dbJobKeys.filter(key=>!jobKeys.has(key))

    

    // Delete all objects that aren't in the job list
    let tx = db.transaction('ScheduledJobs','readwrite');
    let store = tx.objectStore('ScheduledJobs');
    for(const key of exit) {
        if(dev) {
            const job = await store.get(key)
            console.assert(job.characterId === characterId);
        }
        await store.delete(key)
    }

    for(let job of jobs.map(j=>({...j, characterId}))) {
        await store.put(job, job.job_id)
    }

    await tx.done;
    console.log("Saved scheduled jobs");
}