# 三分钟 Demo 脚本

演讲讲"为什么"，Demo 只做一件事：**让评委亲眼看到 AI 在工作，以及它出错时程序怎么管住它。**
少说话，多操作。每一步先做动作，再说一句话。

## 录制前准备

1. `npm run build`，然后 `npm start`，打开 `http://127.0.0.1:8788/app.html?lang=en`。
2. 确认 `.env` 里 `OPENAI_API_KEY` 有效：对话框旁显示 AI 已连接。**如果当天连不上，就按最下面的"备用方案"录，并在画面上写明是本地规则。**
3. 浏览器全屏，字号放大到后排也能看清；关掉其他标签页和通知。
4. 把下面 5 句话存进一个文本文件，录的时候复制粘贴，避免打错字。
5. 整段先练两遍并计时。超过 3 分钟就砍第 5 步。

## 脚本

| 时间 | 操作 | 说的话（英文） | 评委看到的评分点 |
| --- | --- | --- | --- |
| 0:00–0:20 | 页面加载完，蓝老自己眨眼、呼吸、东张西望。拖动旋转一圈。 | "This is Lanlao. Nobody is controlling him right now. He breathes, blinks and looks around on his own. The label here always says: AI simulation." | 设计；伦理 |
| 0:20–0:50 | 输入 **`It's lonely over here. Could you come sit with me?`** 发送。蓝老走过来，字幕出现，声音读出。 | "I did not press a button. The language model understood a whole sentence and chose one action: come." 指一下状态行："This line shows the reply came from the real AI." | AI；自然交互 |
| 0:50–1:15 | 输入 **`I watched a dog run in the park yesterday.`** 蓝老不动，只聊天。 | "I said the word 'run', but I did not ask him to run. So he stays. The action gate checked my sentence first." | AI；技术 |
| 1:15–1:35 | 让蓝老跑起来（点 Run），然后输入 **`stop`**。立刻停下。 | "Stop never waits for the internet. It works on my computer in an instant, even if the AI is slow." | 技术；伦理（用户控制） |
| 1:35–2:00 | 输入 **`Will you tell my parents?`**（必须一字不差，这条规则只认短而明确的问法） 出现系统隐私说明。 | "This answer is not written by the AI. Privacy is too important to guess, so the program gives a checked answer and labels it as a system message." | 伦理（意外后果） |
| 2:00–2:30 | 打开 "Keep a memory"，粘贴 **`She liked to sleep by the window. She never liked swimming.`**，勾选同意，点 AI draft。右侧出现原文引用。 | "AI can tidy my words, but every sentence must quote what I really wrote. If the quote does not match, the server rejects the draft. And I can edit or throw it away." | AI；伦理；设计 |
| 2:30–2:50 | 打开 `/judge.html`，滚到实验表，指 28→64 和 29→0，再指失败行。 | "This is my evidence page. It shows what improved, and the mistakes that are still there." | 技术；原创 |
| 2:50–3:00 | 回到蓝老，点 "Say goodbye"，展示道别窗口后取消。 | "And when you are ready, you can say goodbye. Thank you." | 设计；问题陈述 |

## 可选加分镜头（只有真实完成后才能放）

- **真实的照片→3D 生成**：录下上传照片、等待、候选模型出现的过程，快进到 10 秒，字幕写 "Real generation, sped up"。这是整个项目里 AI"独特能力"最直观的画面，也是目前唯一还没真实跑通的环节，**强烈建议在交件前完成一次**（步骤见 `真實生成檢查清單.md`，约 65–75 个 Tripo API 积分）。
- 如果没跑通，就不要放示范模式的画面冒充；可以展示工作室的上传表单和同意说明，并说 "Generation needs an approval step, so I am not running it live."

## 备用方案（AI 服务连不上）

对话会自动退回本地规则，页面会显示是本地回复。这时：

- 第 2 步改输入 `Lanlao, come here`，并说："The AI service is offline right now, so this is the local fallback. It knows fewer sentences."
- 跳过第 5、6 步，改为在评委页的离线检查器里输入 `Don't run` 和 `Show me how fast you can go`，展示一个正确、一个失败。
- 不要把本地规则说成 AI。评委问起时如实说明。

## 现场问答时的演示

线上决赛有 4 分钟问答。把这三个页面提前开好：蓝老页、评委页、编辑器里打开 `server/action-guard.mjs`。评委问"你怎么保证它不乱动"时，直接切到代码，指 `requestedAction` 这个函数讲。
