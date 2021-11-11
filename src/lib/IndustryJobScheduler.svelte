<script lang="ts">
    import type { EveCharacterId } from "$lib/eve-data/EveCharacter";
    import CreateESIStore from "./eve-data/ESIStore";
    import type {ESIStore} from "./eve-data/ESIStore";
    import EveTypes from "$lib/eve-data/EveTypes";
    import { afterUpdate } from "svelte";

    import { scaleLinear, scaleTime } from "d3-scale";
    import { INVENTION_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";
    import type { Activity_Id } from "$lib/eve-data/EveIndustry";
    import type { EveBlueprint, EveJobDetails } from "$lib/eve-data/ESI";

    export let characterId: EveCharacterId



    let characterJobs: ESIStore<Array<EveJobDetails>>;
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




        
    export let groupBy = "activity_id";

    let _jobs: Array<EveJobDetails>;
    $: {
        _jobs = $characterJobs instanceof Array ? $characterJobs : [] as Array<EveJobDetails>;
        _jobs.sort((a,b)=>a[groupBy] - b[groupBy])
    }
    

    // Assign the jobs into rows
    let rows = new Map<number, Array<EveJobDetails>>();
    $: {
        // Group jobs in the same facility together
        let facilities = new Map<number, Array<EveJobDetails>>();
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

    }


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

    
    function activityToClass(activityId: Activity_Id) {
        switch(activityId) {
            case MANUFACTURING_ACTIVITY_ID:
                return "manufacturing";
            case REACTION_ACTIVITY_ID:
                return "reaction";
            case INVENTION_ACTIVITY_ID:
                return "invention";
            default:
                return "";
        }
    }

    
    let scheduleChart: SVGElement;
    export let xOffset: number = 0;

</script>

<style lang="scss">
    svg {
        background-color: #222;


        g.job {
            rect.job {
                fill: rgb(0, 84, 187);
                stroke: none;

                opacity: 70%;

                &.manufacturing {
                    fill: rgb(182, 119, 0);
                }
                &.reaction {
                    fill: rgb(0, 189, 145);
                }
                &.invention {
                    fill: rgb(48, 148, 191);
                }

                &.delivered {
                    opacity: 30%;
                }
            }

            &:hover {
                rect.job {
                    opacity: 100%;
                }
            }
        }

        
        rect.row {
            fill: transparent;

            &:hover {
                fill: rgba(1,1,1,0.1);
            }
        }
        rect.now {
            fill: #666;
        }

        text {
            fill: #fff;

            font-size: 10px;

            pointer-events: none;
        }

    }
</style>

<select>
    {#each blueprints as blueprint (blueprint.item_id)}
        <option disabled={_jobs.find(job=>job.blueprint_id===blueprint.item_id && new Date(job.end_date).getTime() > Date.now()) !== undefined}>{$EveTypes.get(blueprint.type_id)?.name ?? blueprint.type_id} </option>
    {/each}
</select>

<svg bind:this={scheduleChart} width="100%" height={Math.max(rows.size, 1)*rowHeight}>
    <g class="canvas" transform={`translate(${xOffset*100})`}>

        <rect class="now" x={x(Date.now())} width={1} y={0} height={y(rows.size)} />
        {#each [...rows.values()] as row, r}
            {#each row as job (job.job_id)}
                <g class="job" transform={`translate(${x(job.start_date)}, ${y(r)})`}>
                    <clipPath  id={`job-${job.job_id}`}>
                        <rect width={x(job.end_date)-x(job.start_date)} y={margin} height={y(r+1)-y(r) - margin*2} />
                    </clipPath>
                    <rect class={`job ${activityToClass(job.activity_id)} ${job.status}`} width={x(job.end_date)-x(job.start_date)} y={margin} height={y(r+1)-y(r) - margin*2} 
                        on:click={event=>console.log(job)}
                    />
                    <text clip-path={`url(#job-${job.job_id})`} y={13} x={4}>{$EveTypes.get(job.product_type_id)?.name} x{job.runs}</text>
                </g>
            {/each}
        {/each}
    </g>
</svg>
