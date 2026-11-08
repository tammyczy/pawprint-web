# 蓝老 Live 3D 行为研究

## 研究问题

站在原地的蓝老怎样表现出自然的生理活动、短暂的注意力变化，以及在无人发指令时也会发生的自主行为？这里采用已发表的犬只观察和实验研究，再结合模型实际能表现的动作。实验里的行为频率与情境只能作为设计参考。

| 行为 | 研究观察 | 在蓝老身上的取舍 |
| --- | --- | --- |
| 静息呼吸 | Rishniw 等比较了健康犬在睡眠和安静休息时的呼吸率。Fluoroscopic Estimation 研究用透视影像测量健康犬静息吸气和呼气时胸廓的尺寸变化。 | 保留约三秒一次的轻微胸廓起伏与节奏变化。对胸腔子骨骼做补偿，站着时四爪保持位置。 |
| 自发眨眼 | 犬眼动研究指出，统计出来的眨眼长度会随检测算法变化。另一项犬猫与人互动研究测得犬在该实验中平均约每分钟眨眼 6.5 次。DogFACS 的 AU145 把眨眼描述为上下眼睑合拢。 | 独立于指令与对视排程，眨眼间隔约 4–11 秒，一次约 190 毫秒。上睑行程较大，闭合后再打开。时间和比例是动画调校值。 |
| 主动看人 | Bognár 等在 125 只伴侣犬中测量了对陌生实验者建立眼神接触的速度，发现个体与犬种特征会影响表现。Savalli 等在任务中观察到狗会在主人和目标之间转移视线。 | 在短暂的一次注意力变化里，按当前 3D 镜头方向转头，随后放松。镜头在身后时让对视自然减弱。眼球画在贴图上，视线通过头部朝向表现。 |
| 嗅闻与自主活动 | 犬只独处录像研究记录了活动随独处时间变化的情况。Craven 等在气流实验中测量到犬嗅闻时快速而短促的吸气节奏。 | 安静间隔占主要时间。偶尔低头嗅闻，偶尔用已有步行动画小范围探索，然后停下。快速节奏只用在嗅闻中的极小幅动作。 |

## 模型约束与实现

- 两个蓝老 GLB 都把眼睛画在头部颜色贴图里。局部着色器用同一模型的眼周纹理实现上下睑遮挡，随原本的头部蒙皮一起移动。闭眼细节在近景更明显。
- 待机动作包含呼吸、眨眼、短暂看镜头、嗅闻、走几步和张望。各行为之间插入不同长度的停留。自主动作不发出声音。
- 视线使用 3D 场景镜头位置，不需要摄像头。现有指令会打断自主探索。舞台离开视口时暂停待机排程，系统要求减少动态效果时停用自主探索和眨眼。
- 当前骨架已支持坐下与趴下，使用支撑爪约束完成过渡。翻身仍需要重新制作接触和姿态。

## 走跑、跳跃与动作衔接

| 研究与观察 | 实现 |
| --- | --- |
| 犬只走路与小跑的支撑时序不同，小跑采用对角肢配对。模型本身已有对应步态。 | 从 GLB 测量支撑段速度与落爪相位，再让根节点位移、转向与动画播放速度同步。切换走跑时按实测接触相位交叉过渡。 |
| 动画的脚滑修正可在落脚期间锁定世界坐标，并在离地时渐进解除约束。 | 落爪记录场景位置，用两段骨骼求解修正水平滑移。爪子抬起时逐步释放修正，保留原本的摆动高度。 |
| 原地纵跳研究观察到躯干在蹬地和落地时向支撑爪转移重心。犬只敏捷跳跃研究量化了着地时前肢的屈曲和受力。 | 后腿蹬地、前爪先落和胸部缓冲分别调校。关键帧之间用速度连续的曲线衔接，支撑时段的爪高固定。敏捷赛数据只用于参考着地顺序与缓冲，蓝老的跳跃幅度和时长为动画参数。 |

三人分五轮完成诊断、连续曲线与速度控制、落点调校、整合切换及回归验证。走跑只测试了当前模型和舞台范围。

- 犬只小跑的对角支撑与地面反作用力研究。[PubMed](https://pubmed.ncbi.nlm.nih.gov/10574733/)
- *Cinematographic and electromyographic analysis of vertical standing jump in the dog*。[Journal of Experimental Biology](https://pubmed.ncbi.nlm.nih.gov/536702/)
- *Limb dynamics in agility jumps of beginner and advanced dogs*。[Journal of Experimental Biology](https://pubmed.ncbi.nlm.nih.gov/32098886/)
- Kovar、Gleicher 与 Schreiner，*Footskate Cleanup for Motion Capture Editing*。[University of Wisconsin–Madison](https://research.cs.wisc.edu/graphics/Gallery/FootskateSolver/)

## 原始研究

- Rishniw 等，*Sleeping respiratory rates in apparently healthy adult dogs*。[PubMed](https://pubmed.ncbi.nlm.nih.gov/22240295/)
- *Fluoroscopic Estimation of Thoracic Dimensional Changes in Healthy Dogs*。[PubMed](https://pubmed.ncbi.nlm.nih.gov/28961336/)
- *How to improve data quality in dog eye tracking*。[Behavior Research Methods](https://doi.org/10.3758/s13428-022-01788-6)
- *Mutual synchronization of eyeblinks between dogs/cats and humans*。[Current Zoology](https://academic.oup.com/cz/article/68/2/229/6292112)
- *Human attention affects facial expressions in domestic dogs*。[Scientific Reports](https://pmc.ncbi.nlm.nih.gov/articles/PMC5648750/)
- Bognár 等，*Shorter headed dogs, visually cooperative breeds, younger and playful dogs form eye contact faster with an unfamiliar human*。[Scientific Reports](https://www.nature.com/articles/s41598-021-88702-w)
- Savalli 等，*Eye Contact Is Crucial for Referential Communication in Pet Dogs*。[PLOS ONE](https://pmc.ncbi.nlm.nih.gov/articles/PMC5023129/)
- *Pet dogs home alone: A video-based study*。[Applied Animal Behaviour Science](https://www.sciencedirect.com/science/article/pii/S0168159121002501)
- Craven 等，*The fluid dynamics of canine olfaction*。[Journal of the Royal Society Interface](https://pmc.ncbi.nlm.nih.gov/articles/PMC2871809/)
