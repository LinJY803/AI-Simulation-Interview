import { defineStore } from "pinia";

type Language = "zh-CN" | "en-US";
type ThemeMode = "light" | "dark";

const localeMessages: Record<Language, Record<string, string>> = {
  "zh-CN": {
    appName: "AI 面试系统",
    menuInterview: "AI面试",
    menuHistory: "面试历史",
    menuProfile: "个人中心",
    userProfile: "个人资料",
    settings: "设置",
    logout: "退出登录",
    about: "关于我们",
    help: "帮助中心",
    privacy: "隐私政策",
    footerDesc: "基于 Vue3 + TypeScript + AI 构建",
  },
  "en-US": {
    appName: "AI Interview",
    menuInterview: "Interview",
    menuHistory: "History",
    menuProfile: "Profile",
    userProfile: "Profile",
    settings: "Settings",
    logout: "Logout",
    about: "About",
    help: "Help",
    privacy: "Privacy",
    footerDesc: "Built with Vue3 + TypeScript + AI",
  },
};

export const usePreferenceStore = defineStore("preference", {
  state: () => ({
    language: (localStorage.getItem("language") as Language) || "zh-CN",
    themeMode: (localStorage.getItem("themeMode") as ThemeMode) || "light",
    animations: localStorage.getItem("animations") !== "false",
    sounds: localStorage.getItem("sounds") !== "false",
    autoSave: localStorage.getItem("autoSave") !== "false",
  }),
  actions: {
    initialize() {
      this.applyLanguage(this.language);
      this.applyTheme(this.themeMode);
    },
    applyLanguage(language: Language) {
      this.language = language;
      localStorage.setItem("language", language);
      document.documentElement.lang = language;
    },
    applyTheme(mode: ThemeMode) {
      this.themeMode = mode;
      localStorage.setItem("themeMode", mode);
      document.documentElement.setAttribute("data-theme", mode);
    },
    setAnimations(value: boolean) {
      this.animations = value;
      localStorage.setItem("animations", String(value));
    },
    setSounds(value: boolean) {
      this.sounds = value;
      localStorage.setItem("sounds", String(value));
    },
    setAutoSave(value: boolean) {
      this.autoSave = value;
      localStorage.setItem("autoSave", String(value));
    },
    t(key: string) {
      return localeMessages[this.language]?.[key] || key;
    },
  },
});
