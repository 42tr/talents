<script setup lang="ts">
import { NCard } from 'naive-ui'
import type { Talent } from '../types/talent'
import { computed } from 'vue'

const props = defineProps<{
  data: Talent
}>()

const scoreColor = computed(() => {
  const score = props.data.averageScore
  if (score >= 9) return '#52c41a' // 优秀 - 绿色
  if (score >= 7) return '#1890ff' // 良好 - 蓝色
  if (score >= 6) return '#faad14' // 及格 - 黄色
  return '#f5222d' // 不及格 - 红色
})
</script>

<template>
  <n-card class="card" :title="data.name" :style="{ borderColor: scoreColor }">
    <template #header-extra>
      <span :style="{ color: scoreColor }">{{ data.averageScore }}</span>
    </template>
    卡片内容
  </n-card>
</template>

<style scoped>
.card {
  border-radius: 8px;
  width: 300px;
}
</style>
