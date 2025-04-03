import aiohttp
import asyncio
import logging
import re
from datetime import datetime
from bs4 import BeautifulSoup
import json

logger = logging.getLogger("fund-crawler")

class FundCrawler:
    def __init__(self, db):
        self.db = db
        self.session = None
        
    async def get_session(self):
        if self.session is None:
            self.session = aiohttp.ClientSession(
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            )
        return self.session
    
    async def close(self):
        if self.session:
            await self.session.close()
            self.session = None
    
    async def crawl_fund_price(self, fund_code):
        """爬取基金最新价格"""
        try:
            session = await self.get_session()
            url = f"http://fund.eastmoney.com/f10/F10DataApi.aspx?type=lsjz&code={fund_code}&page=1&per=1"
            
            async with session.get(url) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch price for fund {fund_code}: {response.status}")
                    return
                
                html = await response.text()
                
                # 解析HTML
                soup = BeautifulSoup(html, "html.parser")
                table = soup.find("table", class_="w782 comm lsjz")
                
                if not table:
                    logger.error(f"No price data found for fund {fund_code}")
                    return
                
                rows = table.find_all("tr")
                if len(rows) < 2:  # 第一行是表头
                    logger.error(f"No price data rows for fund {fund_code}")
                    return
                
                cells = rows[1].find_all("td")
                if len(cells) < 3:
                    logger.error(f"Invalid price data format for fund {fund_code}")
                    return
                
                date_str = cells[0].text.strip()
                price_str = cells[1].text.strip()
                change_str = cells[3].text.strip().replace("%", "")
                
                # 转换格式
                date = datetime.strptime(date_str, "%Y-%m-%d")
                price = float(price_str)
                daily_change = float(change_str) if change_str else 0.0
                
                # 存储到数据库
                await self.db.fund_prices.update_one(
                    {"fund_code": fund_code, "date": date},
                    {"$set": {
                        "price": price,
                        "daily_change": daily_change
                    }},
                    upsert=True
                )
                
                logger.info(f"Updated price for fund {fund_code}: {price} ({daily_change}%) on {date_str}")
                
        except Exception as e:
            logger.error(f"Error crawling price for fund {fund_code}: {str(e)}")
    
    async def crawl_fund_details(self, fund_code):
        """爬取基金详细信息"""
        try:
            session = await self.get_session()
            
            # 获取基金基本信息
            url = f"http://fund.eastmoney.com/{fund_code}.html"
            
            async with session.get(url) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch details for fund {fund_code}: {response.status}")
                    return
                
                html = await response.text()
                
                # 解析HTML
                soup = BeautifulSoup(html, "html.parser")
                
                # 基金名称
                fund_name_tag = soup.find("div", class_="fundDetail-tit")
                fund_name = fund_name_tag.find("div").text.strip() if fund_name_tag else "未知"
                
                # 基金公司
                company_tag = soup.find("a", attrs={"href": re.compile(r"Company")})
                company = company_tag.text.strip() if company_tag else "未知"
                
                # 基金经理
                manager_tag = soup.find("a", attrs={"href": re.compile(r"manager")})
                manager = manager_tag.text.strip() if manager_tag else "未知"
                
                # 成立日期和规模
                setup_size_tag = soup.find("div", class_="infoOfFund")
                if setup_size_tag:
                    setup_date_text = setup_size_tag.find("div", class_="col-left").text
                    setup_date_match = re.search(r"成立日期：(\d{4}-\d{2}-\d{2})", setup_date_text)
                    establishment_date = datetime.strptime(setup_date_match.group(1), "%Y-%m-%d") if setup_date_match else None
                    
                    size_text = setup_size_tag.find("div", class_="col-right").text
                    size_match = re.search(r"基金规模：([\d\.]+)亿元", size_text)
                    fund_size = float(size_match.group(1)) if size_match else 0.0
                else:
                    establishment_date = None
                    fund_size = 0.0
                
                # 跟踪指数
                index_tag = soup.find("div", string=re.compile("跟踪标的"))
                tracking_index = index_tag.find_next("td").text.strip() if index_tag else "未知"
                
                # 基金费率
                fee_tag = soup.find("div", string=re.compile("基金费率"))
                expense_ratio = 0.0
                if fee_tag:
                    fee_text = fee_tag.find_next("table").text
                    fee_match = re.search(r"管理费：([\d\.]+)%", fee_text)
                    if fee_match:
                        expense_ratio = float(fee_match.group(1))
                
                # 获取更多指标数据
                detail_url = f"http://fund.eastmoney.com/f10/tsdata_{fund_code}.html"
                async with session.get(detail_url) as detail_response:
                    if detail_response.status != 200:
                        logger.error(f"Failed to fetch tracking details for fund {fund_code}")
                        tracking_error = 0.0
                    else:
                        detail_html = await detail_response.text()
                        detail_soup = BeautifulSoup(detail_html, "html.parser")
                        
                        # 跟踪误差
                        error_tag = detail_soup.find("td", string=re.compile("跟踪误差"))
                        if error_tag:
                            error_value = error_tag.find_next("td").text.strip().replace("%", "")
                            tracking_error = float(error_value) if error_value and error_value != "--" else 0.0
                        else:
                            tracking_error = 0.0
                
                # 获取基金评级
                rating_url = f"http://fund.eastmoney.com/f10/jjpj_{fund_code}.html"
                async with session.get(rating_url) as rating_response:
                    if rating_response.status != 200:
                        logger.error(f"Failed to fetch rating for fund {fund_code}")
                        rating = 3  # 默认3星
                    else:
                        rating_html = await rating_response.text()
                        rating_soup = BeautifulSoup(rating_html, "html.parser")
                        
                        # 晨星评级
                        rating_tag = rating_soup.find("span", string=re.compile("晨星评级"))
                        rating = 3  # 默认3星
                        if rating_tag:
                            rating_img = rating_tag.find_next("img")
                            if rating_img and "src" in rating_img.attrs:
                                rating_src = rating_img["src"]
                                rating_match = re.search(r"(\d+)star", rating_src)
                                if rating_match:
                                    rating = int(rating_match.group(1))
                
                # 获取基金经理的从业年限
                experience_years = 0.0
                if manager != "未知":
                    manager_code = None
                    if manager_tag and "href" in manager_tag.attrs:
                        href = manager_tag["href"]
                        manager_code_match = re.search(r"manager=(\w+)", href)
                        if manager_code_match:
                            manager_code = manager_code_match.group(1)
                    
                    if manager_code:
                        manager_url = f"http://fund.eastmoney.com/manager/{manager_code}.html"
                        async with session.get(manager_url) as manager_response:
                            if manager_response.status == 200:
                                manager_html = await manager_response.text()
                                manager_soup = BeautifulSoup(manager_html, "html.parser")
                                
                                experience_tag = manager_soup.find("span", string=re.compile("从业年限："))
                                if experience_tag:
                                    experience_text = experience_tag.text
                                    experience_match = re.search(r"从业年限：([\d\.]+)年", experience_text)
                                    if experience_match:
                                        experience_years = float(experience_match.group(1))
                
                # 构建基金数据
                fund_data = {
                    "code": fund_code,
                    "name": fund_name,
                    "type": "指数基金",
                    "tracking_index": tracking_index,
                    "fund_size": fund_size,
                    "company": company,
                    "manager": manager,
                    "experience_years": experience_years,
                    "tracking_error": tracking_error,
                    "rating": rating,
                    "expense_ratio": expense_ratio,
                    "establishment_date": establishment_date,
                    "updated_at": datetime.now()
                }
                
                # 检查数据库中是否已存在该基金
                existing_fund = await self.db.funds.find_one({"code": fund_code})
                
                if existing_fund:
                    # 更新现有记录
                    await self.db.funds.update_one(
                        {"code": fund_code},
                        {"$set": fund_data}
                    )
                    logger.info(f"Updated fund details for {fund_code} - {fund_name}")
                else:
                    # 创建新记录
                    fund_data["created_at"] = datetime.now()
                    await self.db.funds.insert_one(fund_data)
                    logger.info(f"Added new fund {fund_code} - {fund_name}")
                
        except Exception as e:
            logger.error(f"Error crawling details for fund {fund_code}: {str(e)}")