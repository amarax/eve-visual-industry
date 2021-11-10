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

    let _jobs: Array<JobDetails>;
    $: {
        _jobs = $characterJobs ?? [] as Array<JobDetails>;
        _jobs?.sort((a,b)=>a.facility_id - b.facility_id)
    }
    


    const rowHeight = 20;

    $: xScale = scaleTime()
        .domain([Date.now()-7*24*60*60*1000,Date.now()])
        .range([0,500]);
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

        rect.job {
            fill: #333;
            stroke: none;

            &.manufacturing {
                fill: rgb(132, 86, 0);
            }
            &.reaction {
                fill: rgb(0, 132, 128);
            }
            &.invention {
                fill: rgb(0, 59, 132);
            }
        }

        g.job:hover {
            rect.job {
                fill: #444;
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

<svg bind:this={scheduleChart} width="100%" height={Math.max(_jobs.length, 1)*rowHeight}>
    <g class="canvas" transform={`translate(${xOffset})`}>

        <rect class="now" x={x(Date.now())} width={1} y={0} height={y(_jobs.length)} />
        {#each _jobs as job, i (job.job_id)}
            <g class="job" transform={`translate(${x(job.start_date)}, ${y(i)})`}>
                <rect class={`job ${activityToClass(job.activity_id)}`} width={x(job.end_date)-x(job.start_date)} y={margin} height={y(i+1)-y(i) - margin*2} 
                    on:click={event=>console.log(job)}
                />
                <text y={13} x={4}>{$EveTypes.get(job.product_type_id)?.name} x{job.runs}</text>
            </g>
        {/each}
    </g>
</svg>
