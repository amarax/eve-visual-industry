<script lang="ts">
    import { browser } from "$app/env";

    import { base as basePath } from "$app/paths";
    import { session } from "$app/stores";
    import { Characters, GetCharacterInfo } from "$lib/eve-data/EveCharacter";
    import type { Character, Character_Id } from "$lib/eve-data/EveCharacter";

    const scopes = "esi-skills.read_skills.v1 esi-wallet.read_character_wallet.v1 esi-search.search_structures.v1 esi-universe.read_structures.v1 esi-assets.read_assets.v1 esi-planets.manage_planets.v1 esi-ui.open_window.v1 esi-markets.structure_markets.v1 esi-characters.read_standings.v1 esi-characters.read_agents_research.v1 esi-industry.read_character_jobs.v1 esi-markets.read_character_orders.v1 esi-characters.read_blueprints.v1 esi-contracts.read_character_contracts.v1 esi-clones.read_implants.v1 esi-industry.read_character_mining.v1";

    let params = {
        'response_type': 'code',
        'redirect_uri': import.meta.env.VITE_EVE_APP_REDIRECT,
        'client_id': import.meta.env.VITE_EVE_APP_CLIENT_ID,
        'scope': scopes,
        'state': "evi-testing"
    }
    let searchParams = new URLSearchParams(params);

    let authorizeQuery = "https://login.eveonline.com/v2/oauth/authorize/?" + searchParams.toString();

    let characterIds = ($session.authenticatedESICharacters || []) as Array<Character_Id>;
    let characters: {[index:Character_Id]: Character} = {}
    $: {
        for(const id of characterIds) {
            GetCharacterInfo(id).subscribe(value=>{
                characters[id] = value;
            })
        }
    }
</script>


{#if characterIds.length > 0}
    {#each characterIds as characterId}
        {characters[characterId]?.name || characterId}&nbsp;
    {/each}
    <a href={authorizeQuery}>Add another character</a> | <a href="/eve-sso/signout">Sign out</a>
{:else}
    <a href={authorizeQuery}><img src={`${basePath}/img/eve-sso-login-white-small.png`} alt="Log in with EVE Online" /></a>
{/if}