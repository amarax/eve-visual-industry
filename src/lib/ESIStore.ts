import { writable } from "svelte/store";
import type { Readable } from "svelte/store";
import { LoadFromESI } from "./EveData";
import type { Subscriber } from "svelte/store";


export enum ESIStoreStatus {
    loading,
    loaded,
    error
}

export interface ESIStore<T> extends Readable<T> {
    status: ESIStoreStatus;
} 


export default function CreateESIStore<Data>( route:string, onLoad?:(value)=>void ): ESIStore<Data> {
    let store = {
        status: ESIStoreStatus.loading,
        subscribe: null,
    }

    function start(set: Subscriber<Data>) {
        if(store.status === ESIStoreStatus.loaded) return;

        LoadFromESI(route)
            .then((value)=>{
                if(onLoad) value = onLoad(value);
                store.status=ESIStoreStatus.loaded;
                set(value);
            })
            .catch((reason)=>{
                store.status=ESIStoreStatus.error;
                set(null);
                console.error(reason);
            });
    }

    // Internally the store is a writable so we can trigger a refresh (not implemented yet) if necessary
    const { subscribe } = writable(null, start);

    store.subscribe = subscribe;

    return store;
}

export function CreateESIStoreFromCache<Data>( route:string, onLoad?:(value)=>void ): ESIStore<Data> {
    let store = {
        status: ESIStoreStatus.loading,
        subscribe: null,
    }

    function start(set: Subscriber<Data>) {
        if(store.status === ESIStoreStatus.loaded) return;

        fetch(`/esi-cache${route}index.json`)
            .then(response=>{
                if(response.ok)
                    return response.json();
                else
                    return Promise.reject("Fetch failed");
            })
            .then((value)=>{
                if(onLoad) value = onLoad(value);
                store.status=ESIStoreStatus.loaded;
                set(value);
            })
            .catch((reason)=>{
                store.status=ESIStoreStatus.error;
                set(null);
                console.error(reason);
            });
    }

    // Internally the store is a writable so we can trigger a refresh (not implemented yet) if necessary
    const { subscribe } = writable(null, start);

    store.subscribe = subscribe;

    return store;
}