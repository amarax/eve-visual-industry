
<script lang="ts">
    import type { EveCharacterId } from "$lib/eve-data/EveCharacter";
    import CreateESIStore from "./eve-data/ESIStore";
    import type {ESIStore} from "./eve-data/ESIStore";
    import EveTypes, { EveTypeId } from "$lib/eve-data/EveTypes";

    import { scaleLinear, scaleTime } from "d3-scale";
    import { Industry, INVENTION_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";
    import type { Activity_Id } from "$lib/eve-data/EveIndustry";
    import type { EveBlueprint, EveJobDetails, EveJobDetailsStatus } from "$lib/eve-data/ESI";
    import { CreateIndustryJobStore, IndustryJobStore } from "./IndustryJob";
import NewIndustryJob from "./NewIndustryJob.svelte";
import { get } from "svelte/store";
import type { JobDetails, JobDetailsStatus } from "./IndustryJobScheduler";
import IndustryJobScheduleBlock from "./IndustryJobScheduleBlock.svelte";
import type { Quantity } from "./eve-data/EveMarkets";

    export let characterId: EveCharacterId

    type EveItemId = number;




    let characterJobs: ESIStore<Array<JobDetails>>;
    let characterBlueprints: ESIStore<Array<EveBlueprint>>;
    let _prevCharacterId: EveCharacterId;
    $: if(characterId && _prevCharacterId !== characterId) {
        characterJobs = CreateESIStore<Array<EveJobDetails>>(`/characters/${characterId}/industry/jobs/`, null, {char:characterId, include_completed:true});
        characterBlueprints = CreateESIStore<Array<EveBlueprint>>(`/characters/${characterId}/blueprints/`, null, {char:characterId});
        _prevCharacterId = characterId;
    }

    let blueprints: Array<EveBlueprint>;
    $: {
        blueprints = $characterBlueprints instanceof Array ? $characterBlueprints : [];
    }


    type NewJobId = number;

    let scheduledJobs = new Map<NewJobId, JobDetails>();

    let selectedBlueprintItem: EveItemId;
    function addJob() {
        let _selectedBlueprintItem = blueprints.find(b=>b.item_id===selectedBlueprintItem);

        if(_selectedBlueprintItem) {
            let activities = $Industry.types[_selectedBlueprintItem.type_id]?.activities;
            let activity = activities[REACTION_ACTIVITY_ID] ?? activities[MANUFACTURING_ACTIVITY_ID]

            let industryJob = CreateIndustryJobStore(activity);
            let _initIndustryJob = get(industryJob);
            
            let _id = Date.now();
            let scheduledJob = {
                job_id: _id,
                activity_id: activity.activity.activityID,
                blueprint_id: _selectedBlueprintItem.item_id,
                blueprint_location_id: _selectedBlueprintItem.location_id,
                blueprint_type_id: _selectedBlueprintItem.type_id,
                end_date: Date.now() + _initIndustryJob.jobDuration*1000,
                start_date: Date.now(),
                status: "scheduled" as JobDetailsStatus,
                runs: _initIndustryJob.runs,
                product_type_id: _initIndustryJob.selectedProduct,
                industryJob: industryJob,                
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
                }


                let materials = [];
                for(let {materialTypeID} of Object.values( ij.activity.materials )) {
                    materials.push({materialTypeId: materialTypeID, quantity: ij.materialQuantity(materialTypeID)})
                }
                jobMaterials.set(industryJob,materials);
                jobMaterials = jobMaterials;
            })

            scheduledJobs = scheduledJobs;
        }
    }
    function removeJob(job_id) {
        jobMaterials.delete( scheduledJobs.get(job_id).industryJob );
        jobMaterials = jobMaterials;

        scheduledJobs.delete(job_id);
        scheduledJobs = scheduledJobs;
    }

    
    export let groupBy = "activity_id";

    let _jobs: Array<JobDetails>;
    $: {
        _jobs = $characterJobs instanceof Array ? $characterJobs : [];
        _jobs.sort((a,b)=>a[groupBy] - b[groupBy])
    }
    

    // Assign the jobs into rows
    let rows = new Map<number, Array<JobDetails>>();
    let flattenedRows: Array<{row: number, job: JobDetails}> = [];
    $: {
        // Group jobs in the same facility together
        let facilities = new Map<number, Array<JobDetails>>();
        _jobs.forEach(job=>{
            if(!facilities.has(job[groupBy])) {
                facilities.set(job[groupBy], []);
            }

            facilities.get(job[groupBy]).push(job);
        })

        rows.clear();
        rows = rows;
        for(let facilityJobs of facilities.values()) {
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
        // For now just add the scheduled rows to any empty row
        for(let sj of scheduledJobs.values()) {
            for(let [row, rowJobs] of rows.entries()) {
                let lastJobInRow = rowJobs[0];  // Row jobs is sorted end to start
                if(scheduledRows.has(row)) {
                    let scheduledJobRow = scheduledRows.get(row);
                    lastJobInRow = scheduledJobRow[scheduledJobRow.length-1];
                }

                if(new Date(sj.start_date) > new Date(lastJobInRow.end_date)) {
                    // Add to row
                    if(!scheduledRows.has(row)) {
                        scheduledRows.set(row, []);
                    }

                    scheduledRows.get(row).push(sj);
                    break;
                }
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

</script>

<style lang="scss">
    svg {
        background-color: #222;

       
        rect.row {
            fill: transparent;

            &:hover {
                fill: rgba(1,1,1,0.1);
            }
        }
        rect.now {
            fill: #666;
        }


    }
</style>

<select bind:value={selectedBlueprintItem}>
    {#each blueprints as blueprint (blueprint.item_id)}
        <option value={blueprint.item_id}>{$EveTypes.get(blueprint.type_id)?.name ?? blueprint.type_id} </option>
    {/each}
</select>
<button on:click={addJob}>Add</button><br/>
{#each [...scheduledJobs.values()] as job}
    <NewIndustryJob blueprint={blueprints.find(b=>b.item_id===job.blueprint_id) } job={job.industryJob} /> <button on:click={event=>removeJob(job.job_id)}>Remove</button><br/>
{/each}

<svg width="100%" height={Math.max(rows.size, 1)*rowHeight}>
    <g class="canvas" transform={`translate(${xOffset*100})`}>

        <rect class="now" x={x(Date.now())} width={1} y={0} height={y(rows.size)} />
        {#each flattenedRows as {row, job} (job.job_id)}
            <IndustryJobScheduleBlock {row} {job} {x} {y} />
        {/each}
        {#each flattenedScheduledRows as {row, job} (job.job_id)}
            <IndustryJobScheduleBlock {row} {job} {x} {y} />
        {/each}
    </g>
</svg>

