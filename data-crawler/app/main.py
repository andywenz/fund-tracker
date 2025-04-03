import asyncio
import os
import logging
from datetime import datetime, time, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

from app.crawlers.fund_crawler import FundCrawler

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("data-crawler")

# 环境变量
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "fund_tracker")
FUND_CODES = os.getenv("FUND_CODES", "").split(",")  # 逗号分隔的基金代码列表
CRAWL_INTERVAL = int(os.getenv("CRAWL_INTERVAL", "3600"))  # 爬取间隔(秒)，默认1小时

# 交易时间判断（9:30-15:00为交易时间）
def is_trading_time():
    now = datetime.now()
    # 检查是否是工作日（周一至周五）
    if now.weekday() >= 5:  # 5=周六, 6=周日
        return False
    
    # 检查是否在交易时间内
    current_time = now.time()
    morning_start = time(9, 30)
    morning_end = time(11, 30)
    afternoon_start = time(13, 0)
    afternoon_end = time(15, 0)
    
    return (morning_start <= current_time <= morning_end) or \
           (afternoon_start <= current_time <= afternoon_end)

async def start_crawling():
    # 连接数据库
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DATABASE_NAME]
    
    fund_crawler = FundCrawler(db)
    
    # 如果没有配置基金代码，从数据库获取
    fund_codes = FUND_CODES
    if not fund_codes or (len(fund_codes) == 1 and not fund_codes[0]):
        funds = await db.funds.find({}, {"code": 1}).to_list(length=100)
        fund_codes = [fund["code"] for fund in funds]
    
    logger.info(f"Starting crawler with fund codes: {fund_codes}")
    
    while True:
        try:
            # 检查是否为交易时间，如果是则更频繁爬取
            if is_trading_time():
                logger.info("Trading time detected, crawling fund prices...")
                for code in fund_codes:
                    await fund_crawler.crawl_fund_price(code)
                
                # 交易时间内每5分钟爬取一次
                await asyncio.sleep(300)
            else:
                # 爬取基金详情（每天一次即可）
                current_time = datetime.now().time()
                if time(17, 0) <= current_time <= time(18, 0):
                    logger.info("Crawling fund details...")
                    for code in fund_codes:
                        await fund_crawler.crawl_fund_details(code)
                        await asyncio.sleep(1)  # 避免请求过于频繁
                
                # 非交易时间按配置的间隔爬取
                logger.info(f"Not trading time, sleeping for {CRAWL_INTERVAL} seconds...")
                await asyncio.sleep(CRAWL_INTERVAL)
        
        except Exception as e:
            logger.error(f"Error during crawling: {str(e)}")
            await asyncio.sleep(60)  # 发生错误后暂停一分钟

if __name__ == "__main__":
    logger.info("Data crawler service starting...")
    asyncio.run(start_crawling())