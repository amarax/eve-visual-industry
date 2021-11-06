<script lang="ts">
    import { loadType, Universe } from "$lib/eve-data/EveData";
    import { ADVANCED_INDUSTRY_SKILL_ID, Decryptors, Industry, INVENTION_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID,  } from "$lib/eve-data/EveIndustry";
    
    import type { EntityCollection, Location_Id, Type_Id } from "$lib/eve-data/EveData";
    import type { IndustryType } from "$lib/eve-data/EveIndustry";

    import { IskAmount, MarketPrices } from "$lib/eve-data/EveMarkets";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";
    import { sum } from "$lib/Utilities";
    import { FormatDuration, FormatIskAmount } from "$lib/Format";
    
    import { CharacterSkills, Character_Id } from "$lib/eve-data/EveCharacter";
    import type { ESIStore } from "$lib/eve-data/ESIStore";
    import LocationSelector from "./LocationSelector.svelte";
import { getContext } from "svelte";
import type { Readable } from "svelte/store";


    let currentCharacter = getContext('currentCharacter') as Readable<Character_Id>;


    
    let characterSkills: ESIStore<CharacterSkills>;


    export let blueprintToInvent: IndustryType = null;

    let inputIndustryTypes: Array<IndustryType> = [];
    $: inputIndustryTypes = Object.values( $Industry.types ).filter(type=>type.activities[INVENTION_ACTIVITY_ID]?.products[blueprintToInvent?.type_id])

    let selectedIndustryType = inputIndustryTypes[0];
    $: {
        if(inputIndustryTypes.length >= 1 && inputIndustryTypes.indexOf(selectedIndustryType) === -1) selectedIndustryType = inputIndustryTypes[0];
    }

    $: inventionActivity = selectedIndustryType?.activities[INVENTION_ACTIVITY_ID];

    function isBlueprint(type_id: Type_Id): boolean {
        return $Universe.categories[9].groups[$Universe.types[type_id]?.group_id] != undefined;
    }

    let prices: EntityCollection<IskAmount> = {};

    export let brokerFeeRate = 0.0151114234532; // Aqua Silentium's broker fee

    $: selectedIndustryTypeIsBlueprint = isBlueprint(selectedIndustryType?.type_id);


    let selectedDecryptor: Type_Id;

    let selectedIndustryTypeCost: IskAmount = 0;
    $: { 
        if(!selectedIndustryTypeIsBlueprint) {
            selectedIndustryTypeCost = prices[selectedIndustryType.type_id];
        }
    }

    let totalAdjustedCostPrice : IskAmount;
    $: {
        totalAdjustedCostPrice = 0;
        let manufacturing = blueprintToInvent.activities[MANUFACTURING_ACTIVITY_ID];
        for(let type_id in manufacturing.materials) {
            totalAdjustedCostPrice += manufacturing.materials[type_id].quantity * ($MarketPrices[type_id]?.adjusted_price ?? 0);
        }
    }

    let activitySystemCostIndex: number, activityTax: number;
    let structureRoleBonuses, structureRigBonuses;
    $: jobCost = totalAdjustedCostPrice * activitySystemCostIndex * 0.02 * (1+(structureRoleBonuses?.jobCostModifier ?? 0)/100) * (1+(structureRigBonuses?.costReductionBonus ?? 0)/100) * (1+activityTax/100);

    let totalCost: IskAmount = 0;
    $: {
        totalCost = 0;
        if(inventionActivity) {
            totalCost += selectedIndustryTypeCost;
            totalCost += sum( Object.values(inventionActivity.materials), material=>prices[material.materialTypeID]*material.quantity );
            totalCost += prices[selectedDecryptor] ?? 0;
            totalCost += jobCost;
        }
    }

    $: jobDuration = inventionActivity.time 
        * (1 - 0.03*($characterSkills?.skills.find(skill=>skill.skill_id===ADVANCED_INDUSTRY_SKILL_ID)?.active_skill_level||0) )
        * (1+(structureRoleBonuses?.jobDurationModifier ?? 0)/100)
        * (1+(structureRigBonuses?.timeReductionBonus ?? 0)/100);


    let skill1, skill2, encryptionSkill;
    let skill1Level = 3, skill2Level =3, encryptionSkillLevel =3;
    $: {
        let characterChanged = false;
        if(characterSkills !== CharacterSkills[$currentCharacter]) {
            characterSkills = CharacterSkills[$currentCharacter];
            characterChanged = true;    // Hidden bug over here where if the contents of the skills change, this isn't triggered
        }


        function getSkillLevel(skill_id: Type_Id): number {
            return $characterSkills?.skills.find(skill=>skill.skill_id===skill_id)?.active_skill_level || 0;
        }

        // if the skills didn't change then don't update the skill level

        let skill1Found = false;
        for(let skill of Object.values(inventionActivity?.requiredSkills)) {
            let skillType = $Universe.types[skill.type_id];
            if(skillType.name.indexOf("Encryption") >=0) {
                if(characterChanged || encryptionSkill?.type_id !== skillType.type_id) {
                    encryptionSkill = skillType;
                    encryptionSkillLevel = getSkillLevel(encryptionSkill.type_id);
                }
                continue;
            }
            if(!skill1Found) {
                if(characterChanged || skill1?.type_id !== skillType.type_id) {
                    skill1 = skillType;
                    skill1Level = getSkillLevel(skill1.type_id);
                }

                skill1Found = true;
            } else {
                if(characterChanged || skill2?.type_id !== skillType.type_id) {
                    skill2 = skillType;
                    skill2Level = getSkillLevel(skill2.type_id);
                }
            }
        }
    }

    let inventionProbability: number = 0.3;
    $: inventionProbability = inventionActivity?.products[blueprintToInvent.type_id]?.probability * (1 + (skill1Level + skill2Level)/30 + encryptionSkillLevel/40) * decryptorProbabilityModifier;

    const DECRYPTOR_RUN_MODIFIER_ATTRIBUTE_ID = 1124;
    const DECRYPTOR_PROBABILITY_MODIFIER_ATTRIBUTE_ID = 1112;
    const DECRYPTOR_ME_MODIFIER_ATTRIBUTE_ID = 1113;
    const DECRYPTOR_TE_MODIFIER_ATTRIBUTE_ID = 1114;


    let decrpytorRunModifier: number;
    let decryptorProbabilityModifier: number;
    let decryptorMEModifier: number;
    let decryptorTEModifier: number;
    $: {
        if(selectedDecryptor) {
            loadType(selectedDecryptor).then(type=>{
                decrpytorRunModifier = type.dogma_attributes.find(attribute=>attribute.attribute_id==DECRYPTOR_RUN_MODIFIER_ATTRIBUTE_ID).value;
                decryptorProbabilityModifier = type.dogma_attributes.find(attribute=>attribute.attribute_id==DECRYPTOR_PROBABILITY_MODIFIER_ATTRIBUTE_ID).value;
                decryptorMEModifier = type.dogma_attributes.find(attribute=>attribute.attribute_id==DECRYPTOR_ME_MODIFIER_ATTRIBUTE_ID).value;
                decryptorTEModifier = type.dogma_attributes.find(attribute=>attribute.attribute_id==DECRYPTOR_TE_MODIFIER_ATTRIBUTE_ID).value;
            })
        } else {
            decrpytorRunModifier = 0;
            decryptorProbabilityModifier = 1;
            decryptorMEModifier = 0;
            decryptorTEModifier = 0;
        }
    }

    let baseME = 2;
    let baseTE = 4;

    export let productME: number = baseME;
    export let productTE: number = baseTE;
    $: {
        productME = baseME + decryptorMEModifier;
        productTE = baseTE + decryptorTEModifier;
    }

    export let productRuns: number = 1;
    $: {
        productRuns = inventionActivity?.products[blueprintToInvent.type_id]?.quantity + decrpytorRunModifier;
        if(isNaN(productRuns)) productRuns = 1;
    }


    $: expectedRuns = productRuns * inventionProbability;

    export let expectedCostPerRun: IskAmount = 0;
    $: {
        expectedCostPerRun = totalCost / expectedRuns;
        if(isNaN(expectedCostPerRun)) expectedCostPerRun = 0;
    }

    export let extents: Array<IskAmount> = null;
    let _extents = [0,1000000];
    $:{
        _extents = extents || [0,totalCost*1.5];
    }


    function formatChange(value:number) {
        return `${value>=0?"+":""}${Math.round(value)}`;
    }
</script>

<style lang="scss">
    select {
        width: 100%;
    }

    .overlay dl {
        grid-template-columns: 70px auto;
    }

    .graph {
        height: 28px;
    }
</style>




<label>
    {skill1?.name} 
    <input bind:value={skill1Level} type="range" min={0} max={5} />
</label>
<br />
<label>
    {skill2?.name}
    <input bind:value={skill2Level} type="range" min={0} max={5} />
</label>
<br />
<label>
    {encryptionSkill?.name}
    <input bind:value={encryptionSkillLevel} type="range" min={0} max={5} />
</label>

<p>
    <LocationSelector activity={INVENTION_ACTIVITY_ID}
        bind:activitySystemCostIndex bind:activityTax bind:structureRoleBonuses bind:structureRigBonuses /><br/>
</p>

<div class="breakdown">
    <div class="itemName">Job cost</div>
    <div class="qty"></div>
    <div class="graph">
        <MarketOrdersBar compact extents={_extents} quantity={1} totalCost={jobCost} />
    </div>

    {#each Object.keys(inventionActivity.materials).map(k=>parseInt(k)) as type_id}
        <div class="itemName" title={`${$Universe.types[type_id].name} [${type_id}]`}>{$Universe.types[type_id].name}</div>
        <div class="qty">{inventionActivity.materials[type_id]?.quantity}</div>
        <div class="graph">
            <MarketOrdersBar compact extents={_extents} quantity={inventionActivity.materials[type_id]?.quantity} 
                {type_id} 
                bind:price={prices[type_id]}
                buyOverheadRate={brokerFeeRate}
            />
        </div>
    {/each}

    <div>
        <span class="overlay-parent">
            <select bind:value={selectedDecryptor}>
                <option value={null}>No decryptor</option>
                {#each Object.values($Decryptors) as decryptorType }
                    <option value={decryptorType.type_id}>{decryptorType.name}</option>
                {/each}
            </select>
            <div class="overlay">
                <dl>
                    <dt>Runs</dt><dd>{formatChange(decrpytorRunModifier)}</dd>
                    <dt>ME</dt><dd>{formatChange(decryptorMEModifier)}</dd>
                    <dt>TE</dt><dd>{formatChange(decryptorTEModifier)}</dd>
                    <dt>Probability</dt><dd>{formatChange(100-decryptorProbabilityModifier*100)}%</dd>
                </dl>
            </div>
        </span>
    </div>
    {#if selectedDecryptor}
        <div class="qty">{1}</div>
        <div class="graph">
            <MarketOrdersBar compact extents={_extents} quantity={1} 
                type_id={selectedDecryptor} 
                bind:price={prices[selectedDecryptor]}
                buyOverheadRate={brokerFeeRate}
            />  
        </div>
    {:else}
        <div></div>
        <div class="graph"></div>
    {/if}

    <div>
        <select bind:value={selectedIndustryType}>
            {#each inputIndustryTypes as blueprint }
                <option value={blueprint}>{$Universe.types[blueprint?.type_id]?.name}</option>
            {/each}
        </select>
    </div>
    {#if selectedIndustryTypeIsBlueprint}
        <div></div>
        <div class="graph">Blueprint cost per run <input type="number" bind:value={selectedIndustryTypeCost} /></div>
    {:else}
        <div class="qty">{1}</div>
        <div class="graph">
            <MarketOrdersBar compact extents={_extents} quantity={1} 
                type_id={selectedIndustryType.type_id} 
                bind:price={prices[selectedIndustryType.type_id]}
                buyOverheadRate={brokerFeeRate}
            />  
        </div>
    {/if}
</div>

<p>
    Invention job cost: {FormatIskAmount(jobCost)}<br/>
    Invention job duration: {FormatDuration(jobDuration)}<br/>
    Invention cost per attempt: <b>{FormatIskAmount(totalCost)}</b> 
</p>

<p>
    Chance of success: {inventionProbability*100}% <br/>
    Expected invention attempts to get >=90% chance to get >=1 successes: {Math.ceil(Math.log(1-0.9)/Math.log(1-inventionProbability))} <br/>
    Expected Runs: {expectedRuns}<br/>
    Expected cost per run: <b>{FormatIskAmount(expectedCostPerRun)}</b>
</p>
