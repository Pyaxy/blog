+++
title = "【eSIM】Redpocket(红包卡) 30$每年 购买激活记录"
date = "2026-05-28"
draft = false 
description = ""
summary = "Redpocket 30$/年 包含了1GB全球漫游流量，100分钟全球漫游通话，100条全球漫游，各种平台接码也很丝滑"
tags = ["esim"]
categories = ["Networking"]
series = []

[params]
  showTableOfContents = true
  showReadingTime = true
+++
# 介绍
美国的电话卡，无需KYC，国内只能使用AT&T的网络，包含100分钟通话、100条短信、1G流量，都是国际范围内可用的，实测用来注册美区Google账号非常丝滑，即使弹出手机号验证也是可以通过的。
# 操作环境
- 网络环境：挂的自建的美国节点。
- 操作系统：Windows
- 浏览器：Chrome正常访问网站
# 购买
在eBay上购买redpocket上2.5$/mo的套餐，发货方式选择eSIM，介绍上说有200兆高速流量，是指美国境内的流量，另外还有1G的全球漫游流量。
注意：
1. 收货地址填美国的免税州地址，不然会多出约2$的税
2. 收到的电话区号是由收货地址的地区决定的。
购买5-15分钟后会收到一封邮件，里面有eSIM的Confirmation Code，用于激活eSIM。
# 激活
使用邮件里的激活网址，填入Confirmation Code和手机的IMEI号。
>[!NOTE] 注意
> 我使用的是iPhone SE3 美版，看网上说Redpocket卡对非原生的eSIM套卡检测非常严格，所以使用小白卡可能概率失败。

使用Google登陆redpocket账号，这样你的redpocket的用户名就是你的邮箱，进去之后趁着还有登陆状态先改密码，不然后续app上的Google登陆有问题，只能使用账号密码登录。

激活后邮箱会收到二维码，手机扫描二维码即可添加eSIM。

# 关于Wi-Fi calling
在我尝试开启Wi-Fi calling的时候，我试了3次：
1. 直接国内直连激活，失败，激活网址直接显示access deny。
2. 换上了自建的美国节点，成功进去了网址，但是会显示无法激活Wi-Fi calling，试了几次都是这样。
3. 尝试使用webshare的伪家宽激活，成功显示了网页，让填入e911地址，网上随便搜了一个地址填了进去，过了一会成功激活了。
维持Wi-Fi calling，我目前用的是美国节点维持，应该不需要家宽维持，我的家宽用的是socks5协议，本质上是不支持udp的，Wi-Fi calling的底层走的是udp维持的，不过由于各地网络环境不一致，请自行尝试直连是否可以维持。

# 该卡潜在的风险
1. 手机号可能是回收过的，**我激活收到的手机号的tg已经被封了**。可能区号在免税州的号段已经被薅过一遍了，填写非免税州的地址可能会好一些。
2. 不确定ebay上的30$/年的套餐是否会一直存在，如果下架了保号费用就高了。