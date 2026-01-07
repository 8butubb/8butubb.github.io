---
title: 把Kindle变成信息屏！越狱+自动更换新闻壁纸全攻略 | 附开源代码
tags: ["学习"]
date: 2025-10-01
summary: "前些日子翻出尘封两年的KPW4，本想重拾阅读初心，却发现亚马逊中国早已物是人非。正当想着要不要给它闲鱼出手时转卖时，B站刷到Kindle全机型都支持越狱了。"
---

前些日子翻出尘封两年的KPW4，本想重拾阅读初心，却发现亚马逊中国早已物是人非。
正当想着要不要给它闲鱼出手时转卖时，B站刷到Kindle全机型都支持越狱了。

- 书伴网的详细图文教程[2025 Kindle 越狱教程：不限 Kindle 型号，不限固件版本](https://bookfere.com/post/1145.html)

瞬间燃起折腾欲，一直没有给kindle越狱过，想着就算要出手也要越狱折腾看看。

## kindle越狱

参考书伴网的教程[2025 Kindle 越狱教程：不限 Kindle 型号，不限固件版本](https://bookfere.com/post/1145.html)
跟着教程一步一步进行即可，这一步我就不再详细说明了。

越狱后的kindle安装了koreader，传书变得方便了，不需要再使用数据线进行拷贝，可以链接webdav服务器进行下载，确实方便多了，也重燃起我的阅读兴趣。
遂想着还有什么可折腾的，想起没越狱之前，一直想着把kindle的壁纸给换掉，现在越狱了应该可以实现了。

## 实践

整理一下我的需求

- 自动化更换kindle壁纸
- 图片内容为新闻排行榜
- 自动化生成壁纸图片

根据需求我大概去网上看了一下有没有相同想法的小伙伴，但是看到的大多是使用git上传管理自己的图片，不是自动化生成一些壁纸
[读书｜通过 Git 管理 Kindle 屏保图片，一键自动同步](https://blog.csdn.net/mzlogin/article/details/132960326)
这是链接大家也可以参考一下。

基于没有现成的，我根据需求大概整理了一下实现的思路

1. github仓库python代码爬取新闻网站信息，整理好生成壁纸，需要适配一下kindle屏幕大小和黑白色，使用github action自动化执行仓库内py脚本每隔30分钟爬取生成一张图片，自动覆盖原图片。
2. kindle写一个sh脚本自动下载图片到指定的目录，使用cron定时任务设置定时下载覆盖

### github

![项目生成的图片](https://img.butubb.cn/i/2025/04/16/67ff6ed10314e.png)
我的github项目地址[8butubb/kindlepic](https://github.com/8butubb/kindlepic)
信息来源是[今日热榜](https://tophub.today)
不知道爬哪个网站的同学可以看看这个网站，信息聚合

### kindle

kindle上壁纸目录是可以使用koreader进行指定，指定或者默认目录，
写一个sh脚本用来下载图片

```sh
#!/bin/sh

# 目标壁纸文件名（需固定名称以覆盖旧文件）
WALLPAPER_NAME="custom_wallpaper.png"
# 壁纸下载链接（替换为你的实际图片URL）
IMAGE_URL="https://example.com/your-image.png"
# 目标路径
TARGET_DIR="/mnt/us/koreader/screensaver"

# 使用 curl 下载并覆盖文件
curl -L -o "${TARGET_DIR}/${WALLPAPER_NAME}" "${IMAGE_URL}"
```

chmod +x download_wallpaper.sh 给个脚本执行权限
写完可以执行一次试试，没有问题的话使用cron设置一下定时任务即可

## 进阶

- 可以在添加天气信息和一些其他自定义信息，这里大家就可以发挥想象力了