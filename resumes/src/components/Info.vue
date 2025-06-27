<script setup lang="ts">
import { NCard, NButton, NModal, NTooltip } from 'naive-ui'
import type { Talent } from '../types/talent'
import { computed, ref } from 'vue'
import { getResumeUrl } from '../api/api'

const props = defineProps<{
  data: Talent
}>()

const resumeUrl = computed(() => {
  if (!props.data.phone) return ''
  return getResumeUrl(props.data.phone)
})

const hasResume = computed(() => {
  return props.data.resumePath !== undefined && props.data.resumePath !== ''
})

const scoreColor = computed(() => {
  const score = props.data.averageScore
  if (score >= 9) return '#52c41a' // 优秀 - 绿色
  if (score >= 7) return '#1890ff' // 良好 - 蓝色
  if (score >= 6) return '#faad14' // 及格 - 黄色
  return '#f5222d' // 不及格 - 红色
})

const openResume = () => {
  if (resumeUrl.value && hasResume.value) {
    window.open(resumeUrl.value, '_blank')
  }
}
</script>

<template>
  <n-card class="card" :style="{ borderColor: scoreColor, color: scoreColor }">
    <template #header>
      <div class="header-content">
        <span :style="{ color: scoreColor }">{{ data.name }}</span>
        <div class="score-container">
          <div class="score-item" v-if="data.experienceScore">
            <span class="score-label">经验</span>
            <span class="score-value" :style="{ color: scoreColor }">{{ data.experienceScore }}</span>
          </div>
          <div class="score-item" v-if="data.educationScore">
            <span class="score-label">教育</span>
            <span class="score-value" :style="{ color: scoreColor }">{{ data.educationScore }}</span>
          </div>
          <div class="score-item" v-if="data.technicalScore">
            <span class="score-label">技术</span>
            <span class="score-value" :style="{ color: scoreColor }">{{ data.technicalScore }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #header-extra>
      <div class="total-score" :style="{ color: scoreColor, fontWeight: 'bold', fontSize: '1.4em' }">
        {{ data.averageScore }}
      </div>
    </template>
    <div class="card-content">
      <div class="info-grid">
        <div class="info-col">
          <div class="info-item">
            <strong>电话:</strong>
            <span class="truncated-text">{{ data.phone || '暂无' }}</span>
          </div>
          <div class="info-item">
            <strong>邮箱:</strong>
            <span class="truncated-text">{{ data.email || '暂无' }}</span>
          </div>
          <div class="info-item">
            <strong>教育:</strong>
            <span class="truncated-text">{{ data.education || '暂无' }}</span>
          </div>
          <div class="info-item">
            <strong>专业:</strong>
            <span class="truncated-text">{{ data.major || '暂无' }}</span>
          </div>
        </div>

        <div class="info-col">
          <div class="info-item">
            <strong>工作年限:</strong>
            <span class="truncated-text">{{ data.years || '暂无' }}</span>
          </div>
          <div class="info-item">
            <strong>期望薪资:</strong>
            <span class="truncated-text">{{ data.expectSalary ? data.expectSalary + 'K' : '暂无' }}</span>
          </div>
          <div class="info-item">
            <strong>籍贯:</strong>
            <span class="truncated-text">{{ data.native || '暂无' }}</span>
          </div>
          <div class="info-item">
            <strong>意向城市:</strong>
            <span class="truncated-text">
              {{ Array.isArray(data.expectCities) && data.expectCities.length ? data.expectCities.join(', ') : '暂无' }}
            </span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="info-item full-width">
          <strong>技能:</strong>
          <n-tooltip v-if="Array.isArray(data.skills) && data.skills.length" trigger="hover">
            <template #trigger>
              <div class="truncated-text with-hover">
                {{ Array.isArray(data.skills) && data.skills.length ? data.skills.join(', ') : '暂无' }}
              </div>
            </template>
            <div class="tooltip-content">
              {{ data.skills.join(', ') }}
            </div>
          </n-tooltip>
          <div v-else class="truncated-text">暂无</div>
        </div>

        <div class="info-item full-width">
          <strong>公司:</strong>
          <n-tooltip v-if="Array.isArray(data.companies) && data.companies.length" trigger="hover">
            <template #trigger>
              <div class="truncated-text with-hover">
                {{ Array.isArray(data.companies) && data.companies.length ? data.companies.join(', ') : '暂无' }}
              </div>
            </template>
            <div class="tooltip-content">
              {{ data.companies.join(', ') }}
            </div>
          </n-tooltip>
          <div v-else class="truncated-text">暂无</div>
        </div>

        <div class="info-item full-width">
          <strong>学校:</strong>
          <n-tooltip v-if="Array.isArray(data.universities) && data.universities.length" trigger="hover">
            <template #trigger>
              <div class="truncated-text with-hover">
                {{
                  Array.isArray(data.universities) && data.universities.length ? data.universities.join(', ') : '暂无'
                }}
              </div>
            </template>
            <div class="tooltip-content">
              {{ data.universities.join(', ') }}
            </div>
          </n-tooltip>
          <div v-else class="truncated-text">暂无</div>
        </div>
      </div>

      <div class="action-buttons">
        <n-button v-if="hasResume" type="primary" size="small" @click="openResume">查看简历</n-button>
        <n-button v-else disabled size="small">无简历</n-button>
      </div>
    </div>
  </n-card>
</template>

<style scoped>
.card {
  border-radius: 8px;
  width: 300px;
  height: auto;
  min-height: 380px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  overflow: hidden;
  position: relative;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding: 0 6px 0 2px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-container {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  padding: 1px 3px;
}

.score-label {
  font-size: 10px;
  color: #999;
}

.score-value {
  font-size: 12px;
  font-weight: 600;
}

.total-score {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
}

.info-grid {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.info-col {
  flex: 1;
  min-width: 0;
}

.detail-section {
  margin-top: 4px;
  border-top: 1px dashed #eee;
  padding-top: 4px;
}

.info-item {
  font-size: 12px;
  line-height: 1.2;
  color: #333;
  overflow: hidden;
  margin-bottom: 4px;
  display: flex;
  flex-direction: column;
}

.full-width {
  width: 100%;
}

.truncated-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #666;
}

.with-hover {
  cursor: pointer;
  border-bottom: 1px dotted #ccc;
}

.tooltip-content {
  max-width: 300px;
  white-space: normal;
  word-break: break-word;
}

.action-buttons {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
  padding-top: 6px;
  margin-top: 6px;
  flex-shrink: 0;
  background-color: #fff;
  position: sticky;
  bottom: 0;
  width: 100%;
}
</style>
