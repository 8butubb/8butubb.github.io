---
title: 给飞牛 NAS 加装大疆 4G 模块一代当备用网：拔掉网线也不掉线
tags: [nas, 4g, 大疆, 网络, 飞牛os]
date: 2026-10-05T00:00:00Z
summary: "单条网线的 NAS 一断线就彻底失联：中继连不上、机器人掉线、远程全废。这篇记录我给飞牛 NAS 插上一块淘宝二手 100 元淘来的大疆 4G 模块一代（QDC507），用开源项目 HiDeck 管它，并一路踩过 OVS 藏断线、僵尸默认路由、网口编号漂移、模块编号变化这些坑，最后实现「拔线自动切 4G、插回自动切回」的全过程。"
---

## 起因：单线 NAS 的焦虑

家里的 NAS 只有一条网线。平时岁月静好，但只要出现下面任意一种情况：

- 网线被谁碰掉（比如我插拔 USB 设备时顺手带下来）
- 光猫/路由器抽风重启
- 宽带施工挖断

NAS 上的东西就**全部对外失联**：远程访问进不来、自建的机器人掉线、同步全部卡住，而人在外面只能干瞪眼。

想上第二条宽带吧，又贵又没必要。所以很自然就想到了：**插一块 4G 模块当备用链路**，平时待命，主线断了自动顶上去。

## 硬件：大疆 4G 模块一代（二手 100 元）+ 一张流量卡

主角是一块**大疆 4G 模块一代**（型号 QDC507）—— 本来是大疆给无人机做 4G 图传增强用的，我在淘宝二手渠道 **100 元**拿下。现在回头看，这价钱也算「高价入手」了 😂（同款行情早就跌到几十块）。

![大疆 4G 模块一代（DJI Cellular 模块）](https://cdn.jsdelivr.net/gh/8butubb/image/img/dji-cellular-4g-module-gen1.jpg)

*大疆 4G 模块一代（DJI Cellular 模块）：U 盘大小的黑盒子，插上电脑就是一块普通 4G 网卡*

它本质上是**深度定制的 Quectel LTE 模块**，识别信息非常诚实：

```bash
lsusb | grep -i quectel          # Bus 007 Device 003: ID 2c7c:0125 Quectel EC25 LTE modem
mmcli -L                          # /org/freedesktop/ModemManager1/Modem/0  QUECTEL Mobile Broadband Module
mmcli -m 0 | grep -i firmware     # firmware revision: QDC507GLEFM21   ← QDC507 就是大疆一代的型号
ip -br link | grep wwan           # wwan0  UP
ip route show default
# default via 192.168.20.1   dev enp4s0-ovs proto static metric 100   ← 有线（主）
# default via 10.200.35.20   dev wwan0      metric 5000               ← 4G（备）
```

USB 的 VID `2c7c` 是 Quectel 的，固件里又带着大疆的型号串 QDC507 —— **「大疆定制固件 + Quectel 硬件」**这个组合在折腾时很有用：网上大半资料是按 Quectel（EG25-G / EC25 那套）写的，照着查基本都能对上。

几个要点：

- 网卡驱动是 `qmi_wwan`，出来一个 `wwan0`；
- 拨号是 **ModemManager 的 initial EPS bearer** 自动做的，**NetworkManager 完全不接管它**（这点后面很关键）；
- 运营商给的是内网地址（CGNAT）+ 一段 IPv6；
- 默认路由的 `metric` 决定优先级：**数字小的优先**。所以有线 100、4G 5000 —— 有线在的时候，4G 就是一条安静的备胎。

## 顺手安利：用 HiDeck 管理这块模块

能当网卡用之后，日常还得看它：信号多少、注册没注册、SIM 什么状态、以及最好用的——**收发短信**（查话费/流量余额就靠短信）。命令行 `mmcli` 都能看，但天天敲太累，于是我把这块交给了一个开源项目：**HiDeck**（`yibaiba/hideck`）—— 一个自托管的 Qualcomm 4G / LTE / 5G 模块 Web 控制台。

部署一句话（Docker，host 网络 + 需要 `/dev` 权限）：

```bash
curl -fsSL https://raw.githubusercontent.com/yibaiba/hideck/main/deploy.sh | sh
# 浏览器打开 http://<NAS_IP>:7575    默认 admin / admin（首次登录强制改密码）
```

我常用的几项：

- **设备**：USB 模块自动发现（QMI / MBIM / AT），实时看信号、频段、SIM 身份 —— 换 USB 口、模块编号漂移这类问题，在这里一眼就能看出模块还在不在；
- **短信**：收件箱 + 发短信。查话费/流量就是给它发 `101` / `108` 到 `10001`，回复直接显示在页面上；
- **代理**：SOCKS5 / HTTP 绑定到这块模块（`SO_BINDTODEVICE`），需要"只有某个程序走 4G"时很省事；
- **电话 / VoWiFi**：还能当网络电话用（VoLTE / WiFi Calling），这部分我还没细折腾；
- **定时任务 + 通知**：支持 Bark、飞书、Telegram 等，做状态/流量提醒很方便。

我的分工是：**HiDeck 当模块的「仪表盘」**（信号、短信、临时代理），**链路切换交给系统那一套路由看门狗**（下面细说）—— 两者互不干扰。

## 飞牛的第一盆冷水：界面里根本没有 4G

打开飞牛「网络设置」，**找不到这块 4G 网卡**。

一开始以为是配置问题，后来翻了 `/usr/trim/bin/network_service` 二进制、它的日志、以及前端页面资源，发现里面连 `wwan`/`modem` 这类字样都没有 —— 结论很干脆：**飞牛的网络设置目前不支持 WWAN 类型的接口**。

所以 4G 这条链路只能靠命令行管（`mmcli` / `ip` / `nmcli`）。界面指望不上，但也不影响用。

## 大坑：拔掉网线，NAS 反而彻底失联

最反直觉的地方来了。

信心满满地拔掉网线，结果**整台 NAS 直接像死了一样**：远程中继连不上、飞书机器人静默、连域名都解析不出来。

但诡异的是：

```bash
curl -4 -s --interface wwan0 https://ifconfig.me/ip    # ✅ 走 4G 单独测，通！
ip route show default                                   # ✅ 4G 那条 metric 5000 明明在路由表里
```

**4G 是好的，路由也在，但流量就是不从它走。** 这就是典型的需要抓现场的问题 —— 等你回我消息的时候，故障现场早就过去了。

### 第一步：用「触发式采样器」抓现场

间歇性故障最忌讳猜。做法是写个采样器，**等状态跳变**（比如物理网口 `carrier` 从 1 变 0），跳变后立刻连采十几轮，把每一轮的路由表、DNS、每个接口单独发请求的出口 IP、中继域名可达性全记下来。

采样结果非常干净：

- 有线接口 `enp4s0` 的 `carrier=0`（物理上确实断了）；
- 但桥接口 `enp4s0-ovs` 的 `carrier` **恒为 1**；
- 断网窗口里，ping/HTTPS/DNS 全是超时（`000`），而 `curl --interface wwan0` 单独走 4G 是通的。

### 第二步：根因 —— OVS 把断线藏了起来

我的网口套在 OVS 里。**OVS 会把物理断线藏起来**：

- 物理口 `enp4s0`：`carrier=0`（断了）
- OVS 内部口 `enp4s0-ovs`：`carrier` 永远是 1

于是 **NetworkManager 根本不知道线断了**，那条 `proto static metric 100` 的默认路由**不会撤销**。结果就是：所有流量继续往一个已经不可达的网关灌（黑洞），而 4G 的 `metric 5000` 老实排在后头，**永远轮不到**。

所以这不是 4G 的问题，是**僵尸默认路由**的问题。

## 解法：2 秒轮询的默认路由看门狗

思路很直接：**盯物理口的 carrier**，断了就把 4G 那条默认路由的 metric 从 5000 提到 50（压过有线的 100），线回来再撤掉。

```bash
PHYS=enp4s0            # 物理口（读 carrier 用）
LTE_DEV=wwan0          # 4G 网卡
LTE_PRIO_METRIC=50     # 临时优先权

carrier() { cat /sys/class/net/$PHYS/carrier 2>/dev/null || echo "?"; }
lte_gw()  { ip route show default | awk -v d="$LTE_DEV" '$1=="default" && $5==d {print $3; exit}'; }

# 注意：判断 metric 必须用数字比较，别用字符串匹配（见下面的坑）
route_metric_is() {   # $1=网关 $2=网卡 $3=metric
  ip route show default | awk -v g="$1" -v d="$2" -v want="$3" '
    $1=="default" && $3==g && $5==d { for (i=1;i<=NF;i++) if ($i=="metric" && $(i+1)+0==want+0) found=1 }
    END { exit(found?0:1) }'
}

check_once() {
  c=$(carrier); lg=$(lte_gw)
  case "$c" in
    0)  # 有线断了 → 给 4G 提权
      if [ -n "$lg" ] && ! route_metric_is "$lg" "$LTE_DEV" "$LTE_PRIO_METRIC"; then
        ip route replace default via "$lg" dev "$LTE_DEV" metric "$LTE_PRIO_METRIC"
      fi ;;
    1)  # 有线恢复 → 撤掉临时路由
      if [ -n "$lg" ] && route_metric_is "$lg" "$LTE_DEV" "$LTE_PRIO_METRIC"; then
        ip route del default via "$lg" dev "$LTE_DEV" metric "$LTE_PRIO_METRIC"
      fi ;;
  esac
}
```

### 这里有两个必须踩过才知道的坑

**坑 1：不要动 NetworkManager 管的那条路由。**

我最早的做法是去改**有线**那条默认路由的 metric（100 → 10000），结果 **30 秒内就被 NM 改回 100**，看门狗白干 ✗。

正确姿势是改**没人管的那条**：4G 的默认路由是 **ModemManager** 建的，NM 不碰它，所以把它从 `metric 5000` 提到 `metric 50`，稳稳压过有线的 100 ✓。

> 通用经验：**改配置前先问「这条配置属于哪个管理器？我改它会不会被覆盖？」** 会覆盖，就换一个等价但归你的杠杆。

**坑 2：判断 metric 别用 `grep` 做前缀匹配。**

我第二版用了 `grep "metric 50"` 来判断"临时优先路由还在不在"，看着挺对，实际灾难：

```
default via 10.200.35.20 dev wwan0 metric 5000
                                 ^^^^ 里面就含 "metric 50"
```

于是有线恢复之后，脚本以为临时路由还在，**每 2 秒重复删一次、刷满日志** ✗。改用 `awk` 把 metric 取出来做**数字比较**之后，世界清净了。

## 部署：非 root 也能长期维护的「转发脚本 + 自更新」

这台 NAS 上我跑服务的账号没有 root，每次改脚本都要找人 `sudo` 重装，很烦。所以又套了一层：

1. `/usr/local/sbin/wan_carrier_fix.sh` 只放一个 **3 行的 stub**，干一件事：exec 到工作目录里的真身；
2. 真身脚本放在普通用户可写的工作目录里，主循环每 2 秒顺手比一下**自己的 mtime**，发现被改了就地 `exec "$SELF"` 重新加载。

```bash
# /usr/local/sbin/wan_carrier_fix.sh —— 只装一次，以后再也不碰
#!/bin/bash
exec /path/to/real/wan_carrier_fix.sh "$@"
```

```ini
# /etc/systemd/system/wan-carrier-fix.service
[Unit]
Description=WAN carrier failover watchdog
After=network-online.target

[Service]
ExecStart=/usr/local/sbin/wan_carrier_fix.sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

效果：**以后改脚本只要改工作目录里那份，2 秒后自动生效**，systemd 只负责兜底崩溃重启。省下的都是找 sudo 的时间。

（小细节：自更新重载必须用**绝对路径**，因为 systemd 给的工作目录可能是 `/`。）

## 切到 4G 之后要处理的两件事

**① 出口 IP 变了，中继要重新握手。**
4G 出口 IP 和宽带完全不是一个网段。家里的 NAS 中继（fnid）是长连接，切过去之后它那边不认旧会话，**必须重启一次中继服务**（`systemctl restart trim_connect`），重启完立刻可用 ✓。

**② 裸 4G 只有出、没有进。**
4G 是运营商 CGNAT，**入站不可能**。所以对外访问要么走中继、要么走 Tailscale —— 局域网直连在断线时必然不通，这不是故障。

顺带一个同源坑：**给隧道/反代配置回源地址时别写局域网 IP**。我原来写的是 `http://192.168.20.18:8080` 这种，一旦网卡上的地址没了，回源直接断（外部看到 530）。改成 `http://127.0.0.1:8080` 之后，**跟走哪条线路、哪个地址完全无关**了 ✓。

## 别让 4G 偷偷烧流量

装完之后我看了眼计数器，吓了一跳：**开机 36 分钟，4G 上行已经 3 GB** 😅

原因：机器上 **IPv6 的默认路由只有 4G 这一条**，所以所有 IPv6 出站流量都在走 4G。而跑着 qBittorrent 的话，做种上传会疯狂吃 IPv6。

两个处理：

- **治本（软件里就能做）**：qBittorrent → 设置 → 高级 → 「网络接口」选有线口、「可选 IP 地址」选有线地址 → 它只用有线收发，线断了它自己哑掉，**绝不会吃 4G** ✓
- **兜底**：加一个静默流量看门狗，**只在"有线本来就正常"时才可能报警**（当日 4G > 1 GB，或单轮增量 > 200 MB），断线期间 4G 是唯一出口，属正常使用，一个字都不说。

## 换个 USB 口的意外收获：别写死网卡名

后来我把 4G 模块换个 USB 口插，顺手发现两个"绝对不能写死"的东西：

1. **ModemManager 里的模块编号会变**：`Modem/0` 变成了 `Modem/2`；
2. **接口名也可能变**（这次还是 `wwan0`，但没理由指望它永远不变）。

所以所有脚本都改成了**自动识别**：

```bash
# 找 4G 网卡：优先看驱动是不是 qmi_wwan，退路才找 wwan*
for d in /sys/class/net/*; do
  [ -e "$d/device/driver" ] || continue
  [ "$(basename "$(readlink -f "$d/device/driver")")" = "qmi_wwan" ] && basename "$d"
done
```

另外还遇到一次 ModemManager 状态错乱：`mmcli` 报 `state: failed / failed reason: sim-missing`，可数据其实是通的（模块自己续着会话）。`systemctl restart ModemManager` 让它重新识别 SIM 即可 —— **但要注意，这时 MM 已经不托管任何数据会话了，一旦掉线它不会自动重连**，所以别放着不管。

## 效果

现在这套跑下来，日常是这样的：

| 场景 | 表现 |
| --- | --- |
| 拔掉网线 | 1~2 秒内 4G 提权顶上，NAS 服务、远程访问、机器人都不断 |
| 插回网线 | 自动撤掉临时的 4G 路由，出口回到有线，4G 回到待命 |
| 只有 4G 时 | 远程访问走中继（需重启一次中继服务），局域网直连不通属正常 |
| 有线正常时 | 4G 只当备胎，流量几乎为零（qB 已绑定网卡） |

成本就是一块二手大疆 4G 模块（100 元）+ 一张流量卡，比第二条宽带便宜太多了。

## 小结

- **单线 NAS 的备用链路，值得折腾**；大疆一代 4G 模块（本质是 Quectel LTE 模块）在 Linux 上几乎是插上就能用，日常管理交给 HiDeck 很省心；
- **断线切换的坑常常不在备用链路本身，而在主链路的"僵尸状态"**（本例：OVS 藏了物理断线 → 默认路由不撤 → 备用链路永远轮不到）；
- **别跟上层管理器抢它管的配置**，换个"没人管的等价杠杆"（改 4G 那条 metric，而不是有线那条）；
- **判断数值别用字符串匹配**，`metric 50` 会被 `metric 5000` 命中；
- **脚本别写死网卡名/模块编号**，用 `qmi_wwan` 驱动去认；
- 计量的链路上，**把大流量程序绑到主网卡**，再配一个"只在异常时才说话"的看门狗。

折腾的过程很烦，但结果是"真香"：现在拔网线，我甚至感觉不到。
