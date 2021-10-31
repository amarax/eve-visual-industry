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


export default function CreateESIStore( route:string ): ESIStore<any> {
    let store = {
        status: ESIStoreStatus.loading,
        subscribe: null,
    }

    function start(set: Subscriber<any>) {
        if(store.status === ESIStoreStatus.loaded) return;

        LoadFromESI(route)
            .then((value)=>{
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

export function CreateESIStoreFromCache( route:string, onLoaded?:(value)=>void ): ESIStore<any> {
    let store = {
        status: ESIStoreStatus.loading,
        subscribe: null,
    }

    function start(set: Subscriber<any>) {
        if(store.status === ESIStoreStatus.loaded) return;

        fetch(`/esi-cache${route}index.json`)
            .then(response=>{
                if(response.ok)
                    return response.json();
                else
                    return Promise.reject("Fetch failed");
            })
            .then((value)=>{
                onLoaded && onLoaded(value);
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