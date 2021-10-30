import { Readable, writable } from "svelte/store";
import { LoadFromESI } from "./EveData";



export default function ESIStore( route:string ): Readable<any> {
    let store = {
        status: 'loading',
        subscribe: null,
    }

    function load(set) {
        LoadFromESI(route)
            .then((value)=>{
                store.status='loaded';
                set(value);
            })
            .catch((reason)=>{
                store.status='error';
                set(null);
                console.error(reason);
            });
    }

    // Internally the store is a writable so we can trigger a refresh (not implemented yet) if necessary
    const { subscribe } = writable(null, load);

    store.subscribe = subscribe;

    return store;
}