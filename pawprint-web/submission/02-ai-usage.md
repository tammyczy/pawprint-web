# AI Usage Explanation（AI 使用说明）

限制：≤250 词。指南要求讲清三件事：用了什么 AI 技术、它起什么作用、**学生自己做了什么**。
最后一段是评委判断"原创性"的依据，必须由 Josh 按事实填写。

---

## English（提交用）

<!-- AI_USAGE_START -->
Pawprint uses three pretrained AI services. I did not train them.

1. **Seeing.** Tripo's image-to-3D model infers a 3D pet from photos, including sides the photo never showed. Because it guesses, a person must approve the result.
2. **Understanding.** An OpenAI language model reads a message and returns a short reply plus one action from a fixed list: come, walk, run, wag, jump, stop, or none.
3. **Speaking.** OpenAI text-to-speech reads the reply in a voice labeled synthetic, not a clone of any pet.

The AI proposes; the program decides. The server blocks any movement the person did not ask for. Privacy questions get a fixed, fact-checked answer. Messages about self-harm skip the AI and show ways to reach real people. Memory drafts must quote the owner's exact words.

**My work:** [Josh: 2–3 true sentences, about 45 words. The idea and why; what you designed; which test sentences you wrote; one failure you found and how it was fixed.]

**Help I received:** AI coding assistants (Codex, Claude) wrote and reviewed much of the code under my direction. [Adult's role] advised me. Three.js renders the 3D scene. Lanlao's model was [how it was made].
<!-- AI_USAGE_END -->

正文不含方括号是 160 词，给 Josh 的两处留了 90 词。填好后把两个标记之间的英文贴进任意数词工具核对，必须 ≤250。

---

## 中文对照

Pawprint 使用三个预训练的 AI 服务，它们不是我训练的。

1. **看（感知）。** Tripo 的图像转 3D 模型观察宠物照片，推断出立体形状，包括照片没拍到的侧面。因为它是猜的，所以必须有人审核结果。
2. **理解（自然交互、推理）。** OpenAI 语言模型读一句话，返回一句简短回复和一个动作，动作只能从固定列表里选。
3. **说。** OpenAI 语音合成用标明"合成"的声音读出回复，不是任何宠物的声音克隆。

AI 提建议，程序做决定。服务器把每个动作和用户真正的请求对照，没请求就拦下。隐私问题用核实过的固定答案，不让模型猜。涉及自伤的消息不经过 AI，直接显示联系真人的方式。记忆草稿必须逐字引用主人的原话。


---

## 五大理念对照表（答辩时用，不占字数）

| Big Idea | Pawprint 里的例子 | 一个局限 |
| --- | --- | --- |
| 1 Perception 感知 | 图像转 3D 从照片里"看出"形状；浏览器语音识别把声音变成文字 | 看不到的背面是猜的 |
| 2 Representation & Reasoning 表示与推理 | 宠物被表示成网格+骨骼；一句话被表示成 `{caption, action, sound}`；动作闸门用规则推理"用户真的要求了吗" | 规则没见过的说法会选择不动 |
| 3 Learning 学习 | 三个服务都是从大量数据中预训练出来的；我离线训练过一个 315 句的小分类器来理解"学习"是什么 | 小分类器不懂否定，"别跑"和"跑"很像，所以没上线 |
| 4 Natural Interaction 自然交互 | 中英法三种语言打字或说话；回复带语气的合成声音 | 语音识别会听错 |
| 5 Societal Impact 社会影响 | 哀伤中的人很脆弱：不假装复活、不制造依赖、隐私说实话、危机时交给真人 | 还没有做过真人研究，不知道是否真的有帮助 |
