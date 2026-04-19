import { defineStore } from 'pinia'
import { api } from '@/service/api'

export interface AgentConfig {
  id: string
  userId?: number | string
  name: string
  description?: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  memoryEnabled: boolean
  ragEnabled: boolean
  toolEnabled: boolean
  defaultKnowledgeBaseId?: string
  createdAt: number
  updatedAt: number
}

export const useAgentStore = defineStore('agent', {
  state: () => ({
    agents: [] as AgentConfig[],
    activeAgentId: '' as string,
    loading: false,
  }),
  getters: {
    activeAgent: (state) => state.agents.find((item) => item.id === state.activeAgentId) || null,
  },
  actions: {
    async fetchAgents() {
      this.loading = true
      try {
        const res = await api.gpt.listAgents()
        this.agents = res.data || []
        if (!this.activeAgentId && this.agents.length) {
          this.activeAgentId = this.agents[0].id
        }
        if (this.activeAgentId && !this.agents.find((item) => item.id === this.activeAgentId)) {
          this.activeAgentId = this.agents[0]?.id || ''
        }
      } finally {
        this.loading = false
      }
    },

    async saveAgent(payload: Partial<AgentConfig> & Pick<AgentConfig, 'name' | 'systemPrompt'>) {
      const res = await api.gpt.upsertAgent(payload)
      const saved = res.data
      const idx = this.agents.findIndex((item) => item.id === saved.id)
      if (idx >= 0) this.agents[idx] = saved
      else this.agents.unshift(saved)
      this.activeAgentId = saved.id
      return saved
    },

    async deleteAgent(id: string) {
      await api.gpt.deleteAgent(id)
      this.agents = this.agents.filter((item) => item.id !== id)
      if (this.activeAgentId === id) this.activeAgentId = this.agents[0]?.id || ''
    },

    setActiveAgent(id: string) {
      this.activeAgentId = id
    },
  },
})
