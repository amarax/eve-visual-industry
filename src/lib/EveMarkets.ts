import { get, writable } from "svelte/store"
import { loadFromESI } from "$lib/EveData";

import type { Writable } from "svelte/store";
import type { EntityCollection, Type_Id } from "$lib/EveData";




type DurationDays = number;

type Region_Id = number;
type Location_Id = number;
type System_Id = number;

type Quantity = number;

type IskAmount = number;

type Timestamp = number;

type MarketOrder = {
    duration: DurationDays,
    is_buy_order: boolean,
    issued: Timestamp,
    location_id: Location_Id,
    min_volume: Quantity,
    order_id: number,
    price: IskAmount,
    range: string,
    system_id: System_Id,
    type_id: Type_Id,
    volume_remain: Quantity,
    volume_total: Quantity
}

export type MarketType = {
    orders: {
        buy: Array<MarketOrder>,
        sell: Array<MarketOrder>,
    },

    lastUpdated: Timestamp,
}

export type MarketTypeStore = Writable<MarketType>

type MarketRegion = {
    types: EntityCollection<MarketTypeStore>
}


type Markets = {
    regions: EntityCollection<MarketRegion>
}


export const Markets: Markets = {regions:{
    10000002: {types:{}}
}}

async function loadOrders(type: Type_Id, region: Region_Id = 10000002, store: MarketTypeStore) {
    let marketType = get(store);

    if(marketType.lastUpdated === null || marketType.lastUpdated <= new Date().getTime() - 5*60*1000 /*5 minutes*/ )
    try {

        let buyOrders: Array<MarketOrder> = await loadFromESI( `/markets/${region}/orders/?datasource=tranquility&order_type=buy&page=1&type_id=${type}` );
        buyOrders.sort((a,b)=>b.price-a.price);  // Descending order
        marketType.orders.buy = buyOrders;

        store.set(marketType);

        let sellOrders: Array<MarketOrder> = await loadFromESI( `/markets/${region}/orders/?datasource=tranquility&order_type=sell&page=1&type_id=${type}` );
        sellOrders.sort((a,b)=>a.price-b.price);    // Ascending order
        marketType.orders.sell = sellOrders;

        store.set(marketType);

        marketType.lastUpdated = new Date().getTime();
    } catch(error) {
    }
}

export function getMarketType(type: Type_Id, region: Region_Id = 10000002) {

    if(Markets.regions[region].types[type] === undefined) {
        Markets.regions[region].types[type] = writable({ 
            orders:{
                buy: [],
                sell: []
            },
            lastUpdated: null,
        });
    }

    loadOrders(type, region, Markets.regions[region].types[type]);

    return Markets.regions[region].types[type];
}