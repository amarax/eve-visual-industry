<script lang="ts">
    import { GetLocationStore, loadType, Universe } from "./EveData";
    import { ADVANCED_INDUSTRY_SKILL_ID, Decryptors, Industry, IndustrySystems, INVENTION_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID,  } from "./EveIndustry";
    
    import type { EntityCollection, EveLocation, Location_Id, Type_Id } from "./EveData";
    import type { IndustryType } from "./EveIndustry";

    import { getMarketType, IskAmount, MarketPrices, MarketType } from "./EveMarkets";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";
    import { sum } from "./Utilities";
    import { FormatDuration, FormatIskAmount } from "./Format";
    
    import { Characters, CharacterSkills } from "./EveCharacter";
    import type { ESIStore } from "./ESIStore";
    import LocationSelector from "./LocationSelector.svelte";


    export let selectedCharacterId = null;

    
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

    $: {
        if(inventionActivity) {
            // materials (datacores)

            // blueprint

            // decryptor
        } else {
            prices = {}
        }
    }



    export let brokerFeeRate = 0.0151114234532; // Aqua Silentium's broker fee

    $: selectedIndustryTypeIsBlueprint = isBlueprint(selectedIndustryType?.type_id);


    let selectedDecryptor: Type_Id;

    let breakdownItems: Array<Type_Id> = [];
    $: {
        breakdownItems = [];
        if(inventionActivity) {
            if(!selectedIndustryTypeIsBlueprint) breakdownItems.push(selectedIndustryType.type_id);
            breakdownItems.push( ...Object.keys(inventionActivity.materials).map(string=>parseInt(string)) );
            if(selectedDecryptor) breakdownItems.push(selectedDecryptor);
        }
    }


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

    let selectedLocationId: Location_Id = null;
    let selectedLocation: ESIStore<EveLocation> = null;

    let systemCostIndex = 0.01;
    let jobCostModifier = 0;
    let facilityTax = 0;
    $: {
        if(selectedLocationId) selectedLocation = GetLocationStore(selectedLocationId);
        if($selectedLocation) {
            systemCostIndex = $IndustrySystems.find(system=>system.solar_system_id === ($selectedLocation.solar_system_id ?? $selectedLocation.system_id)).cost_indices.find(value=>value.activity=="invention").cost_index;
            jobCostModifier = $selectedLocation.modifiers?.jobCostModifier ?? 0;
            facilityTax = $selectedLocation.modifiers?.facilityTax ?? 0;
            jobDurationModifier = $selectedLocation.modifiers?.jobDurationModifier ?? 0;
        } else {
            systemCostIndex = 0.01;
            jobCostModifier = 0;
            facilityTax = 0;
            jobDurationModifier = 0;
        }
    }
    
    $: jobCost = totalAdjustedCostPrice * systemCostIndex * 0.02 * (1+jobCostModifier/100) * (1+facilityTax/100);

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

    let jobDurationModifier = 0;
    $: jobDuration = inventionActivity.time * (1+jobDurationModifier/100) * (1 - 0.03*($characterSkills?.skills.find(skill=>skill.skill_id===ADVANCED_INDUSTRY_SKILL_ID)?.active_skill_level||0) )


    let skill1, skill2, encryptionSkill;
    let skill1Level = 3, skill2Level =3, encryptionSkillLevel =3;
    $: {
        let characterChanged = false;
        if(characterSkills !== CharacterSkills[selectedCharacterId]) {
            characterSkills = CharacterSkills[selectedCharacterId];
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
        _extents = extents || [0,totalCost*1.1];
    }


    export let marketFilterLocation: Location_Id = null;
</script>

<style lang="scss">
    div.breakdown {
        display: grid;
        grid-template-columns: 1fr 80px 500px;

        max-width: 800px;

        .itemName {
            overflow-x: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

        }

        .qty {
            text-align: right;
            margin-right: 10px;
        }


        margin-top: 16px;
        margin-bottom: 16px;
    }
</style>

<div>
    <select bind:value={selectedIndustryType}>
        {#each inputIndustryTypes as blueprint }
            <option value={blueprint}>{$Universe.types[blueprint?.type_id]?.name}</option>
        {/each}
    </select>

    <select bind:value={selectedDecryptor}>
        <option value={null}>No decryptor</option>
        {#each Object.values($Decryptors) as decryptorType }
            <option value={decryptorType.type_id}>{decryptorType.name}</option>
        {/each}
    </select>
    Runs +{decrpytorRunModifier} ME {decryptorMEModifier} TE {decryptorTEModifier} Probability {decryptorProbabilityModifier*100-100}%
    <br/>

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
        <LocationSelector bind:value={selectedLocationId} /><br/>
        System cost index {systemCostIndex}
    </p>
    
    <div class="breakdown">
        <div class="itemName">Job cost</div>
        <div class="qty"></div>
        <div>
            <MarketOrdersBar compact extents={_extents} quantity={1} totalCost={jobCost} />
        </div>

        {#each breakdownItems as type_id}
            <div class="itemName" title={`${$Universe.types[type_id].name} [${type_id}]`}>{$Universe.types[type_id].name}</div>
            <div class="qty">{inventionActivity.materials[type_id]?.quantity || 1}</div>
            <div>
                <MarketOrdersBar compact extents={_extents} quantity={inventionActivity.materials[type_id]?.quantity || 1} 
                    {type_id} {marketFilterLocation} 
                    bind:price={prices[type_id]}
                    buyOverheadRate={brokerFeeRate}
                />
            </div>
        {/each}
        {#if !selectedDecryptor}
            <div class="itemName">No decryptor</div>
            <div style={`height:${24}px`}></div><div></div>
        {/if}
        {#if selectedIndustryTypeIsBlueprint}
            <div class="itemName">Blueprint copy cost per run</div>
            <div></div>
            <div><input type="number" bind:value={selectedIndustryTypeCost} /></div>            
        {/if}
    </div>
    

    Invention job cost: {FormatIskAmount(jobCost)}<br/>
    Invention job duration: {FormatDuration(jobDuration)}

    <p>
        Invention Cost per run: <b>{FormatIskAmount(totalCost)}</b> Chance of success: <b>{inventionProbability*100}%</b> <br/>
        Expected invention attempts to get >=90% chance to get >=1 successes: {Math.ceil(Math.log(1-0.9)/Math.log(1-inventionProbability))} <br/>
        Expected Runs: {expectedRuns}  Expected cost per run: {FormatIskAmount(expectedCostPerRun)}
    </p>
</div>