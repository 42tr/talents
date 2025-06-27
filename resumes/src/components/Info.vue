<script setup lang="ts">
import { NCard, NButton, NModal } from 'naive-ui'
import type { Talent } from '../types/talent'
import { computed, ref } from 'vue'
import { getResumeUrl } from '../api/api'

const props = defineProps<{
  data: Talent
}>()

const showResumeModal = ref(false)
const resumeUrl = computed(() => {
  if (!props.data.phone) return ''
  return getResumeUrl(props.data.phone)
})

const scoreColor = computed(() => {
  const score = props.data.averageScore
  if (score >= 9) return '#52c41a' // 优秀 - 绿色
  if (score >= 7) return '#1890ff' // 良好 - 蓝色
  if (score >= 6) return '#faad14' // 及格 - 黄色
  return '#f5222d' // 不及格 - 红色
})

const openResume = () => {
  if (resumeUrl.value) {
    window.open(resumeUrl.value, '_blank')
  }
}
</script>

<template>
  <n-card class="card" :style="{ borderColor: scoreColor, color: scoreColor }">
    <template #header>
      <span :style="{ color: scoreColor }">{{ data.name }}</span>
    </template>
    <template #header-extra>
      <span :style="{ color: scoreColor, fontWeight: 'bold', fontSize: '1.6em' }">{{ data.averageScore }}</span>
    </template>
    <div class="card-content">
      <div class="info-item">
        <strong>电话:</strong>
        {{ data.phone }}
      </div>
      <div class="info-item">
        <strong>邮箱:</strong>
        {{ data.email }}
      </div>
      <div class="info-item">
        <strong>教育背景:</strong>
        {{ data.education }}
      </div>
      <div class="info-item">
        <strong>技能:</strong>
        {{ Array.isArray(data.skills) ? data.skills.join(', ') : data.skills }}
      </div>

      <div class="action-buttons">
        <n-button v-if="resumeUrl" type="primary" size="small" @click="openResume">查看简历</n-button>
      </div>
    </div>
  </n-card>
</template>

<style scoped>
.card {
  border-radius: 8px;
  width: 300px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.action-buttons {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
