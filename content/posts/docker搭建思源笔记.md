---
title: docker搭建思源笔记
tags: [linux, docker]
date: 2024-11-25T00:00:00Z
summary: docker搭建思源笔记...
---
- `PUID`: 自定义用户 ID（可选，如果未提供，默认为 `1000`）
- `PGID`: 自定义组 ID（可选，如果未提供，默认为 `1000`）
- `workspace_dir_host`：宿主机上的工作空间文件夹路径
- `accessAuthCode`：访问授权码，请**务必修改**，否则任何人都可以读写你的数据(必须配置，否则容器无法启动)

---

# docker-compose

    version: "3.9"
    services:
      main:
        image: b3log/siyuan
        command: ['--workspace=/siyuan/workspace/', '--accessAuthCode=xxx']
        ports:
          - 6806:6806
        volumes:
          - workspace_dir_host:/siyuan/workspace
        restart: unless-stopped
        environment:
          - TZ=Asia/shanghai
          - PUID=${YOUR_USER_PUID}  # 自定义用户 ID
          - PGID=${YOUR_USER_PGID}  # 自定义组 ID