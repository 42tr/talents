<template>
  <div
    :style="{
      width: width,
      height: height
    }"
    ref="echartsRef" />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { PropType } from 'vue'
import { useEcharts } from '../../hooks/useEcharts.ts'
import type { EChartsCoreOption } from '../../hooks/useEcharts.ts'

const props = defineProps({
  options: { type: Object as PropType<EChartsCoreOption>, required: true },
  height: { type: String, default: '100%' },
  width: { type: String, default: '100%' },
  themeColors: { type: Array as PropType<string[]>, default: () => [] }
})

const echartsRef = ref()

const { setOptions, initCharts } = useEcharts(echartsRef, props.options)

watch(
  () => props.options,
  (nVal) => {
    let targetOptions: EChartsCoreOption = {}
    if (props.themeColors && props.themeColors.length > 0) {
      targetOptions = { ...nVal }
      targetOptions.color = props.themeColors
    } else {
      targetOptions = { ...nVal }
    }
    setOptions(targetOptions)
  }
)

onMounted(() => {
  initCharts()
})
</script>
