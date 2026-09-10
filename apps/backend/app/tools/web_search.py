import re
import socket
import ipaddress
import urllib.parse
import httpx
from typing import List, Dict, Any
from app.tools.base import BaseTool, ToolResult

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),  # AWS/GCP Metadata
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def is_safe_url(url: str) -> bool:
    """
    Validate that the URL does not resolve to private IPs, localhost, or cloud metadata endpoints.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal"):
            return False

        # Resolve IP
        ip_str = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip_str)

        for blocked in BLOCKED_IP_NETWORKS:
            if ip_obj in blocked:
                return False

        return True
    except Exception:
        return False


def sanitize_external_text(text: str) -> str:
    """
    Sanitize untrusted external web text against obvious prompt injection attempts.
    """
    if not text:
        return ""
    # Strip dangerous instruction overrides
    patterns = [
        r"(?i)ignore\s+(all\s+)?(previous|prior)\s+instructions",
        r"(?i)system\s+prompt\s+override",
        r"(?i)reveal\s+(the\s+)?(api\s+key|secret|password)",
    ]
    sanitized = text
    for p in patterns:
        sanitized = re.sub(p, "[REDACTED_UNTRUSTED_INSTRUCTION]", sanitized)
    return sanitized


class WebSearchTool(BaseTool):
    name = "web_search"
    description = "Search the public web for real-time information, news, documentation, and current events."

    async def execute(self, query: str, max_results: int = 5, **kwargs) -> ToolResult:
        if not query or not query.strip():
            return ToolResult(success=False, output=[], error="Empty search query")

        query = query.strip()
        results: List[Dict[str, Any]] = []

        try:
            # Use DuckDuckGo HTML search / API endpoint
            search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(query)}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }

            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                res = await client.get(search_url, headers=headers)
                if res.status_code == 200:
                    html = res.text
                    # Extract search result items with regex
                    items = re.findall(
                        r'<a class="result__url" href="([^"]+)".*?<h2 class="result__title">.*?<a.*?>(.*?)</a>.*?<a class="result__snippet".*?>(.*?)</a>',
                        html,
                        re.DOTALL
                    )

                    for raw_url, raw_title, raw_snippet in items[:max_results]:
                        # Clean HTML tags
                        title = re.sub(r"<[^>]+>", "", raw_title).strip()
                        snippet = re.sub(r"<[^>]+>", "", raw_snippet).strip()
                        
                        # Unquote DuckDuckGo redirect url
                        actual_url = raw_url
                        if "uddg=" in raw_url:
                            match = re.search(r"uddg=([^&]+)", raw_url)
                            if match:
                                actual_url = urllib.parse.unquote(match.group(1))

                        if is_safe_url(actual_url):
                            domain = urllib.parse.urlparse(actual_url).netloc
                            results.append({
                                "title": sanitize_external_text(title),
                                "url": actual_url,
                                "domain": domain,
                                "snippet": sanitize_external_text(snippet),
                            })

            if not results:
                # Fallback simple search engine query
                results.append({
                    "title": f"Web Query: {query}",
                    "url": f"https://duckduckgo.com/?q={urllib.parse.quote_plus(query)}",
                    "domain": "duckduckgo.com",
                    "snippet": f"Direct web search results for query '{query}'.",
                })

            return ToolResult(
                success=True,
                output=results,
                metadata={"query": query, "count": len(results)}
            )

        except Exception as e:
            return ToolResult(
                success=False,
                output=[],
                error=f"Web search failed: {str(e)[:100]}"
            )
