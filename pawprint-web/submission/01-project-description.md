# Project Description（项目介绍）

限制：在线提交表 ≤200 词，指南 ≤250 词。下面的正文控制在 200 词以内，两边都满足。
**方括号里的内容必须换成真实情况，否则整句删掉。**

---

## English（提交用）

<!-- DESCRIPTION_START -->
When a pet dies, people are often told, "It was just a dog." But the sadness is real. In one UK study of adults whose hardest loss was a pet, 7.5% showed signs of long-lasting grief. A photo shows what a pet looked like. It cannot show what being with them felt like.

Pawprint is an honest AI companion for remembering a pet. From an owner's photos, AI builds a 3D model. You can talk to it, call it closer, pet it, write a memory, and say goodbye.

Honest means it never pretends. It always says it is a simulation. It sends no notifications and never says "I miss you", because grief apps can create dependence. If someone seems in danger, it points to real people.

AI makes mistakes, so I test it. An early version heard "Don't run" and ran. In another test, the AI sent the dog running to a sad person who never asked. Now an action gate checks every move against what the person really said. On 32 "should not move" test sentences, wrong moves fell from 29 to 0.

Pawprint does not claim to heal grief. It offers a gentle way to remember.
<!-- DESCRIPTION_END -->

---

## 中文对照（帮助理解，不提交）

宠物去世时，人们常常听到"不过是一只狗"。可是难过是真的。英国一项研究里，把宠物离世当作最痛苦失去的成年人中，7.5% 出现了长期哀伤的迹象。照片能留住宠物的样子，却留不住和它在一起的感觉。

Pawprint 是一个诚实的 AI 纪念伙伴。AI 根据主人的照片生成 3D 模型。你可以和它说话、叫它过来、摸摸它、写下一段回忆，准备好了再道别。

"诚实"的意思是它从不假装。它始终说明自己是模拟，不是宠物回来了。它不发通知，也不说"我想你"，因为这类应用可能让人产生依赖。如果有人看起来有危险，它会停下来，指向真人的帮助。

AI 会犯错，所以我测试它。早期版本听到"Don't run（别跑）"反而跑了。另一次测试里，一个难过的人并没有要求，AI 却让小狗冲了过去。现在有一个"动作闸门"，把每个动作和用户真正说的话对照检查。在 32 条"不该动"的测试句上，错误动作从 29 次降到 0 次。

Pawprint 不声称能治愈哀伤。它提供一种温和、可控的纪念方式。

---

## 提交前逐句核对

| 句子里的事实 | 出处 | Josh 需要确认 |
| --- | --- | --- |
| 7.5% | Hyland, PLOS ONE 2026，只针对英国成年人 | 被问到时要说 "adults in the UK, not kids" |
| AI builds a 3D model from photos | Tripo；目前只跑通过模拟流程和已有模型 | **交件前最好完成一次真实生成**，否则把这句改成 "AI can build" |
| 29 → 0 | `npm run evaluate`，32 条"不该动"的开发样例 | 要会说 "these are my development cases, not a blind test" |
| "an action gate checks every move" | `server/action-guard.mjs` | **只有 Josh 真的参与设计、测试并能讲清楚时才用 "I"**；否则改成 "we" 并在 AI 使用说明里写清分工 |
