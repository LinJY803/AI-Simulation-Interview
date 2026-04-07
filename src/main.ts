/*
 * @Author: 夏目 1207644747@qq.com
 * @Date: 2026-04-06 14:02:58
 * @LastEditors: 夏目 1207644747@qq.com
 * @LastEditTime: 2026-04-08 00:23:24
 * @FilePath: \ai-interview\src\main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

import App from "./App.vue";
import router from "./router";
import "./styles/index.scss";
import { usePreferenceStore } from "./store";

const app = createApp(App);

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

const pinia = createPinia();
app.use(pinia);
const preferenceStore = usePreferenceStore(pinia);
preferenceStore.initialize();
app.use(router);
app.use(ElementPlus);

app.mount("#app");
