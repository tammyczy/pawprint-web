# 连续嘴缝结构实验（未通过）

从 `lanlao-hip-posture-review.blend` 的隔离副本扩大局部切割，按各分裂顶点坐标仅用于图节点定位（未焊接原UV/法线），筛选实际相连的 52 点、51 边嘴缝；逐个真实边选择上下侧建立绑定的口内壁。相比按横坐标排序跨接，两处内部黑色交叉在静态渲染中明显减少，但正面嘴过宽、侧面舌片及角落裂痕仍不自然，不能作为成品。新内壁目前是独立网格，并未焊接到原始表面。

检查：原始 23,504 个网格点的位置（5 位小数计数）均保留；增加面后总数 23,748，3 个原有形态键与 UVMap 名称存在；这不是逐项检查 UV、每个原 shape-key 位移或蒙皮变形。仅渲染正、侧、闭嘴静态，未作连续动画、导出、网页、其他动作检查。正式模型未修改。

脚本 `build.py` -> `connect-peredge.py` -> `render-peredge.py`，当前引用 `/private/tmp/lanlao-contiguous-cut.blend` 等临时路径；可将其改为持久路径重新运行。`connect.py` 为按顶点配对的对照版本。

补充口型收窄实验：`build-aperture.py` -> `connect-aperture.py` -> `render-aperture.py` 独立生成，口部前方收窄；视觉仍呈尖角微笑，侧脸有裂痕，舌根像从闭合下巴伸出，未达自然标准。未接网站。前后对照图 `aperture-front.png` / `aperture-side.png`；`aperture-test.blend` 可打开检查。

## 原始未切开脸的局部细分与实际嘴缘路径

`subdivide-local.py` 将鼻口区域 340 个面边局部细分，保留 3 个原形态键及 UVMap；`find-dense-path.py` 沿实际网格边定位单条 42 点路径，坐标聚类仅用于追踪连通关系，不焊合 UV 分裂点。`build-dense-path.py` 仅分开该路径的原边并添加下颌；`connect-dense.py` 逐对连接内壁：41/41 口缘边均发现两侧。静态渲染由 `render-dense-inner.py` 生成。脚本引用 /private/tmp 中间文件，需依上述顺序在本机运行；模型快照 `dense-path-preview.blend` 已保存。

`validate-dense.py` 将原模型 23,504 个顶点的 Basis 与两个毛发 shape-key 坐标作为 9 元组，四舍五入至 5 位小数对比，均能在候选模型中找到；UVMap 仍存在。并未验证 UV 数值、插值点的形态键、变形权重、原动画或网页。模型在闭嘴静态外观大致保留，但张嘴正面仍有过宽黑口、侧面存在裂纹、舌头与口底不自然；不能作为用户可验收预览。此为网格细分实验，不等于专业手工完成完整拓扑替换。

## 原脸细分后的真实边缘共享与形态键修正

在 `dense-path` 原脸路径副本，`weld-dense.py` 把 41 对原生边和 123 个内壁面作为同一身体网格共享点，给新增 97 点复制各骨骼权重及三组形态键位移（最大误差 0）；对原嘴缘隔离平滑法线。`ellipse-corrective.py` 按帧20实际上下唇间距生成仅张嘴启用的椭圆修正形态键，以缩小前视口宽。文件 `ellipse-weld-preview.blend`，截图 `ellipse-weld-{front,side,closed}.png`。只核对静态图，未证明新形态键与骨骼动画、UV数值、其他动作或网页兼容。

摄像机射线对正面舌两侧 8 个深色点采样（`probe-dark-regions.py`）均击中主模型 `Deep oral surface` 内壁面，而不是背景：侧面黑色锯齿在样本中是过宽的口腔开口，并非可简单填补的缺面；这不证明整个网格无洞。正面口角仍尖、侧面仍有裂缝和舌根欠自然，达不到用户验收标准，未接入网站。探查 `probe-lipfaces.py` 找到 22258、22269、22284 等邻接下唇内壁面，已供舌根桥接试验。
