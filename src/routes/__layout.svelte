<script lang="ts">
    import CharacterSelector from '$lib/components/CharacterSelector.svelte';
    import { CharacterBlueprints, Character_Id } from '$lib/eve-data/EveCharacter';
    import { GetLocationStore } from '$lib/eve-data/EveData';
    import LocationSelector from '$lib/components/LocationSelector.svelte';
    import { onMount, setContext } from 'svelte';
    import { writable } from 'svelte/store';

    import type { Location_Id } from '$lib/eve-data/EveData';
    
    import EveTypes from '$lib/eve-data/EveTypes';
    import EveMarketGroups from '$lib/eve-data/EveMarketGroups';

    import '../app.scss';


    $: loaded = $EveTypes.size > 0 && $EveMarketGroups.size > 0;
    

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
    let locations = writable({});
    $: if(mounted) {    // Ensure that subscribes run only if the component is mounted
        let _locations = {};
        locations.set(_locations);

        $blueprints?.forEach(b=>{ 
            _locations[b.location_id] = null;
        });

        TradeHubs.forEach(location_id=>_locations[location_id] = null)

        let ids = Object.keys(_locations);
        ids.forEach(location_id=>{
            GetLocationStore(parseInt(location_id)).subscribe(value=>{
                _locations[location_id] = value;
                locations.set(_locations);
            });
        })
    }

	let mounted = false;
    onMount(()=>{mounted = true})

    setContext('locations', locations);

    let marketFilterLocation = writable<Location_Id>(null);
    setContext('marketFilterLocation', marketFilterLocation);

    let currentCharacter = writable<Character_Id>(null);
    setContext('currentCharacter', currentCharacter);
</script>

{#if loaded}
    <CharacterSelector bind:value={$currentCharacter} /><br/>
    Filter market <LocationSelector allowUnselected bind:value={$marketFilterLocation} />

    <main>
        <slot />
    </main>
{:else}
    Loading key data...
{/if}