---
title: markdown语法使用指南
tags: [markdown]
date: 2025-03-09T08:00:00Z
summary: 用来学习markdown语法
---
## 基础语法

---

### 标题

```markdown
# H1
## H2
### H3
#### H4
##### H5
###### H6
```

### 文本样式

```markdown
*斜体* _斜体_
**粗体** __粗体__
***粗斜体*** ___粗斜体___
~~删除线~~
```

### 列表

```markdown
- 无序列表
* 无序列表
+ 无序列表

1. 有序列表
2. 有序列表
3. 有序列表

- [x] 已完成
- [ ] 未完成
```

### 代码

```markdown
行内代码：`code`

代码块：
‍```python
print("Hello World")
‍```
```

### 链接与图片

```markdown
[链接文字](URL "标题")
![图片alt](图片URL "标题")
```

### 引用

```markdown
> 引用内容
> 多行引用
```

### 表格

```markdown
| 左对齐 | 居中对齐 | 右对齐 |
|:-------|:-------:|-------:|
| 数据   | 数据    | 数据   |
| 数据   | 数据    | 数据   |
```

## 高级语法

---

### 分隔线

```markdown
---
***
___
```

### 脚注

```markdown
这是一个脚注[^note]
[^note]: 脚注内容
```

### HTML

```markdown
<details>
<summary>点击展开</summary>
隐藏内容
</details>
```

### 转义字符

```markdown
\*转义星号\*
```