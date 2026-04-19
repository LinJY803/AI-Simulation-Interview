<template>
  <div class="profile-page">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <div>
            <div class="title">个人设置</div>
            <div class="sub-title">只保留和对话项目相关的偏好项</div>
          </div>
        </div>
      </template>

      <div class="profile-top">
        <el-avatar :size="72" :src="userInfo.avatar" />
        <div>
          <h3>{{ userInfo.username }}</h3>
          <p>{{ userInfo.email }}</p>
        </div>
      </div>

      <el-form :model="profileForm" label-width="92px" class="settings-form">
        <el-form-item label="昵称">
          <el-input v-model="profileForm.username" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="profileForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="主题">
          <el-select v-model="theme.darkMode" @change="toggleTheme">
            <el-option :value="false" label="浅色奶油" />
            <el-option :value="true" label="深色夜色" />
          </el-select>
        </el-form-item>
        <el-form-item label="语言">
          <el-select v-model="theme.language" @change="changeLanguage">
            <el-option label="中文" value="zh-CN" />
            <el-option label="English" value="en-US" />
          </el-select>
        </el-form-item>
        <el-form-item label="动画">
          <el-switch v-model="theme.animations" active-text="开启" @change="syncPreference" />
        </el-form-item>
        <el-form-item label="声音">
          <el-switch v-model="theme.sounds" active-text="开启" @change="syncPreference" />
        </el-form-item>
        <el-form-item label="自动保存">
          <el-switch v-model="theme.autoSave" active-text="开启" @change="syncPreference" />
        </el-form-item>
        <el-form-item>
          <el-button class="save-btn" type="primary" :loading="saving" @click="saveProfile">保存设置</el-button>
          <el-button class="reset-btn" @click="resetProfile">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { usePreferenceStore, useUserStore } from '@/store'
import { api } from '@/service/api'

const userStore = useUserStore()
const preferenceStore = usePreferenceStore()
const saving = ref(false)

const userInfo = reactive({ username: '', email: '', avatar: '' })
const profileForm = reactive({ username: '', email: '' })
const theme = reactive({ darkMode: preferenceStore.themeMode === 'dark', language: preferenceStore.language, animations: preferenceStore.animations, sounds: preferenceStore.sounds, autoSave: preferenceStore.autoSave })
const snapshot = computed(() => ({ username: profileForm.username, email: profileForm.email }))

const loadProfile = async () => {
  const current = userStore.userInfo
  if (current) {
    userInfo.username = current.username
    userInfo.email = current.email
    userInfo.avatar = current.avatar
    profileForm.username = current.username
    profileForm.email = current.email
  }
  try {
    const result = await api.user.getProfile()
    const p = result.data
    if (!p) return
    userInfo.username = p.username || userInfo.username
    userInfo.email = p.email || userInfo.email
    userInfo.avatar = p.avatar || userInfo.avatar
    profileForm.username = p.username || profileForm.username
    profileForm.email = p.email || profileForm.email
  } catch {}
}

const saveProfile = async () => {
  saving.value = true
  try {
    const result = await api.user.updateProfile({ username: profileForm.username, email: profileForm.email })
    const saved = result.data
    userInfo.username = saved.username || profileForm.username
    userInfo.email = saved.email || profileForm.email
    if (userStore.userInfo) userStore.setUserInfo({ ...userStore.userInfo, username: userInfo.username, email: userInfo.email })
    ElMessage.success('设置已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
const resetProfile = () => { profileForm.username = snapshot.value.username; profileForm.email = snapshot.value.email; ElMessage.info('已重置') }
const toggleTheme = () => preferenceStore.applyTheme(theme.darkMode ? 'dark' : 'light')
const changeLanguage = () => preferenceStore.applyLanguage(theme.language as 'zh-CN' | 'en-US')
const syncPreference = () => { preferenceStore.setAnimations(theme.animations); preferenceStore.setSounds(theme.sounds); preferenceStore.setAutoSave(theme.autoSave) }
onMounted(loadProfile)
</script>

<style scoped lang="scss">
.profile-page { padding: 16px; }
.profile-card { max-width: 820px; margin: 0 auto; border-radius: 30px; background: rgba(255,255,255,.84); backdrop-filter: blur(18px); border: 1px solid rgba(255,255,255,.72); box-shadow: 0 20px 50px rgba(0,0,0,.08); }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 22px; font-weight: 700; color: #262626; }
.sub-title { margin-top: 4px; font-size: 12px; color: #8e8e8e; }
.profile-top { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; padding: 14px 16px; border-radius: 22px; background: linear-gradient(180deg, rgba(255,255,255,.78), rgba(250,247,242,.9)); border: 1px solid rgba(0,0,0,.05); }
.profile-top h3, .profile-top p { margin: 0; }
.profile-top p { color: #8e8e8e; margin-top: 4px; }
.settings-form :deep(.el-input__wrapper), .settings-form :deep(.el-select__wrapper) { border-radius: 16px; background: #fafafa; box-shadow: none; border: 1px solid #ece5dc; }
.settings-form :deep(.el-switch__core) { background: #d7ddd8; }
.save-btn, .reset-btn { border-radius: 999px; }
.save-btn { background: #89a99b; border: none; box-shadow: 0 14px 24px rgba(137,169,155,.2); }
.reset-btn { border-color: #ece5dc; }
@media (max-width: 768px) { .profile-page { padding: 12px; } }
</style>
