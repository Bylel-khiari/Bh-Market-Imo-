# Scrapy settings for real_estate_scraper project
#
# For simplicity, this file contains only settings considered important or
# commonly used. You can find more settings consulting the documentation:
#
#     https://docs.scrapy.org/en/latest/topics/settings.html
#     https://docs.scrapy.org/en/latest/topics/downloader-middleware.html
#     https://docs.scrapy.org/en/latest/topics/spider-middleware.html

BOT_NAME = "real_estate_scraper"

SPIDER_MODULES = ["real_estate_scraper.spiders"]
NEWSPIDER_MODULE = "real_estate_scraper.spiders"

ADDONS = {}

import os


# Crawl responsibly by identifying yourself (and your website) on the user-agent
#USER_AGENT = "real_estate_scraper (+http://www.yourdomain.com)"

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Crawl profiles are consumed either globally through SCRAPER_CRAWL_PROFILE,
# or per-spider through spider custom_settings.
CRAWL_PROFILES = {
    "fast_stable": {
        "CONCURRENT_REQUESTS": 24,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 10,
        "DOWNLOAD_DELAY": 0.1,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_START_DELAY": 0.1,
        "AUTOTHROTTLE_MAX_DELAY": 3.0,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 6.0,
    },
    "structured_large": {
        "CONCURRENT_REQUESTS": 16,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 8,
        "DOWNLOAD_DELAY": 0.2,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_START_DELAY": 0.2,
        "AUTOTHROTTLE_MAX_DELAY": 5.0,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 4.0,
    },
    "fragile": {
        "CONCURRENT_REQUESTS": 8,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 4,
        "DOWNLOAD_DELAY": 0.45,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_START_DELAY": 0.5,
        "AUTOTHROTTLE_MAX_DELAY": 8.0,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 1.5,
    },
}

DEFAULT_CRAWL_PROFILE = os.getenv("SCRAPER_CRAWL_PROFILE", "fast_stable").strip().lower()
if DEFAULT_CRAWL_PROFILE not in CRAWL_PROFILES:
    DEFAULT_CRAWL_PROFILE = "fast_stable"

ACTIVE_CRAWL_PROFILE = CRAWL_PROFILES[DEFAULT_CRAWL_PROFILE]

# Concurrency and throttling settings
CONCURRENT_REQUESTS = ACTIVE_CRAWL_PROFILE["CONCURRENT_REQUESTS"]
CONCURRENT_REQUESTS_PER_DOMAIN = ACTIVE_CRAWL_PROFILE["CONCURRENT_REQUESTS_PER_DOMAIN"]
DOWNLOAD_DELAY = ACTIVE_CRAWL_PROFILE["DOWNLOAD_DELAY"]
RANDOMIZE_DOWNLOAD_DELAY = True

# Disable cookies (enabled by default)
#COOKIES_ENABLED = False

# Disable Telnet Console (enabled by default)
#TELNETCONSOLE_ENABLED = False

# Override the default request headers:
#DEFAULT_REQUEST_HEADERS = {
#    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
#    "Accept-Language": "en",
#}

# Enable or disable extensions
# See https://docs.scrapy.org/en/latest/topics/extensions.html
EXTENSIONS = {
    "real_estate_scraper.extensions.ActiveScrapeSiteGuardExtension": 100,
}

# Configure item pipelines
# See https://docs.scrapy.org/en/latest/topics/item-pipeline.html
ITEM_PIPELINES = {
    "real_estate_scraper.pipelines.RawPipeline": 300,
}

# Enable and configure the AutoThrottle extension
# See https://docs.scrapy.org/en/latest/topics/autothrottle.html
AUTOTHROTTLE_ENABLED = ACTIVE_CRAWL_PROFILE["AUTOTHROTTLE_ENABLED"]
# The initial download delay
AUTOTHROTTLE_START_DELAY = ACTIVE_CRAWL_PROFILE["AUTOTHROTTLE_START_DELAY"]
# The maximum download delay to be set in case of high latencies
AUTOTHROTTLE_MAX_DELAY = ACTIVE_CRAWL_PROFILE["AUTOTHROTTLE_MAX_DELAY"]
# The average number of requests Scrapy should be sending in parallel to
# each remote server
AUTOTHROTTLE_TARGET_CONCURRENCY = ACTIVE_CRAWL_PROFILE["AUTOTHROTTLE_TARGET_CONCURRENCY"]
# Enable showing throttling stats for every response received:
#AUTOTHROTTLE_DEBUG = False

RETRY_ENABLED = True
RETRY_TIMES = int(os.getenv("SCRAPER_RETRY_TIMES", "2"))
DOWNLOAD_TIMEOUT = int(os.getenv("SCRAPER_DOWNLOAD_TIMEOUT", "25"))
LOG_LEVEL = os.getenv("SCRAPER_LOG_LEVEL", "INFO")

# Enable and configure HTTP caching (disabled by default)
# See https://docs.scrapy.org/en/latest/topics/downloader-middleware.html#httpcache-middleware-settings
#HTTPCACHE_ENABLED = True
#HTTPCACHE_EXPIRATION_SECS = 0
#HTTPCACHE_DIR = "httpcache"
#HTTPCACHE_IGNORE_HTTP_CODES = []
#HTTPCACHE_STORAGE = "scrapy.extensions.httpcache.FilesystemCacheStorage"

# Set settings whose default value is deprecated to a future-proof value
FEED_EXPORT_ENCODING = "utf-8"
