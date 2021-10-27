<script lang="ts">
    import { Decryptors } from "./EveData";





</script>

<select>
    <option>No decryptor</option>
    {#each Object.values($Decryptors) as decryptorType }
        <option value={decryptorType.type_id}>{decryptorType.name}</option>
    {/each}
</select>