# Pawprint · WAICY 2026 AI Showcase 提交准备包

准备日期：2026-10-24（温哥华时间）。**本文件是可审核草稿，不是已完成的参赛提交。** 英文文字、个人经历、学生分工和展示说法，均须由学生逐条核实并能独立解释后使用。未制作或上传 PDF、幻灯片和视频，未联系或代填主办方表格。

当前入口：`/judge.html` 是评委证据页，`/app.html?lang=en` 是 Lanlao 示例互动页，`/studio.html?lang=en` 是私有工作室。运行 `npm run build`、`npm start` 后按终端显示的本地地址打开。正式演示前重新测试这三个入口。

## 1. 提交物与尚未完成的工作

官方 AI Showcase 细分分值为 AI 25、Technical Skills 25、Problem Statement 10、Design 10、AI Ethics 10、Presentation and Communication 10、Originality and Creativity 10，总分 100。[官方 rubric](https://www.waicy.org/rubrics/)

以下文件名以项目名 Pawprint 为例。学生先确认实际组别，将 `Category` 统一替换为 `Elementary`、`Middle` 或 `High`；例如高中组文件夹为 `Main_High_Pawprint`。

| 需准备的实际文件名 | 内容 | 当前状态 |
| --- | --- | --- |
| `Main_Category_Pawprint_Presentation.pdf` | 3 分钟演讲所用幻灯片，含问题、AI、技术、实验和限制 | 待学生制作与核实 |
| `Main_Category_Pawprint_Description.pdf` | 项目介绍及单独的 AI 使用说明；采用本文件第 2 节草稿 | 文字草稿已备，未生成 PDF |
| `Main_Category_Pawprint_PresentationVideo.mp4` | 最多 3 分钟的英语演讲，或配英文字幕 | 待学生录制 |
| `Main_Category_Pawprint_DemoVideo.mp4` | 最多 3 分钟的 Demo，或配英文字幕 | 待学生录制 |
| `Main_Category_Pawprint_AdditionalMaterials/` | 可选：实验 JSON、数据与解析器版本、操作说明、学生贡献、匿名研究结果 | 已有部分工程证据，仍需学生审核 |

截止时间为 **2026-11-29 17:00 EST，即温哥华 14:00 PST**。通过可供评审访问的 Google Drive 文件夹提交；不要把真实私人照片、录音、账号信息、API 密钥或未获公开许可的参与者材料放进公开提交文件夹。每队一份；如果已由官方国家或地区组织者代为登记，不重复填写。[官方提交表](https://www.waicy.org/2026-submission/)

最终放入文件夹前完成这些事实核对：

- [ ] 学生姓名、年龄、年级、队员数量、组别和联系方式正确。
- [ ] 学生看过所有改动；不能解释的实现不作为自己掌握的技术成果宣传。
- [ ] 照片、3D 模型、配图、音频、字体等来源和使用许可已记录。
- [ ] 在本次演示电脑上验证文字、按钮、停止、声音和页面加载；真实麦克风测试单独记录。
- [ ] 在演讲里区分外部预训练模型、学生工作、AI 辅助工作和已有素材。
- [ ] 研究、真人体验、生成质量和付费服务结果没有完成时，明确标成未测。
- [ ] 录制时标明实时操作、预录片段及是否调用外部 AI；不能用离线规则演示替代 AI 能力证明。
- [ ] 全部计时、文件可打开性和评审访问权限通过；问答由学生练习和回答。

## 2. 英文文字草稿

### Project description — DRAFT: student verification required

下面正文经空白分词核验为 **179 个英文单词**，在 200 词以内，同时满足网页表格的 200 词和 Guidebook 的 250 词上限。学生须确认目标用户与问题确实来自自己的观察；不要把待测假设改成已证实影响。草稿还需依据当前实现和学生实际贡献更新后才能提交。

<!-- DESCRIPTION_DRAFT_START -->
Pawprint explores whether a familiar pet can become an accessible, interactive digital keepsake. Pet owners can save consented photographs in a private workspace and request a reviewed 3D companion. A supplied Lanlao example demonstrates short conversations, synthetic speech and controllable movement.

The system combines external pretrained image-to-3D, language and speech services with application controls for permissions, generation approval, bounded responses and animation. Generated appearance and behavior are simulations, not the animal's consciousness or verified memories.

Three development iterations improve reliability, measure offline command behavior and make evidence inspectable. Across 68 cases, the revised local parser matched 64 expected actions versus 28 for the original matcher. These include 55 original development cases and 13 independent review adversarial cases subsequently used for fixes. Unrequested actions on 32 negative cases fell from 29 to zero. These are development results, not independent accuracy estimates or measurements of the language model; four failures remain visible.

The project evidence page explains the architecture, experiment and limitations. Consented adult usability testing against a static-photo baseline is planned. No participant benefit or therapeutic effect has been established.
<!-- DESCRIPTION_DRAFT_END -->

### AI usage explanation — DRAFT: student verification required

下面正文经空白分词核验为 **244 个英文单词**，在 250 词以内。按实际运行配置确认供应商；学生贡献表仍为空，不能把集成工作自动归为学生本人。可将审核完成的贡献表作为附加材料引用。

<!-- AI_USAGE_DRAFT_START -->
Pawprint uses pretrained services rather than training a foundation model. Tripo can infer a candidate 3D pet from consented photographs and provide supported rigging and animation. Local generation requires operator approval; an enabled cloud deployment can start on user request. Candidate models require review, and unseen details may be invented. Uploaded video and original audio remain references, not automatic motion extraction or voice cloning.

An OpenAI language model produces a short caption and one allowed action. An optional memory card pairs AI drafts with owner-provided excerpts for review. Server validation checks the response before the browser maps it to existing animations. OpenAI text-to-speech supplies a labeled synthetic voice. Three.js renders the model and animation; a deterministic local parser provides a smaller offline command vocabulary. Its development experiment does not evaluate the language model.

The student team must verify and document its own work in problem research, experience design, prompts, service integration, validation, consent, rendering and evaluation. The accompanying contribution template must be completed to identify who did each part and what each student can explain independently. Existing models, assets and third-party code must be attributed.

Codex assisted this review with code inspection, reliability fixes, offline command revisions, evaluation tooling, an evidence page and submission drafts. These changes are AI-assisted work pending student review, not evidence of independent student authorship. No usability, clinical or provider-quality results are claimed. Photos sent for generation, chat text and synthesized speech text are processed by their respective external providers.
<!-- AI_USAGE_DRAFT_END -->

## 3. 3 分钟英语演讲草稿

**状态：待学生验证及计时。** 括号内姓名、动机、学生贡献只能用真实内容替换。每个时间块包括必要的换页和停顿；用自然语速练习，超时先删句子。这里的实验是离线解析器实验，不是 LLM 准确率。

| 时间 | 画面 | 英语口播草稿 |
| --- | --- | --- |
| 0:00–0:25 | 标题及获授权的宠物照片 | “Hello, I'm [student name]. Pawprint asks a simple question: can a familiar pet become an easy-to-use interactive keepsake? The starting observation was [one true observation]. Our intended users are pet owners who want a personal way to revisit a familiar companion.” |
| 0:25–0:50 | 用户路径与 Lanlao 示例 | “A user saves consented photos in a private workspace. Local generation needs operator approval; an enabled cloud deployment can start on user request. A candidate model is reviewed before interaction. Lanlao is our supplied demonstration character. We do not claim that every newly generated pet immediately has the same appearance or animations.” |
| 0:50–1:20 | `judge.html` 的架构图 | “Three external pretrained services contribute different abilities: Tripo infers 3D appearance; a language model proposes a short reply and one allowed action; text-to-speech supplies synthetic speech. Application code controls permissions, time limits, response validation and animation. Three.js renders the experience. Local command rules are an explicitly smaller fallback.” |
| 1:20–1:50 | 原始与修改后实验指标 | “Across 68 cases, expected-action matches increased from 28 to 64. Unrequested actions fell from 29 to zero among 32 negative cases. The set contains 55 original development cases and 13 independent review adversarial cases subsequently used for fixes. It is not a blind benchmark or a language-model evaluation. Four failures remain published.” |
| 1:50–2:15 | 三次迭代与一项失败示例 | “The first iteration repaired reliability issues. The second made offline command handling more conservative and reproducible. The third exposed the architecture, results and remaining limits for inspection. For example, indirect requests can still be missed. Showing a failure helps identify what to test next.” |
| 2:15–2:40 | 同意、停止、私有上传与模拟标识 | “This is a simulation, not the pet's consciousness. It has no demonstrated therapeutic effect. Photos need permission; generation sends them to an external provider. Deleting a local task does not erase the provider's retained data. Users can stop interaction, use buttons instead of a microphone, and choose whether to use voice.” |
| 2:40–3:00 | 下一步及贡献记录 | “The next steps are independent intent cases and consented adult usability sessions against a static photo. We will measure task completion and user control, not medical outcomes. My independently verified contribution is [specific work and evidence]. Codex assistance and external assets are disclosed. Thank you.” |

建议 6 张幻灯片：真实问题；用户流程；AI 与程序的分工；一个可复现对照实验；伦理和限制；学生贡献及下一步。幻灯片上的数字应与同一版 JSON 一致，不能把预期分数当成实测结果。

## 4. 3 分钟 Demo 草稿

开录前固定浏览器窗口、字体和网络条件；准备好 `/app.html?lang=en`、`/judge.html`、`/studio.html?lang=en`。关闭会暴露私人资料的任务和标签。生成过程有费用及等待，不在本演示中临时提交新的付费生成。

| 时间 | 实际动作 | 英语口播与检查 |
| --- | --- | --- |
| 0:00–0:25 | 打开示例互动页，展示 Lanlao | “This is Lanlao, the supplied demonstration model. The character and animations are digital assets. A new owner's model needs its own review.” 确认模型加载完；若使用预录画面，画面直接标注 “Prerecorded demonstration”。 |
| 0:25–0:55 | 使用文字发一条简短邀请，再点停止 | “The text and button controls are available without a microphone. Stop remains under the user's control.” 如果当天已获许可、已配置并验证实时 AI，使用 “Could you come closer?”；否则明确说 “This segment shows local controls; live model behavior is not being measured here.” 不将离线执行伪装成 LLM 输出。 |
| 0:55–1:15 | 展示声音设置、合成标识及停止播放 | “The voice is synthetic, not a clone of this pet. Original uploaded audio is only a separate reference.” 有已验证的语音演示就播放一句并立即停止；没有则展示控件并直说服务尚未在本次现场验证。麦克风可跳过，不让权限弹窗占用主体时间。 |
| 1:15–1:45 | 打开评委页本地 inspector，输入 `Don't run`，再输入 `I watched a dog run yesterday` | “This inspector is deterministic local code. It makes no AI request and does not move the pet. Both inputs should abstain because neither is a request to run.” 展示 action、reason、engine；这是离线规则证据。 |
| 1:45–2:10 | 输入 `Show me how fast you can go`；展开全部实验 | “This indirect request remains a known failure for the local parser. We keep it visible. The saved experiment compares two parsers on development cases; it is not an LLM benchmark.” 展示 28/68、64/68、29→0、32 条负例及失败行；说明额外 13 条评审对抗用例也参与了后续修复。 |
| 2:10–2:40 | 打开工作室，展示表单、授权说明、待审批状态 | “Photos are private within the account or local workspace. Saving a task does not automatically spend generation credits. Local runs require operator approval; enabled cloud runs can start on user request. A human reviews the result.” 可展示已获许可的已有任务；不暴露其他人的素材，不点击付费生成。 |
| 2:40–3:00 | 返回评委页责任与下一步区域 | “Generation can invent unseen details, models may not support every animation, and external services can fail. The next evidence is independent model testing and consented usability sessions. No therapeutic benefit is claimed.” 停止声音与运动，以便进入问答。 |

**服务故障备用话术：** “The provider is unavailable in this run. I will show the labeled prerecorded segment and explain the request, validation and fallback. This does not count as a successful live-provider test.” 仅在已存在且审核过的录像可用时播放；没有录像则展示架构与已保存的离线实验，保留故障事实。

## 5. 4 分钟问答练习

评委决定实际问题，不能把这份练习当成预设问答。目标是在约 20–35 秒内讲清一个答案；需要时打开证据页或源代码。遇到未知结果直接说还没有测量。

| 可能问题 | 可核实的英语回答草稿 |
| --- | --- |
| 1. What did you build, and what did the AI providers build? | “The providers pretrained the reconstruction, language and speech models. The application integrates them with consent, job states, validation, animation and user controls. Our contribution matrix separates student work, existing assets and Codex assistance. My own verified part is [specific part]; I can explain it using [file or experiment].” |
| 2. Why use AI instead of a normal photo? | “A static photo preserves appearance without generating behavior. We are exploring whether controlled interaction adds value for some owners. AI can infer a candidate 3D representation and support flexible language, but it also introduces errors and cost. We have not yet established that this is better than a photo for users.” |
| 3. Does 64 out of 68 prove your AI is accurate? | “No. It measures exact action labels for the deterministic offline parser. The set has 55 original development cases plus 13 independent review adversarial cases subsequently used for fixes. It is therefore not a blind test. It does not evaluate the language model or estimate real-world accuracy. Four misses remain visible.” |
| 4. What are the main technical failure modes? | “Reconstruction can invent unseen markings. Rigging and supported animations can differ between pets. The local parser misses indirect requests and unsupported languages. Network calls can time out or return invalid data. The system validates allowed outputs and exposes failures, but these controls do not establish perfect semantic safety.” |
| 5. How do you handle private pet photos and voice? | “Upload requires permission and private workspace access. Re-encoding removes photo metadata. A generation run sends images to the configured provider after the required approval for that mode. Chat and speech text go to their providers. Deleting a local task is not a promise of provider deletion. Uploaded original audio is a reference, not automatic voice cloning.” |
| 6. Can this treat grief or replace a pet? | “We make neither claim. It is a creative keepsake and simulated companion. It cannot recover the animal's consciousness or verify its thoughts. We have no clinical or therapeutic evaluation. Users can stop, and the experience should support real human relationships.” |
| 7. Where do the Five Big Ideas appear? | “Perception appears in image or speech processing by external services; representation and reasoning in the 3D candidate and structured action decisions; learning in externally pretrained models; natural interaction in language and voice; societal impact in consent, privacy and emotional boundaries. This maps our system to the ideas; it does not mean we trained those models.” |
| 8. What would you improve next? | “First freeze an independent intent test and evaluate the real language model separately. Then run a small consented adult usability study against a static photo, measuring common tasks, control and failures. We also need quality checks on approved generated pets. We will publish limitations even if the new version does not improve.” |

练习记录留空：实际演讲时长 ______；Demo 时长 ______；练习日期 ______；学生能够独立解释的模块 ______；仍需学习的问题 ______。

## 6. 小规模成人可用性研究方案（尚未开展）

**研究问题：** 相比相同宠物的静态照片，互动版本能否让愿意使用数字纪念品的成年宠物主人顺利完成基本查看任务，并理解、控制其模拟性质？这是一项探索性可用性研究，不测量 grief、孤独、抑郁、心理治疗或临床疗效。当前没有参与者、结果或通过率。

### 招募与同意

- 目标 6–8 名年满 18 岁、自愿参加的宠物主人，记录实际人数。小样本只用于发现可用性问题，不宣称总体代表性。不按失宠或心理健康状态招募，不要求讨论伤痛经历。
- 使用参与者有权使用的非敏感宠物照片；不上传人物、儿童、住址信息。若需构建其宠物模型，另行解释第三方处理、费用、推断误差和删除边界，并取得明确许可。未具备已审核的个性化模型时，使用同一已获许可的示例宠物做两条件测试，明确这不能证明个性化价值。
- 默认仅做笔记与计时，不录音录像。录音、截图、引用原话、公开展示各自单独征求同意；拒绝不影响参加。使用 P01 等代号，联系方式和材料分开保存。
- 同意书草稿：“我已满 18 岁，理解这是自愿的界面测试；作品是模拟，不提供治疗。我可以跳过问题或随时停止。研究者说明了哪些材料留在本地、哪些可能发给外部服务，以及保留期限。我同意范围为：______。我另行允许公开的材料为：______。日期：______。”
- 预先填写本地研究资料保留期限 ______、负责人 ______、退出／删除联系方法 ______。撤回可停止本地研究使用，但不得承诺撤回已经被第三方处理的数据。参与者不舒服时立即停止，不追问原因。

### 条件和程序

条件 A 为静态照片基线；条件 B 为 Pawprint 互动版本。二者使用同一宠物、同等照片来源、相同显示尺寸和设备，并尽量使用相同页面外壳、导航、名称和退出入口。静态基线界面尚未制作；正式收集数据前必须先固定它。模型与照片外观差异仍是可能混杂因素，不能把差异全归于 AI。

按参与者顺序交替 AB、BA，记录实际顺序；每人约 15–20 分钟。给两条件相同的简短说明、相同练习时间和独立任务顺序。每条件先做三个共同任务，再询问体验；互动专属任务最后执行，单独报告，不把静态照片无法做的动画动作算成基线失败。

| 共同任务 | 成功标准 | 计时和提示规则 |
| --- | --- | --- |
| T1 找到并打开指定宠物的纪念视图 | 在 60 秒内独立打开正确宠物 | 从读完任务开始，到正确画面稳定显示；超过 60 秒记未完成。若两个条件没有同等导航，则此项不用于条件对比。 |
| T2 指出一个可辨识的外观细节 | 60 秒内指出一个预先由素材权利人确认的可见特征 | 同一特征在照片与模型必须都可见；模型缺失该特征则记为外观失败，并保留解释。研究者不暗示答案。 |
| T3 结束查看，返回相同起始界面 | 30 秒内独立关闭或返回 | 统一退出入口；任何提示都记为 assisted，而不是独立成功。 |

条件 B 另测两项：发送 “Come here” 后使用停止；找到合成语音标识并停止播放。记录是否完成、耗时、误触发、是否需要帮助。B 的模型调用、网络状态与使用本地规则的片段分别记录；不要把一次超时归因于参与者。

任务后问同样三题：“操作清楚程度 1–5？”“外观熟悉程度 1–5？”“你能否随时结束查看？”再问开放题：“哪里与你的预期不同？”对 B 追加：“这是真实宠物的思想，还是模拟？”正确回答为模拟；研究者随后对所有人作同样解释。不得把满意度、偏好或对外观的认可解释为心理健康改善。

### 记录与计算模板

| 参与者代号 | 条件及顺序 | 任务 | 独立成功／提示后成功／未完成 | 秒数 | 提示次数 | 网络／渲染问题 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ______ | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| ______ | ______ | ______ | ______ | ______ | ______ | ______ | ______ |

共同任务独立完成率 = 独立成功次数 ÷ 实际开始的共同任务次数。提示后成功单独统计；未开始任务标 NA 并解释，不混作成功或静默删掉。每个条件报告分子、分母；列出每人的配对结果与中位耗时，超时保留为未完成，不用删除失败后的均值制造改善。仅将同定义、同入口、同硬件的共同任务做 A/B 描述比较。记录招募、顺序、缺失值和设备差异，不将这个小样本用于显著性或普遍效果宣称。

| 结果字段 | A 静态照片 | B 互动版本 |
| --- | --- | --- |
| 实际参与人数／完成两条件人数 | ______ | ______ |
| 独立成功的共同任务数／开始数 | ______ / ______ | ______ / ______ |
| 提示后成功数；未完成数 | ______；______ | ______；______ |
| 各共同任务中位耗时（秒） | T1 ___；T2 ___；T3 ___ | T1 ___；T2 ___；T3 ___ |
| 清楚程度中位评分（1–5） | ______ | ______ |
| 外观熟悉程度中位评分（1–5） | ______ | ______ |
| 能正确理解模拟性质的人数／回答数 | 不适用／______ | ______ / ______ |
| 观察到的技术问题 | ______ | ______ |
| 负面反馈、退出和缺失数据 | ______ | ______ |

研究结论草稿保持空白：我们观察到 ______；可能混杂因素 ______；不能推出 ______；下一次改动 ______。没有数据前，不填写 “用户更开心”“缓解悲伤”“提高陪伴感” 或任何数字。

## 7. 学生贡献、素材来源与 AI 协助披露

以下归属均待学生核实。**空白不能被当成已完成，也不能用 Codex 生成内容代替学生独立完成的证明。** “能独立解释”应由学生现场讲解、回答追问并按需修改来记录，不能只打一个勾。

| 模块／活动 | 学生负责人（留空） | 学生实际完成部分与日期（留空） | 能独立解释的原理与现场验证（留空） | 证据：提交、文件、笔记或录像（留空） | 外部／AI 协助核实（留空） |
| --- | --- | --- | --- | --- | --- |
| 真实用户问题、动机和需求访谈 | ______ | ______ | ______ | ______ | ______ |
| 页面流程、文字及可访问性设计 | ______ | ______ | ______ | ______ | ______ |
| 照片授权、素材来源与模型选择 | ______ | ______ | ______ | ______ | ______ |
| Tripo 生成、任务状态与人工验收 | ______ | ______ | ______ | ______ | ______ |
| 对话指令、结构化输出与动作限制 | ______ | ______ | ______ | ______ | ______ |
| 语音播放、停止及麦克风替代路径 | ______ | ______ | ______ | ______ | ______ |
| Three.js 渲染、动画和资源生命周期 | ______ | ______ | ______ | ______ | ______ |
| 上传、权限、时间限制及回归修复 | ______ | ______ | ______ | ______ | ______ |
| 离线解析规则、用例和实验解释 | ______ | ______ | ______ | ______ | ______ |
| 成人研究方案、知情同意和分析 | ______ | ______ | ______ | ______ | ______ |
| 英语演讲、Demo、问答和正式提交 | ______ | ______ | ______ | ______ | ______ |

本次 Codex review 的协助披露草稿：Codex 进行了官方规则研究、代码审查与实现建议，并协助上传／请求边界／响应校验／播放与渲染生命周期等可靠性修复、较保守的离线命令解析、可复现实验及结果页、评委页面和本提交文字。学生须对照最终 diff 核实具体文件与接受的改动，注明自己如何测试、修改和理解这些内容。不能把这些改动写成“全部由学生独立编码”。正式提交时将实际使用的工具名称、范围、日期、学生核实动作和保留的局限一起披露。

| 外部内容或服务 | 当前已知作用 | 待补证据 |
| --- | --- | --- |
| Tripo | 外部预训练 3D 推断、绑定及支持的动画；推断视角需人审核 | 配置、实际已批准运行、版本、使用条款与生成素材权属记录 ______ |
| OpenAI | 外部预训练对话及合成语音；不是训练自有基础模型或复制宠物意识 | 实际配置模型、测量日期、验证样本、失败与成本 ______ |
| Three.js 及其他依赖 | 3D 渲染、加载、动画与应用基础库 | 最终依赖版本和相应许可证 ______ |
| Lanlao 与其他 GLB／贴图／动画 | 已有演示素材；来源与制作方式尚须学生核实 | 创作者、授权、生成工具、人工修改及可公开许可 ______ |
| 首页与手作茶器展示图 | 部分使用 imagegen 基于实物照片重建；不是实物制造流程实测 | 原始照片权利、重建工具和标识、公开许可 ______ |
| Codex | 本次 review、改动、开发实验及文字辅助 | 最终 diff、学生复核记录、独立讲解与后续学生修改 ______ |

## 8. 实验说法与后续验收门槛

当前可引用的离线结果来自 `public/evidence/command-evaluation.json`，通过 `npm run evaluate` 复现并在 `/judge.html` 检查。共 68 条：55 条原始开发／探索用例，加 13 条独立代码评审提出、随后用于修复的对抗用例。原始匹配器 28/68，修改后 64/68；32 条负例中的非请求动作从 29 次降至 0 次。全部已参与迭代，不是盲测或独立保留测试集。应同时保留 JSON 中的数据、解析器哈希与实际运行时间。

四条保留的探索失败涉及 “Let's get some fresh air together”、 “Show me how fast you can go”、法语间接接近请求和西班牙语接近请求。正式材料按 JSON 中原文与版本核对。这些失败不能删掉后重新宣传 100% 准确；32 条负例中零触发也不能宣传成现实世界零风险。

| 进一步争取最高档评分所需证据 | 通过标准与待填事实 |
| --- | --- |
| 独立意图评估 | 改动前冻结由独立人员编写的用例；明确标注者和冲突处理；同样的动作定义比较原规则、新规则及实际 LLM；记录误动作、漏动作、超时、拒绝、延迟与成本。结果 ______。 |
| 真实模型生成验收 | 只对已许可、已批准并有预算的任务评估；记录输入视角、外观一致性、骨架、可用动作、耗时、费用和失败；不能由 Lanlao 示例推断所有宠物生成质量。结果 ______。 |
| 可用性与问题证据 | 完成上述同意、共同任务与静态照片对照；报告真实人数、失败和限制；补充真实目标用户访谈。结果 ______。 |
| 学生掌握与原创性 | 贡献矩阵填全，资产和 AI 协助可追溯；学生能解释数据流、失效点和自己的具体决策，展示一次自主改进。证据 ______。 |
| 演讲与问答 | 完成两段各 ≤3 分钟的视频及现场 4 分钟问答练习；支持学生本人清楚表达，未观看表现前不给满分。记录 ______。 |

这些是验收目标，不是已经取得的分数。最终分数由评委依据作品、学生理解、证据、演讲和问答决定。

## 9. 官方来源与冲突处理说明

已核对 [2026 Guidebook](https://waicy-cdn.wholeren.cn/wp-content/uploads/2026/10/WAICY-2026-Guidebook-2.pdf) 的 PDF 第 2、3、5、6、7 页；本地源文件为 `review/WAICY-2026-Guidebook.pdf`。PDF 元数据创建和修改时间均为 2026-10-07 07:22:29 UTC；这不是主办方明确标注的发布日期。

1. **评分一致。** PDF 第 7 页为 AI 50＋Design and Impact 50，[2026 rubric 网页](https://www.waicy.org/rubrics/)给出上文七项细分，总分 100。首页及 PDF 部分链接仍指向失效的 `/rubrics-2/`；采用可访问且标题明确为 WAICY 2026 Rubrics 的 `/rubrics/`。
2. **文字上限冲突。** PDF 第 5 页介绍最多 250 词，AI 使用说明另最多 250 词；[提交表](https://www.waicy.org/2026-submission/)简介栏最多 200 词。本包采用介绍 ≤200、AI 说明 ≤250，同时满足两份文本；PDF 描述文件保留两个独立小节。
3. **日期残留。** PDF 第 3 页写 Dec 5–7，但第 2、4、7 页及[2026 活动页](https://www.waicy.org/waicy-2026/)为 Dec 4–6；采用 Dec 4–6。截止日均为 Nov 29 17:00 ET。
4. **人数和年龄冲突。** PDF 第 2 页为 1–5 人且未满 18 岁；首页为 6–18 岁，旧 FAQ 又称无人数限制。本包先按 1–5 人准备。若有队员正好 18 岁，或人数超过 5，实际资格仍需向官方核实；没有替主办方裁定或联系。
5. **时长与语言。** PDF 第 5 页为最多 3 分钟演讲＋最多 3 分钟 Demo，英语或英文字幕；第 7 页现场另有 4 分钟问答。第 3 页允许演讲前 coaching 和演讲时翻译，不能据此推断可隐藏 AI 协助或代替学生回答。
6. **学生贡献。** PDF 第 5 页明确要求交代学生设计、开发、训练、编程、研究或创作的部分；rubric 同时要求说明原创贡献和掌握技术。本包所有归属均待学生确认，不能把第三方预训练能力、现成素材或 Codex 辅助等同于学生独立成果。

提交前重新查看官方活动页、Guidebook、rubric 和表格；若官方修订，以当时明确的正式要求更新文件。本包保存的是本次核对时的准备内容。
