<script lang="ts">
import { Activity_Id, INVENTION_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID } from "./eve-data/EveIndustry";
import EveTypes from "./eve-data/EveTypes";
import type { JobDetails } from "./IndustryJobScheduler";


    export let r: number;
    export let job: JobDetails

    export let x: (datetime: number|string)=>number;
    export let y: (row: number)=>number;

    let margin = 2;

    function activityToClass(activityId: Activity_Id) {
        switch(activityId) {
            case MANUFACTURING_ACTIVITY_ID:
                return "manufacturing";
            case REACTION_ACTIVITY_ID: // Keep this so that the rest of the SDE stuff works (when we schedule new jobs)
                return "reaction";
            case 9: // Somehow on TQ the reaction activity id is different from the SDE
                return "reaction";
            case INVENTION_ACTIVITY_ID:
                return "invention";
            default:
                return "";
        }
    }
</script>

<style lang="scss">
    g {
        --manufacturing-color: rgb(182, 119, 0);
        --reaction-color: rgb(0, 189, 145);
        --invention-color: rgb(48, 148, 191);
        --blueprint-color: rgb(0, 84, 187);


        rect.job {
            fill: var(--blueprint-color);
            stroke: rgb(0, 115, 255);
            stroke-width: 0;

            opacity: 70%;

            &.manufacturing {
                fill: var(--manufacturing-color);
                stroke: rgb(255, 166, 0);
            }
            &.reaction {
                fill: var(--reaction-color);
                stroke: rgb(0, 255, 195);
            }
            &.invention {
                fill: var(--invention-color);
                stroke: rgb(104, 210, 255);
            }

            &.scheduled {
                opacity: 50%;
                stroke-width: 1px;
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

    text {
            fill: #fff;

            font-size: 10px;

            pointer-events: none;
    }
</style>

<g transform={`translate(${x(job.start_date)}, ${y(r)})`}>
    <clipPath id={`job-${job.job_id}`}>
        <rect width={x(job.end_date)-x(job.start_date)} y={margin} height={y(r+1)-y(r) - margin*2} />
    </clipPath>
    <rect class={`job ${activityToClass(job.activity_id)} ${job.status}`} width={x(job.end_date)-x(job.start_date)} y={margin} height={y(r+1)-y(r) - margin*2} 
        on:click={event=>console.log(job)}
    />
    <text clip-path={`url(#job-${job.job_id})`} y={13} x={4}>{$EveTypes.get(job.product_type_id)?.name} x{job.runs}</text>
</g>