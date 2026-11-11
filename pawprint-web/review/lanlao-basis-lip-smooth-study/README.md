# 嘴缘坐标与形态键诊断

独立副本，不接入网页。对已同步下颌与口缘的模型，读取27对真实口缘上下顶点的张嘴位置，拟合上唇曲线与较小椭圆间距，生成随张嘴权重变化的 `LipSmoothTest` 形态键。为避免把张嘴形态复制再重复叠加，探针和新形态键明确使用 `from_mix=False`。原试验误用 from_mix 默认值，导致下颌褶皱，已单独保留在上一个试验文件夹作为失败记录。

早期过渡帧中，射线抽查的暗点命中 Deep oral surface，邻近皮毛点命中原始材质；这一抽样不排除其他位置有漏空。根据帧12坐标采样，上唇局部 z 从 0.57526 到 0.58299，邻点不连续，说明嘴缘几何本身也导致轮廓锯齿。拟合后的正面相比早期版本略平顺，但口型仍显水平宽缝，侧面舌头像细片。此版不自然，不可作为用户预览或接入网站；没有检验连续视频、模型其他动画、碰撞、GLB 或网页。

运行 build.py 依赖 ../lanlao-lip-sync-study/preview.blend 和 ../lanlao-connected-mouth-workflow/ellipse-corrective.py；输出临时文件路径需要按需要改写。参考本文件夹的 PNG、raycast.log 和 lip-coordinate.log。
