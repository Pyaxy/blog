+++
"title" = "Recent Tinkering Diary"
"description" = ""
"summary" = ""
"tags" = ["Raspberry Pi", "Emby", "115 Cloud Drive", "Cloudflare"]
"categories" = ["Logs"]
"date" = "2026-01-28"
"draft" = false
"series" = []

[params]
"showTableOfContents" = true
"showReadingTime" = true
+++
The end result: a media library running on extremely modest hardware, with support for playing original 4K Blu-ray files that start instantly. It is accessible from anywhere in the country with an internet connection, and the server load stays extremely low during playback. See image 2.

I recently wanted to watch the final show of Taylor Swift's Eras Tour, but it turned out the original file was 20G. After downloading it and opening it in infuse, I felt like I'd discovered a whole new world. The media library had nothing but Taylor's poster sitting there all by itself, and all that empty space made me want to fill it up little by little with things I liked. I'd been meaning to watch Breaking Bad anyway, so I figured I'd download that and add it too. Then I found out the complete series in original 4K quality was 1700G, which completely killed the idea of downloading it locally. After all, if I deleted the files after watching them, they would disappear from the media library too.

So I started looking for solutions. At first I had two ideas: build a local nas and put the media library on it, or store everything in cloud storage and read the data from the cloud in real time.

I did a rough calculation for the first option. With hard drive and memory prices going up, the drives and memory alone would cost 2,000–3,000 yuan. Immediately ruled that out.

The second option is pretty similar to the first, basically a diskless nas. In particular, the strm files used with mounted cloud storage are like locally stored shortcuts to videos in the cloud. Click a shortcut and the video plays, without taking up local storage space.

Next came choosing a cloud storage service. I went straight for 115, which has the biggest collection of magnet-link resources, unlimited bandwidth, and 40T of storage for 100 yuan a year. (You have to subscribe for eight years in one go to get that price, but 115 has been around for 17 years, so I'm not worried about it disappearing. Two or three years of use would pay for itself.)

For the hardware, I chose the Raspberry Pi 5 I bought a year ago. It had been gathering dust for a whole year and could finally see the light of day again. After getting everything deployed successfully, I found that this setup could even run on a Raspberry Pi 3.

The whole setup consists of openlist+taosync+emby+mihomo+matecubexd+medialinker+cloudflared. It mainly handles mounting cloud data locally and generating strm files (openlist+taosync), building the media library itself (emby+mihomo+metacubexd), and reverse-proxying emby so videos can play even when the server has extremely little bandwidth (medialinker).

That's roughly how I put the media library together. Then, while I was writing the blog post, Alibaba Cloud sent me a message saying my domain was about to expire again. Alibaba Cloud's pricing is fucking outrageous: 125 yuan a year for an xyz domain. Like hell I'm renewing that 🥚. But the image hosting service for my notes needs a domain, so I immediately switched over to cloudflare.

It felt like discovering a whole new world. A com domain from cloudflare costs 10 dollars for the first year and 10 dollars to renew. How do you beat that? I registered one right away, and it doesn't need ICP filing! Registering a domain through Alibaba Cloud be like: fill out an application, print it, sign it, record a video holding your ID and reading out a pledge, upload it, then wait 7–14 days for review 😄. And you have to have a server on Alibaba Cloud too, which means spending more fucking money.

After registering the domain, I migrated the image hosting service first. Then I discovered that cloudflare gives individual users 10G of storage for free, with no charge for up to one million A/B requests a month. Why had I been paying Alibaba Cloud 10 yuan a year to renew my image hosting service all this time?

I found that cloudflare had even given my domain an ssl certificate for free. (With Alibaba Cloud, you still have to pay to rent one.) Then I carried on configuring the firewall and so on, since that's what most people know cloudflare for.

After finishing the blog post, I asked Gemini whether cloudflare had any other services I hadn't freeloaded off yet. Of course it did. It offers free tunnel access, which is perfect for reaching your home server while you're out and keeps the server from being directly exposed to the public internet. (And I don't have a public ip anyway.) cloudflare's free tunnel service strictly prohibits using it for video playback and large file downloads. (Bandwidth really is expensive.) But the advantage of this setup is that the server only sends the strm file to my phone, and the phone reads the video data straight from the cloud storage server. That means almost zero traffic goes through the tunnel. After some configuration, I can now access my emby while I'm out too.

I tested it, and the bitrate could even reach 124Mbps. (That depends heavily on the source; this was measured while playing a Breaking Bad episode that was 52G on its own.) Short videos usually run at around 1–2Mbps. The result absolutely blows them away.

Then I started worrying that the Raspberry Pi's sd card wouldn't hold up under this kind of service. While emby is running, it frequently writes things like the user's current playback progress and logs to the card. Frequent small-file writes are exactly what sd cards hate most. And because sd card reads are slow, the posters lag behind when you scroll through the media library.

So I started thinking about changing the Raspberry Pi's storage setup. An sd card was absolutely out of the question. One of the biggest updates in the Raspberry Pi 5 is its pcie interface, which makes things easy: buy a pcie-to-nvme board for the Pi, then get a second-hand SSD pulled from another machine.

While picking a board, I found something really fun: the pironman 5, a little case for the Raspberry Pi.

What caught my attention most was that it comes with a tower cooler for the Pi. With my previous setup running, the Pi's own fan was at full speed and it was still hot to the touch. A tower cooler should solve that problem nicely.

The case also has a pcie-to-nvme board built in, so I don't have to buy one separately.

And the whole case is tiny, with a little oled display on top that shows the current system status.

The case arrived today. After putting it together, the cpu temperature really did come down, but the drive I ordered hasn't arrived yet. I'll deal with that tomorrow when it gets here.

The minimum cost of putting this service together: an arm machine with two cores and 2G of RAM (100–200 yuan; remember to buy one with emmc storage built in, since sd cards don't last) plus a cloud storage subscription. Everything else, like the domain, case, and fan, is an optional extra.

More tinkering on the list:

- Once the drive arrives, install it and migrate the system from the sd card to the drive.

- Set up a software router to run the "magic" service, so my PC can access the internet with no proxy software installed, and the Raspberry Pi won't need its own proxy running to pull images either. Maybe a switch game accelerator too? (I haven't even turned on my switch in ages, and I've already sold my copy of Splatoon 3, which I used to play online.)

From 1.28 to today, I've spent a week tinkering with all this stuff, and I'm still not finished. Then I remembered that the whole reason I started was to watch Taylor's new movie. I'd completely forgotten. I put it on and watched one chapter. She's so beautiful, as you can see in the picture haha.

![](20261015014003923.jpeg)
