# Pawprint — an honest AI companion for remembering a pet

**Problem.** Pet loss can be deeply distressing. In a UK study of adults who identified a pet's death as their most distressing bereavement, 7.5% reported symptoms consistent with prolonged grief; this is not an estimate for young people ([Hyland, PLOS ONE, 2026](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0339213)). Current diagnostic guidelines do not allow a prolonged grief disorder diagnosis after pet loss. Researchers have also raised concerns about AI "griefbots", including potential dependence ([Hollanek & Nowaczyk-Basińska, 2024](https://lcfi.ac.uk/news-events/news/deathbots-griefbots-and-the-digital-afterlife)). Pawprint's effect on grief has not been established.

**Who it is for.** People remembering a pet who has died. The prototype has not yet been evaluated with users; use by children and teens needs additional age-appropriate safeguards and review. 94 million U.S. households live with a pet ([APPA, 2025](https://americanpetproducts.org/news/the-american-pet-products-association-appa-releases-2025-state-of-the-industry-report-archive)).

**Design principles.** Not a resurrection (always an AI simulation) · no notifications or streaks · photos sent for generation only with consent · gentle referral to real people and professional help when distress is serious.

問題陳述：有些人的寵物離世後，哀傷可能被忽視。Pawprint 探索以照片、3D 形象與主人提供的故事紀念寵物；這是數位模擬，是否對使用者有幫助仍須研究。

---

# Pawprint — 当前项目副本

## WAICY 2026：当前审查与三个优化阶段

已完成 V1 可靠性修复、V2 可复现的本地指令对照实验、V3 评委证据页。完整结论见 [项目审查与逐项评分](review/WAICY-2026-REVIEW.md)，准备材料见 [提交与答辩包](review/SUBMISSION-KIT.md)。评分为桌面预评，不能替代官方评分或现场问答。

- `npm test`：隔离数据／模拟供应商回归测试，不收费。
- `npm run evaluate`：重跑 68 条开发／对抗指令实验，不调用模型。
- `npm run build`：先刷新实验 JSON，再构建五个入口。
- `npm start` 后访问 `http://127.0.0.1:8788/judge.html`；开发预览为 `http://127.0.0.1:5174/judge.html`。

原有互动、Studio、模型与个人数据保留。当前服务是本机试点；音视频参考仅保存，尚不驱动行为学习或声音克隆。下方包含历史版本说明，不应覆盖本节当前状态。

本网站已迁移到当前 chat。运行 `npm start` 后访问 http://127.0.0.1:8788/；互动页为 `/app.html?lang=en`，开发地址为 http://127.0.0.1:5174/。也可双击 `启动Pawprint.cmd`。

完整迁移记录见上一级目录的 `Pawprint迁移记录.md`。下方保留旧项目说明，其中端口、标题和旧首页描述以当前迁移记录为准。

当前互动页已经接入 OpenAI 人声回复：六种声音可选，默认 Verse；蓝老是男孩子，声音以明亮、轻快的少年感男声为方向；可选择自然陪伴、开心俏皮、温柔安慰三种语气，支持试听、重听、停止和自动朗读。麦克风只在点击后开启。声音为 AI 生成；正文与语音使用服务器现有的 `OPENAI_API_KEY`，可通过 `OPENAI_SPEECH_MODEL` 更换语音模型。官方接口说明：https://developers.openai.com/api/docs/guides/text-to-speech 。

互动页与宠物页的「留下一段回忆」可直接下载或清空用户写的原文；内容保留在当前页面，不会由应用自动保存到数据库。只有用户勾选同意并选择 AI 整理时，原文才发送至 OpenAI，并使用服务器现有的模型配置；服务未配置或失败时原文仍可用。AI 草稿旁的引用经过原文子串检查，但不能证明改写符合事实，需用户逐句核对。删除或取消本地内容不能保证供应商删除或停止处理已收到的数据。当前测试使用模拟供应商；真实 AI 整理质量和用户反馈尚未验证。

官网 `/#keepsakes` 展示创作者在景德镇手作的两件陶瓷茶器，图片由内置 imagegen 基于实物照片分别重建。这是实体纪念周边方向的作品展示，尚未接入实体下单或制造流程。

# 蓝老 · 语音互动网站

> v2 增加了带账号和私有上传的宠物工作室。请先阅读 [部署与配置说明](./部署与配置说明.md)。完整工作室需运行 `npm run build` 和 `npm start`，访问 http://127.0.0.1:8787/studio.html 。下面的静态部署说明只适用于旧版蓝老演示，不适用于账号、照片或生成 API。当前服务器禁止 iframe 嵌入；如需嵌入须单独审查安全策略。

Three.js 直接加载附带的动画 GLB，不涉及 3DGS 转换。保留已认可的四个动作、原始颜色贴图与毛尖动画。

## 在电脑上运行

需要 Node.js。在此文件夹运行 `npm install`，然后 `npm run dev`，打开终端显示的本地地址。不要直接双击 HTML。

## 指令

| 说法 | 行为 |
| --- | --- |
| 蓝老，过来 | 朝当前镜头方向走近，到达后停止 |
| 蓝老，走一走 / 散步 | 在活动范围内走动 |
| 蓝老，跑步 | 在活动范围内小跑 |
| 蓝老，摇尾巴 | 播放摇尾巴动作 |
| 蓝老，跳一下 | 跳一次后站好 |
| 蓝老，停下 / 别动 | 停止移动，恢复站姿 |
| 蓝老，回去 | 回到出发点 |

点击“开启语音互动”后说一句话，每次识别结束自动停止聆听，不在后台持续监听。简体、繁体指令均可解析；默认识别语言是普通话 zh-CN。名字不是必需唤醒词。本版是明确指令匹配，不是通用语音聊天。

语音识别依赖浏览器 Web Speech API；部分浏览器虽提供接口，也可能无法连接识别服务。可能由浏览器服务商联网处理音频；网站本身不保存录音、不上传到自建服务器。不支持或拒绝麦克风权限时，可用按钮和文字。

## 放到你的网站

运行 `npm run build`，将 `dist` 内全部内容放入网站静态目录。支持作为独立网页，也可通过 iframe 嵌入；跨来源 iframe 使用麦克风需要上层网站允许 microphone。正式网站使用 HTTPS。当前版本仅在本机预览，未发布到公网。

`public/models/lanlao.glb` 为网页用模型；原始完整版 GLB 保留在上一级目录。网页模型使用 Meshopt 压缩，加载器已配套，不删减四个动作或替换毛色贴图。

## 验证与边界

`npm test` 检查指令解析；`npm run build` 检查生产构建。按钮、文字、到达后停止等可在页面测试；真实语音识别需用户本人授权麦克风并试说，不能把文字测试等同于麦克风测试。

模型较细致，低性能手机可能掉帧；本版限制渲染像素比，但未另做低模。毛发是预制的辅助动画，不是实时物理模拟。

技术参考：[Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)、[AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html)、[MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)。
