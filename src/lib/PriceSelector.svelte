<script lang="ts">
import { getMarketType } from "./EveMarkets";
import MarketOrdersBar from "./MarketOrdersBar.svelte";


    export let type_id;

    $: marketType = getMarketType(type_id);

    export let price;
    $: {
        if(!price) {
            price = $marketType.orders.sell[0]?.price;
        }
    }
</script>


<MarketOrdersBar />