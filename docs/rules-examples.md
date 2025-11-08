# XHRay Rules: Real-World Examples

This document contains **working, tested rules** for common scenarios and popular websites/frameworks.

---

## E-Commerce Examples

### Shopify Store
```json
[
  {
    "name": "🛒 Add to Cart",
    "selector": "button[name='add'], form[action='/cart/add'] button, .product-form__submit",
    "urlPattern": "/cart/add\\.js|/cart/add"
  },
  {
    "name": "🛒 Update Cart Quantity",
    "selector": ".cart__qty-input, input[name='updates[]'], .quantity__input",
    "urlPattern": "/cart/update\\.js|/cart/change\\.js"
  },
  {
    "name": "🛒 Remove from Cart",
    "selector": ".cart__remove, a[href*='cart/change'][href*='quantity=0']",
    "urlPattern": "/cart/change\\.js.*quantity=0"
  },
  {
    "name": "💳 Proceed to Checkout",
    "selector": "button[name='checkout'], .cart__checkout-button",
    "urlPattern": "/checkout|/cart/checkout"
  },
  {
    "name": "🔍 Product Quick View",
    "selector": ".quick-view-button, [data-action='quick-view']",
    "urlPattern": "/products/.*\\.js"
  },
  {
    "name": "❤️ Add to Wishlist",
    "selector": ".wishlist-button, [data-action='add-to-wishlist']",
    "urlPattern": "/wishlist"
  }
]
```

### WooCommerce Store
```json
[
  {
    "name": "🛒 WooCommerce Add to Cart",
    "selector": ".single_add_to_cart_button, button.add_to_cart_button",
    "urlPattern": "\\?add-to-cart=|wc-ajax=add_to_cart"
  },
  {
    "name": "🛒 WooCommerce Update Cart",
    "selector": "button[name='update_cart']",
    "urlPattern": "/cart/\\?update_cart"
  },
  {
    "name": "💳 WooCommerce Place Order",
    "selector": "#place_order",
    "urlPattern": "/checkout/.*wc-ajax=checkout"
  },
  {
    "name": "🔍 WooCommerce Product Filter",
    "selector": ".woocommerce-widget-layered-nav a, .woocommerce-ordering select",
    "urlPattern": "wc-ajax=get_refreshed_fragments"
  },
  {
    "name": "⭐ WooCommerce Review Submit",
    "selector": "#commentform #submit",
    "urlPattern": "/wp-comments-post\\.php"
  }
]
```

### Amazon-style Marketplace
```json
[
  {
    "name": "🛒 Add to Cart",
    "selector": "#add-to-cart-button, .a-button-input[name='submit.add-to-cart']",
    "urlPattern": "/cart/add|/gp/item-dispatch"
  },
  {
    "name": "📦 Buy Now",
    "selector": "#buy-now-button, input[name='submit.buy-now']",
    "urlPattern": "/checkout/turbo"
  },
  {
    "name": "🔍 Search Products",
    "selector": "#nav-search-submit-button, input[type='submit'][value='Go']",
    "urlPattern": "/s\\?|/search\\?"
  },
  {
    "name": "⭐ Filter by Rating",
    "selector": "a[href*='rh=.*p_72']",
    "urlPattern": "/s\\?.*rh="
  }
]
```

---

## Social Media Examples

### Twitter/X-like Platform
```json
[
  {
    "name": "📝 Post Tweet",
    "selector": "button[data-testid='tweetButtonInline'], button[data-testid='tweetButton']",
    "urlPattern": "/i/api/.*tweet|/1\\.1/statuses/update"
  },
  {
    "name": "❤️ Like Tweet",
    "selector": "button[data-testid='like'], button[aria-label*='Like']",
    "urlPattern": "/i/api/.*favorite|/1\\.1/favorites/create"
  },
  {
    "name": "🔄 Retweet",
    "selector": "button[data-testid='retweet'], button[aria-label*='Retweet']",
    "urlPattern": "/i/api/.*retweet|/1\\.1/statuses/retweet"
  },
  {
    "name": "💬 Reply to Tweet",
    "selector": "button[data-testid='reply'], button[aria-label*='Reply']",
    "urlPattern": "/i/api/.*tweet.*reply"
  },
  {
    "name": "👤 Follow User",
    "selector": "button[data-testid*='follow']",
    "urlPattern": "/i/api/.*friendships/create|/1\\.1/friendships/create"
  },
  {
    "name": "🔍 Search",
    "selector": "input[data-testid='SearchBox_Search_Input']",
    "urlPattern": "/i/api/.*search|/1\\.1/search"
  }
]
```

### Facebook-style Platform
```json
[
  {
    "name": "📝 Create Post",
    "selector": "button[aria-label*='Post'], button[data-testid='react-composer-post-button']",
    "urlPattern": "/api/graphql/.*publish|/composer/create"
  },
  {
    "name": "👍 Like Post",
    "selector": "button[aria-label*='Like'], div[data-testid='fb-ufi-likelink']",
    "urlPattern": "/api/graphql/.*react|/like\\.php"
  },
  {
    "name": "💬 Comment",
    "selector": "button[aria-label*='Comment'], button[data-testid='ufi_comment_button']",
    "urlPattern": "/api/graphql/.*comment|/comment/create"
  },
  {
    "name": "📤 Share",
    "selector": "button[aria-label*='Share'], button[data-testid='share_button']",
    "urlPattern": "/api/graphql/.*share|/share/post"
  }
]
```

### LinkedIn-style Platform
```json
[
  {
    "name": "📝 Share Update",
    "selector": "button.share-actions__primary-action",
    "urlPattern": "/voyager/api/.*ugcPosts"
  },
  {
    "name": "👍 React to Post",
    "selector": "button.reactions-react-button",
    "urlPattern": "/voyager/api/.*reactions"
  },
  {
    "name": "🤝 Connect Request",
    "selector": "button[aria-label*='Connect'], button.artdeco-button--secondary",
    "urlPattern": "/voyager/api/.*invitations"
  },
  {
    "name": "💼 Apply to Job",
    "selector": "button.jobs-apply-button",
    "urlPattern": "/voyager/api/.*jobApplications"
  }
]
```

---

## SaaS Application Examples

### Project Management (Jira-style)
```json
[
  {
    "name": "🎫 Create Issue",
    "selector": "#create-issue-submit, button[type='submit'][form*='create']",
    "urlPattern": "/rest/api/.*issue$"
  },
  {
    "name": "✏️ Edit Issue",
    "selector": "#edit-issue-submit, button[id*='issue-edit']",
    "urlPattern": "/rest/api/.*issue/[A-Z]+-\\d+"
  },
  {
    "name": "💬 Add Comment",
    "selector": "#issue-comment-add-submit, button[id*='comment-add']",
    "urlPattern": "/rest/api/.*issue/.*/comment"
  },
  {
    "name": "🔄 Change Status",
    "selector": "#action_id, button[id*='transition']",
    "urlPattern": "/rest/api/.*issue/.*/transitions"
  },
  {
    "name": "📎 Attach File",
    "selector": "#attach-file-button",
    "urlPattern": "/rest/api/.*issue/.*/attachments"
  }
]
```

### CRM (Salesforce-style)
```json
[
  {
    "name": "👤 Create Lead",
    "selector": "button[name='save'], input[value='Save'][title*='Lead']",
    "urlPattern": "/services/data/.*Lead"
  },
  {
    "name": "💰 Create Opportunity",
    "selector": "button[title*='Save Opportunity']",
    "urlPattern": "/services/data/.*Opportunity"
  },
  {
    "name": "📧 Send Email",
    "selector": "button[title='Send'], input[value='Send'][name*='email']",
    "urlPattern": "/services/data/.*EmailMessage|/_ui/core/email/action/SendEmail"
  },
  {
    "name": "📞 Log Call",
    "selector": "button[title*='Log a Call']",
    "urlPattern": "/services/data/.*Task.*TaskSubtype=Call"
  },
  {
    "name": "🔍 Search Records",
    "selector": "button[type='submit'][title*='Search']",
    "urlPattern": "/services/data/.*search/\\?q="
  }
]
```

### Email Client (Gmail-style)
```json
[
  {
    "name": "📧 Send Email",
    "selector": "button[aria-label*='Send'], div[role='button'][aria-label*='Send']",
    "urlPattern": "/mail/.*\\?.*compose.*send"
  },
  {
    "name": "📥 Archive Email",
    "selector": "button[aria-label*='Archive'], div[data-tooltip*='Archive']",
    "urlPattern": "/mail/.*\\?.*archive"
  },
  {
    "name": "🗑️ Delete Email",
    "selector": "button[aria-label*='Delete'], div[data-tooltip*='Delete']",
    "urlPattern": "/mail/.*\\?.*trash"
  },
  {
    "name": "⭐ Star Email",
    "selector": "button[aria-label*='Star'], span[role='checkbox'][aria-label*='starred']",
    "urlPattern": "/mail/.*\\?.*star"
  },
  {
    "name": "🏷️ Apply Label",
    "selector": "button[aria-label*='Labels'], div[data-tooltip*='Labels']",
    "urlPattern": "/mail/.*\\?.*label"
  }
]
```

---

## Content Management System Examples

### WordPress Admin
```json
[
  {
    "name": "📄 Publish/Update Post",
    "selector": "#publish, #save-post",
    "urlPattern": "/wp-admin/post\\.php|/wp-admin/admin-ajax\\.php.*action=heartbeat"
  },
  {
    "name": "📷 Upload Media",
    "selector": ".upload-button, #plupload-upload-ui button",
    "urlPattern": "/wp-admin/async-upload\\.php"
  },
  {
    "name": "💾 Auto-Save",
    "selector": "",
    "urlPattern": "/wp-admin/admin-ajax\\.php.*action=heartbeat.*wp_autosave"
  },
  {
    "name": "🔌 Plugin Install",
    "selector": ".install-now, a.button[data-slug]",
    "urlPattern": "/wp-admin/update\\.php.*action=install-plugin"
  },
  {
    "name": "⚙️ Save Settings",
    "selector": "#submit, input[type='submit'][name='submit']",
    "urlPattern": "/wp-admin/options\\.php|/wp-admin/admin\\.php"
  },
  {
    "name": "💬 Quick Edit",
    "selector": "button.save",
    "urlPattern": "/wp-admin/admin-ajax\\.php.*action=inline-save"
  }
]
```

### Ghost CMS
```json
[
  {
    "name": "📝 Publish Post",
    "selector": "button[data-test-button='publish-flow']",
    "urlPattern": "/ghost/api/.*posts/\\?.*source=html"
  },
  {
    "name": "💾 Auto-Save",
    "selector": "",
    "urlPattern": "/ghost/api/.*posts/.*\\?save_revision=true"
  },
  {
    "name": "📷 Upload Image",
    "selector": "button[data-test-button='upload-image']",
    "urlPattern": "/ghost/api/.*images/upload"
  }
]
```

---

## Developer Tool Examples

### GitHub
```json
[
  {
    "name": "💬 Create Issue",
    "selector": "button[type='submit'][data-disable-with='Creating issue...']",
    "urlPattern": "/.*/.*/issues$"
  },
  {
    "name": "✅ Create Pull Request",
    "selector": "button.js-pull-request-submit",
    "urlPattern": "/.*/.*/pull/create"
  },
  {
    "name": "💬 Comment on Issue/PR",
    "selector": "button.js-comment-and-button",
    "urlPattern": "/.*/.*/issues/.*/comments"
  },
  {
    "name": "⭐ Star Repository",
    "selector": "button.starred, button.js-toggler-target",
    "urlPattern": "/.*/.*/star"
  },
  {
    "name": "🍴 Fork Repository",
    "selector": "button[data-hydro-click*='fork']",
    "urlPattern": "/.*/.*/fork"
  },
  {
    "name": "✏️ Edit File",
    "selector": "button#commit-changes",
    "urlPattern": "/.*/.*/edit/.*"
  }
]
```

### GitLab
```json
[
  {
    "name": "💬 Create Issue",
    "selector": "button[data-qa-selector='submit_issue_button']",
    "urlPattern": "/api/v4/projects/\\d+/issues"
  },
  {
    "name": "✅ Create Merge Request",
    "selector": "button[data-qa-selector='submit_merge_request_button']",
    "urlPattern": "/api/v4/projects/\\d+/merge_requests"
  },
  {
    "name": "🏗️ Run Pipeline",
    "selector": "button[data-qa-selector='run_pipeline_button']",
    "urlPattern": "/api/v4/projects/\\d+/pipeline"
  }
]
```

### Stack Overflow
```json
[
  {
    "name": "📝 Post Question",
    "selector": "#submit-button",
    "urlPattern": "/questions/ask/submit"
  },
  {
    "name": "💬 Post Answer",
    "selector": "#submit-answer",
    "urlPattern": "/posts/.*add-answer"
  },
  {
    "name": "👍 Upvote",
    "selector": ".js-vote-up-btn",
    "urlPattern": "/posts/.*/vote/2"
  },
  {
    "name": "👎 Downvote",
    "selector": ".js-vote-down-btn",
    "urlPattern": "/posts/.*/vote/3"
  },
  {
    "name": "✅ Accept Answer",
    "selector": ".js-accepted-answer-indicator",
    "urlPattern": "/posts/.*/vote/1"
  }
]
```

---

## Analytics & Tracking Examples

### Google Analytics (Universal)
```json
[
  {
    "name": "📊 GA Event Tracking",
    "selector": "[data-ga-category], [data-ga-action]",
    "urlPattern": "google-analytics\\.com/collect\\?.*&t=event"
  },
  {
    "name": "📄 GA Pageview",
    "selector": "",
    "urlPattern": "google-analytics\\.com/collect\\?.*&t=pageview"
  }
]
```

### Google Analytics 4 (GA4)
```json
[
  {
    "name": "📊 GA4 Events",
    "selector": "[data-gtm-click], [data-event]",
    "urlPattern": "google-analytics\\.com/g/collect\\?.*&en="
  }
]
```

### Google Tag Manager
```json
[
  {
    "name": "🏷️ GTM Click Events",
    "selector": "[data-gtm-click], [data-gtm-vis-first-on-screen]",
    "urlPattern": "googletagmanager\\.com/gtm\\.js|google-analytics\\.com"
  }
]
```

### Mixpanel
```json
[
  {
    "name": "📊 Mixpanel Track Event",
    "selector": "[data-mixpanel-event], [data-track]",
    "urlPattern": "api\\.mixpanel\\.com/track"
  },
  {
    "name": "👤 Mixpanel Identify",
    "selector": "",
    "urlPattern": "api\\.mixpanel\\.com/engage"
  }
]
```

### Segment
```json
[
  {
    "name": "📊 Segment Track",
    "selector": "[data-segment-event]",
    "urlPattern": "api\\.segment\\.io/v1/track"
  },
  {
    "name": "📄 Segment Page",
    "selector": "",
    "urlPattern": "api\\.segment\\.io/v1/page"
  }
]
```

### Facebook Pixel
```json
[
  {
    "name": "📊 Facebook Pixel Event",
    "selector": "[data-fb-event]",
    "urlPattern": "facebook\\.com/tr/\\?.*&ev="
  }
]
```

---

## Authentication Examples

### Standard Login Forms
```json
[
  {
    "name": "🔐 Login Form Submit",
    "selector": "form[action*='login'] button[type='submit'], #login-form button[type='submit']",
    "urlPattern": "/login|/auth/login|/api/authenticate"
  },
  {
    "name": "📝 Registration Form",
    "selector": "form[action*='register'] button[type='submit'], form[action*='signup'] button[type='submit']",
    "urlPattern": "/register|/signup|/api/register"
  },
  {
    "name": "🚪 Logout Action",
    "selector": "a[href*='logout'], button[onclick*='logout']",
    "urlPattern": "/logout|/api/logout|/auth/signout"
  },
  {
    "name": "🔑 Password Reset Request",
    "selector": "form[action*='forgot'] button[type='submit'], form[action*='reset'] button[type='submit']",
    "urlPattern": "/forgot-password|/reset-password|/api/password/reset"
  }
]
```

### OAuth/Social Login
```json
[
  {
    "name": "🔐 OAuth Login (Google)",
    "selector": "button[data-provider='google'], a[href*='oauth/google']",
    "urlPattern": "accounts\\.google\\.com/o/oauth2|/auth/google/callback"
  },
  {
    "name": "🔐 OAuth Login (GitHub)",
    "selector": "button[data-provider='github'], a[href*='oauth/github']",
    "urlPattern": "github\\.com/login/oauth|/auth/github/callback"
  },
  {
    "name": "🔐 OAuth Login (Facebook)",
    "selector": "button[data-provider='facebook'], a[href*='oauth/facebook']",
    "urlPattern": "facebook\\.com/.*dialog/oauth|/auth/facebook/callback"
  }
]
```

### Multi-Factor Authentication
```json
[
  {
    "name": "🔐 MFA Code Submit",
    "selector": "form[action*='mfa'] button[type='submit'], #mfa-form button",
    "urlPattern": "/mfa/verify|/api/2fa/verify"
  },
  {
    "name": "📱 Send MFA Code",
    "selector": "button[data-action='send-code']",
    "urlPattern": "/mfa/send|/api/2fa/send"
  }
]
```

---

## Search & Filter Examples

### Generic Search
```json
[
  {
    "name": "🔍 Search Submit",
    "selector": "form[role='search'] button, button[type='submit'][aria-label*='search']",
    "urlPattern": "/search\\?|/api/search"
  },
  {
    "name": "🔍 Live Search (Autocomplete)",
    "selector": "input[type='search'], input[role='searchbox']",
    "urlPattern": "/api/autocomplete|/api/suggest"
  }
]
```

### E-Commerce Filters
```json
[
  {
    "name": "🏷️ Category Filter",
    "selector": ".filter-category a, input[name='category']",
    "urlPattern": "/products\\?.*category=|/api/products\\?.*filter"
  },
  {
    "name": "💰 Price Range Filter",
    "selector": "input[name='price_min'], input[name='price_max']",
    "urlPattern": "/products\\?.*price|/api/products\\?.*price"
  },
  {
    "name": "⭐ Rating Filter",
    "selector": "input[name='rating'], a[href*='rating']",
    "urlPattern": "/products\\?.*rating"
  },
  {
    "name": "🔤 Sort Options",
    "selector": "select[name='sort'], button[data-sort]",
    "urlPattern": "/products\\?.*sort="
  }
]
```

---

## Real-Time Communication Examples

### Chat Applications
```json
[
  {
    "name": "💬 Send Message",
    "selector": "button[data-action='send'], form[data-testid='message-form'] button[type='submit']",
    "urlPattern": "/api/messages|/chat/send|wss?://.*/(chat|messages)"
  },
  {
    "name": "📎 Upload File in Chat",
    "selector": "button[aria-label*='Attach'], input[type='file'][accept*='image']",
    "urlPattern": "/api/upload|/api/attachments"
  },
  {
    "name": "✏️ Typing Indicator",
    "selector": "textarea[data-testid='message-input'], input[placeholder*='message']",
    "urlPattern": "wss?://.*/(typing|presence)"
  },
  {
    "name": "✅ Mark as Read",
    "selector": "",
    "urlPattern": "/api/messages/.*/read|/api/conversations/.*/read"
  }
]
```

### Video Conferencing
```json
[
  {
    "name": "📹 Join Meeting",
    "selector": "button[data-action='join'], button[aria-label*='Join']",
    "urlPattern": "/api/meetings/.*/join|wss?://.*/(conference|meeting)"
  },
  {
    "name": "🎤 Toggle Microphone",
    "selector": "button[aria-label*='Mute'], button[data-action='toggle-audio']",
    "urlPattern": "/api/meetings/.*/audio|wss?://.*/(audio|media)"
  },
  {
    "name": "📹 Toggle Camera",
    "selector": "button[aria-label*='Camera'], button[data-action='toggle-video']",
    "urlPattern": "/api/meetings/.*/video|wss?://.*/(video|media)"
  },
  {
    "name": "🖐️ Raise Hand",
    "selector": "button[aria-label*='Raise'], button[data-action='raise-hand']",
    "urlPattern": "/api/meetings/.*/raise-hand"
  }
]
```

---

## Testing Tips

### How to Use These Examples

1. **Copy the relevant rule set** from above
2. **Open XHRay Rules Editor** in the userscript panel
3. **Paste into the JSON editor** (replace or append to existing rules)
4. **Click "Save Rules"**
5. **Test by performing the action** on the target website
6. **Verify in telemetry log** that the rule badge appears

### Customization Tips

- Replace generic `/api/` patterns with specific endpoints from your application
- Adjust selectors if the framework uses different class names
- Use browser DevTools to inspect actual element selectors and network requests
- Start with broad patterns and narrow down based on results

---

## Contributing

Found a working rule for a popular site or framework? Please contribute!

1. Test thoroughly on the actual website
2. Document which version/theme you tested against
3. Submit via GitHub issue or pull request

---

**Last Updated**: November 2025
