---
title: 给 Hugo 博客归档页加上 Github 风格热力图
date: 2026-03-31T16:26:31Z
draft: false
tags: [博客, Hugo, 前端, 魔改]
categories: [博客]
---
最近看着博客的归档页面，总觉得光秃秃的列表差点意思。平时经常看 Github 主页那块绿色的代码提交热力图（Heatmap），看着自己的“绿格子”一天天变多，那种正反馈确实挺让人上瘾的。

于是就萌生了一个想法：**能不能在我的博客归档页也加一个类似 Github 风格的文章更新热力图？**

折腾了一番后，完美搞定。这篇文章记录一下具体的实现过程。

## 需求分析

在动手之前，我给自己定了几个硬性要求：
1. **零依赖，不拖慢速度**：网上很多教程教的是用 ECharts 之类的图表库。虽然效果好，但为了一个小图引入这么大的库，对静态博客的加载速度很不友好。我要用纯原生 JS 和 CSS 来画。
2. **主题适配**：我的博客用的是 PaperMod 主题，支持暗黑模式切换。这个热力图必须能无缝跟着主题切换颜色。
3. **响应式布局，拒绝丑陋的滚动条**：手机端和电脑端屏幕宽度不一样。我不希望在手机上出现一个很长很长的横向滚动条。它必须能根据当前窗口的宽度，自动计算并显示能够放得下的“周数”。
4. **边缘防遮挡的悬浮提示**：鼠标放上去要能显示当天的文章信息，而且如果是最右侧（今天）或者最顶部的数据，提示框不能被屏幕边缘截断。

## 动手实现

Hugo 的修改逻辑很简单，不要去动 `themes/` 目录下的源码，而是利用它的覆盖机制。

把 `themes/PaperMod/layouts/_default/archives.html` 复制到项目根目录的 `layouts/_default/archives.html`。接下来所有的修改都在这个本地文件里进行。

### 1. 数据获取

第一步是把博客里所有文章的日期拿出来。这一步利用 Hugo 强大的模板语法，在 HTML 里直接把数据渲染成 JS 的数组：

```html
<script>
  const postsData = [
    {{- range where site.RegularPages "Type" "in" site.Params.mainSections }}
    { date: "{{ .Date.Format "2006-01-02" }}", title: "{{ .Title | htmlEscape }}" },
    {{- end }}
  ];

  // 按日期归类统计
  const postMap = new Map();
  postsData.forEach(p => {
    if (!postMap.has(p.date)) postMap.set(p.date, []);
    postMap.get(p.date).push(p);
  });
</script>
```

这段代码会在编译时把所有文章遍历一遍，最终生成一个干净的 JSON 数据交给浏览器的 JS 处理。

### 2. 页面结构与 CSS Grid 布局

放弃了图表库，我选择用 CSS Grid 来画格子。HTML 结构非常简单：左侧是“一三五”的星期提示，右侧是滚动容器，里面装月份标签和格子容器，底部放一个“少 -> 多”的图例。

样式的核心在于颜色的定义。为了适配 PaperMod 的暗黑模式，我直接绑定了主题的 `html.dark` 选择器，定义了两套 CSS 变量：

```css
:root {
  --heatmap-level-0: #ebedf0;
  --heatmap-level-1: #9be9a8;
  --heatmap-level-2: #40c463;
  --heatmap-level-3: #30a14e;
  --heatmap-level-4: #216e39;
  /* ...其他颜色变量 */
}
html.dark, html[data-theme="dark"], body.dark {
  --heatmap-level-0: #161b22;
  --heatmap-level-1: #0e4429;
  --heatmap-level-2: #006d32;
  --heatmap-level-3: #26a641;
  --heatmap-level-4: #39d353;
}
```

网格的画法直接利用 `display: grid; grid-template-rows: repeat(7, 12px); grid-auto-flow: column;`，让格子自动按列排布（也就是一列代表一周）。

### 3. 自适应宽度的 JS 逻辑

这是我觉得最巧妙的一步。与其用 `overflow-x: auto` 弄出一个滑动条，不如直接算好能放下几列。

```javascript
// 获取容器实际宽度
const containerWidth = scrollContainer.clientWidth;
const cellWidth = 15; // 12px格子 + 3px间距

// 计算最多能放下多少周，上限是53周（一整年）
const maxWeeks = Math.floor(containerWidth / cellWidth);
const weeksToShow = Math.min(53, maxWeeks); 
const daysToShow = weeksToShow * 7;
```

有了 `daysToShow`，就可以倒推出起始日期。接着用一个 for 循环，每天生成一个 `div` 塞进 grid 容器里。根据当天发文的数量，给 `div` 设置不同的 `data-level` 属性，配合 CSS 变色。

同时，我还监听了 `window.resize` 事件，只要你拖动浏览器窗口大小，它就会自动重新计算并重绘，体验极度丝滑。

### 4. Tooltip 边缘防遮挡

最后一个细节是鼠标悬浮的提示框。最开始写的时候发现，如果你今天发了文章（位置在屏幕最右侧），弹出的提示框会被浏览器边缘吃掉一半。

所以加上了一点碰撞检测的数学计算：

```javascript
// ... 省略部分代码
const rect = cell.getBoundingClientRect();
const tooltipRect = tooltip.getBoundingClientRect();

let top = rect.top - tooltipRect.height - 8;
let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

// 顶部防遮挡：如果上面没空间了，就翻转到格子下面
if (top < 10) {
  top = rect.bottom + 8;
}

// 左右防遮挡
if (left < 10) {
  left = 10;
} else if (left + tooltipRect.width > window.innerWidth - 10) {
  left = window.innerWidth - tooltipRect.width - 10;
}

tooltip.style.position = 'fixed';
tooltip.style.left = `${left}px`;
tooltip.style.top = `${top}px`;
```

用 `fixed` 定位配合 `getBoundingClientRect` 获取相对视口的位置，这样就能保证无论格子在哪，提示框都能完完整整地展示出来。

## 最终效果

至此，大功告成。

打开归档页面，上面是绿油油的热力图，下面是传统的文章列表。切换暗黑模式也是秒切。最重要的是，全程没用任何外部库，轻量到了极致。

以后写博客的动力又多了一条：点亮今天的绿格子！