<script lang="ts">
import { base as basePath } from "$app/paths";

    const scopes = "esi-skills.read_skills.v1 esi-wallet.read_character_wallet.v1 esi-search.search_structures.v1 esi-universe.read_structures.v1 esi-assets.read_assets.v1 esi-planets.manage_planets.v1 esi-ui.open_window.v1 esi-markets.structure_markets.v1 esi-characters.read_standings.v1 esi-characters.read_agents_research.v1 esi-industry.read_character_jobs.v1 esi-markets.read_character_orders.v1 esi-characters.read_blueprints.v1 esi-contracts.read_character_contracts.v1 esi-clones.read_implants.v1 esi-industry.read_character_mining.v1";

    let params = {
        'response_type': 'code',
        'redirect_uri': "http://localhost:3000/eve-sso",
        'client_id': import.meta.env.VITE_EVE_APP_CLIENT_ID,
        'scope': scopes,
        'state': "evi-testing"
    }
    let searchParams = new URLSearchParams(params);

    let authorizeQuery = "https://login.eveonline.com/v2/oauth/authorize/?" + searchParams.toString();

    console.log(authorizeQuery);

</script>

<a href={authorizeQuery}><img src={`${basePath}/img/eve-sso-login-white-small.png`} alt="Log in with EVE Online" /></a>