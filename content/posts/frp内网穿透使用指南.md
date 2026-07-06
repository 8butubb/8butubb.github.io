---
title: frp内网穿透使用指南
tags: [linux]
date: 2024-12-04T16:00:00Z
summary: frp（Fast Reverse Proxy）是一个高性能的反向代理应用，主要用于内网穿透。...
---
## 什么是 frp？

frp（Fast Reverse Proxy）是一个高性能的反向代理应用，主要用于内网穿透。它可以将内网服务暴露到公网上，方便外部访问。

有很多小伙伴，家里都有性能很强大的电脑，但是苦于没有公网 IP，导致无法在互联网上部署自己的网站或者服务，而 frp 内网穿透就是用来解决这个问题的。

---

- 首先你得拥有一台具有公网 IP 的服务器，如果你只是用来进行内网穿透的话，性能并不需要很强，1h1g 是肯定够用了。
- 其次，在中国境内的服务器因为种种原因，需要进行网站备案，所以我这里更推荐你去购买香港或者美国的服务器，可以免备案。会省下很多麻烦事。

> PS: 这里推荐一下本站在用的服务器 CloudCone，价格便宜实惠，流量大，用作 frp 服务器绰绰有余。我这边购买的是 2h1g 服务器，一年也就 130 元人民币，并且还支持支付宝直接支付，无需 VISA 卡之类的，本站强烈推荐！！！！

---

## frp 内网穿透

frp 一共分为两个部分：

- **服务器**：一个具有公网 IP 的服务器，运行 frps（frp server）。
- **客户端**：一台处于内网中的机器，运行 frpc（frp client）。

### frps（服务端）

1. 前往 [frp GitHub Releases 页面](https://github.com/fatedier/frp/releases) 下载适合你服务器操作系统的 frp 包。(一般linux64位系统选择linux\_amd64即可)
2. 解压缩下载的包：

   tar -zxvf frp_x.x.x_linux_amd64.tar.gz
3. 进入解压好的目录，找到frps.toml文件

   vim frps.toml
4. 编辑frps.toml文件

   ```sh
   [common]

   # frps 服务端的基本配置

   # frps 监听的端口，frpc 将通过这个端口连接到 frps

   bind_port = 7443

   # 用于身份验证的 token，frpc 连接时需要提供相同的 token

   token = xxxxxxxxx

   # 监控面板的端口（可选），通过这个端口可以访问 frps 的状态信息

   dashboard_port = 8443

   # 监控面板的用户名和密码，保护监控面板的访问

   dashboard_user = new_username
   dashboard_pwd = NewPassword!2024

   # 允许开放的端口范围，设置为只开放 10000-11000 端口（可自定义开放端口）

   allow_ports = 10000-11000

   # 日志级别，可选值有 trace, debug, info, warn, error

   log_level = info

   # 日志文件路径，frps 的日志将写入该文件

   log_file = ./frps.log

   # 指定日志的最大大小（单位：MB），达到该大小后将进行轮转

   max_log_size = 10

   # 允许的最大连接数，限制同时连接到 frps 的 frpc 客户端数量

   max_connections = 100

   # 启用加密传输（可选），可以提高数据传输的安全性

   enable_encrypt = true

   # 启用 TCP KeepAlive（可选），可以防止由于网络问题导致的连接断开

   tcp_keep_alive = true

   # 允许的最大数据包大小（单位：字节）

   max_packet_size = 8192
   ```

### frp从(客户端)

前面的步骤都是一样的

- 前往 [frp GitHub Releases 页面](https://github.com/fatedier/frp/releases) 下载适合你服务器操作系统的 frp 包。(一般linux64位系统选择linux\_amd64即可)
- 解压缩下载的包：

  tar -zxvf frp_x.x.x_linux_amd64.tar.gz

1. 找到frpc.toml
2. 编辑frpc.toml


   ```sh
   [common]

   # frpc 连接到 frps 服务器的配置

   # frps 服务器的地址

   server_addr = "your_frps_server_ip"  # 替换为你的 frps 服务器 IP

   # frps 服务器的端口

   server_port = 7443                     # 与 frps 的 bind_port 一致

   # 身份验证 token，必须与 frps 中的 token 一致

   token = "xxxxxxxxx"

   # 以下是需要开放的服务配置

   # 例如，HTTP 服务

   [http]
   type = "tcp"
   local_ip = "127.0.0.1"
   local_port = 80                         # 本地 HTTP 服务端口
   remote_port = 10001                     # 通过 frp 暴露的端口

   # 其他服务可以继续添加
   ```
---

> ***这时候通过访问公网服务器ip加上remote_port端口，即可访问你对应的内网服务了！如果访问有不了请检查一下服务器的防火墙，和云服务器上的防火墙。***

这时我们还需要把公网服务器上的frps服务设置为开机自启动

---

- 创建 一个Systemd 服务文件

  sudo vi /etc/systemd/system/frps.service

在文件里添加

```
[Unit]  
Description=frp server  
After=network.target

[Service]  
ExecStart=/path/to/frps -c /path/to/frps.toml  
Restart=on-failure  
User=your_username      # 替换为运行 frps 的用户名  
WorkingDirectory=/path/to/frp    # frp 的工作目录

[Install]  
WantedBy=multi-user.target
```

- 重新加载 Systemd

  sudo systemctl daemon-reload
- 启动服务并设置为开机自启

  sudo systemctl start frpssudo systemctl enable frps
- 查看服务状态

  sudo systemctl status frps
- 如果出现错误，大概率是你的路径填写的不对，确保 `ExecStart` 路径指向你的 frps 可执行文件和配置文件的正确路径。