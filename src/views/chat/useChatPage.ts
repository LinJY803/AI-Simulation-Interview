import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { api } from '@/service/api'
import { audioService } from '@/service/audio'
import { useAgentStore, useKnowledgeBaseStore, useMemoryStore, useUserStore } from '@/store'
import type { ChatConversation, ChatMessage } from '@/types/chat'
import { ElMessage } from 'element-plus'
import {
  CHAT_CONVERSATIONS_STORAGE_KEY,
  CHAT_CONTEXT_LIMIT,
  DEFAULT_AI_AVATAR,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_WELCOME_MESSAGE,
  buildConversationSummary,
  createAssistantMessage,
  createConversation,
  createUserMessage,
  getRecentMessages,
  needsSummary,
} from './chatSession'

export function useChatPage() {
  const userStore = useUserStore()
  const memoryStore = useMemoryStore()
  const knowledgeBaseStore = useKnowledgeBaseStore()
  const agentStore = useAgentStore()

  const assistantAvatar = computed(() => DEFAULT_AI_AVATAR)
  const userAvatar = computed(() => userStore.userInfo?.avatar || '')

  const inputText = ref('')
  const inputMode = ref<'text' | 'voice'>('text')
  const isRecording = ref(false)
  const conversationItems = ref<ChatConversation[]>([])
  const activeConversationId = ref<string | null>(null)
  const generatingConversationId = ref<string | null>(null)
  const activeReplyMessageId = ref<string | null>(null)

  let recordingPromise: Promise<Blob> | null = null
  let typingTimer: number | null = null
  let pendingAssistantText = ''
  let streamFinished = false
  let activeTypingTarget = { conversationId: '', messageId: '' }
  let streamAbortController: AbortController | null = null

  const activeConversation = computed(() =>
    conversationItems.value.find(c => c.id === activeConversationId.value) ?? null,
  )
  const activeAgent = computed(() => agentStore.activeAgent)
  const activeConversationAgent = computed(() => {
    const convAgentId = activeConversation.value?.agentId
    if (convAgentId) {
      return agentStore.agents.find((item) => item.id === convAgentId) || null
    }
    return activeAgent.value
  })
  const activeAgentId = computed(() => activeConversationAgent.value?.id || '')
  const knowledgeBaseId = computed(() =>
    activeConversationAgent.value?.defaultKnowledgeBaseId || knowledgeBaseStore.knowledgeBases.find((item) => item.status === 'active')?.id || null,
  )
  const activeMessages = computed(() => activeConversation.value?.messages ?? [])
  const activeRecentMessages = computed(() => getRecentMessages(activeMessages.value, CHAT_CONTEXT_LIMIT))
  const isActiveConversationGenerating = computed(
    () => generatingConversationId.value !== null && generatingConversationId.value === activeConversationId.value,
  )
  const activeStreamingMessageId = computed(() =>
    generatingConversationId.value === activeConversationId.value ? activeReplyMessageId.value : null,
  )

  const saveConversations = () => {
    localStorage.setItem(CHAT_CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversationItems.value))
  }

  const updateConversationMeta = (conv: ChatConversation) => {
    conv.updatedAt = Date.now()
    if (conv.title.startsWith('新会话')) {
      const firstUser = conv.messages.find(m => m.role === 'user')
      if (firstUser?.content) conv.title = firstUser.content.slice(0, 18)
    }
    saveConversations()
  }

  const extractMemoryCandidates = (conv: ChatConversation) => {
    const messages = conv.messages.slice(-12)
    const userTexts = messages.filter(m => m.role === 'user').map(m => m.content)
    const assistantTexts = messages.filter(m => m.role === 'assistant').map(m => m.content)
    const text = userTexts.join(' ')
    const assistantText = assistantTexts.join(' ')

    const candidates: Array<{
      type: 'profile' | 'preference' | 'fact' | 'task' | 'summary'
      key: string
      value: string
      weight: number
      source: 'user' | 'assistant' | 'derived'
      sourceId?: string
    }> = []

    const ruleProfiles: Array<[RegExp, string]> = [
      [/我叫([^，。\s]{2,20})/, 'name'],
      [/([\u4e00-\u9fa5A-Za-z0-9_\-]{2,20})岁/, 'age'],
      [/住在([^，。\s]{2,20})/, 'location'],
      [/目前([在于从]).{0,10}(做|负责)([^，。\n]{2,30})/, 'current_role'],
    ]
    ruleProfiles.forEach(([pattern, key]) => {
      const match = text.match(pattern)
      if (match?.[1] || match?.[3]) {
        candidates.push({
          type: 'profile',
          key,
          value: match[1] || match[3],
          weight: 0.92,
          source: 'user',
        })
      }
    })

    const rulePreferences = [
      /喜欢([^，。\s]{2,20})/g,
      /偏好([^，。\s]{2,20})/g,
      /更希望([^，。\s]{2,30})/g,
      /不喜欢([^，。\s]{2,20})/g,
    ]
    rulePreferences.forEach((pattern, idx) => {
      const match = text.match(pattern)
      if (match?.length) {
        match.forEach((item, itemIndex) => {
          candidates.push({
            type: 'preference',
            key: `preference_${idx}_${itemIndex}`,
            value: item.replace(/^(喜欢|偏好|更希望|不喜欢)/, ''),
            weight: 0.88,
            source: 'user',
          })
        })
      }
    })

    if (text.includes('正在') || text.includes('计划') || text.includes('准备')) {
      candidates.push({
        type: 'task',
        key: 'user_goal',
        value: text.slice(0, 120),
        weight: 0.7,
        source: 'user',
      })
    }

    if (assistantText.includes('建议') || assistantText.includes('可以') || assistantText.includes('推荐')) {
      candidates.push({
        type: 'summary',
        key: 'assistant_advice',
        value: assistantText.slice(0, 160),
        weight: 0.58,
        source: 'assistant',
      })
    }

    return candidates
  }

  const syncMemoryFromConversation = (conv: ChatConversation) => {
    const recent = [...conv.messages].slice(-6)
    const lastUser = [...recent].reverse().find(m => m.role === 'user')
    const lastAssistant = [...recent].reverse().find(m => m.role === 'assistant')

    if (lastUser?.content) {
      memoryStore.addFact(`conversation_${conv.id}_last_user`, lastUser.content, 0.72, 'user')
      memoryStore.addSummary(`conversation_${conv.id}_topic`, lastUser.content.slice(0, 80), 0.48, 'derived')
    }
    if (lastAssistant?.content) {
      memoryStore.addFact(`conversation_${conv.id}_last_assistant`, lastAssistant.content, 0.46, 'assistant')
    }

    const candidates = extractMemoryCandidates(conv)
    for (const item of candidates) {
      const similar = memoryStore.findSimilar(item.type, item.value)
      if (similar) {
        memoryStore.update(similar.id, {
          value: item.value,
          weight: Math.max(similar.weight, item.weight),
          source: item.source,
          sourceId: item.sourceId,
        })
        continue
      }
      if (item.type === 'profile') memoryStore.addProfile(item.key, item.value, item.weight, item.source, item.sourceId)
      if (item.type === 'preference') memoryStore.addPreference(item.key, item.value, item.weight, item.source, item.sourceId)
      if (item.type === 'fact') memoryStore.addFact(item.key, item.value, item.weight, item.source, item.sourceId)
      if (item.type === 'task') memoryStore.addTask(item.key, item.value, item.weight, item.source, item.sourceId)
      if (item.type === 'summary') memoryStore.addSummary(item.key, item.value, item.weight, item.source, item.sourceId)
    }

    if (conv.summary) {
      memoryStore.addSummary(`conversation_${conv.id}_summary`, conv.summary, 0.55, 'derived')
    }
  }

  const updateConversationSummary = (conv: ChatConversation) => {
    if (!needsSummary(conv.messages)) return
    conv.summary = buildConversationSummary(conv)
    conv.summaryUpdatedAt = Date.now()
    memoryStore.addSummary(`conversation_${conv.id}_summary`, conv.summary, 0.55, 'derived')
    saveConversations()
  }

  const stopTyping = () => {
    if (typingTimer) window.clearTimeout(typingTimer)
    typingTimer = null
  }

  const stopAssistantReply = () => {
    streamAbortController?.abort()
    streamAbortController = null
    stopTyping()
    pendingAssistantText = ''
    streamFinished = false
    const conv = conversationItems.value.find(c => c.id === generatingConversationId.value)
    const msg = conv?.messages.find(m => m.id === activeReplyMessageId.value)
    if (msg) {
      msg.status = 'completed'
      msg.updatedAt = Date.now()
      saveConversations()
    }
    generatingConversationId.value = null
    activeReplyMessageId.value = null
  }

  const applyTypingStep = () => {
    const { conversationId, messageId } = activeTypingTarget
    const conv = conversationItems.value.find(c => c.id === conversationId)
    const msg = conv?.messages.find(m => m.id === messageId)
    if (!conv || !msg) {
      stopTyping()
      return
    }

    if (msg.content.length >= pendingAssistantText.length) {
      msg.content = pendingAssistantText
      msg.status = 'completed'
      msg.updatedAt = Date.now()
      saveConversations()
      stopTyping()
      if (streamFinished && generatingConversationId.value === conversationId) {
        generatingConversationId.value = null
        activeReplyMessageId.value = null
        updateConversationMeta(conv)
      }
      return
    }

    const remaining = pendingAssistantText.slice(msg.content.length)
    const nextSize = remaining.length > 220 ? 10 : remaining.length > 80 ? 5 : remaining.length > 20 ? 3 : 1
    const nextChunk = remaining.slice(0, nextSize)
    msg.content += nextChunk
    msg.status = 'streaming'
    msg.updatedAt = Date.now()
    saveConversations()

    const delay = /[。！？.!?]\s*$/.test(msg.content) ? 28 : nextChunk === '\n' ? 24 : nextChunk.length > 4 ? 16 : 12
    typingTimer = window.setTimeout(applyTypingStep, delay)
  }

  const loadConversations = () => {
    try {
      const raw = localStorage.getItem(CHAT_CONVERSATIONS_STORAGE_KEY)
      if (!raw) {
        const now = Date.now()
        const first = createConversation({
          id: `conv-${now}`,
          title: '新会话 1',
          updatedAt: now,
          messages: [
            createAssistantMessage({
              conversationId: `conv-${now}`,
              id: `msg-${now}-welcome`,
              content: DEFAULT_WELCOME_MESSAGE,
              status: 'completed',
              createdAt: now,
              sequence: 0,
              metadata: { source: 'assistant' },
            }),
          ],
        })
        conversationItems.value = [first]
        activeConversationId.value = first.id
        saveConversations()
        return
      }

      const parsed = JSON.parse(raw) as ChatConversation[]
      conversationItems.value = Array.isArray(parsed) ? parsed : []
      if (conversationItems.value.length === 0) {
        const now = Date.now()
        const first = createConversation({ id: `conv-${now}`, title: '新会话 1', updatedAt: now })
        conversationItems.value = [first]
        activeConversationId.value = first.id
        saveConversations()
        return
      }

      activeConversationId.value = conversationItems.value[0]?.id ?? null
    } catch {
      conversationItems.value = []
      const now = Date.now()
      const first = createConversation({ id: `conv-${now}`, title: '新会话 1', updatedAt: now })
      conversationItems.value = [first]
      activeConversationId.value = first.id
      saveConversations()
    }
  }

  const selectConversation = (id: string) => {
    activeConversationId.value = id
    const conv = conversationItems.value.find((item) => item.id === id)
    if (conv?.agentId) {
      agentStore.setActiveAgent(conv.agentId)
    }
  }

  const createNewConversation = (focus = true, withWelcome = false) => {
    const now = Date.now()
    const id = `conv-${now}`
    const conv = createConversation({
      id,
      title: `新会话 ${conversationItems.value.length + 1}`,
      updatedAt: now,
      agentId: agentStore.activeAgentId || agentStore.agents[0]?.id,
      messages: withWelcome
        ? [
            createAssistantMessage({
              conversationId: id,
              id: `msg-${now}-welcome`,
              content: DEFAULT_WELCOME_MESSAGE,
              status: 'completed',
              createdAt: now,
              sequence: 0,
              metadata: { source: 'assistant' },
            }),
          ]
        : [],
    })
    conversationItems.value.unshift(conv)
    if (focus) activeConversationId.value = id
    saveConversations()
  }

  const createConversationHandler = (focus = true) => {
    createNewConversation(focus, false)
  }

  const ensureConversation = () => {
    if (activeConversation.value) return activeConversation.value
    createNewConversation(true, false)
    return activeConversation.value!
  }

  const handleSendMessage = async () => {
    const content = inputText.value.trim()
    if (!content) return
    if (isActiveConversationGenerating.value) return

    const conv = ensureConversation()
    const now = Date.now()
    conv.messages.push(
      createUserMessage({
        conversationId: conv.id,
        id: `msg-${now}`,
        content,
        createdAt: now,
        sequence: conv.messages.length,
        metadata: { source: 'user' },
      }),
    )
    inputText.value = ''
    updateConversationMeta(conv)
    await nextTick()
    await sendAssistantReply(conv.id)
  }

  const sendAssistantReply = async (conversationId: string) => {
    const conv = conversationItems.value.find(c => c.id === conversationId)
    if (!conv) return

    generatingConversationId.value = conversationId
    pendingAssistantText = ''
    streamFinished = false
    activeTypingTarget = { conversationId, messageId: `msg-${Date.now()}-assistant` }
    streamAbortController = new AbortController()

    const assistantNow = Date.now()
    const assistantMsg: ChatMessage = createAssistantMessage({
      conversationId,
      id: activeTypingTarget.messageId,
      content: '',
      status: 'streaming',
      createdAt: assistantNow,
      sequence: conv.messages.length,
      metadata: { source: 'assistant' },
    })
    conv.messages.push(assistantMsg)
    activeReplyMessageId.value = assistantMsg.id
    saveConversations()

    const memoryContext = (activeConversationAgent.value?.memoryEnabled ?? true)
      ? memoryStore
          .list({ minWeight: 0.55 })
          .slice(0, 8)
          .map((item) => `[${item.type}] ${item.key}: ${typeof item.value === 'string' ? item.value : JSON.stringify(item.value)}`)
      : []

    const kbContext = (activeConversationAgent.value?.ragEnabled ?? true)
      ? knowledgeBaseStore.knowledgeBases
          .filter((kb) => kb.status === 'active' && kb.indexStatus === 'ready')
          .slice(0, 5)
          .map((kb) => `知识库「${kb.name}」(${kb.documentCount} 文档, ${kb.chunkCount} chunks)`)
      : []

    const retrievalContext = [
      memoryContext.length ? `长期记忆：\n${memoryContext.join('\n')}` : '',
      kbContext.length ? `可用知识库：\n${kbContext.join('\n')}` : '',
      conv.summary ? `会话摘要：${conv.summary}` : '',
    ].filter(Boolean)

    const chatMessages = [
      { role: 'system' as const, content: activeConversationAgent.value?.systemPrompt || DEFAULT_SYSTEM_PROMPT },
      ...(conv.summary ? [{ role: 'system' as const, content: `会话摘要：${conv.summary}` }] : []),
      ...retrievalContext.map((content) => ({ role: 'system' as const, content })),
      ...activeRecentMessages.value.map(m => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      })),
    ]

    await api.gpt.streamChatSSE(chatMessages, {
      onChunk: chunk => {
        pendingAssistantText += chunk
        if (!typingTimer) applyTypingStep()
      },
      onMeta: meta => {
        const target = conv.messages.find(m => m.id === assistantMsg.id)
        if (!target) return
        const citations = (meta?.metadata?.citations || meta?.citations || []) as any[]
        target.metadata = {
          ...(target.metadata || {}),
          citations,
          retrieval: {
            ...(target.metadata?.retrieval || {}),
            hits: citations,
            citations,
          },
        }
        target.updatedAt = Date.now()
        saveConversations()
      },
      onDone: text => {
        pendingAssistantText = text || pendingAssistantText
        streamFinished = true
        if (!typingTimer) applyTypingStep()
        updateConversationSummary(conv)
        if (activeConversationAgent.value?.memoryEnabled ?? true) {
          syncMemoryFromConversation(conv)
        }
        streamAbortController = null
      },
      onError: err => {
        stopTyping()
        if (err.name === 'AbortError') {
          const stoppedMsg = conv.messages.find(m => m.id === assistantMsg.id)
          if (stoppedMsg) {
            stoppedMsg.status = 'completed'
            stoppedMsg.updatedAt = Date.now()
            saveConversations()
          }
          return
        }
        generatingConversationId.value = null
        activeReplyMessageId.value = null
        streamAbortController = null
        ElMessage.error(err.message || '回复失败')
        const failedMsg = conv.messages.find(m => m.id === assistantMsg.id)
        if (failedMsg) {
          failedMsg.status = 'error'
          failedMsg.updatedAt = Date.now()
          saveConversations()
        }
      },
    }, {
      userId: userStore.userInfo?.id,
      agentId: activeAgentId.value || undefined,
      knowledgeBaseId: knowledgeBaseId.value || undefined,
      signal: streamAbortController.signal,
    })
  }

  const startRecording = async () => {
    if (generatingConversationId.value === activeConversationId.value || isRecording.value) return
    if (!audioService.isRecordingSupported()) {
      ElMessage.error('当前浏览器不支持录音')
      return
    }

    try {
      isRecording.value = true
      recordingPromise = audioService.startRecording()
    } catch {
      isRecording.value = false
      ElMessage.error('无法访问麦克风')
    }
  }

  const stopRecording = async () => {
    if (!isRecording.value) return

    try {
      isRecording.value = false
      audioService.stopRecording()
      const blob = recordingPromise ? await recordingPromise : null
      recordingPromise = null
      if (!blob) return

      const result = await api.gpt.speechToText(blob)
      const transcript = result.data?.text?.trim()
      if (!transcript) return

      inputText.value = transcript
      await handleSendMessage()
    } catch (error: any) {
      ElMessage.error(error?.message || '语音转写失败')
    } finally {
      isRecording.value = false
      recordingPromise = null
    }
  }

  watch(conversationItems, saveConversations, { deep: true })

  watch(
    [activeConversationId, () => agentStore.agents.length],
    () => {
      const conv = activeConversation.value
      if (!conv) return
      if (!conv.agentId) {
        conv.agentId = agentStore.activeAgentId || agentStore.agents[0]?.id || ''
      }
      if (conv.agentId) {
        agentStore.setActiveAgent(conv.agentId)
      }
    },
    { immediate: true },
  )

  onMounted(() => {
    loadConversations()
    agentStore.fetchAgents().catch(() => undefined)
  })

  onUnmounted(() => {
    stopTyping()
    if (isRecording.value) audioService.stopRecording()
    streamAbortController?.abort()
  })

  return {
    assistantAvatar,
    userAvatar,
    inputText,
    inputMode,
    isRecording,
    conversationItems,
    activeConversationId,
    activeMessages,
    activeStreamingMessageId,
    isActiveConversationGenerating,
    pageTitle: '智能体对话',
    pageSubtitle: '支持多轮对话、流式输出与语音输入',
    sidebarTitle: '会话列表',
    createLabel: '新建会话',
    searchPlaceholder: '搜索会话...',
    emptyText: '开始一段新的对话吧',
    assistantLabel: '智能体',
    userLabel: '我',
    voiceLabel: '语音转写',
    inputPlaceholder: '输入你的问题，Enter 发送',
    hintText: '按 Enter 发送',
    sendLabel: '发送',
    textModeLabel: '文本',
    voiceModeLabel: '语音',
    recordingHint: '正在录音，松开发送',
    holdHint: '按住说话',
    agentOptions: computed(() => agentStore.agents),
    activeAgentId,
    activeAgent: activeConversationAgent,
    setActiveAgent: (id: string) => {
      agentStore.setActiveAgent(id)
      const conv = activeConversation.value
      if (conv) {
        conv.agentId = id
        conv.updatedAt = Date.now()
        saveConversations()
      }
    },
    selectConversation,
    createConversation: createConversationHandler,
    handleSendMessage,
    startRecording,
    stopRecording,
    stopAssistantReply,
  }
}
