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



export const IndustryDogmaAttributes: Readable<{
    attributes: EntityCollection<DogmaAttributes>,
    types: EntityCollection<EntityCollection<DogmaTypeAttributes>>
}> = readable({attributes:{}, types:{}}, (set)=>{
    let attributes = {};
    let types = {};

    LoadFromSDE("/data/dgmAttributeTypes.csv")
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
            data.filter(type=>type.attributeID!==null && (type.attributeName?.indexOf("Manufacturing Time Bonus")!=-1 || type.attributeName?.indexOf("Industry Job Length Bonus")!=-1))
                .forEach(type=>attributes[type.attributeID]=type);
        })
        .then(()=>LoadFromSDE("/data/dgmIndustryTypeAttributes.csv")) // This first load has a large impact on performance, need to figure out how to cut it down
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

            set({attributes, types});
        })
        .catch(error=>console.error(error))

})