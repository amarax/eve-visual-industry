import { readable } from "svelte/store";
import type { Readable } from "svelte/store";
import { LoadFromSDE } from "./EveData";
import type { EntityCollection, Type_Id } from "./EveData";

type DogmaAttributes = {
    attributeID: number,
    attributeName: string,
    description,
    iconID,
    defaultValue,
    published,
    displayName,
    unitID,
    stackable,
    highIsGood,
    categoryID
}

type DogmaTypeAttributes = {
    type_id: Type_Id,
    attribute_id: number,
    value: number
}


let _industryDogmaAttributes = {attributes:{}, types:{}};
let industryDogmaAttributesLoaded = false;
export const IndustryDogmaAttributes: Readable<{
    attributes: EntityCollection<DogmaAttributes>,
    types: EntityCollection<EntityCollection<DogmaTypeAttributes>>
}> = readable(_industryDogmaAttributes, (set)=>{
    if(industryDogmaAttributesLoaded) {
        return;
    }

    let attributes = {};
    let types = {};

    LoadFromSDE("dgmAttributeTypes")
        .then((data: Array<{
            attributeID: number,
            attributeName: string,
            description,
            iconID,
            defaultValue,
            published,
            displayName,
            unitID,
            stackable,
            highIsGood,
            categoryID
        }>)=>{
            // data.filter(type=>type.attributeID!==null && (type.attributeName?.indexOf("Manufacturing Time Bonus")!=-1 || type.attributeName?.indexOf("Industry Job Length Bonus")!=-1))
            data
                .forEach(type=>attributes[type.attributeID]=type);
        })
        .then(()=>LoadFromSDE("dgmIndustryTypeAttributes")) // This first load has a large impact on performance, need to figure out how to cut it down
        .then((data:Array<{
            typeID: Type_Id,
            attributeID,
            valueInt: number | "None",
            valueFloat: number | "None"
        }>)=>{
            data.filter(typeAttribute=>attributes[typeAttribute.attributeID] !== undefined).forEach(t=>{
                types[t.typeID] = types[t.typeID] ?? {};
                types[t.typeID][t.attributeID] = {
                    type_id: t.typeID,
                    attribute_id: t.attributeID,
                    value: t.valueInt === "None" ? t.valueFloat : t.valueInt
                }
            })

            _industryDogmaAttributes = {attributes, types};
            set(_industryDogmaAttributes);
            industryDogmaAttributesLoaded = true;
        })
        .catch(error=>console.error(error))

})


// Temporary implementation of a Eve Dogma operator
export function ModifierAdd(source: number, target: number): number {
    return target * (1 + (source ?? 0)/100);
}

export function ApplyEffects(base: number, modifiers: Array<{value:number}>): number {
    let out = base;
    modifiers.forEach(m=>{out = !isNaN(m.value) ? ModifierAdd(m.value, out) : out});
    return out;
}