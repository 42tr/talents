<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NInput, NIcon, NSpace, NButton, NInputGroup, NUpload } from 'naive-ui'
import type { UploadCustomRequestOptions } from 'naive-ui'

import { Flash } from '@vicons/carbon'
import { getTalentList, uploadResume } from './api/api'
import Info from './components/Info.vue'
import type { Talent } from './types/talent'

const talents = ref<Talent[]>([])

onMounted(async () => {
  await getList()
})

async function getList() {
  talents.value = await getTalentList()
}

async function handleUpload({ file }: UploadCustomRequestOptions) {
  await uploadResume(file.file as File)
  await getList()
}
</script>

<template>
  <div class="container">
    <div class="search-bar">
      <n-input-group>
        <n-input placeholder="搜索" style="width: 62%">
          <template #prefix>
            <n-icon :component="Flash" />
          </template>
        </n-input>
        <n-upload :custom-request="handleUpload" :show-file-list="false">
          <n-button type="primary" ghost>上传简历</n-button>
        </n-upload>
      </n-input-group>
    </div>

    <div class="talent-grid">
      <Info v-for="talent in talents" :data="talent" :key="talent.phone" />
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px;
}

.search-bar {
  margin-bottom: 24px;
}

.talent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 300px);
  gap: 24px;
  justify-content: center;
  align-items: start;
}

@media (max-width: 768px) {
  .talent-grid {
    grid-template-columns: repeat(auto-fill, 280px);
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .talent-grid {
    grid-template-columns: repeat(1, 300px);
    justify-content: center;
  }
}
</style>
