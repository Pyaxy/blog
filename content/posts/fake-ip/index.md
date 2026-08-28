+++
title = "【教程】Openclash在fake-ip的Dnsmasq转发模式下根据设备MAC让其流量绕过内核"
date = "2026-03-07"
draft = false
description = ""
summary = "实现了openclash在fake-ip的Dnsmasq转发下按设备走代理"
tags = ["Openclash", "软路由"]
categories = ["Networking"]
series = []

[params]
  showTableOfContents = true
  showReadingTime = true
+++

# 需求背景
楼主最近新买了一台软路由，然后设置了openclash为全屋代理，但是我使用Mac开发时所使用的网络环境会经常变化，而且会使用到surge进行rewrite（毕竟如果我全屋都用openclash我的surge不白买了😭），最终目的还是让surge接管我电脑的代理

问题随之而来，现在openclash主推的模式是fake-ip模式，但fake-ip模式下，若要实现局域网设备的黑白名单过滤，DNS劫持模式必须改为**防火墙转发**模式，并**不支持Dnsmasq转发**。

![](20260307000056505.png)

放弃Dnsmasq转发意味着放弃了openclash的绕过中国大陆功能，该功能可以使访问国内大众网站下的流量不经过clash内核处理，有效降低了内核的负载，同时提高了访问速度。

在Dnsmasq模式下，大家最普遍的控制设备是否走代理的方式就是在openclash的规则集里添加这条规则：

```yaml
rules:
	SRC-IP-CIDR,192.168.1.23/32,DIRECT
```

这样做的确可以实现特定设备不走代理，但是弊端也很明显，虽然特定设备不走代理，但是流量白白的进入了内核进行了拆包再根据规则封装转发，同样会提高内核负载。

> [!info] fake-ip的另一个缺点
> 在fake-ip模式下，设备针对域名的ping操作会失效，这是因为在开启fake-ip模式后，为了保证系统的正常运作，openclash会向防火墙添加拒绝ICMP报文的规则，导致失效。

因此，无论是使用Dnsmasq转发，还是使用防火墙转发，都无法解决上述的所有问题，那么是否可以让特定设备的所有流量全部绕过内核，在该设备上网时，openclash对于它是完全透明的。

**这样无论是NAS还是别的什么设备，可以放心的让它进行直连而不用担心流量被偷偷跑完了**

---
# 参考文档
在实现上述目标的过程中，我参考了以下链接：

[openclash的基础设置，实现全屋代理](https://github.com/Aethersailor/Custom_OpenClash_Rules/wiki/OpenClash-%E8%AE%BE%E7%BD%AE%E6%96%B9%E6%A1%88)

[# OpenWrt 使用 Tag 给特定的设备单独指定旁路网关的地址和 DNS](https://blog.hellowood.dev/posts/openwrt-%E4%BD%BF%E7%94%A8-tag-%E7%BB%99%E7%89%B9%E5%AE%9A%E7%9A%84%E8%AE%BE%E5%A4%87%E5%8D%95%E7%8B%AC%E6%8C%87%E5%AE%9A%E6%97%81%E8%B7%AF%E7%BD%91%E5%85%B3%E7%9A%84%E5%9C%B0%E5%9D%80%E5%92%8C-dns/)

[OpenClash 在 Dnsmasq 转发模式下基于 MAC 绕过设备](https://kasuha.com/posts/openclash-dns-forward-bypass-by-mac/)

# 整合实现
我整合并优化了上述文档的内容生成了下面这一份实现教程。

这是这份教程撰写时我的软路由系统信息：
- 固件版本：ImmortalWrt 24.10.4 r33602-e717d133ed6d / LuCI openwrt-24.10 branch 25.300.72106~0418b54
- 内核版本：6.6.110
- Clash内核版本：**alpha-g86257fc**
- Openclash客户端版本：**v0.47.055**

**如果你在实施过程中发现有的Web UI不一致，请搜索自己的系统版本的相同操作方法。**

## 固定设备ip地址
如果你已经为设备设置了dhcp静态ip地址，请忽略该步骤。

进入`网络` -> `DHCP/DNS` -> `静态地址分配` -> `添加`

`MAC 地址`选择设备的MAC地址，`IPv4 地址`填写为设备当前的ip地址，`租约时间`选择12h，剩下的保持默认，保存并应用配置，这样以后每次设备联网时都会固定分到当前的ip地址。

![](20260307004626200.png)

## 修改来源流量访问控制
进入Openclash主页，选择`插件设置`，滑到最下面，在来源流量访问控制的设置界面，添加新的一项，`内部地址`填刚才固定的ip地址，`端口`留空，`通讯协议`选择`全部`，`对象`选择`RETURN`，完成后点击最下面的`应用配置`。

这样设置完毕后，设备针对real-ip地址的访问流量会直接绕过内核，但是设备要获得real-ip需要先进行DNS。如果设备的DNS服务器地址还填的路由器网关地址，那么内核还是会劫持DNS请求并返回一个fake-ip，而来源流量访问控制是不会让访问fake-ip的流量绕过内核的，因此下一步我们需要设置设备的DNS服务器。

## 设置设备的DNS服务器
关于设备的DNS服务器有两种设置方法：
### 方法一
- 直接进入自己设备的网络设置，手动更改DNS服务器为国内的热门DNS服务器，比如`114.114.114.114`、`223.5.5.5`、`119.29.29.29`

但个人更推荐第二种方法，方法二不会修改设备的网络设置，方便设备切换不同网络环境时保证网络设置的唯一性

### 方法二
该方法是基于Dnsmasq的tag功能实现的，可以为单独的设置分配网关和DNS服务器地址，我们此处只需要分配DNS服务器地址。

进入刚才固定ip地址的页面中，编辑你刚才设置的固定ip的那一条目，找到`标签`，添加一个，比如`directnode`，tag 名称不能包含空格和特殊字符，保存并应用。

![](20260307011039057.png)

进入OpenWrt的命令行页面，执行以下命令：
```bash
uci set dhcp.directnode="tag"
uci set dhcp.directnode.dhcp_option="6,223.5.5.5,119.29.29.29,114.114.114.114"
uci commit dhcp
/etc/init.d/dnsmasq restart
```
上面的`directnode`即你创建的tag名称，类型设置为`tag`，dhcp_option中`6`代表下发的DNS服务器地址，多个地址直接使用逗号分隔。

断开设备的网络连接，并重新连上，这样会重新触发dhcp分配，查看设备的网络设置，路由器下发的DNS服务器地址应该就不是路由器地址了。

理论上讲，此时DNS过程也不走路由器了，这下应该可以实现从DNS到访问real-ip全程绕过内核了，但是如果你这个时候去访问Google，发现你的设备还是能访问成功。

## 修改防火墙规则
问题其实出在了路由器防火墙规则上，在openclash到fake-ip模式启动后，openclash会添加一条防火墙规则，将所有的TCP/UDP到53端口的请求全部劫持到本机的53端口，那么其实上面设置的公共DNS并没有什么作用，设备发送到公共DNS服务器的请求还是会被劫持并返回fake-ip

解决的方法也很简单，由于openclash的防火墙转发的黑白名单实现就是依赖防火墙的，它维护了一个需要绕过的设备的MAC地址的集合，随后在DNS劫持的时候，凡是命中该集合内的MAC地址的数据包都直接放行。

我们可以仿照这个思路在Dnsmasq模式下也实现黑白名单功能，在openclash中用户可以通过覆写脚本实现对防火墙规则的操作。

进入openclash首页，点击 `插件设置`，再点击`开发者选项`。

粘贴下面的覆写代码，填写具体设备的MAC地址到里面，该代码维护了一个需要绕过的MAC地址集合，使DNS劫持时命中集合的数据包直接放行。

> [!warning]
> 下面代码修改的是基于`nftables`的防火墙，如果你使用的是`iptabls`的防火墙，部分语法可能不适用，可以让AI帮你转化一下语法。



```bash
#!/bin/sh
. /usr/share/openclash/ruby.sh
. /usr/share/openclash/log.sh
. /lib/functions.sh

# This script is called by /etc/init.d/openclash
# Add your custom overwrite scripts here, they will be take effict after the OpenClash own srcipts

LOG_OUT "Tip: Start Running Custom Overwrite Scripts..."
LOGTIME=$(echo $(date "+%Y-%m-%d %H:%M:%S"))
LOG_FILE="/tmp/openclash.log"
#Config Path
CONFIG_FILE="$1"
    sleep 20
    LOG_OUT "Tip: Start Add Custom Firewall Rules..."
    # >>> 在这里填需要绕过 Clash 的设备 MAC，空格分隔
    MACS="aa:bb:cc:dd:ee:ff"

    # 1) 集合：lan_bypass_macs（存在则清空，确保可重复执行）
    if nft list set inet fw4 lan_bypass_macs >/dev/null 2>&1; then
      nft flush set inet fw4 lan_bypass_macs || :
    else
      nft add set inet fw4 lan_bypass_macs '{ type ether_addr; flags interval; }' || :
    fi

    # 填充集合
    for mac in $MACS; do
      # 正规化为小写
      m=$(echo "$mac" | tr 'A-F' 'a-f')
      nft add element inet fw4 lan_bypass_macs "{ $m }" 2>/dev/null || :
    done

    # 2) 删除所有旧的“ether saddr @lan_bypass_macs return”，再插到链首
    nft -a list chain inet fw4 dstnat 2>/dev/null | awk '
      /ether saddr @lan_bypass_macs/ && / return/ {
        for (i=1;i<=NF;i++) if ($i=="handle") {print $(i+1)}
      }' | while read -r h; do
        [ -n "$h" ] && nft delete rule inet fw4 dstnat handle "$h" 2>/dev/null || :
      done
    nft insert rule inet fw4 dstnat ether saddr @lan_bypass_macs return || :
    LOG_OUT "Done: MAC bypass rules loaded."
exit 0
```


事已至此，现在你的设备的所有流量应该都不会进入clash内核了，而且fake-ip也不会影响你ping域名了😄。

![](20260307014933623.png)

