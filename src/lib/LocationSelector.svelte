<script lang="ts">
    import { EveLocation, IsLocationStation, Location_Id, StructureTaxRates } from "$lib/eve-data/EveData";
    import { getContext } from "svelte";
    import type { Readable } from "svelte/store";
    import { Activity_Id, GetCostIndex, Industry, IndustrySystems, MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID } from "./eve-data/EveIndustry";

    export let value: Location_Id = null;

    $: locations = getContext('locations') as Readable<{[index:Location_Id]: EveLocation }>;
    export let allowUnselected: boolean = false;

    $: if(!allowUnselected && value == null && Object.keys($locations).length>0) {
        value = parseInt( Object.keys($locations)[0] );
    }

    export let selectedLocation: EveLocation = null;
    $: selectedLocation = $locations[value];

    export let activity: Activity_Id = null;
    $: _activity = $Industry.activities[activity];

    const DefaultCostIndex = 0.01;
    export let activitySystemCostIndex = DefaultCostIndex;
    $: if(_activity) {
        activitySystemCostIndex = GetCostIndex($IndustrySystems, selectedLocation, activity) ?? DefaultCostIndex;
    } else {
        activitySystemCostIndex = DefaultCostIndex;
    }

    $: locationIsStructure = selectedLocation && !IsLocationStation(value)

    // Hard code structure bonuses for now

    const RAITARU_TYPE_ID = 35825;
    const AZBEL_TYPE_ID = 35826;
    const SOTIYO_TYPE_ID = 35827;
    const ATHANOR_TYPE_ID = 35835;

    export let structureRoleBonuses: {
        jobDurationModifier: number,
        materialConsumptionModifier: number,
        jobCostModifier: number
    } = null;
    $: if(locationIsStructure) {
        switch(selectedLocation.type_id) {
            case RAITARU_TYPE_ID:
                structureRoleBonuses = {
                    "jobDurationModifier": -15,
                    "materialConsumptionModifier": 0,
                    "jobCostModifier": -3
                }
                if(activity === MANUFACTURING_ACTIVITY_ID || activity === REACTION_ACTIVITY_ID) {
                    structureRoleBonuses.materialConsumptionModifier = -1;
                }
                break;
            case AZBEL_TYPE_ID:
                structureRoleBonuses = {
                    "jobDurationModifier": -20,
                    "materialConsumptionModifier": 0,
                    "jobCostModifier": -4
                }
                if(activity === MANUFACTURING_ACTIVITY_ID || activity === REACTION_ACTIVITY_ID) {
                    structureRoleBonuses.materialConsumptionModifier = -1;
                }
                break;
            case SOTIYO_TYPE_ID:
                structureRoleBonuses = {
                    "jobDurationModifier": -30,
                    "materialConsumptionModifier": 0,
                    "jobCostModifier": -5
                }
                if(activity === MANUFACTURING_ACTIVITY_ID || activity === REACTION_ACTIVITY_ID) {
                    structureRoleBonuses.materialConsumptionModifier = -1;
                }
                break;
            case ATHANOR_TYPE_ID:
                structureRoleBonuses = {
                    jobDurationModifier: 0,
                    materialConsumptionModifier: 0,
                    jobCostModifier: 0
                }
                break;
            default:
                structureRoleBonuses = null;
        }
    } else {
        structureRoleBonuses = null;
    }


    const DefaultTaxRate = 10;
    export let activityTax: number = DefaultTaxRate;
    $: if(locationIsStructure && $StructureTaxRates[value] && $StructureTaxRates[value][activity] !== undefined) {
        activityTax = $StructureTaxRates[value][activity]
    } else {
        activityTax = DefaultTaxRate;
    }

    function onChangeFacilityTax(event) {
        let update = {}
        update[value] = {}
        update[value][activity] = parseFloat(event.target.value)
        StructureTaxRates.update(update);
    }

    const StructureRigMEBonuses = [0,-2,-2.4];
    const StructureRigTEBonuses = [0,-20,-24];
    const StructureRigCostBonuses = [0,-10,-12];

    // TODO also factor in system security bonus
    // Currently we assume hisec
    export let structureRigBonuses: {
        materialReductionBonus: number,
        timeReductionBonus: number,
        costReductionBonus: number,
    } = null;
    $: if(locationIsStructure) {
        structureRigBonuses = {
            materialReductionBonus: -2,
            timeReductionBonus: 0,
            costReductionBonus: 0,
        }
    } else {
        structureRigBonuses = null;
    }


    export let collapsed = true;


    let _locations: Array<{location_id:Location_Id, name:string}> = [];
    $: _locations = Object.keys($locations).map(id=>({
        location_id: parseInt(id), 
        name: $locations[id]?.name
    })).sort((a,b)=>(a.name && b.name) ? a.name.localeCompare(b.name) : 0)
</script>


<style lang="scss">
    .overlay-parent {
        select {
            flex-shrink: 1;
            width: 100%;
        }
    }

</style>


<span class="overlay-parent">
    <select bind:value={value}>
        {#if allowUnselected}
            <option value={null}></option>
        {/if}
        {#each _locations as location}
            <option value={location.location_id}>{location.name ?? location.location_id}</option>
        {/each}
    </select>
    {#if _activity}
        <button on:click={()=>{collapsed = !collapsed}}>{collapsed?"+":"-"}</button>
    {/if}
    {#if _activity && collapsed}
    <div class="overlay">
        <dl>
            <dt>System cost index</dt> <dd>{activitySystemCostIndex*100}%</dd>
            <dt>Tax for {_activity.activityName}</dt> <dd>{activityTax}%</dd>
            {#if locationIsStructure}
            <dt class="full-width">Structure role bonuses</dt>
            <dd class="full-width">ME {structureRoleBonuses.materialConsumptionModifier}% | Cost {structureRoleBonuses.jobCostModifier}% | TE {structureRoleBonuses.jobDurationModifier}%</dd>
            <dt class="full-width">Structure rig bonuses</dt>
            <dd class="full-width">
                {#if activity === MANUFACTURING_ACTIVITY_ID || activity === REACTION_ACTIVITY_ID}
                    ME {structureRigBonuses.materialReductionBonus}%
                {/if}
                {#if activity !== MANUFACTURING_ACTIVITY_ID && activity !== REACTION_ACTIVITY_ID}
                    Cost {structureRigBonuses.costReductionBonus}%
                {/if}
                | TE {structureRigBonuses.timeReductionBonus}%
            </dd>
        {/if}
        </dl>
    </div>
    {/if}
</span>



{#if _activity && !collapsed}
<dl>
    <dt>System cost index</dt> <dd>{activitySystemCostIndex*100}%</dd>
    <dt>Tax for {_activity.activityName}</dt> <dd><input type="range" min={0} max={20} step={0.5} value={activityTax} on:input={onChangeFacilityTax} disabled={IsLocationStation(value)} /> {activityTax}</dd>
    {#if locationIsStructure}
        <dt>Structure role bonuses</dt>
        <dd>ME {structureRoleBonuses.materialConsumptionModifier}% | Cost {structureRoleBonuses.jobCostModifier}% | TE {structureRoleBonuses.jobDurationModifier}%</dd>
        {#if activity === MANUFACTURING_ACTIVITY_ID || activity === REACTION_ACTIVITY_ID}
            <dt>Structure rig material bonus</dt> <dd>
                {#each StructureRigMEBonuses as bonus }
                    <label><input type=radio bind:group={structureRigBonuses.materialReductionBonus} name="MEBonus" value={bonus}> {bonus}%</label>
                {/each}
            </dd>
        {/if}
        {#if activity !== MANUFACTURING_ACTIVITY_ID && activity !== REACTION_ACTIVITY_ID}
            <dt>Structure rig cost bonus</dt> <dd>
                {#each StructureRigCostBonuses as bonus }
                    <label><input type=radio bind:group={structureRigBonuses.costReductionBonus} name="CostBonus" value={bonus}> {bonus}%</label>
                {/each}
            </dd>
        {/if}
        <dt>Structure rig duration bonus</dt> <dd>
            {#each StructureRigTEBonuses as bonus }
                <label><input type=radio bind:group={structureRigBonuses.timeReductionBonus} name="TEBonus" value={bonus}> {bonus}%</label>
            {/each}
        </dd>
    {/if}
</dl>
{/if}