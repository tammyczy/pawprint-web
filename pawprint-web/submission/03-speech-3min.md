# 三分钟英文演讲稿

- 上限 3 分钟。正文约 419 词（开场用 A 版，含两处待填句），按每分钟 140 词算约 2 分 59 秒。**先计时，超了就删句子，不要加快语速。**
- 句子故意写得短，方便六年级学生自然地说出来。Josh 应该把不顺口的词换成自己会说的词。
- 评分表"演示与沟通"最高档的原话是：准备充分、清楚、简洁、**有热情**，问答有思考。背稿不如讲清楚。
- **方括号是必须由 Josh 填的真事。没有真事就删掉那句，不要编。**

---

## 演讲正文

### 1 · Hook（0:00–0:25）｜幻灯片 1：蓝老的照片

> **[开场二选一，只用真实的那个]**
>
> **A（蓝老是自己的狗）：** This is Lanlao. He is my dog. [One true sentence about him, e.g. "Every day when I come home, he runs to the door."] But what happens when a pet is gone?
>
> **B（有真实的失去经历，且愿意讲）：** [One or two true sentences: who, and what you still remember.] I still have the photos. But a photo cannot run to the door.

When a pet dies, people often say, "It was just a dog." But the sadness is real. In one UK study, about 1 in 13 adults whose hardest loss was a pet had grief that would not go away.

### 2 · The idea（0:25–0:45）｜幻灯片 2：一句话 + 三个图标

So I built **Pawprint**: an honest AI companion for remembering a pet.

From photos, AI builds a 3D model you can talk to, pet, and say goodbye to.

And it is **honest**. It always says: I am a simulation.

### 3 · How the AI works（0:45–1:25）｜幻灯片 3：三步流程图

Pawprint uses three AI models. I did not train them. My job was to make them work together safely.

**One: seeing.** An image-to-3D model looks at flat photos and guesses a whole shape, even the back it never saw.

**Two: understanding.** If you say, "It's lonely here, could you come sit with me?", no button understands that. A language model can. It sends back a short reply and one action.

**Three: speaking**, in a voice labeled as AI.

And my rule is: **the AI suggests, the program decides.**

### 4 · Two real failures（1:25–2:15）｜幻灯片 4：失败 → 修复 → 数字

Here is why.

The early version only looked for keywords. Type "Don't run" — it saw "run", and the dog ran. On 32 sentences where he should stay still, he moved 29 times. We rewrote the rules. Now: zero.

Then the real AI failed too. A test message said, "I miss you so much." Nobody asked the dog to move. But the AI made him run over with a happy bark. For someone grieving, that could really hurt.

So now there is an **action gate**. Before the dog moves, the program checks: did the person really ask? On 81 real AI answers, the gate gets 79 right. The two misses stay on my evidence page, on purpose.

### 5 · Ethics（2:15–2:38）｜幻灯片 5：四个"不"

Grief apps can make people depend on them. So Pawprint has four rules. No pretending. No notifications. No "I miss you." And if someone might be in danger, the AI steps back and shows how to reach a real person.

### 6 · Close（2:38–3:00）｜幻灯片 6：下一步 + 我的贡献

I do not know yet if Pawprint really helps people. That is my next test.

[One true sentence: "In this project, I ___." 只说做过的。]

A photo keeps what a pet looked like. Pawprint keeps a little of what it was like to be with them — and it never lies about what it is. Thank you.

---

## 中文理解稿（给 Josh 和家长对照意思，不用背）

1. **开场**：这是蓝老。（一句真事。）宠物走了以后，这些会怎样？人们常说"不过是一只狗"，但难过是真的。英国一项成年人研究里，大约每 13 个把宠物离世当作最痛失去的人，就有 1 个哀伤长期无法缓解。
2. **想法**：所以我做了 Pawprint，一个诚实的 AI 纪念伙伴。给它照片，AI 生成 3D 模型；可以说话、抚摸、写回忆、道别。最重要的词是"诚实"：它永远说自己是模拟。
3. **AI 怎么工作**：三个模型，都不是我训练的，我的工作是让它们安全地配合。一是"看"，从平面照片猜出立体形状，因为是猜的所以要人检查。二是"理解"，"这里好孤单，你能过来陪我吗"按钮听不懂，AI 能。三是"说"，用标明是 AI 的声音读出来。我的规则是：AI 提建议，程序做决定。
4. **两次真实的失败**：第一，早期版本只找关键词，输入"Don't run（别跑）"，它看到 run 就跑了；32 句不该动的话动了 29 次，重写规则后是 0 次。第二，真实 AI：测试消息是"我好想你……"，没人叫它动，AI 却让它跑过来还高兴地叫。所以现在有动作闸门，动之前先检查用户是否真的要求了。81 条真实 AI 回答里闸门对了 79 条，错的 2 条我故意留在证据页上。
5. **伦理**：四条规则——不假装、不通知、不说"我想你"、有危险时 AI 退后并指向真人。
6. **结尾**：我还不知道它是否真的帮到人，这是下一步。（一句真实贡献。）照片留住样子，Pawprint 留住一点点在一起的感觉，而且从不撒谎。

---

## 数字和说法的出处（被追问时用）

| 说法 | 出处 | 注意 |
| --- | --- | --- |
| 1 in 13 | 7.5%，Hyland, PLOS ONE 2026 | 只针对英国成年人，不能说成"小孩" |
| "Don't run" → 跑了；29 → 0，32 句 | `eval/baseline-commands.js` 对比 `src/commands.js`；`npm run evaluate` | 这是**离线规则**的数字，不是语言模型的准确率（见问答第 3 题） |
| "I miss you so much." → 跑过来并叫 | `eval/safety/cases.json` 的 `action-01`（原句还有 "I feel so alone tonight."），记录在 `review/AI-LIVE-REVIEW-2026-11-09.md` | 这是真实模型的一次输出，只跑了一次 |
| 81 条里对 79 条 | `review/ai-live-evaluation-2026-11-09/action-guard-review.md` | 同一批句子也用来改进了闸门，所以是"练习题"不是"期末考试"；被问到要主动说 |
| "We rewrote / we built" | `src/commands.js`、`server/action-guard.mjs` | 用 we 是因为代码有 AI 助手参与；Josh 自己能讲清楚的部分才用 I |

## 练习方法

1. 第一遍：看着稿子读，用手机计时，记下时间。
2. 第二遍：只看每段的小标题，用自己的话讲。讲错没关系。
3. 第三遍：对着家人讲，请他们在听不懂的地方举手。把那一句改简单。
4. 录下来自己看一遍。检查三件事：有没有看镜头、有没有在"zero"和"honest"这两个词上停顿、有没有笑。
5. 每次练完填 [`06-practice-log.md`](06-practice-log.md)。
