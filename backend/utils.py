# utils.py - Logging, retry-with-backoff, and manual batching utilities,
# plus a websocket log callback hook for real-time monitoring.

import asyncio
import time
import logging
from typing import List, Callable, Any, Coroutine, TypeVar, Tuple, Optional

# Standard library logger
logger = logging.getLogger("agentic_system")
logger.setLevel(logging.INFO)
formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger.addHandler(handler)

# Custom callback hook for websocket streaming of log messages
ws_log_callback: Optional[Callable[[str, str], Coroutine[Any, Any, None]]] = None


def set_ws_log_callback(callback: Callable[[str, str], Coroutine[Any, Any, None]]):
    """Sets a callback that will receive formatted log messages to send over websocket."""
    global ws_log_callback
    ws_log_callback = callback


async def system_log(level: str, message: str):
    """Logs to python logging and triggers the websocket callback if set."""
    if level.lower() == "info":
        logger.info(message)
    elif level.lower() == "warning":
        logger.warning(message)
    elif level.lower() == "error":
        logger.error(message)
    else:
        logger.debug(message)

    if ws_log_callback:
        try:
            await ws_log_callback(level.upper(), message)
        except Exception as e:
            logger.error(f"Failed to execute ws_log_callback: {e}")


T = TypeVar('T')
R = TypeVar('R')


async def retry_with_backoff(
    coro_func: Callable[[], Coroutine[Any, Any, R]],
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    on_retry_cb: Optional[Callable[[int, Exception, float], Coroutine[Any, Any, None]]] = None
) -> R:
    """
    Executes an async function, retrying on failure with exponential backoff.

    Args:
        coro_func: The async function to execute.
        max_retries: Total number of attempts allowed before giving up.
        initial_delay: Initial sleep duration in seconds.
        backoff_factor: Multiplier for backoff calculation.
        on_retry_cb: Optional callback executed when a retry is triggered.
    """
    delay = initial_delay
    for attempt in range(1, max_retries + 1):
        try:
            return await coro_func()
        except Exception as e:
            if attempt == max_retries:
                await system_log("ERROR", f"Attempt {attempt} failed. Max retries ({max_retries}) reached. Raising error: {e}")
                raise e

            await system_log("WARNING", f"Attempt {attempt} failed with error: {e}. Retrying in {delay:.2f}s...")
            if on_retry_cb:
                await on_retry_cb(attempt, e, delay)

            await asyncio.sleep(delay)
            delay *= backoff_factor


async def process_in_batches(
    items: List[T],
    batch_size: int,
    process_item_fn: Callable[[T], Coroutine[Any, Any, R]],
    concurrency_limit: int = 2
) -> List[Tuple[T, Optional[R], Optional[Exception]]]:
    """
    Processes list items in batches, with a concurrency limit on how many run
    in parallel within each batch. This is the manual batching implementation
    (explicit chunking + semaphore-controlled concurrency, not a framework
    auto-batcher) required by the project spec.

    Args:
        items: List of inputs.
        batch_size: Max number of items grouped into a single batch.
        process_item_fn: Async function to process a single item.
        concurrency_limit: Number of items processed concurrently inside each batch.

    Returns:
        List of tuples: (item, result_or_None, exception_or_None)
    """
    results: List[Tuple[T, Optional[R], Optional[Exception]]] = []

    # Step 1: manually chunk items into batches of the given size
    batches = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]

    await system_log(
        "INFO",
        f"Batching Execution: Grouped {len(items)} items into {len(batches)} batches of size <= {batch_size}."
    )

    for batch_idx, batch in enumerate(batches):
        await system_log("INFO", f"Starting Batch {batch_idx + 1}/{len(batches)} (Size: {len(batch)} items)")

        # Step 2: cap concurrency within this batch using a semaphore
        semaphore = asyncio.Semaphore(concurrency_limit)

        async def worker(item: T) -> Tuple[T, Optional[R], Optional[Exception]]:
            async with semaphore:
                try:
                    res = await process_item_fn(item)
                    return item, res, None
                except Exception as ex:
                    await system_log("ERROR", f"Error processing item '{item}': {ex}")
                    return item, None, ex

        # Step 3: run this batch's items concurrently (bounded by the semaphore)
        tasks = [worker(item) for item in batch]
        batch_results = await asyncio.gather(*tasks)
        results.extend(batch_results)

        await system_log("INFO", f"Finished Batch {batch_idx + 1}/{len(batches)}.")

    return results