<script lang="ts">
    import CharacterSelector from '$lib/components/CharacterSelector.svelte';
    import { CharacterBlueprints, EveCharacterId } from '$lib/eve-data/EveCharacter';
    import { EveLocation, GetLocationStore } from '$lib/eve-data/EveData';
    import LocationSelector from '$lib/components/LocationSelector.svelte';
    import { onMount, setContext } from 'svelte';
    import { readable, writable } from 'svelte/store';

    import type { Location_Id } from '$lib/eve-data/EveData';
    
    import EveTypes from '$lib/eve-data/EveTypes';
    import EveMarketGroups from '$lib/eve-data/EveMarketGroups';
    import Login from '$lib/Login.svelte';

    import '../app.scss';
import { session } from '$app/stores';
import type { EveLocationId } from '$lib/eve-data/ESI';
import type { EveLocationsContext } from 'src/contexts';


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
    let _locations = new Map<EveLocationId,EveLocation>();
    let locations = writable<EveLocationsContext>(_locations);
    $: if(mounted) {    // Ensure that subscribes run only if the component is mounted
        _locations.clear();
        locations.set(_locations);

        $blueprints?.forEach(b=>{ 
            _locations.set(b.location_id, null);
        });

        TradeHubs.forEach(location_id=>_locations.set(location_id, null))

        for(let locationId of _locations.keys()) {
            GetLocationStore(locationId).subscribe(value=>{
                _locations.set(locationId, value);
                locations.set(_locations);
            });
        }

    }
    setContext('EveLocations', locations);

	let mounted = false;
    onMount(()=>{mounted = true})


    let marketFilterLocation = writable<Location_Id>(null);
    setContext('marketFilterLocation', marketFilterLocation);

    let currentCharacter = writable<EveCharacterId>(null);
    setContext('currentCharacter', currentCharacter);

    const availableEveCharacters = writable<Array<EveCharacterId>>([]);
    setContext('availableEveCharacters', availableEveCharacters);
    $: $availableEveCharacters = $session.authenticatedESICharacters ?? [];
</script>

<p>
    <Login />
</p>


{#if loaded}
    <CharacterSelector bind:value={$currentCharacter} /><br/>
    Filter market <LocationSelector allowUnselected bind:value={$marketFilterLocation} />

    <main>
        <slot />
    </main>
{:else}
    Loading key data...
{/if}