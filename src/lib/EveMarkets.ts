import { get, readable, writable } from "svelte/store"
import { LoadFromESI } from "$lib/EveData";

import type { Readable, Writable } from "svelte/store";
import type { EntityCollection, Type_Id } from "$lib/EveData";




type DurationDays = number;
export type DurationSeconds = number;

type Region_Id = number;
type Location_Id = number;
type System_Id = number;

export type Quantity = number;

export type IskAmount = number;

export type Timestamp = number;

export type MarketOrder = {
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

export class MarketType {
    orders: {
        buy: Array<MarketOrder>,
        sell: Array<MarketOrder>,

        lastUpdated: Timestamp,
    };

    type_id: Type_Id;

    constructor(type_id: Type_Id) {
        this.orders = {
            buy: [],
            sell: [],
            lastUpdated: null,
        }

        this.type_id = type_id;
    }
}

export type MarketTypeStore = Writable<MarketType>

type MarketRegion = {
    types: EntityCollection<MarketTypeStore>
}


type Markets = {
    regions: EntityCollection<MarketRegion>,
    prices: Readable<EntityCollection<MarketPrices>>
}


export const Markets: Markets = {
    regions:{
        10000002: {types:{}},
    }, 
    prices: readable({}, (set)=>{
        LoadFromESI( `/markets/prices/?datasource=tranquility` )
            .then((prices: Array<MarketPrices>)=>{
                let types = {}

                prices.forEach(typePrice=>{
                    types[typePrice.type_id] = typePrice;
                })
                
                set(types);
        
                        
            })
            .catch(reason=>console.error(reason))

        return ()=>{}

    })

}


export const MarketPrices = Markets.prices;


type MarketPrices = {
    adjusted_price: IskAmount,
    average_price: IskAmount,
    type_id: Type_Id
}


async function loadOrders(type: Type_Id, region: Region_Id = 10000002, store: MarketTypeStore) {
    let marketType = get(store);

    if(marketType.orders.lastUpdated === null || marketType.orders.lastUpdated <= new Date().getTime() - 5*60*1000 /*5 minutes*/ )
    try {

        let orders: Array<MarketOrder> = await LoadFromESI( `/markets/${region}/orders/?order_type=all&type_id=${type}` );
        marketType = get(store);
        marketType.orders.buy = orders.filter(order=>order.is_buy_order).sort((a,b)=>b.price-a.price);  // Descending order
        marketType.orders.sell = orders.filter(order=>!order.is_buy_order).sort((a,b)=>a.price-b.price);    // Ascending order
        marketType.orders.lastUpdated = new Date().getTime();

        store.set(marketType);

    } catch(error) {
        console.log(error);
    }
}

export function getMarketType(type: Type_Id, region: Region_Id = 10000002) {
    if(Markets.regions[region].types[type] === undefined) {
        Markets.regions[region].types[type] = writable(new MarketType(type), (set)=>{
        });
    }

    loadOrders(type, region, Markets.regions[region].types[type]);

    return Markets.regions[region].types[type];
}