<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NInput, NIcon, NSpace } from 'naive-ui'
import { Flash } from '@vicons/carbon'
import { getTalentList } from './api/api'
import Info from './components/Info.vue'
import type { Talent } from './types/talent'

const talents = ref<Talent[]>([])

onMounted(async () => {
  await getList()
})

async function getList() {
  talents.value = await getTalentList()
}
</script>

<template>
  <div>
    <div style="margin-bottom: 16px">
      <n-input placeholder="搜索">
        <template #prefix>
          <n-icon :component="Flash" />
        </template>
      </n-input>
    </div>

    <n-space>
      <Info v-for="talent in talents" :data="talent" :key="talent.phone" />
    </n-space>
  </div>
</template>

<style scoped></style>
