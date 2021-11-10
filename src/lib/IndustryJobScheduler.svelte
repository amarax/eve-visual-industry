<script lang="ts">
    import type { EveCharacterId } from "$lib/eve-data/EveCharacter";
    import CreateESIStore from "./eve-data/ESIStore";
    import type {ESIStore} from "./eve-data/ESIStore";
    import EveTypes from "$lib/eve-data/EveTypes";
    import { afterUpdate } from "svelte";

    import { scaleLinear, scaleTime } from "d3-scale";
import { Activity_Id, INVENTION_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID } from "./eve-data/EveIndustry";

    export let characterId: EveCharacterId

    type JobDetails = {
        activity_id,
        blueprint_id,
        blueprint_location_id,
        blueprint_type_id,
        cost,
        duration,
        end_date,
        facility_id,
        installer_id,
        job_id,
        licensed_runs,
        output_location_id,
        probability,
        product_type_id,
        runs,
        start_date,
        station_id,
        status,
    }

    let characterJobs: ESIStore<Array<JobDetails>>;
    $: if(characterId) characterJobs = CreateESIStore<Array<JobDetails>>(`/characters/${characterId}/industry/jobs/`, null, {char:characterId, include_completed:true})

    export let groupBy = "activity_id";

    let _jobs: Array<JobDetails>;
    $: {
        _jobs = $characterJobs instanceof Array ? $characterJobs : [] as Array<JobDetails>;
        _jobs.sort((a,b)=>a[groupBy] - b[groupBy])
    }
    

    // Assign the jobs into rows
    let rows = new Map<number, Array<JobDetails>>();
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
    afterUpdate(()=>{
        // scheduleChart?.setAttribute('viewBox',`${xOffset} 0 ${scheduleChart.clientWidth} ${scheduleChart.clientHeight}`)
    })
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

<svg bind:this={scheduleChart} width="100%" height={Math.max(rows.size, 1)*rowHeight}>
    <g class="canvas" transform={`translate(${xOffset*100})`}>

        <rect class="now" x={x(Date.now())} width={1} y={0} height={y(rows.size)} />
        {#each [...rows.values()] as row, r}
            {#each row as job (job.job_id)}
                <g class="job" transform={`translate(${x(job.start_date)}, ${y(r)})`}>
                    <rect class={`job ${activityToClass(job.activity_id)} ${job.status}`} width={x(job.end_date)-x(job.start_date)} y={margin} height={y(r+1)-y(r) - margin*2} 
                        on:click={event=>console.log(job)}
                    />
                    <text y={13} x={4}>{$EveTypes.get(job.product_type_id)?.name} x{job.runs}</text>
                </g>
            {/each}
        {/each}
    </g>
</svg>
