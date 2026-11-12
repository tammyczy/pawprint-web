# 四分钟问答练习

问答是这个项目**最容易丢分、也最容易拉开差距**的地方。评分表里：

- "演示与沟通"最高档要求 *thoughtful answers*；
- "原创性"要求把**自己的贡献和别人的区分清楚**；
- "AI"最高档要求对五大理念有 *superb understanding*。

这个项目的代码有大量 AI 助手参与。这不违规，但评委一定会问"哪部分是你做的"。**唯一安全的策略是说实话，并且对自己说的每一句都能往下讲两层。** 下面的答案是起点，Josh 必须改成自己的话。每个答案控制在 20–30 秒。

答不上来时的万能句（真诚比硬撑得分高）：

> "I'm not sure. Here is what I do know: ___. I would test it by ___."

---

## A · 一定会被问到的 5 题

**1. Why do you need AI? Couldn't you just use buttons?**
> Buttons only know the words I planned. A grieving person does not talk in commands. They say, "It's lonely here, could you come sit with me?" Only a language model understands that. And only an image-to-3D model can turn flat photos into something you can walk around. But AI also makes mistakes, so I put a gate after it.

**2. Did you train the AI? What did you actually do yourself?**
> I did not train the big models. Tripo and OpenAI did. [My own work was: ___, ___ and ___.] I used AI coding assistants to help write the code, the same way a builder uses power tools. But I decided what to build, and I can explain how it works. For example, [pick one thing and explain it for 10 seconds].

*中文提示：这题的方括号是全场最重要的一句，必须是真的，而且 Josh 要能当场打开对应的页面或代码讲。*

**3. You said unwanted moves went from 29 to 0. Does that mean your AI is 100% accurate?**
> No. That number is for my offline rules, not the language model. And those 32 sentences are ones I used while fixing it, so it is like practice homework, not a final exam. For the real AI, the gate matched 79 of 81 answers, and two are still wrong. To really know, I need new sentences written by people who never saw my rules.

**4. Could this hurt someone who is grieving?**
> Yes, it could, and that is why I designed against it. Researchers warn about "griefbots" making people dependent. So Pawprint has no notifications and no streaks, and the AI is told never to say "I miss you" or "come back". It is also told never to forgive you "for the pet", because it cannot know. And if someone writes about hurting themselves, the AI does not answer at all; the page shows how to reach real people. But I have not tested it with real grieving people yet, so I cannot promise it is safe for everyone.

**5. Where does my data go?**
> Photos go to my server first, where the hidden location data is removed. They are only sent to Tripo after the person agrees. Chat text goes to OpenAI. The goodbye letter never leaves the browser. One honest limit: if you delete something here, I cannot promise the AI companies delete their copy.

---

## B · 五大理念（每条一句例子 + 一句局限）

**6. Where are the Five Big Ideas in your project?**
> **Perception:** the 3D model "sees" the shape of a dog in a photo. **Representation and reasoning:** a sentence becomes a small form with three boxes: reply, action, sound. Then my rules reason about it: did the person ask? **Learning:** the models learned from huge amounts of data before I used them. **Natural interaction:** you can type or speak in Chinese, English or French. **Societal impact:** grieving people are vulnerable, so honesty and control come first.

**7. What is the difference between your rules and machine learning?**
> My rules are written by hand: "if the sentence has 'don't', do not move." A learning model finds patterns from examples by itself. I tried a tiny learning model with 315 example sentences. It was right about 78% of the time on my practice set, but it could not tell "run" from "don't run", because it only looks at letters. So I kept the rules in charge of "don't". That taught me why learning models need a safety layer.

*中文提示：这题只有在 Josh 真的看过 `eval/intent/README.md` 并理解后才这样答。否则只答前两句。*

**8. How does image-to-3D know what the back of the dog looks like?**
> It does not know. It guesses, from thousands of other animals it saw in training. So it can invent a spot that is not there. That is why a person must approve the model before using it.

---

## C · 技术追问

**9. What happens if the AI says something wrong or is offline?**
> Three layers. First, the server checks the answer has the right shape and an allowed action. Second, the action gate. Third, if OpenAI is down or slow, the page falls back to local rules and tells you it did. And "stop" always works instantly, because it never goes to the internet.

**10. What was the hardest bug?**
> [Josh 选一个自己真正经历过的。备选：] The AI promised "I'm coming over!" in words but forgot to send the action, so the dog just stood there. Words and actions did not match. Now, for one clear command, the program adds the missing action and labels the reply as adjusted by the system.

**11. How do you know your tests are good?**
> There are 207 automatic tests, and they run without the internet, so they cost nothing. But tests only prove what I thought of. That is why I also sent real sentences to the real AI and read every answer.

**12. Why is the dog's movement so natural?**
> We studied how real dogs walk and trot. In a trot, the diagonal legs move together. The code also locks each paw to the floor while it is down, so the feet do not slide.

---

## D · 问题与原创

**13. Who is this for? Did you talk to real users?**
> People who have lost a pet. I have not done a user study yet. [If true: I talked with ___ about ___.] My plan is to ask adult pet owners to compare Pawprint with a plain photo, and measure whether they understand it is a simulation and feel in control.

**14. There are already AI pet apps. What is new here?**
> Some AI pet apps focus on making the pet feel as real as possible. Mine goes the other way. It is built around honesty: it says it is a simulation, it will not ask you to come back, and it lets you say goodbye. And it publishes its own mistakes on the evidence page.

**15. Is it okay to make a copy of a pet that died?**
> I think it depends on the person. Some people may find it comforting, some may find it too sad. So everything is a choice: you can just write a memory and never open the 3D pet. And it never pretends to be the real one.

**16. What would you do with more time?**
> Three things. Test with real people. Run a blind test with new sentences. And make a quiet mode with only photos and words, for people who do not want a moving pet.

---

## 给 Josh 的学习清单

答辩前，下面每一条都要能**不看稿讲 20 秒**。讲不出来的，要么学会，要么从演讲和文书里删掉相关的话。

- [ ] 用自己的话说出 Pawprint 是什么、给谁用。
- [ ] 三个 AI 各做什么；哪一个是"猜"的，为什么要人审核。
- [ ] "AI suggests, the program decides" 是什么意思，举一个例子。
- [ ] "Don't run" 为什么旧版会跑；打开评委页当场演示。
- [ ] 29→0 和 79/81 分别量的是什么，为什么都不是"准确率"。
- [ ] 四条伦理规则，以及每条在防什么。
- [ ] 数据去哪里：照片、聊天、道别信各一句。
- [ ] 五大理念各一个例子。
- [ ] 自己做了什么、AI 助手做了什么、大人帮了什么。
- [ ] 一个还没解决的问题，和打算怎么解决。
