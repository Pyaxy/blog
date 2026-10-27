+++
title = "Private"

# Render individual URLs without publishing a directory listing.
[build]
  list = "never"
  render = "never"

[sitemap]
  disable = true

[cascade]
  outputs = ["HTML"]

  [cascade.build]
    list = "never"
    render = "always"

  [cascade.sitemap]
    disable = true

  [cascade.params]
    searchHidden = true
    hiddenInHomeList = true
    hiddenInRss = true
    robotsNoIndex = true
    ShowPostNavLinks = false
    ShowBreadCrumbs = false
+++
