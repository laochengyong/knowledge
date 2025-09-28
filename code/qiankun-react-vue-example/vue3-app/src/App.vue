<template>
  <div class="vue3-app">
    <h2>Vue3 子应用</h2>
    
    <div class="message-section">
      <h3>收到的消息:</h3>
      <p>{{ message || '暂无消息' }}</p>
    </div>
    
    <div class="interaction-section">
      <h3>发送消息到主应用:</h3>
      <input
        type="text"
        placeholder="输入消息..."
        v-model="inputMessage"
      />
      <button @click="sendToMain">发送</button>
    </div>
    
    <div class="local-state">
      <h3>子应用本地状态:</h3>
      <p>计数器: {{ count }}</p>
      <button @click="count++">增加计数</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance, onUnmounted } from 'vue';

const instance = getCurrentInstance();
const actions = instance.appContext.config.globalProperties.$actions;

const message = ref('');
const inputMessage = ref('');
const count = ref(0);
let unsubscribe = null;

onMounted(() => {
  if (actions) {
    // 初始获取状态
    message.value = actions.getGlobalState()?.message || '';
    
    // 监听状态变化
    unsubscribe = actions.onGlobalStateChange((state) => {
      message.value = state.message;
    }, true);
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

const sendToMain = () => {
  if (actions && inputMessage.value) {
    actions.setGlobalState({
      ...actions.getGlobalState(),
      message: `来自Vue3子应用: ${inputMessage.value}`
    });
    inputMessage.value = '';
  }
};
</script>
