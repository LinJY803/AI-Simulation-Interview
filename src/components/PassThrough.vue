<script setup lang="ts">
import { useAttrs, useSlots, type Component } from 'vue'

defineOptions({
  inheritAttrs: false,
})

interface PassThroughProps {
  is?: string | Component
}

withDefaults(defineProps<PassThroughProps>(), {
  is: 'div',
})

const attrs = useAttrs()
const slots = useSlots()
</script>

<template>
  <component :is="is" v-bind="attrs" v-slots="slots" />
</template>
