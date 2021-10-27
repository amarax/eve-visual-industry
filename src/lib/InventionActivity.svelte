<script lang="ts">
    import { Decryptors, Universe } from "./EveData";



    let scienceSkills = [];
    let encryptionSkills = [];
    $: {
        if($Universe.markets && $Universe.types) {
            scienceSkills = $Universe.markets.groups[375].types.map(type_id=>$Universe.types[type_id]).sort((a,b)=>a.name.localeCompare(b.name));
            encryptionSkills = scienceSkills.filter(type=>type.name.indexOf("Encryption") >=0);
        }
    }



</script>

<div>
    <select>
        <option>No decryptor</option>
        {#each Object.values($Decryptors) as decryptorType }
            <option value={decryptorType.type_id}>{decryptorType.name}</option>
        {/each}
    </select>
    <br/>

    <label>
        <select>
            {#each scienceSkills as {id,name} }
                <option value={id}>{name}</option>
            {/each}
        </select>
        <input type="range" min={0} max={5} />
    </label>
    <br />
    <label>
        <select>
            {#each scienceSkills as {id,name} }
                <option value={id}>{name}</option>
            {/each}
        </select>
        <input type="range" min={0} max={5} />
    </label>
    <br />
    <label>
        <select>
            {#each encryptionSkills as {id,name} }
                <option value={id}>{name}</option>
            {/each}
        </select>
        <input type="range" min={0} max={5} />
    </label>
</div>