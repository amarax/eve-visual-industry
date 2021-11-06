<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";

    import CharacterSelector from "$lib/CharacterSelector.svelte";
    import { GetLocationStore, Location_Id, Universe } from "$lib/eve-data/EveData";
    import { Industry } from "$lib/eve-data/EveIndustry";
    import ManufacturingActivity from "$lib/ManufacturingActivity.svelte";
    import TypeSelector from "$lib/TypeSelector.svelte";

    import { MANUFACTURING_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";

    import type { Type_Id, Type } from "$lib/eve-data/EveData";
    import LocationSelector from "$lib/LocationSelector.svelte";

    import { getContext, onDestroy, onMount, setContext } from "svelte";
    import { CharacterBlueprints, Character_Id } from "$lib/eve-data/EveCharacter";
    import { Unsubscriber, writable } from "svelte/store";

    

    $: selectedTypeId = parseInt( $page.params['type'] ) || null;


    // Only pick types that can be manufactured
    let selectableTypes: Array<Type> = null;

    $: if($Industry.types && $Universe.types) {
        function getManufacturedProducts(blueprint_id:Type_Id|string): Array<Type_Id> {
            return Object.keys( $Industry.types[blueprint_id].activities[MANUFACTURING_ACTIVITY_ID]?.products ?? {} ).map(id=>parseInt(id));
        }

        let selectableTypeIDs = [];

        Object.values($Industry.types).forEach(t=>{
            selectableTypeIDs = [...selectableTypeIDs, ...getManufacturedProducts(t.type_id)]
        })

        selectableTypes = selectableTypeIDs.filter(id=>$Universe.types[id]!==undefined).map(id=>$Universe.types[id]);
    }

    $: blueprints = CharacterBlueprints[ $currentCharacter ];

    const TradeHubs = [
        60003760,   // Jita IV - Moon 4 - Caldari Navy Assembly Plant
        1028858195912,   // Perimeter Tranquility Trading Tower
        // Currently only Jita/Perimeter is supported because market region is hard-coded to The Forge
        
        // 60008494,   // Amarr VIII (Oris) - Emperor Family Academy
        // 60004588,   // Rens VI - Moon 8 - Brutor Tribe Treasury
        // 60011866,   // Dodixie IX - Moon 20 - Federation Navy Assembly Plant
        // 60005686,   // Hek VIII - Moon 12 - Boundless Creation Factory
    ]

    // Set the locations context for all location selectors below
    let _unsubscribes: Array<Unsubscriber>=[];
    let locations = writable({});
    $: if(mounted) {    // Ensure that subscribes run only if the component is mounted
        _unsubscribes.forEach(u=>u());
        _unsubscribes = [];

        let _locations = {};
        locations.set(_locations);

        $blueprints?.forEach(b=>{ 
            _locations[b.location_id] = null;
        });

        TradeHubs.forEach(location_id=>_locations[location_id] = null)

        let ids = Object.keys(_locations);
        ids.forEach(location_id=>{
            let unsubscribe = GetLocationStore(parseInt(location_id)).subscribe(value=>{
                _locations[location_id] = value;
                locations.set(_locations);
            });

            if(typeof unsubscribe == 'function') _unsubscribes.push(unsubscribe);

        })
    }

    let mounted = false;
    onMount(()=>{mounted = true})

    onDestroy(()=>{_unsubscribes.forEach(u=>u&&u())})

    setContext('locations', locations);

    let marketFilterLocation = writable<Location_Id>(null);
    setContext('marketFilterLocation', marketFilterLocation);

    let currentCharacter = writable<Character_Id>(null);
    setContext('currentCharacter', currentCharacter);
</script>


<svelte:head>
	<title>{($Universe?.types && $Universe?.types[selectedTypeId]) ? `${$Universe?.types[selectedTypeId]?.name} - ` : "" }EVE Online Visual Industry Calculator</title>
</svelte:head>


<CharacterSelector bind:value={$currentCharacter} /><br/>
Filter market <LocationSelector allowUnselected bind:value={$marketFilterLocation} />


<TypeSelector {selectedTypeId} on:change={event=>{goto(`${event.detail}`, {keepfocus:true})}} {selectableTypes} />

<p/><ManufacturingActivity selectedProductId={selectedTypeId} />
    