
<script lang="ts">
    import { CharacterBlueprints, EveCharacterId } from "$lib/eve-data/EveCharacter";
    import CreateESIStore, { ESIStoreStatus } from "./eve-data/ESIStore";
    import type {ESIStore} from "./eve-data/ESIStore";
    import EveTypes, { EveType, EveTypeId } from "$lib/eve-data/EveTypes";

    import { scaleLinear, scaleTime } from "d3-scale";
    import { Industry, INVENTION_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";
    import type { Activity_Id } from "$lib/eve-data/EveIndustry";
    import type { EveAsset, EveBlueprint, EveItemId, EveJobDetails, EveLocationId } from "$lib/eve-data/ESI";
    import { CreateIndustryJobStore, IndustryJobStore } from "./IndustryJob";
import NewIndustryJob from "./NewIndustryJob.svelte";
import { get, readable } from "svelte/store";
import type { JobDetails, JobDetailsStatus } from "./IndustryJobScheduler";
import IndustryJobScheduleBlock from "./IndustryJobScheduleBlock.svelte";
import type { Quantity } from "./eve-data/EveMarkets";
import { onDestroy, onMount, setContext } from "svelte";
import { GetScheduledJobs, OverwriteScheduledJobs } from "./local-data/ScheduledJobs";
import type { EVIScheduledJob } from "./local-data/ScheduledJobs";
import { max } from 'd3-array';
import { GetLocationStore } from "./eve-data/EveData";

    export let characterId: EveCharacterId

    let characterJobs: ESIStore<Array<JobDetails>>;
    let characterBlueprints: ESIStore<Array<EveBlueprint>>;
    let characterAssets: ESIStore<Array<EveAsset>>;
    let _prevCharacterId: EveCharacterId;
    $: if(characterId && _prevCharacterId !== characterId) {
        characterJobs = CreateESIStore<Array<EveJobDetails>>(`/characters/${characterId}/industry/jobs/`, null, {char:characterId, include_completed:true});
        characterAssets = CreateESIStore<Array<EveAsset>>(`/characters/${characterId}/assets/`, null, {char:characterId});
        characterBlueprints = CharacterBlueprints[characterId];

        _prevCharacterId = characterId;

        setContext('currentCharacter', readable(characterId));
    }

    export let incompleteJobs: Array<JobDetails> = [];
    $: incompleteJobs = [ 
        // ...($characterJobs?.filter(j=>j.status==='active')??[]), 
        // ...scheduledJobs.values()    // We'll exclude scheduled jobs first until we can properly handle dependencies
    ];

    let blueprints: Array<EveBlueprint>;
    $: {
        blueprints = $characterBlueprints instanceof Array ? $characterBlueprints : [];
        blueprints.sort((a,b)=>$EveTypes.get(a.type_id).name.localeCompare($EveTypes.get(b.type_id).name))
    }


    type NewJobId = number;

    let scheduledJobs = new Map<NewJobId, JobDetails>();

    function createScheduledJob(blueprint_id: EveItemId, restore?: EVIScheduledJob): JobDetails | undefined {
        let _blueprintItem = blueprints.find(b=>b.item_id===blueprint_id);

        if(_blueprintItem) {
            let activities = $Industry.types[_blueprintItem.type_id]?.activities;
            let activity = activities[restore?.activity_id] ?? activities[REACTION_ACTIVITY_ID] ?? activities[MANUFACTURING_ACTIVITY_ID]

            let industryJob = CreateIndustryJobStore(activity);
            if(restore) {
                industryJob.update({
                    blueprintModifiers: {
                        materialEfficiency: _blueprintItem.material_efficiency,
                        timeEfficiency: _blueprintItem.time_efficiency
                    },
                    runs: restore.runs,
                })
            }
            let _initIndustryJob = get(industryJob);
            
            let activity_id = activity.activity.activityID;
            let start_date = restore?.start_date || Date.now();
            let runs = _initIndustryJob.runs;

            let _id = restore?.job_id ?? Date.now();   // Maybe we should automatically generate this
            let scheduledJob = {
                job_id: _id,
                activity_id,
                blueprint_id,
                facility_id: _blueprintItem.location_id,
                blueprint_type_id: _blueprintItem.type_id,
                end_date: start_date + _initIndustryJob.jobDuration*1000,
                start_date,
                status: "scheduled" as JobDetailsStatus,
                runs,
                product_type_id: _initIndustryJob.selectedProduct,
                industryJob: industryJob,
                installer_id: characterId,
            }
            scheduledJobs.set(_id, scheduledJob)

            industryJob.subscribe(ij=>{
                let j = scheduledJobs.get(_id);
                // Assume activity and product_type remain the same
                let newEndDate = j.start_date + ij.jobDuration*1000;
                let newRuns = ij.runs;

                // Only trigger re-render on changes
                if(newEndDate!=j.end_date || newRuns!=j.runs) {
                    j.end_date = newEndDate;
                    j.runs = newRuns;
                    scheduledJobs = scheduledJobs;

                    // For now we'll just save based on this
                    save();
                }

                let materials = [];
                for(let {materialTypeID} of Object.values( ij.activity.materials )) {
                    materials.push({materialTypeId: materialTypeID, quantity: ij.materialQuantity(materialTypeID)})
                }
                jobMaterials.set(industryJob,materials);
                jobMaterials = jobMaterials;
            })

            scheduledJobs = scheduledJobs;
            return scheduledJob;
        }
        
        return undefined;
    }


    let selectedBlueprintItem: EveItemId;
    function addJob() {
        createScheduledJob(selectedBlueprintItem);

        selectedBlueprintItem = null;

        save();
    }
    function removeJob(job_id) {
        jobMaterials.delete( scheduledJobs.get(job_id).industryJob );
        jobMaterials = jobMaterials;

        scheduledJobs.delete(job_id);
        scheduledJobs = scheduledJobs;

        save();
    }

    // #region Load/save Scheduled Jobs

    const SAVE_DEBOUNCE_TIMEOUT = 500;

    // Combine multiple save requests in a short period so we don't overload the db unnecessarily
    let _saveTimeout: NodeJS.Timeout = undefined;
    let _save = ()=>{
        OverwriteScheduledJobs( characterId, [...scheduledJobs.values()].map(({
            job_id, start_date, blueprint_id, activity_id, runs, installer_id,
        })=>({
            job_id, start_date, blueprint_id, activity_id, runs, installer_id,
            location_id:null
        })) );
        _saveTimeout = undefined;
    };
    let save = ()=>{
        if(_saveTimeout) {
            clearTimeout(_saveTimeout);
        }
        _saveTimeout = setTimeout(_save, SAVE_DEBOUNCE_TIMEOUT);
    }
    onDestroy(()=>{
        if(_saveTimeout) {
            clearTimeout(_saveTimeout);
            _save();
        }
    })

    // #endregion


    
    export let groupBy = "activity_id";

    let _jobs: Array<JobDetails>;
    $: {
        _jobs = $characterJobs instanceof Array ? $characterJobs : [];
        _jobs.sort((a,b)=>a[groupBy] - b[groupBy])
    }
    
    const ACTIVITY_ID_SORT_ORDER = {
        [MANUFACTURING_ACTIVITY_ID]: 0,
        [REACTION_ACTIVITY_ID]: 1,
        9: 1,
        [INVENTION_ACTIVITY_ID]: 2,
        5: 3,   // Copying
        4: 4,   // Material efficiency
        3: 5,   // Time efficiency

        // Not used in TQ
        0: 6,
        6: 6,
        7: 6,
    }

    // Assign the jobs into rows
    let rows = new Map<number, Array<JobDetails>>();
    let flattenedRows: Array<{row: number, job: JobDetails}> = [];
    $: {
        // Group jobs in the same facility together
        let groups = new Map<number, Array<JobDetails>>();
        _jobs.forEach(job=>{
            if(!groups.has(job[groupBy])) {
                groups.set(job[groupBy], []);
            }

            groups.get(job[groupBy]).push(job);
        })

        let sortedGroups = [...groups.entries()];
        if(groupBy == 'activity_id') {
            // Impose a sort order
            sortedGroups.sort((a,b)=>ACTIVITY_ID_SORT_ORDER[a[0]] - ACTIVITY_ID_SORT_ORDER[b[0]])
        } else {
            sortedGroups.sort((a,b)=>a[0] - b[0])
       }
        let groupValues = sortedGroups.map(([g, fg])=>fg);

        rows.clear();
        rows = rows;
        for(let facilityJobs of groupValues) {
            facilityJobs.sort((a,b)=>new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
            let firstFacilityRow = rows.size;

            let lastFacilityRow = firstFacilityRow;
            rows.set(lastFacilityRow, []);
            for(let fj of facilityJobs) {
                let row = firstFacilityRow;
                while(row <= lastFacilityRow) {
                    let r = rows.get(row);
                    let lastFjInRow = r[r.length-1];
                    if(r.length == 0 || (new Date(fj.end_date) < new Date(lastFjInRow.start_date)))
                        break;
                    row++;
                }

                if(!rows.get(row)) {
                    rows.set(row, []);
                    lastFacilityRow = row;
                }

                rows.get(row).push(fj);
            }
        }

        flattenedRows = [];
        for(let [row, jobs] of rows.entries()) {
            for(let job of jobs) {
                flattenedRows.push({row, job});
            }
        }
        // Sort so the DOM elements will be the same order
        flattenedRows.sort((a,b)=>a.job.job_id - b.job.job_id);
        flattenedRows = flattenedRows;
    }
    

    let scheduledRows = new Map<number, Array<JobDetails>>();
    let flattenedScheduledRows = [];
    $: {
        scheduledRows.clear();
        for(let sj of scheduledJobs.values()) {
            let row = 0;
            while(row < 100) {
                let rowJobs = rows.get(row);
                let lastJobInRow = rowJobs && rowJobs[0];  // Row jobs is sorted end to start

                // For now we just assume that the rows are already populated with previous jobs
                // so any overflow we just handle later on
                if(lastJobInRow && lastJobInRow[groupBy] !== sj[groupBy]) {
                    if(groupBy=='activity_id' && lastJobInRow[groupBy]==9 && sj[groupBy] == REACTION_ACTIVITY_ID) {
                        // Special exception for reactions as they're still considered equivalent
                    } else {
                        row++;
                        continue;
                    }
                }

                if(scheduledRows.has(row)) {
                    let scheduledJobRow = scheduledRows.get(row);
                    lastJobInRow = scheduledJobRow[scheduledJobRow.length-1];
                }

                if(!lastJobInRow || (new Date(sj.start_date) > new Date(lastJobInRow.end_date))) {
                    // Add to row
                    if(!scheduledRows.has(row)) {
                        scheduledRows.set(row, []);
                    }

                    scheduledRows.get(row).push(sj);
                    break;
                }

                row++;
            }
        }
        scheduledRows = scheduledRows;

        flattenedScheduledRows = [];
        for(let [row, jobs] of scheduledRows.entries()) {
            for(let job of jobs) {
                flattenedScheduledRows.push({row, job});
            }
        }
        flattenedScheduledRows.sort((a,b)=>a.job.job_id - b.job.job_id);
        flattenedScheduledRows = flattenedScheduledRows;
    }

    // #region Materials Calculation

    let jobMaterials = new Map<IndustryJobStore, Array<{materialTypeId:EveTypeId, quantity:Quantity}>>();
    export let materialsList = new Map<EveTypeId, Quantity>();
    $: {
        materialsList.clear();

        for(let materials of jobMaterials.values()) {
            for(let {materialTypeId, quantity} of materials) {
                materialsList.set(materialTypeId, (materialsList.get(materialTypeId) ?? 0) + quantity);
            }
        }

        materialsList = materialsList;
    }


    // #endregion

    // #region load and save jobs from EVIDatabase
    $: if($characterBlueprints && characterBlueprints.status == ESIStoreStatus.loaded) {
        GetScheduledJobs(characterId)
            .then(jobs=>{
                // TODO filter jobs that are no longer valid
                jobs.forEach(j=>createScheduledJob(j.blueprint_id, j));

                console.log("Loaded jobs", jobs.length);
            })

        // TODO save scheduled jobs if there are changes
    }

    // #endregion


    // #region Character Assets

    $: blueprintLocations = new Set($characterBlueprints?.map(b=>b.location_id));

    // let locationNames = new Map<EveLocationId,string>();
    // $: if($characterBlueprints) {
    //     blueprintLocations.forEach(l=>GetLocationStore(l).subscribe(loc=>{locationNames.set(l,loc.name);locationNames=locationNames}))
    // }

    export let materialsInAssets = new Map<EveTypeId, Array<EveAsset>>();
    $: relevantLocationAssets = $characterAssets?.filter(a=>blueprintLocations.has(a.location_id));

    $: {
        materialsInAssets.clear();
        relevantLocationAssets
            // ?.filter(asset=>materialsList.has(asset.type_id))    // Don't filter as there may be other jobs in other characters that need this material
            ?.forEach(asset=>{
                    if(!materialsInAssets.has(asset.type_id)) {
                        materialsInAssets.set(asset.type_id, []);
                    }

                    materialsInAssets.get(asset.type_id).push(asset);
                });
        materialsInAssets = materialsInAssets;
    }

    // #endregion


    const rowHeight = 20;

    export let scale = 100;
    $: xScale = scaleTime()
        .domain([Date.now()-24*60*60*1000,Date.now()])
        .range([-scale,0]);
    $: x = value=>xScale(new Date(value));

    $: y = scaleLinear()
        .domain([0, 1])
        .range([0,rowHeight])

    const margin = 2;

    export let xOffset: number = 0;

    let blueprintSelector: HTMLSelectElement;

    $: numberOfRows = Math.max(rows.size, (max([...scheduledRows.keys()])??0) + 1, 1);
</script>

<style lang="scss">
    svg {
        background-color: #222;

        rect.now {
            fill: #666;
        }


    }
</style>

<select value={selectedBlueprintItem} on:change={event=>selectedBlueprintItem = parseInt(event.currentTarget.value)}>
    {#each blueprints as blueprint (blueprint.item_id)}
        <option value={blueprint.item_id} disabled={blueprint.runs !== -1 && blueprint.runs <= _jobs.find((j)=>j.blueprint_id===blueprint.item_id && j.status==='active')?.runs}>{$EveTypes.get(blueprint.type_id)?.name ?? blueprint.type_id} </option>
    {/each}
</select>
<button on:click={addJob}>Add</button><br/>
{#each [...scheduledJobs.values()] as job}
    <NewIndustryJob blueprint={blueprints.find(b=>b.item_id===job.blueprint_id) } job={job.industryJob} /> <button on:click={event=>removeJob(job.job_id)}>Remove</button><br/>
{/each}

<svg width="100%" height={numberOfRows*rowHeight}>
    <g class="canvas" transform={`translate(${xOffset*100})`}>
        <rect class="now" x={x(Date.now())} width={1} y={0} height={y(numberOfRows)} />
        {#each flattenedRows as {row, job} (job.job_id)}
            <IndustryJobScheduleBlock {row} {job} {x} {y} />
        {/each}
        {#each flattenedScheduledRows as {row, job} (job.job_id)}
            <IndustryJobScheduleBlock {row} {job} {x} {y} />
        {/each}
    </g>
</svg>
