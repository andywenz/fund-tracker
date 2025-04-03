from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorCollection
from fastapi import Request
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import pymongo

from app.models.fund import FundBase, FundCreate, FundUpdate, FundInDB, FundPrice, FundPriceInDB

router = APIRouter()

def get_fund_collection(request: Request) -> AsyncIOMotorCollection:
    return request.app.mongodb.funds

def get_price_collection(request: Request) -> AsyncIOMotorCollection:
    return request.app.mongodb.fund_prices

# 获取所有基金
@router.get("/", response_model=List[FundInDB])
async def get_funds(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None
):
    fund_collection = get_fund_collection(request)
    query = {}
    
    if search:
        query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"code": {"$regex": search, "$options": "i"}},
                {"tracking_index": {"$regex": search, "$options": "i"}},
                {"company": {"$regex": search, "$options": "i"}},
            ]
        }
    
    funds = await fund_collection.find(query).skip(skip).limit(limit).to_list(length=limit)
    
    for fund in funds:
        fund["_id"] = str(fund["_id"])
    
    return funds

# 获取单个基金
@router.get("/{fund_id}", response_model=FundInDB)
async def get_fund(fund_id: str, request: Request):
    fund_collection = get_fund_collection(request)
    
    try:
        fund = await fund_collection.find_one({"_id": ObjectId(fund_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid fund ID format")
    
    if fund is None:
        raise HTTPException(status_code=404, detail=f"Fund with ID {fund_id} not found")
    
    fund["_id"] = str(fund["_id"])
    return fund

# 根据基金代码获取基金
@router.get("/code/{fund_code}", response_model=FundInDB)
async def get_fund_by_code(fund_code: str, request: Request):
    fund_collection = get_fund_collection(request)
    
    fund = await fund_collection.find_one({"code": fund_code})
    
    if fund is None:
        raise HTTPException(status_code=404, detail=f"Fund with code {fund_code} not found")
    
    fund["_id"] = str(fund["_id"])
    return fund

# 创建基金
@router.post("/", response_model=FundInDB)
async def create_fund(fund: FundCreate, request: Request):
    fund_collection = get_fund_collection(request)
    
    # 检查是否已存在
    existing_fund = await fund_collection.find_one({"code": fund.code})
    if existing_fund:
        raise HTTPException(status_code=400, detail=f"Fund with code {fund.code} already exists")
    
    now = datetime.utcnow()
    fund_dict = fund.dict()
    fund_dict.update({
        "created_at": now,
        "updated_at": now
    })
    
    result = await fund_collection.insert_one(fund_dict)
    
    created_fund = await fund_collection.find_one({"_id": result.inserted_id})
    created_fund["_id"] = str(created_fund["_id"])
    
    return created_fund

# 更新基金
@router.put("/{fund_id}", response_model=FundInDB)
async def update_fund(fund_id: str, fund_update: FundUpdate, request: Request):
    fund_collection = get_fund_collection(request)
    
    try:
        fund = await fund_collection.find_one({"_id": ObjectId(fund_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid fund ID format")
    
    if fund is None:
        raise HTTPException(status_code=404, detail=f"Fund with ID {fund_id} not found")
    
    update_data = {k: v for k, v in fund_update.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await fund_collection.update_one({"_id": ObjectId(fund_id)}, {"$set": update_data})
    
    updated_fund = await fund_collection.find_one({"_id": ObjectId(fund_id)})
    updated_fund["_id"] = str(updated_fund["_id"])
    
    return updated_fund

# 删除基金
@router.delete("/{fund_id}", status_code=204)
async def delete_fund(fund_id: str, request: Request):
    fund_collection = get_fund_collection(request)
    
    try:
        fund = await fund_collection.find_one({"_id": ObjectId(fund_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid fund ID format")
    
    if fund is None:
        raise HTTPException(status_code=404, detail=f"Fund with ID {fund_id} not found")
    
    await fund_collection.delete_one({"_id": ObjectId(fund_id)})

# 获取基金价格历史
@router.get("/{fund_code}/prices", response_model=List[FundPriceInDB])
async def get_fund_prices(
    fund_code: str, 
    request: Request,
    days: int = Query(30, ge=1, le=365),
    end_date: Optional[datetime] = None
):
    price_collection = get_price_collection(request)
    
    if end_date is None:
        end_date = datetime.utcnow()
    
    start_date = end_date - timedelta(days=days)
    
    query = {
        "fund_code": fund_code,
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    prices = await price_collection.find(query).sort("date", pymongo.ASCENDING).to_list(length=days)
    
    for price in prices:
        price["_id"] = str(price["_id"])
    
    return prices

# 添加基金价格记录
@router.post("/prices", response_model=FundPriceInDB)
async def add_fund_price(price: FundPrice, request: Request):
    price_collection = get_price_collection(request)
    fund_collection = get_fund_collection(request)
    
    # 验证基金是否存在
    fund = await fund_collection.find_one({"code": price.fund_code})
    if fund is None:
        raise HTTPException(status_code=404, detail=f"Fund with code {price.fund_code} not found")
    
    # 检查该日期的价格是否已存在
    existing_price = await price_collection.find_one({
        "fund_code": price.fund_code,
        "date": price.date
    })
    
    if existing_price:
        # 如果已存在，则更新
        await price_collection.update_one(
            {"_id": existing_price["_id"]},
            {"$set": {"price": price.price, "daily_change": price.daily_change}}
        )
        existing_price["price"] = price.price
        existing_price["daily_change"] = price.daily_change
        existing_price["_id"] = str(existing_price["_id"])
        return existing_price
    
    # 如果不存在，则创建新记录
    result = await price_collection.insert_one(price.dict())
    
    created_price = await price_collection.find_one({"_id": result.inserted_id})
    created_price["_id"] = str(created_price["_id"])
    
    return created_price