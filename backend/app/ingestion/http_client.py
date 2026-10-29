import asyncio
import time
from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlparse
import httpx
from app.core.config import settings
from app.core.logging import logger

try:
    from urllib.robotparser import RobotFileParser
    ROBOTS_AVAILABLE = True
except ImportError:
    ROBOTS_AVAILABLE = False


class RateLimiter:
    """Per-domain rate limiter using token bucket / delay."""
    def __init__(self, requests_per_second: float = 2.0):
        self.delay = 1.0 / requests_per_second
        self.last_request_time: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def wait(self, domain: str):
        async with self._lock:
            now = time.time()
            last = self.last_request_time.get(domain, 0.0)
            elapsed = now - last
            if elapsed < self.delay:
                await asyncio.sleep(self.delay - elapsed)
            self.last_request_time[domain] = time.time()


class SharedHttpClient:
    """
    Robust HTTP client with:
    - Retries with exponential backoff
    - Per-domain rate limiting
    - ETag and Last-Modified caching
    - Custom User-Agent identifying Opportunity Radar
    - robots.txt compliance
    """
    def __init__(self):
        self.headers = {
            "User-Agent": settings.USER_AGENT,
            "Accept": "application/json, text/html, application/xml, text/xml, */*",
            "Accept-Language": "en-US,en;q=0.9",
        }
        self.rate_limiter = RateLimiter(requests_per_second=2.0)
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.robot_parsers: Dict[str, Any] = {}
        self._client: Optional[httpx.AsyncClient] = None

    async def get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                headers=self.headers,
                timeout=httpx.Timeout(20.0, connect=10.0),
                follow_redirects=True,
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def is_allowed_by_robots(self, url: str) -> bool:
        """Check robots.txt for domain if available."""
        if not ROBOTS_AVAILABLE:
            return True
        try:
            parsed = urlparse(url)
            domain = f"{parsed.scheme}://{parsed.netloc}"
            if domain not in self.robot_parsers:
                rp = RobotFileParser()
                rp.set_url(f"{domain}/robots.txt")
                client = await self.get_client()
                try:
                    resp = await client.get(f"{domain}/robots.txt", timeout=5.0)
                    if resp.status_code == 200:
                        rp.parse(resp.text.splitlines())
                    else:
                        rp.allow_all = True
                except Exception:
                    rp.allow_all = True
                self.robot_parsers[domain] = rp

            rp = self.robot_parsers[domain]
            return rp.can_fetch(settings.USER_AGENT, url)
        except Exception:
            return True

    async def get(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        max_retries: int = 3,
        use_cache: bool = True,
    ) -> httpx.Response:
        domain = urlparse(url).netloc
        await self.rate_limiter.wait(domain)

        # Check robots.txt
        if not await self.is_allowed_by_robots(url):
            logger.warning(f"Fetch disallowed by robots.txt: {url}")
            raise PermissionError(f"Robots.txt disallows scraping {url}")

        req_headers = dict(self.headers)
        if headers:
            req_headers.update(headers)

        # Add caching headers if cached previously
        cache_key = f"{url}?{params}" if params else url
        if use_cache and cache_key in self.cache:
            entry = self.cache[cache_key]
            if entry.get("etag"):
                req_headers["If-None-Match"] = entry["etag"]
            if entry.get("last_modified"):
                req_headers["If-Modified-Since"] = entry["last_modified"]

        client = await self.get_client()
        attempt = 0
        backoff = 1.0

        while attempt < max_retries:
            attempt += 1
            try:
                response = await client.get(url, params=params, headers=req_headers)
                
                # If not modified (304), return cached response representation
                if response.status_code == 304 and cache_key in self.cache:
                    logger.debug(f"Cache hit (304) for {url}")
                    return self.cache[cache_key]["response"]

                if response.status_code in (429, 502, 503, 504) and attempt < max_retries:
                    logger.warning(f"HTTP {response.status_code} for {url}, retrying in {backoff}s (attempt {attempt}/{max_retries})")
                    await asyncio.sleep(backoff)
                    backoff *= 2.0
                    continue

                response.raise_for_status()

                # Store ETag / Last-Modified in cache
                if use_cache:
                    etag = response.headers.get("etag")
                    last_modified = response.headers.get("last-modified")
                    if etag or last_modified:
                        self.cache[cache_key] = {
                            "etag": etag,
                            "last_modified": last_modified,
                            "response": response,
                            "saved_at": time.time(),
                        }

                return response
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                if attempt >= max_retries:
                    logger.error(f"Failed fetching {url} after {max_retries} attempts: {exc}")
                    raise
                await asyncio.sleep(backoff)
                backoff *= 2.0


http_client = SharedHttpClient()
