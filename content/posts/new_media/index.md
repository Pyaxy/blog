+++
title = "【教程】因为买不起内存，我使用了树莓派+115网盘+Strm搭建了家庭影音库（踩坑实录）"
date = "2026-01-30"
draft = false 
description = ""
summary = "经过一番折腾，我实现了在轻量服务器上部署可以播放4K蓝光原盘电影的Emby项目。"
tags = ["Emby", "Docker", "115网盘", "树莓派", "OpenList"]
categories = ["Projects"]
series = []

[params]
  showTableOfContents = true
  showReadingTime = true
+++

# 需求背景
作者最近想要折腾一台NAS用于家庭影音库的搭建，但是仔细研究了一下，内存和硬盘的价格都不是很合适，且近几年来由于NAS走入了大众视野，运营商对上行带宽的限制变严格了许多，导致外网播放也逐渐受损。

恰好这个大佬的文章可以很好的解决我的需求：[【教程】如何用一台2g15g的VPS结合网盘实现302直链播放的个人全自动追番Emby影视库](https://idcflare.com/t/topic/31258?u=witcheng)

于是我仿照着大佬的思路进行了复现，并在最后记录下自己踩坑的点，如果你在部署时遇到了问题，希望我踩过的坑你不用再踩一遍，希望对大家有所帮助！


### 搭建前的准备
你需要具备的知识：
1. 了解Linux系统的基本操作。
2. 了解Docker的基本用法。

我的基本情况：

2. 树莓派5 8G内存 32G存储卡
3. 115网盘会员

> [!INFO] 关于设备
> 根据我部署成功之后的体验来看，我这块树莓派5的性能是**完全冗余**的，由于这套观影架构的特性，设备大部分时间的CPU占用为0，因此一台入门级别的VPS是完全够用的。


> [!INFO] 关于网盘
> 网盘的选择主要在于两点
> 
> 1. 最好是国内网盘，这套架构完全支持**杜比蓝光原盘电影**的播放，一部这样的电影大小约70G～80G，如果使用国外的网盘，那么就要付出高昂的流量费用了，且大部分国外网盘在国内并没有做CDN加速。
> 2. 最好没有速度限制，要播放高码率的影片，对网盘的带宽提出了很大的要求，如果你的网盘会员会限速（~~比如淘宝88 VIP兑换的夸克网盘~~），那么观影体验会差很多。



### 最终效果
如果搭建成功的话，可以实现家庭影音库的搭建，包括：

1. 秒开4K原盘电影。
2. 零服务器带宽消耗，带宽由网盘商提供。

最终效果图：
![](20260130193802327.png)


---
# 方案介绍
### 组件介绍
本方案全程使用Docker容器部署，具备良好的可迁移性，理解各个Docker容器具体作用有利于我们完整的理解整个方案架构。

##### OpenList

[OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList)

相当于在服务器上自建了一个**品牌为OpenList的网盘**，可以将市面上的其他网盘挂载在该网盘的目录下，理解这一点对后续架构的理解**至关重要**。
> [!NOTE]
> 比如我将115网盘挂载到了OpenList网盘的`/115`目录下，同时我将夸克网盘挂载到了OpenList网盘的`/Quark`目录下，用户只需要访问OpenList网盘就可以同时访问两个甚至多个网盘。


##### TaoSync

[dr34m-cn/taosync](https://github.com/dr34m-cn/taosync)

可以将OpenList网盘中的*在线*内容下载到服务器上，主要用于将OpenList网盘生成的Strm文件同步到服务器上。


##### Mihomo

[MetaCubeX/mihomo](https://github.com/MetaCubeX/mihomo)

基于Clash.Meta的科学上网组件，实现服务器访问墙外的网站，主要用于解决Emby获取影片元数据连接不成功的问题。


##### Metacubexd

[MetaCubeX/metacubexd](https://github.com/MetaCubeX/metacubexd)
Mihomo的前端面板，用于控制Mihomo的代理节点。


##### Emby
家庭媒体库的**核心**，对家庭影音库的资源进行统筹管理，在本方案中主要是用于扫描存储到本地的Strm文件用于建立媒体库索引。

镜像地址：[https://hub.docker.com/r/amilys/embyserver](https://hub.docker.com/r/amilys/embyserver)

##### MediaLinker

[thsrite/MediaLinker](https://github.com/thsrite/MediaLinker)

对Emby实现反向代理，并拦截用户的观影请求重定向到网盘，是**实现观影时服务器0负载的关键**


### 方案原理
方案的主要原理为**将轻量化的VPS转化为PB级数据中心的网关**，用户与VPS的数据交换均为控制信号，VPS将用户的观影请求直接重定向至网盘，影片流量**绕过**了VPS直接来到了用户设备中，极大的降低了服务器的配置要求。

![](20260130201236421.png)

# 开始部署
在我们准备好VPS后，在用户目录下，创建目录`my_media`，家庭影音库的所有配置都存储到该目录下

### 部署OpenList
在`my_media`下创建`docker-compose.yml`文件，填入我们第一个容器OpenList的配置信息。
##### docker-compose.yml
```yml
services:
  # OpenList配置
  openlist:
    image: openlistteam/openlist:latest # 官方镜像
    container_name: openlist
    restart: always # 保证服务器意外断电时自动重启服务
    ports:
      - 5244:5244 # 将5244端口映射到外部
    environment:
      - TZ=Asia/Shanghai # 国内时区
    volumes:
      - ./openlist/data:/opt/openlist/data # my_media/openlist文件夹下存储OpenList的所有配置信息
      - ./Strm:/Strm # 重点！OpenList生成的Strm文件保存到物理机的my_media/Strm里
```

##### 挂载网盘
完成编辑后尝试启动服务，在命令行输入
```bash
docker compose up -d
```
显示运行成功后访问`http://<服务器ip>:5244`，成功进入OpenList主界面。

![](20260130203512122.png)

账户为admin，密码会在第一次启动的时候在终端日志里打印出来，登陆进去后第一时间改密码。

根据OpenList的[官方文档](https://doc.oplist.org/guide/drivers/common)添加自己的使用的网盘，我添加的是115，添加成功后会在主页显示出来。

![](20260130204151688.png)

##### Strm文件生成
`.strm` 文件本质上是一个**纯文本文件**，里面并不存储任何视频内容，而只保存了一行或多行**媒体资源的直接访问地址**（例如 HTTP / HTTPS / WebDAV / SMB / RTSP 等）。  

可以把它理解为一个“**视频的快捷方式**”或“**在线播放指针**”。

而Emby完美支持Strm文件的读取，在Emby的眼中`.strm`文件就是一个媒体视频，因此我们可以将大量的Strm文件保存在存储空间有限的轻量VPS中。

OpenList支持对内部目标进行扫描并自动生成该目录下文件对应的`.strm`文件，进入开OpenList管理 -> 存储 -> 添加 -> 驱动名称选择`Strm`，我们都需要填这些内容：

1. 挂载路径：`/virtual_strm`
2. 启用签名：开启。
3. 路径：你挂载在OpenList中的网盘的路径。比如我将115网盘挂载在`/115`，而我的影音文件都存储在网盘的`01_Media_Library`中，因此我的完整路径填为`/115/01_Media_Library`。
4. 站点URL：填为`http://<服务器ip>:5244`。这样我们生成的**媒体资源的直接访问地址（直链）**为外部地址，而不是容器内的地址。
5. 携带签名：开启。开启此项OpenList生成的直链后面会加上签名用于鉴权，**如果你的服务器会暴露在公网环境下请务必开启**，此项用于防止你的网盘目录结构被猜出来被任意用户使用直链访问。

完成之后OpenList会自动生成你选择的目录下的`.strm`文件到`/virtual_strm`中

![](20260131032034875.png)

按照预期，此时我们在浏览器访问`.strm`中的链接是可以直接播放的，同时服务器的不会产生明显的流量变化。

> [!Warning] 注意
> 此时的`.strm`文件只存储于OpenList网盘中，在VPS的视角中该文件依然是在线文件，而`Emby`只支持本地文件夹的访问，因此我们需要将`.strm`文件同步到本地文件夹中，我们使用TaoSync实现这一过程。

---
### 部署TaoSync
我们在刚才编辑的`docker-compose.yml`中填入TaoSync的配置信息。
##### docker-compose.yml
```yml
services:
  # OpenList配置
  openlist:
  ...

  # TaoSync配置
  taosync:
    image: dr34m/tao-sync:latest # 官方镜像
    container_name: taosync
    restart: always
    ports:
      - 8023:8023 # 映射8023端口到外面
    volumes:
      - ./taosync:/app/data # my_media/taosync目录下存储TaoSync的配置信息
```
##### 配置同步作业
再次启动服务，此时我们访问`http://<服务器ip>:8023`，成功进入TaoSync的主界面。与OpenList类似，用户名为`admin`，密码打印到了日志里，如果没有的话使用`my_media/taosync`中的恢复密钥改一下密码即可。

TaoSync本质上是用于操作网盘的，不支持对本地文件的操作，但是我们可以在OpenList中再挂载一个类型为**本机存储**的路径。同样进入开OpenList管理 -> 存储 -> 添加 -> 驱动名称选择`本机存储`，我们都需要填这些内容：

1. 挂载路径：`/physical_strm`
2. 启用签名：开启。
3. 根文件夹路径：`/Strm`。

保存后，我们现在应该在OpenList中看到`physical_strm`目录，里面为空。

进入TaoSync，进入引擎管理 -> 新增引擎，我们填写：

1. 地址：OpenList的入口地址，即`http://<服务器ip>:5244`。
2. 备注：自己填写即可。
3. 令牌：在OpenList的管理 - > 设置 -> 其他 -> 页面最下面的令牌，复制填写进去。

![](20260131034852319.png)

接下来进入作业管理 -> 新建作业，我们填写：

1. 引擎：刚才创建的引擎。
2. 源目录：即存储着生成的`strm`文件的目录`/virtual_strm`。
3. 目标目录：即需要被同步的目录，即刚才创建的本机存储目录`/physicial_strm`。
4. 同步方法：全同步。这样我们在云端删除的文件也会在本地删除。
5. 同步间隔：10分钟，自己酌情考虑时间，该时间仅供参考。

完成后点击作业右侧的手动执行进行初次同步，完成后进入OpenList的`/physical_strm`目录，里面应该有着刚才生成的`strm`文件。

> [!NOTE]- 各种strm文件夹的区分（点击展开阅读）
> 这是我刚开始搭建时让我很迷惑的点，从开始部署到现在一共出现了3个`strm`文件夹`/Strm`，`/virtual_strm`，`/physical_strm`。
> 
> 为了便于区分其作用域，我才用类网络传输协议的方式对这些文件夹加上前缀：
> 
> 1. `VPS://`代表该目录是在服务器物理存储的，与服务器上的其他文件夹并无差异。
> 2. `OpenList://`代表该目录只在OpenList中可见，就类似于你在其他网盘里的内容一样，你在其中的修改不会影响到服务器本地文件，就类似于你在网盘中新建了文件夹，这对你电脑没有任何影响。
> 
> 接下来我们讲讲各种`strm`目录协作下发生了什么。
> 
> 1. 在我们添加了`OpenList://virtual_strm`之后，该目录下自动生成了与`OpenList://115/01_Media_Library`中一样的目录结构，并且为每个媒体文件创建了`strm`文件。这是最初的`strm`文件。
> 2. 在我们配置`OpenList://physical_strm`之后，由于OpenList的本机存储目录的特性，OpenList将`VPS://my_media/Strm`文件夹挂载到`OpenList://physical_strm`上，我们在操作`OpenList://physical_strm`的同时，其实就是在操作`VPS://my_media/Strm`。
> 3. 当我们使用TaoSync将`OpenList://virtual_strm`与`OpenList://physical_strm`建立同步时，TaoSync会一直保持`OpenList://physical_strm`与`OpenList://virtual_strm`一致，而操作`OpenList://physical_strm`的时候同样会在`VPS://my_media/Strm`中写入`strm`文件。

到此为止，我们就成功的对网盘上的内容建立`strm`文件并进行本地存储。

此时你如果再向网盘上传一个视频后，10分钟后该文件的`strm`文件会出现在服务器端`my_media/Strm`目录中，浏览器点击`strm`的链接也是可以直接播放的。

---
### 部署Emby
Emby是**个人媒体服务器**软件，部署到服务器上之后可以将分散在本地硬盘、NAS 或远程存储中的媒体资源统一整理成一个**带有海报、简介、演员信息的媒体库**，并通过客户端实现在线播放。

继续在`docker-compose.yml`中编写Emby配置，
##### docker-compose.yml
```yml
servicces:
	# OpenList配置
	openlist:
	...
	
	# TaoSync配置
	taosync:
    ...
	
	# Emby配置
	embyserver:
	    image: amilys/embyserver_arm64v8:latest # arm架构的镜像
	    container_name: emby
	    network_mode: bridge # 使用桥接模式
	    environment:
	      - UID=0
	      - GID=0
	      - TZ=Asia/Shanghai
	      - HTTP_PROXY=http://192.168.31.164:7890
	      - HTTPS_PROXY=http://192.168.31.164:7890
	      - http_proxy=http://192.168.31.164:7890
	      - https_proxy=http://192.168.31.164:7890
	      - NO_PROXY=localhost,127.0.0.1,openlist,medialinker
	      - no_proxy=localhost,127.0.0.1,openlist,medialinker
	    volumes:
	      - ./emby/config:/config
	      - ./Strm:/data/Strm # 将本地的VPS://Strm目标映射到容器里
	    ports:
	      - 7568:8096 # 将Emby端口映射到7568
	    restart: always
```

> [!Warning] 注意服务器系统架构
> 由于我的树莓派是arm架构的，所以我的emby用的是arm架构的镜像文件，请根据自己的服务器架构选择合适的镜像：
> 
> 1. ARM架构的服务器配置与我一样即可。
> 2. x86架构的服务器镜像填为`amilys/embyserver:latest`即可。

##### 创建媒体库
再次运行Docker之后，我们访问`http://<服务器ip>:7568`进入Emby的首页，第一次启动需要进行初始化，请根据页面的提示完成即可。

用户完成注册登陆后，我们进入设置 -> 媒体库 -> 新建媒体库：
1. 内容类型：番剧/电视剧目录选择电视节目；电影选择影片
2. 文件夹：选择`/data/Strm/Movies'或者`/data/Strm/TV_Shows'等，具体根据你自己的媒体库结构选择，不过建议是媒体类型按照种类存放。
3. 其他配置保持默认即可，Emby是个比较复杂的系统，~~后续留着慢慢折腾~~。

建立成功后如图所示，此时回到主页视频应该是可以直接播放的，此时CPU利用率应该会占满，同时服务器也会有明显的上传与下载流量。如果播放不了也没关系，这大概率是因为浏览器的解码能力太弱导致的。
![](20260131044400514.png)
另外，你的媒体库可能加载不出来封面图片等元数据，这大概率是因为获取这些数据的网站被墙了，我们接下来在服务器上部署代理服务解决此问题。

---
### 部署Mihomo与Metacubexd
Mihomo是新一代基于Clash.Meta内核的代理软件，由于服务器普遍没有GUI界面，我们需要再部署Metacubexd用于控制Mihomo。
##### docker-compose.yml
```yml
services:
  # 刚才的一些配置
  ......
  
  # Mihomo配置
  mihomo:
    image: metacubex/mihomo:latest
    container_name: mihomo
    restart: always
    network_mode: host
    volumes:
      - ./mihomo/config:/root/.config/mihomo # my_media/mihomo/config存储mihomo配置
    cap_add:
      - NET_ADMIN # 给予网络权限，防止出错

  # Metacubexd配置
  metacubexd:
    image: dzlx/metacubexd:latest
    container_name: metacubexd
    restart: always
    ports:
      - "8088:80"  # 网页访问端口，你可以改成自己喜欢的
```
##### 配置代理服务
由于代理只需要进行媒体元数据的采集，因此对梯子的要求很低，我用的是市面上很常见的1元机场，下载机场配置文件到服务器的`~/my_media/mihomo/config/config.yaml`中。
> [!Info] 提供一个简单的思路
> 由于市面上提供的机场订阅链接直接下载普遍都是Base64编码后的配置文件，那么我们先进行订阅转化再下载即可。
> 
> 1. 随便搜一个订阅转换的网站，我这里用的是https://acl4ssr-sub.github.io/
> 2. 选择基础模式，直接粘贴你的机场订阅链接，点击生成订阅链接，并复制。
> 3. 在服务器终端输入：`curl -L -o ~/my_media/mihomo/config/config.yaml "你刚才转换生成的订阅下载链接"`

检查一下下载完的配置文件，确保开头有这些内容，如果没有需要自己加上。

![](20260131054519356.png)

再次运行Docker，进入`http://<服务器ip>:8088`，进入到Mihomo管理页面，进行节点选择等的配置。

##### 让Emby服务器走代理
再次编辑`docker-compose.yml`，为Emby的配置添加上这几行环境
```yml
services:

	...
	...
	...
	
	# Emby配置
	Emby:
	
	...
	
	environment:
	
		...
		
		- HTTP_PROXY=http://<服务器ip>:7890
	    - HTTPS_PROXY=http://<服务器ip>:7890
	    - http_proxy=http://<服务器ip>:7890
	    - https_proxy=http://<服务器ip>:7890
	    - NO_PROXY=localhost,127.0.0.1,openlist,medialinker
	    - no_proxy=localhost,127.0.0.1,openlist,medialinker
```

重启Docker，这下我们媒体库的页面可以完美显示封面等信息了。

### 部署MediaLinker
我们在直接使用Emby进行播放时，由于Emby的本身的特性，就算Emby获得了用户需要观看的视频的直链，他会亲自当作中转，自己获取直链的内容并转发给用户，这样就导致服务器的CPU占用极高，同时伴随着大量的上传/下载行为，~~太费钱了~~。

MediaLinker应运而生，MediaLinker是embyExternalUrl的docker版本，旨在通过nginx对Emby进行反向代理。

当用户发起播放请求时，MediaLinker会拦截这个请求，自己调用Emby的API获取播放直链，一旦获取成功就直接返回给用户，此时的直链终点目标是OpenList，用户会直接访问OpenList的直链，OpenList在接收到请求后会根据直链查数据库 / 缓存，确认这是哪个存储（阿里云盘 / OneDrive / 115 / 百度网盘…）的哪个文件，调用对应的官方网盘的API接口获取该资源在官方网盘上的直链，一般为`https://cdn.115.com/xxx/xxx/xxx?sign=xxxx&expires=10000`，这种链接的有效期一般有限，每次获取都不一样。然后将这个链接通过302重定向的方式返回给用户，用户就成功建立起了用户 -> 网盘CDN之间的数据流
![](20260131051831779.png)

继续编写`docker-compose.yml`
##### docker-compose.yml
```yml
services:
  # 刚才的一些配置
  ...
  ...
  ...
  
  # MediaLinker配置
  medialinker:
    image: thsrite/medialinker:latest
    container_name: medialinker
    restart: always
    network_mode: host # 注意使用Host模式，Host在高并发的情况下性能会更优 
    environment:
      - SERVER=emby
      - NGINX_PORT=8091 # 我们以后就通过ip:8091访问emby
      - NGINX_SSL_PORT=8095
      - AUTO_UPDATE=false
    volumes:
      - ./medialinker:/opt
```
##### 配置MediaLinker
运行Docker服务后，MediaLinker会自动生成`~/my_media/medialinker/constant.js`配置文件，配置里面的几项，剩下的无特殊需求可以不用修改。
```javascript
const embyHost = "http://<服务器ip>:7568"; # 为Emby暴露出来的端口
const embyApiKey = "xxxxxxxxxxxxx"; # 在Emby -> 设置 -> API密钥 -> 新建API密钥，生成后复制进来
const mediaMountPath = [""]; # 这里不用填
```

再次重启Docker服务，这次我们访问`http://<服务器ip>:8091`进入Emby，此时再点击一个视频播放，我们会惊喜地发现CPU占用与上下行流量几乎都为0了😄。

当然，我个人是不推荐直接在浏览器上看Emby的，市面上有着很多成熟的支持Emby的媒体播放器，**添加Emby服务时地址端口记得填写为`8091`即可。**

---
# 部署过程中我遇到的问题
### Emby第一次运行时退出，代码555
这就是因为系统架构不同，记住选择适配自己机器的镜像！

### Emby显示不出视频封面
90%是因为网络问题，参考上面的教程部署Mihomo，并让Emby走代理。

### 家庭内网里服务器断电重启后连接不上所有服务
试着在路由器的管理页面检查一下服务器的ip是不是变了，最好别让服务器使用DHCP，在路由器管理界面为服务器分配一个静态ip，**记得同步更改OpenList的Strm里的站点URL**。

### 尝试使用互联网现成的Clash前端页面时发现连不上
大概率是因为服务器地址填的是http协议，被浏览器拦截了，有能力最好让服务器用上https😿。

### 部署Mihomo后Emby获取元数据的地址依然没有走代理
一般是因为获取元数据的地址没有在规则里，一般的解决方法是添加超时的地址到规则里面去，又或者代理走白名单模式，只有在白名单里面的地址直连，不在里面的地址一律走代理。

### 配置基本上都没问题但是播放不了
检查OpenList中的网盘Cookie之类的是否过期了，不要认为你可以通过OpenList查看文件列表就可以播放文件，网盘商对查看内容的API更严格，验证cookie是否失效的方法就是在OpenList中打开一个文件，如何过期了会显示消息。

### 播放报错401
一般是因为OpenList开启了签名，访问者访问的时候没有携带签名。
有两种解决方法：
1. （推荐）在配置生成`strm`文件的存储驱动中开启`携带签名`选项，开启后最好手动在TaoSync中同步一下，~~如果你不想等10分钟的话~~。
2. （公网环境下慎用）在OpenList管理 -> 设置 -> 全局 -> 签名所有，关掉这个，同时关闭所有存储驱动的签名功能，关闭你访问的存储驱动的密码。
### 断开与服务器的链接后服务就失效了
Docker运行时没有加`-d`，没有建立守护进程。

---
# 总结
经过上面的一番折腾，我们实现了在轻量服务器上部署可以播放4K蓝光原盘电影的Emby项目，用户与服务器之间只进行控制信号的交流，数据流是直接与网盘进行的。

此方案优点在于在户外播放也是满速的，你不必使用自己服务器的上行带宽进行数据传输，此外大多数网盘都具有妙传的功能，节约了下载资源的时间

此方案的缺点也很明显，要不限速的国内网盘的会员，同时断网的时候也不能进行观看。

最后分享几个我个人在用的资源站：

[【收费】哆咪｜高清影音分享平台｜里面有大量蓝光原盘演唱会视频和高解析音乐｜主要收录着日语歌](https://www.do-mi.cc/)

[【免费】音范丝｜老牌4K蓝光原盘电影分享平台](https://www.yinfans.cc/)

[【免费】蜜柑计划｜全网最全的番剧资源网站](https://mikan.tangbai.cc/)

[【免费】SeedHub｜比较综合的一个资源站](https://www.seedhub.cc/)

[【免费但需要登陆】NULLBR｜目前电影近12w+部，剧集4.5w+部。99%提供磁力下载链接。7w+网盘分享](https://nullbr.online/)
