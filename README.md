# CIGVis.js

> 🌍 JavaScript/TypeScript 库，用于在浏览器中可视化多维地球物理数据

[![npm version](https://img.shields.io/npm/v/cigvis-js.svg)](https://www.npmjs.com/package/cigvis-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**CIGVis.js** 是 Python [cigvis](https://github.com/JintaoLee-Roger/cigvis) 库的 JavaScript 移植版，由[中国科学技术大学计算解释组 (CIG)](https://cig.ustc.edu.cn/main.htm)开发。

## ✨ 特性

- **3D 体积可视化** - 使用 Three.js/WebGL 进行交互式 3D 渲染
- **切片显示** - 沿任意轴（inline/crossline/time）显示 2D 切片
- **曲面可视化** - 显示地层面，支持深度或振幅着色
- **测井可视化** - 3D 空间中显示测井轨迹和曲线
- **等值面提取** - 从 3D 数据中提取并显示等值面
- **点云可视化** - 支持基于值的点云着色
- **丰富色表** - 内置地球物理专用色表（Petrel, seismic 等）
- **纯浏览器** - 完全在浏览器中运行，无需服务器

## 📦 安装

```bash
npm install cigvis
```

```bash
yarn add cigvis
```

```bash
pnpm add cigvis
```

## 🚀 快速开始

### 基本用法

```typescript
import * as cigvis from 'cigvis';

// 1. 读取体积数据
const response = await fetch('seismic.bin');
const buffer = await response.arrayBuffer();
const data = new Float32Array(buffer);
const shape = [192, 200, 240]; // [ni, nx, nt]

// 2. 创建切片节点
const nodes = cigvis.createSlices({
  data,
  shape,
  pos: { x: 0, y: 0, z: 239 },
  cmap: 'petrel',
  clim: [-1, 1],
});

// 3. 3D 可视化
cigvis.plot3D({
  nodes,
  container: '#viewer',
  volumeShape: shape,
});
```

### 使用 IO 工具读取数据

```typescript
import { io } from 'cigvis';

// 读取二进制体积数据
const { data, shape } = await io.readVolume('seismic.bin', [192, 200, 240]);

// 读取 LAS 测井数据
const lasData = await io.readLASFromURL('well.las');
const gammaRay = io.getCurve(lasData, 'GR');

// 读取地层文件
const horizon = await io.readHorizFromURL('horizon.txt', {
  ni: 192, nx: 200, dt: 4, istart: 0, xstart: 0,
});
```

### 创建多种可视化节点

```typescript
import * as cigvis from 'cigvis';

// 切片
const slices = cigvis.createSlices({
  data: volumeData,
  shape: [192, 200, 240],
  pos: { x: 96, y: 100, z: 120 },
  cmap: 'petrel',
});

// 曲面
const surfaces = cigvis.createSurfaces({
  surfaces: [horizonData],
  shape: [192, 200],
  volume: volumeData,
  volumeShape: [192, 200, 240],
  valueType: 'amp',
  cmap: 'seismic',
});

// 测井
const wellLog = cigvis.createWellLog({
  trajectory: trajectoryData,
  values: gammaRayData,
  cmap: 'hot',
  clim: [0, 150],
  style: 'tubes',
});

// 等值面
const body = cigvis.createBody({
  data: volumeData,
  shape: [192, 200, 240],
  isoValue: 0.5,
  color: '#00ff00',
});

// 点云
const points = cigvis.createPointCloud({
  positions: pointPositions,
  values: pointValues,
  cmap: 'rainbow',
  size: 2,
});

// 组合显示
cigvis.plot3D({
  nodes: [...slices, ...surfaces, wellLog, body, points],
  container: '#viewer',
  volumeShape: [192, 200, 240],
});
```

### 使用色表

```typescript
import { colormap } from 'cigvis';

// 列出可用色表
const cmaps = colormap.listColormaps();
// ['parula', 'petrel', 'seismic', 'gray', 'jet', 'viridis', ...]

// 创建色表
const cmap = colormap.createColormap('petrel');

// 应用色表到数据
const imageData = colormap.applyColormap(
  data, width, height, 'petrel', [-1, 1]
);

// 反转色表
const reversed = colormap.createColormap('petrel_r');

// 设置 alpha
const transparent = colormap.setAlpha('petrel', 0.5);
```

### 2D 绘图

```typescript
import { plot2d } from 'cigvis';

// 绘制 2D 图像
const canvas = plot2d.plot2D({
  image: sliceData,
  width: 200,
  height: 150,
  cmap: 'gray',
  clim: [-1, 1],
  title: 'Inline Slice',
  xlabel: 'Crossline',
  ylabel: 'Time',
});

document.body.appendChild(canvas);
```

### 1D 绘图

```typescript
import { plot1d } from 'cigvis';

// 绘制单道
const canvas = plot1d.plot1D({
  data: traceData,
  dt: 4,
  orient: 'v',
  title: 'Seismic Trace',
  color: '#00d4aa',
});

// 绘制多道
const multiCanvas = plot1d.plotMultiTraces({
  data: sectionData,
  nTraces: 30,
  nSamples: 200,
  dt: 4,
});
```

### 切片查看器

```typescript
import { sliceviewer } from 'cigvis';

// 创建切片查看器
const viewer = sliceviewer.createSliceViewer({
  container: document.getElementById('viewer')!,
  data: volumeData,
  shape: [192, 200, 240],
  axis: 'z',
  pos: 120,
  cmap: 'petrel',
});

// 添加注释
const horizon = sliceviewer.addHorizon(horizonX, horizonY, {
  name: 'Top Reservoir',
  color: 'yellow',
});

const fault = sliceviewer.addFault(faultX, faultY, {
  name: 'Fault F1',
  color: 'red',
});

const well = sliceviewer.addWell(wellX, wellY, {
  name: 'Well A-1',
  color: 'white',
  size: 6,
});
```

### 网格生成

```typescript
import { meshs } from 'cigvis';

// 曲面转网格
const { vertices, faces } = meshs.surface2mesh(heightMap, [64, 64]);

// 点云转立方体
const cubeMesh = meshs.cubePoints(pointPositions, 0.5);

// 测井轨迹转管道
const tubeMesh = meshs.trajectoryMesh(trajectory, 0.02, 8);

// 合并多个网格
const merged = meshs.mergeMeshs([mesh1, mesh2, mesh3]);
```

### 工具函数

```typescript
import { utils } from 'cigvis';

// 计算统计信息
const stats = utils.statistics(data);
// { min, max, mean, std, median, count }

// 自动计算颜色范围
const clim = utils.autoClim(volumeData);

// 归一化数据
const normalized = utils.normalize(data);

// 插值
const value = utils.bilinearInterpolate(data, width, height, x, y);
const value3d = utils.trilinearInterpolate(data, nx, ny, nz, x, y, z);
```

### 交互式工具

```typescript
import { tools } from 'cigvis';

// 交互式提取任意线
const result = await tools.extractArbitraryLine({
  data: volumeData,
  shape: [192, 200, 240],
  background: 'data',
  sliceIndex: 50,
});

console.log(result.data);   // 提取的数据
console.log(result.path);   // 路径点
console.log(result.indices); // 路径索引
```

### GUI Web Components

```html
<!-- 色表选择器 -->
<cigvis-colormap-picker selected="petrel"></cigvis-colormap-picker>

<!-- 滑块 -->
<cigvis-range-slider label="Opacity" value="80" min="0" max="100"></cigvis-range-slider>

<!-- 按钮 -->
<cigvis-button label="Reset View" variant="primary"></cigvis-button>

<!-- 下拉选择 -->
<cigvis-dropdown-select label="Colormap" value="petrel"></cigvis-dropdown-select>

<!-- 侧边栏 -->
<cigvis-sidebar position="right">
  <cigvis-sidebar-section title="Settings">
    <cigvis-range-slider label="Slice X" value="96" min="0" max="192"></cigvis-range-slider>
  </cigvis-sidebar-section>
</cigvis-sidebar>
```

```typescript
// 监听事件
const slider = document.querySelector('cigvis-range-slider');
slider.addEventListener('change', (e) => {
  console.log('Value:', e.detail.value);
});
```

## 📚 API 参考

### 核心模块

| 模块 | 说明 |
|------|------|
| `cigvis.createSlices()` | 创建切片节点 |
| `cigvis.createSurfaces()` | 创建曲面节点 |
| `cigvis.createWellLog()` | 创建测井节点 |
| `cigvis.createBody()` | 创建等值面节点 |
| `cigvis.createPointCloud()` | 创建点云节点 |
| `cigvis.plot3D()` | 3D 可视化 |

### 子模块

| 模块 | 说明 |
|------|------|
| `cigvis.io` | 数据读取（二进制、LAS、地层、断层） |
| `cigvis.colormap` | 色表管理 |
| `cigvis.meshs` | 网格生成 |
| `cigvis.utils` | 数学工具函数 |
| `cigvis.plot1d` | 1D 绘图 |
| `cigvis.plot2d` | 2D 绘图 |
| `cigvis.plotly` | Plotly.js 集成 |
| `cigvis.viser` | Viser 集成 |
| `cigvis.sliceviewer` | 切片查看器 |
| `cigvis.tools` | 交互式工具 |
| `cigvis.gui` | Web Components |
| `cigvis.config` | 全局配置 |
| `cigvis.colors` | 颜色方案 |
| `cigvis.style` | 主题样式 |

## 🎨 内置色表

| 色表 | 说明 |
|------|------|
| `petrel` | 地球物理标准色表 |
| `seismic` | 蓝白红地震色表 |
| `gray` / `gray_r` | 灰度/反转灰度 |
| `jet` | 彩虹色表 |
| `viridis` | 感知均匀色表 |
| `hot` | 热力图色表 |
| `cool` | 冷色调 |
| `parula` | MATLAB parula |

## 🔧 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式
npm run dev

# 运行测试
npm test
```

## 📖 示例

查看 [examples/](examples/) 目录获取完整示例：

- [1D 绘图示例](examples/1d/)
- [2D 绘图示例](examples/2d/)
- [3D 可视化示例](examples/3d/)
- [色表示例](examples/colormap/)
- [GUI 组件示例](examples/gui-test.html)

## 🤝 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 🙏 致谢

本库是 Python [cigvis](https://github.com/JintaoLee-Roger/cigvis) 库的 JavaScript 移植版。

原始论文：
> **CIGVis: An open-source Python tool for the real-time interactive visualization of multidimensional geophysical data**
> Jintao Li, Yunzhi Shi, Xinming Wu
> Paper: https://library.seg.org/doi/abs/10.1190/geo2024-0041.1

## 🔗 相关项目

- [cigvis](https://github.com/JintaoLee-Roger/cigvis) - 原始 Python 库
- [vispy](https://github.com/vispy/vispy) - cigvis Python 使用的 3D 可视化库
- [Three.js](https://threejs.org/) - cigvis.js 使用的 3D 库
