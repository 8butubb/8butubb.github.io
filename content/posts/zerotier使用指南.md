---
title: zerotier使用指南
tags: [linux]
date: 2025-09-08T08:00:00Z
summary: zerotier使用指南
---
# 注册

1.进入[https://my.zerotier.com/network](https://my.zerotier.com/network)注册登录

Create A Network 新建网络，查看网络id

# linux端

## 1.安装

    curl -s [https://install.zerotier.com](https://install.zerotier.com) | sudo bash

## 2.加入网络

    sudo zerotier-cli join #你的网络id
    #设置zerotier自启
    sudo systemctl enable zerotier-one.service

新设备加入都要去[zerotier后台](https://my.zerotier.com/network)许可

![](https://img.butubb.cn/i/2024/12/09/67564e1d90bb7.png)

![](https://img.butubb.cn/i/2024/12/09/67564e2d8f266.png)

Authorized勾打上，name自己起，点击save保存

# docker安装

    docker run -d -restart always -name zerotier -v 你本地的地址:/var/lib/zerotier-one -network host zerotier/zerotier:latest
    #要使用host网络模式

    docker exec -it zerotier
    sudo zerotier-cli join #你的网络id

# ios端

App Store登录美区账号

搜索下载zerotier-one

打开点击右上角➕

输入网页端显示的网络id

点击add network

---

如果只是简单的互通到这里为止，你的iphone和linux已经可以实现互相访问了，直接ping网页端显示的ip地址即可，一般刚连上会延迟比较高，打洞成功后延迟基本在个位数

![](https://img.butubb.cn/i/2024/12/12/675a2c5a84c21.png)

# 进阶设置

## zerotier托管路由

如果你想实现访问linux客户端下的其他局域网设备，比如ps5等无法安装zerotier的设备

在linux已经安装配置好zerotier的基础上

    # 通过 ip a可以查看网卡配置，找到对应的zerotier虚拟网卡
    ztiv5heone: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 2800 qdisc fq_codel state UNKNOWN group default qlen 1000
    link/ether c6:a0:24:d1:76:3b brd ff:ff:ff:ff:ff:ff
    inet 10.147.17.11/24 brd 10.147.17.255 scope global ztiv5heone
    valid_lft forever preferred_lft forever
    inet6 fe80::c4a0:24ff:fed1:763b/64 scope link
    valid_lft forever preferred_lft forever

    # ztiv5heone 为虚拟网卡名字
    #允许防火墙通过
    iptables -I FORWARD -i ztiv5heone -j ACCEPT
    iptables -I FORWARD -o ztiv5heone -j ACCEPT
    iptables -t nat -I POSTROUTING -o ztiv5heone -j MASQUERADE

    # 允许转发
    cat /proc/sys/net/ipv4/ip_forward
    # 如果返回 1，表示开启不需要后续操作；0 表示关闭需要开启

    sudo vim /etc/sysctl.conf
    #在文件中找到（或添加）以下行：net.ipv4.ip_forward = 1

    sudo sysctl -p
    #保存后执行生效

进入[https://my.zerotier.com/network](https://my.zerotier.com/network)进入当前的网络id

找到

![](https://img.butubb.cn/i/2024/12/09/67564e4c2e223.png)

destination填写你的局域网网段例如192.168.2.0/24 ,via输入分配给你的虚拟局域网地址例如10.147.17.11

这里的意思就是如果我要访问局域网的其他设备，是要通过via填写的地址转发到目的局域网ip

此时使用在同一zerotier网络下的其他设备，ping你的局域网其他设备，能ping通即成功