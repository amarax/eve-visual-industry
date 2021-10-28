<script lang="ts">
    import { Decryptors, Industry, INVENTION_ACTIVITY_ID, loadType, Type, Universe } from "./EveData";
    import type { EntityCollection, IndustryType, Type_Id } from "./EveData";
    import { getMarketType, IskAmount, MarketType } from "./EveMarkets";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";
    import { sum } from "./Utilities";
    import { FormatIskAmount } from "./Format";

    export let blueprintToInvent: IndustryType = null;
    

    let inputIndustryTypes: Array<IndustryType> = [];
    $: inputIndustryTypes = Object.values( $Industry.types ).filter(type=>type.activities[INVENTION_ACTIVITY_ID]?.products[blueprintToInvent?.type_id])

    $: inventionActivity = inputIndustryTypes[0]?.activities[INVENTION_ACTIVITY_ID];

    let selectedIndustryType = inputIndustryTypes[0];

    $: {
        if(inputIndustryTypes.length === 1) selectedIndustryType = inputIndustryTypes[0];
    }

    function isBlueprint(type_id: Type_Id): boolean {
        return $Universe.categories[9].groups[$Universe.types[type_id]?.group_id] != undefined;
    }

    let _relatedTypeStores: Array<Function> = [];   // Unsubscribe functions
    let relatedTypes: EntityCollection<MarketType> = {};
    $: {
        if(inventionActivity) {
            _relatedTypeStores.forEach(unsubscribe=>unsubscribe());

            _relatedTypeStores = [];

            Object.values(inventionActivity.materials).forEach(material=>{
                let unsubscribe = getMarketType(material.materialTypeID).subscribe(
                    value=>relatedTypes[value.type_id] = value
                );
                if(unsubscribe) _relatedTypeStores.push( unsubscribe );
            })

            if(selectedIndustryType && !isBlueprint(selectedIndustryType.type_id)) {
                let unsubscribe = getMarketType(selectedIndustryType.type_id).subscribe(
                    value=>relatedTypes[value.type_id] = value
                );
                if(unsubscribe) _relatedTypeStores.push( unsubscribe );
            }

            if(selectedDecryptor) {
                let unsubscribe = getMarketType(selectedDecryptor).subscribe(
                    value=>relatedTypes[value.type_id] = value
                );
                if(unsubscribe) _relatedTypeStores.push( unsubscribe );
            }
        }
    }



    export let brokerFeeRate = 0.0151114234532; // Aqua Silentium's broker fee


    let scienceSkills = [];
    let encryptionSkills = [];
    $: {
        if($Universe.markets && $Universe.types) {
            scienceSkills = $Universe.markets.groups[375].types.map(type_id=>$Universe.types[type_id]).sort((a,b)=>a.name.localeCompare(b.name));
            encryptionSkills = scienceSkills.filter(type=>type.name.indexOf("Encryption") >=0);
        }
    }

    let selectedDecryptor: Type_Id;

    let breakdownItems: Array<Type_Id> = [];
    $: {
        breakdownItems = [];
        if(selectedIndustryType && !isBlueprint(selectedIndustryType.type_id)) breakdownItems.push(selectedIndustryType.type_id);
        breakdownItems.push( ...Object.keys(inventionActivity.materials).map(string=>parseInt(string)) );
        if(selectedDecryptor) breakdownItems.push(selectedDecryptor);
    }


    let selectedIndustryTypeCost = 0;
    $: { 
        selectedIndustryTypeCost = 0;
        if(selectedIndustryType && !isBlueprint(selectedIndustryType.type_id)) {
            selectedIndustryTypeCost = relatedTypes[selectedIndustryType.type_id].orders.sell[0]?.price;
        }
    }

    let totalCost = 0;
    $: {
        totalCost = 0;
        totalCost += selectedIndustryTypeCost;
        totalCost += sum( Object.values(inventionActivity.materials), material=>relatedTypes[material.materialTypeID].orders.sell[0]?.price*material.quantity );
        if(selectedDecryptor) totalCost += relatedTypes[selectedDecryptor].orders.sell[0]?.price;
    }

    let inventionProbability: number = 0.3;
    let skill1Level = 3, skill2Level =3, encryptionSkillLevel =3;
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
    $: productRuns = inventionActivity.products[blueprintToInvent.type_id].quantity + decrpytorRunModifier;

    $: expectedRuns = productRuns * inventionProbability;

    export let expectedCostPerRun: IskAmount = 0;
    $: expectedCostPerRun = totalCost / expectedRuns;

    export let extents: Array<IskAmount> = null;
    let _extents = [0,1000000];
    $:{
        _extents = extents || [0,totalCost*1.1];
    }

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
    Runs +{decrpytorRunModifier} ME {decryptorMEModifier} TE {decryptorTEModifier} Probability {100-decryptorProbabilityModifier*100}%
    <br/>

    <label>
        <select>
            {#each scienceSkills as {id,name} }
                <option value={id}>{name}</option>
            {/each}
        </select>
        <input bind:value={skill1Level} type="range" min={0} max={5} />
    </label>
    <br />
    <label>
        <select>
            {#each scienceSkills as {id,name} }
                <option value={id}>{name}</option>
            {/each}
        </select>
        <input bind:value={skill2Level} type="range" min={0} max={5} />
    </label>
    <br />
    <label>
        <select>
            {#each encryptionSkills as {id,name} }
                <option value={id}>{name}</option>
            {/each}
        </select>
        <input bind:value={encryptionSkillLevel} type="range" min={0} max={5} />
    </label>

    <div class="breakdown">
        {#each breakdownItems as type_id}
            <div class="itemName" title={`${$Universe.types[type_id].name} [${type_id}]`}>{$Universe.types[type_id].name}</div>
            <div class="qty">{inventionActivity.materials[type_id]?.quantity || 1}</div>
            <div>
                <MarketOrdersBar height={20} extents={_extents} quantity={inventionActivity.materials[type_id]?.quantity || 1} 
                    highestBuyOrder={relatedTypes[type_id].orders.buy[0]} lowestSellOrder={relatedTypes[type_id].orders.sell[0]} 
                    buyOverheadRate={-brokerFeeRate}
                />
                <br/>
            </div>
        {/each}
    </div>

    Total Invention Cost {FormatIskAmount(totalCost)} Chance of success {inventionProbability*100}% <br/>
    Expected Runs {expectedRuns}  Expected cost per run {FormatIskAmount(expectedCostPerRun)}
    
</div>