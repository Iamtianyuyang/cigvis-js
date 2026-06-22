# CIGVis Code Graph Analysis

基于 [pydeps](https://github.com/thebjorn/pydeps) 和 Python AST 分析的 cigvis 代码结构图。

## 原始 cigvis Python 包结构

```
cigvis/ (22,235 行代码)
├── 核心配置
│   ├── config.py          (91 行) - 全局配置（数据顺序、轴反转）
│   ├── colors.py          (117 行) - 默认颜色方案
│   └── tools.py           (127 行) - 工具函数
│
├── 色彩映射
│   ├── colormap.py        (760 行) - 色彩映射工具
│   └── customcmap.py      (1,257 行) - 自定义色表数据（OpendTect）
│
├── IO 模块
│   ├── io/las.py          (108 行) - LAS 测井文件
│   ├── io/horiz.py        (21 行) - 地层文件
│   ├── io/fault_skin.py   (293 行) - 断层数据
│   └── io/vds.py          (268 行) - OpenVDS 格式
│
├── 网格/几何
│   ├── meshs/surfaces.py  (160 行) - 曲面网格
│   ├── meshs/well_logs.py (215 行) - 测井轨迹
│   ├── meshs/points.py    (50 行) - 点云
│   ├── meshs/indicator.py (132 行) - 指示器
│   └── meshs/merge.py     (30 行) - 网格合并
│
├── 3D 可视化 - VisPy (桌面)
│   ├── vispyplot.py       (2,214 行) - 主绘图函数
│   └── vispynodes/        (5,030 行)
│       ├── axis_aligned_image.py - 轴对齐切片
│       ├── volume_slices.py - 体积切片
│       ├── volume_image.py - 体积渲染
│       ├── meshnode.py - 网格节点
│       ├── well_log.py - 测井可视化
│       ├── colorbar.py - 色标
│       ├── vis_canvas.py - 画布
│       └── ...
│
├── 3D 可视化 - Viser (Web)
│   ├── viserplot.py       (969 行) - Web 可视化
│   └── visernodes/        (1,583 行)
│       ├── volume_slice.py - 体积切片
│       ├── meshnode.py - 网格节点
│       ├── well_log.py - 测井
│       ├── server.py - 服务器
│       └── ...
│
├── 2D/1D 可视化
│   ├── mpl2dplot.py       (391 行) - Matplotlib 2D
│   ├── mpl1dplot.py       (413 行) - Matplotlib 1D
│   └── plotlyplot.py      (1,051 行) - Plotly (Jupyter)
│
├── GUI
│   └── gui/               (3,583 行)
│       ├── gui3d/ - 3D 界面
│       ├── gui2d/ - 2D 界面
│       └── widgets/ - UI 组件
│
└── 工具
    ├── utils/             (1,479 行)
    │   ├── utils.py - 通用工具
    │   ├── surfaceutils.py - 曲面工具
    │   ├── slice_provider.py - 切片提供器
    │   └── plotlyutils.py - Plotly 工具
    └── sliceviewer/       (1,484 行) - 切片查看器
```

## 模块依赖图

```
                    ┌─────────────┐
                    │   config    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
        │  colormap  │ │ colors│ │   utils   │
        └─────┬─────┘ └───┬───┘ └─────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
   ┌─────┴─────┐   ┌─────┴─────┐   ┌──────┴──────┐
   │ vispyplot  │   │viserplot  │   │ plotlyplot  │
   └─────┬─────┘   └─────┬─────┘   └─────────────┘
         │               │
   ┌─────┴─────┐   ┌─────┴─────┐
   │vispynodes │   │visernodes │
   └───────────┘   └───────────┘
```

## npm 包映射

| Python 模块 | npm 路径 | 状态 | 说明 |
|-------------|----------|------|------|
| `config` | `src/types.ts` | ✅ 已移植 | 类型定义和配置 |
| `colormap` | `src/colormap/` | ✅ 已移植 | 色彩映射系统 |
| `customcmap` | `src/colormap/builtin-cmaps.ts` | ✅ 已移植 | 内置色表 |
| `io` | `src/io/` | ✅ 已移植 | 二进制/LAS 读取 |
| `utils` | `src/utils/` | ✅ 已移植 | 数学工具 |
| `vispyplot` | `src/plot3d.ts` | ✅ 已移植 | 3D 绘图 API |
| `vispynodes` | `src/renderer/` | ✅ 已移植 | Three.js 渲染器 |
| `visernodes` | `src/renderer/` | ✅ 已移植 | Three.js 渲染器 |
| `meshs` | `src/nodes/` | ✅ 已移植 | 节点创建 |
| `mpl2dplot` | - | ⏳ 待移植 | 需要 plotly.js |
| `mpl1dplot` | - | ⏳ 待移植 | 需要 plotly.js |
| `plotlyplot` | - | ⏳ 待移植 | 需要 plotly.js |
| `gui` | - | ❌ 不移植 | 浏览器原生 UI |
| `sliceviewer` | - | ⏳ 待移植 | 需要 React/Vue |

## 统计

| 指点 | Python 原版 | npm 版本 |
|------|-------------|----------|
| 总行数 | 22,235 | ~2,500 |
| 模块数 | 65 | 15 |
| 函数数 | 1,000+ | 80+ |
| 类数 | 100+ | 5 |

## 核心 API 对照

```python
# Python cigvis
import cigvis
nodes = cigvis.create_slices(volume, pos=[0, 0, 239])
cigvis.plot3D(nodes)
```

```typescript
// JavaScript cigvis-js
import * as cigvis from 'cigvis';
const nodes = cigvis.createSlices({ data: volume, shape: [192,200,240], pos: {z: 239} });
cigvis.plot3D({ nodes, container: '#viewer' });
```
