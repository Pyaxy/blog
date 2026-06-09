+++
title = "[eSIM] Redpocket Annual $30 Plan Purchase and Activation Notes"
date = "2026-05-28"
draft = false
description = ""
summary = "Redpocket's $30/year plan includes 1 GB of global roaming data, 100 minutes of global roaming calls, and 100 global roaming SMS messages. It also works smoothly for receiving verification codes on various platforms."
tags = ["esim"]
categories = ["Networking"]
series = []

[params]
  showTableOfContents = true
  showReadingTime = true
+++

# Introduction

This is a U.S. phone plan that does not require KYC. In mainland China, it can only use AT&T's network. It includes 100 minutes of calls, 100 SMS messages, and 1 GB of data, all available internationally. In my testing, it worked very smoothly for registering a U.S. Google account. Even when phone number verification popped up, it could pass successfully.

# Operating Environment

- Network environment: self-hosted U.S. proxy node.
- Operating system: Windows.
- Browser: Chrome, with normal access to the website.

# Purchase

Buy Redpocket's $2.5/month plan on eBay and choose eSIM as the delivery method. The listing says it includes 200 MB of high-speed data, which refers to data within the United States. In addition, it also includes 1 GB of global roaming data.

Notes:

1. Use an address in a U.S. tax-free state as the shipping address, otherwise there will be about $2 of extra tax.
2. The area code of the phone number you receive is determined by the region of the shipping address.

About 5-15 minutes after purchase, you will receive an email containing the eSIM Confirmation Code, which is used to activate the eSIM.

# Activation

Use the activation URL in the email, then enter the Confirmation Code and your phone's IMEI number.

> [!NOTE] Note
> I used a U.S. version iPhone SE 3. I saw online that Redpocket is very strict about detecting non-native eSIM adapter cards, so using a physical eSIM adapter card may have a chance of failing.

Log in to your Redpocket account with Google. This way, your Redpocket username will be your email address. After entering the account, change the password while you are still logged in. Otherwise, Google login may have issues later in the app, and you may only be able to log in with the account password.

After activation, you will receive a QR code by email. Scan the QR code with your phone to add the eSIM.

# About Wi-Fi Calling

When I tried to enable Wi-Fi Calling, I attempted it three times:

1. Directly activated from mainland China without a proxy. Failed. The activation website directly showed "access denied".
2. Switched to my self-hosted U.S. proxy node. I could successfully enter the website, but it showed that Wi-Fi Calling could not be activated. I tried several times and got the same result.
3. Tried using Webshare's pseudo-residential proxy. This successfully loaded the webpage and asked me to enter an E911 address. I searched online for a random address, filled it in, and after a while Wi-Fi Calling activated successfully.

To keep Wi-Fi Calling active, I am currently using a U.S. proxy node. It should not require a residential IP to stay active. My residential proxy uses the SOCKS5 protocol, which fundamentally does not support UDP, while Wi-Fi Calling is maintained over UDP at the lower layer. However, network environments vary by region, so please test yourself whether a direct connection can maintain it.

# Potential Risks of This Card

1. The phone number may have been recycled. **The Telegram account associated with the number I received after activation had already been banned.** It is possible that number ranges in tax-free-state area codes have already been abused heavily. Using an address from a non-tax-free state might be better.
2. It is uncertain whether the $30/year plan on eBay will always remain available. If it is delisted, the cost of keeping the number will become higher.
