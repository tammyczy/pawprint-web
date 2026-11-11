# Pawprint：WAICY 故事与 AI 讲解稿

适用方向：WAICY 2026 **AI Showcase**。本稿基于现有项目和 2026-11-09 可见的开发记录，供演讲、幻灯片和答辩准备；不是已经验证的用户研究或比赛成绩。正式使用前，学生需核实自己的经历、贡献、演示配置和数据版本。若实际报名的是 AI-Generated Video 等其他赛道，需按该赛道重新调整。

## 一、故事核心

**一句话：** Pawprint 让宠物主人可以用照片、故事和可控的数字互动来纪念一只熟悉的宠物，同时清楚告诉他们：这是模拟，不是宠物回来了。

**故事线：** 熟悉的日常 → 失去后留下的照片与记忆 → 一个问题：能否用互动的方式保存这些记忆？→ Pawprint 的体验 → AI 如何参与 → 为什么人必须掌握控制权 → 下一步验证。

下面的开场是一个**想象中的场景**，不是学生或真实用户的亲身经历。若有真实、愿意公开的故事，可以替换，但不要编造亲身经历或用户反馈。

## 二、三分钟英文演讲稿

建议以自然语速练习，按真实计时调整。方括号仅在有真实信息时填写；如暂无可核实的个人贡献，删去对应句子并在答辩前完成贡献记录。

### 0:00–0:25 · 一个空下来的日常

Imagine coming home and looking at a photograph of your dog. You remember not only its face, but the little things a photo cannot show: coming when you called, or wagging its tail at the door.

For someone who has lost a pet, those moments can mean a great deal. Could technology offer another way to remember them?

### 0:25–0:50 · Pawprint 的想法

Our project, **Pawprint**, explores an interactive digital keepsake using pet photos, a 3D character, and the owner's memories.

This is Lanlao, our demonstration companion. A person can interact, stop whenever they choose, and write a memory. This is a simulation. It cannot bring a pet back or reveal what the animal really thinks.

### 0:50–1:30 · AI 做了什么

With permission, photos can be sent to Tripo, an external AI service, to create a candidate 3D model. A person must review it: AI may invent details the photos do not show.

During interaction, a language model can propose a short reply and an action. Our application checks the response and maps allowed actions to existing animations. Three.js displays the character, and a separate service can provide synthetic speech.

The owner can also ask AI to organize a memory they wrote. We show original excerpts for review, but the owner must check the draft because AI can misunderstand.

### 1:30–1:55 · 测试、失败与改进

We tested a separate offline command parser. On 68 development examples, matches with expected actions rose from 28 to 64. Unwanted actions among 32 negative examples fell from 29 to zero. Four expected actions were still missed.

These cases helped us make fixes, so this is not an independent accuracy score. It does not measure the language model.

### 1:55–2:25 · 设计与责任

Users can choose text or buttons, stop an interaction, and decide whether to request a memory draft. Sending photos or text to external services has privacy implications; local deletion does not guarantee provider deletion.

Pawprint is a creative keepsake, not a treatment. We have not established an effect on grief or wellbeing.

### 2:25–3:00 · 下一步与结尾

Next, we plan an independent language-model test and a usability comparison with a static photo, involving consenting adults. We will measure understanding and control, not medical outcomes.

[My verified contribution was **具体工作**.] We also acknowledge external services, existing assets, and AI assistance.

A photo preserves what a pet looked like. Pawprint asks whether a thoughtful, controllable interaction can help us revisit remembered moments—while keeping memory and simulation distinct. Thank you.

## 三、故事中文理解稿

试想一个人回到家，看见一张宠物的照片。照片留下了熟悉的脸，但他还记得照片之外的细节：呼唤时跑过来的样子，或者进门时摇动的尾巴。我们想探索：除了看照片，人们能否用一种自己可以控制的互动方式，回顾这些珍贵的瞬间？

因此有了 Pawprint：用户可以用经过授权的照片创建候选 3D 形象，和示例角色蓝老互动，也可以写下属于自己的回忆。AI 能协助生成模型、理解文字、生成短回复和整理记忆；但 AI 并不知道宠物真实的想法，生成的内容也可能出错。所以我们把审核、停止和选择权交给人，并清楚标明这是模拟。

我们已经对离线指令解析做了开发测试，看到改善，也保留了失败例子。接下来需要独立测试真实语言模型，并邀请自愿的成年用户比较互动体验与静态照片。Pawprint 想探索的是一种有边界的纪念方式，而它是否对使用者有帮助，还需要证据。

## 四、AI 讲解：从输入到输出

| 环节 | 输入和输出 | AI 或程序做什么 | 要说明的边界 |
| --- | --- | --- | --- |
| 生成形象 | 获授权的照片 → 候选 3D 模型 | 外部预训练 Tripo 服务从照片推断形象；项目管理任务并呈现候选结果 | 看不到的部位可能被猜错；人要审核。新模型不保证有蓝老全部动作。本地生成需操作人员批准；启用的云端部署可由用户请求启动 |
| 对话与动作 | 用户文字 → 短回复与候选动作 | 外部预训练语言模型生成候选内容；应用验证和限制动作，再映射到现有动画 | 模型可能误解；程序也可能误判。普通对话与动作控制需要单独测试 |
| 记忆整理 | 用户自己写的原文 → 可选 AI 草稿和原文摘录 | 用户明确同意后，外部语言模型协助整理；程序检查引用是否是原文子串 | 引用匹配不证明改写忠实；用户须逐句检查。未请求整理时，原文在页面中处理 |
| 声音 | 文本 → 合成语音 | 外部文字转语音服务产生可播放的声音 | 是合成声音，不是宠物声音克隆；文字会发送给服务商。语音识别可能由浏览器服务商处理 |
| 画面与离线控制 | 模型和已有动画 / 简单命令 → 画面和动作 | Three.js 渲染；本地确定性规则处理较小的离线指令词汇 | 渲染与规则本身不等于训练 AI；离线规则结果不能当作语言模型表现 |

**怎样向评委解释 AI 的独特作用：** 一张照片只展示它拍到的视角；图像到 3D 模型可以尝试推断一个可旋转的候选形象。固定按钮只能触发预设操作；语言模型可以处理更灵活的表达并生成不同的短回复。这些能力都带来错误与隐私风险，所以应用要检查输出、提供控制，并且保留人工审核。我们使用外部预训练模型，并没有声称自行训练基础模型。

### 五大 AI 概念：用本项目举例

1. **Perception（感知）：** 图像到 3D 服务处理照片中的视觉信息；如果使用浏览器语音识别，语音服务处理语音输入。这些能力来自外部服务，不代表团队训练了感知模型。
2. **Representation and Reasoning（表示与推理）：** 候选 3D 模型把外观表示成可显示的数字结构；语言模型提出结构化的回复和动作。应用再用明确规则验证动作。推断出的细节不一定真实。
3. **Learning（学习）：** Tripo、语言模型和语音服务使用预训练模型，其学习发生在供应商的训练过程中。Pawprint 的离线规则实验是人工修改并比较规则，不是模型在线学习。
4. **Natural Interaction（自然交互）：** 用户可以用日常语言输入，选择合成语音，或直接使用按钮；不同途径的能力与限制并不完全相同。
5. **Societal Impact（社会影响）：** 宠物回忆可能很私密；系统涉及照片、文字的第三方处理、可能产生误导的模拟和情感依赖风险。明确同意、停止入口、人工审核和诚实说明边界是设计的一部分，并不保证消除全部风险。

## 五、评委可能追问

**Q: Why do you need AI?**  
A: AI can infer a candidate 3D representation from photos and handle more flexible language than a fixed set of buttons. Those outputs can be wrong, so we review the model and constrain actions. We still need to test whether users find the interaction more useful than a photo.

**Q: Did you train the AI?**  
A: No foundation model was trained by this project. We use external pretrained services and application code. I can explain my own verified work: [具体贡献]. We will disclose other assistance and assets separately.

**Q: Does 64 out of 68 prove the AI is accurate?**  
A: No. That number is for the local deterministic parser on a development set. The examples include cases used to make fixes. Four expected actions were missed, and the result does not evaluate the language model or estimate real-world accuracy.

**Q: What happens if AI invents a memory or a detail?**  
A: A generated 3D model can invent unseen details, and a memory draft can change the meaning of the owner's words. We show the source excerpts and ask the owner to review the result. A matching quote does not guarantee a correct interpretation.

**Q: Does Pawprint help people recover from grief?**  
A: We do not know. We have not conducted a clinical study or established a therapeutic effect. We describe it as a digital keepsake, and plan to study usability and user control first.

**Q: What happens to private data?**  
A: With the required consent and action, pet photos can be sent to the image-to-3D provider; chat and optional memory-draft text can be sent to the language provider. Speech text can be sent to the speech provider. Local deletion is not a promise that external copies are deleted. We need to verify the actual deployment and provider retention settings.

**Q: What is original about the project?**  
A: Pawprint combines a familiar-pet keepsake, a 3D character, optional owner-authored memories and user-controlled interaction, with explicit simulation and privacy boundaries. The team must identify its own verified design and engineering contributions separately from pretrained services, existing assets and AI assistance.

## 六、评分对应与最后核实

| 官方 AI Showcase 评分项 | 本稿对应位置 | 还需要的证据 |
| --- | --- | --- |
| AI（25） | 生成、对话、语音、记忆及五大概念 | 学生能独立解释真实数据流与外部模型；分别验证实际配置 |
| Technical Skills（25） | 模型、动作验证、Three.js、离线实验 | 现场展示代码或数据流，解释至少一个失败与修正；完成真实贡献表 |
| Problem Statement（10） | 开场、目标人群、想解决的问题 | 说明问题来源；用户需求和实际影响仍需研究 |
| Design（10） | 用户选择、停止、记忆审核 | 展示可实际操作的界面与视觉、声音选择，核实演示设备 |
| AI Ethics（10） | 模拟标识、同意、隐私、审核和风险 | 复核部署和供应商数据处理、删除边界与适用年龄 |
| Presentation & Communication（10） | 完整故事、演讲与问答 | 本人练习并计时，能自然回答而不是只背稿 |
| Originality & Creativity（10） | 项目组合、故事主题及明确归属 | 核实学生原创工作、外部素材和 Codex 协助，不虚构经历 |

**演讲前核实：** ① 学生身份与真实动机；② 本人做了什么、能独立解释什么；③ 演示时实际启用的模型和功能；④ 实验数据与所展示版本一致；⑤ 示例照片和素材有权使用；⑥ 计时不超过三分钟。现场若功能失败，应如实说明，不把录屏或离线规则说成实时 AI。

参考：[WAICY 2026 官方评分表](https://www.waicy.org/rubrics/)、本项目 [提交准备包](SUBMISSION-KIT.md)、[真实 AI 开发评测](AI-LIVE-REVIEW-2026-11-09.md)、[行动追踪](WAICY-2026-ACTION-TRACKER.md)。
