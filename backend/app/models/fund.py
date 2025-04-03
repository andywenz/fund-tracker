from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class FundBase(BaseModel):
    code: str
    name: str
    type: str = "指数基金"
    tracking_index: str
    fund_size: float  # 单位：亿元
    company: str
    manager: str
    experience_years: float
    tracking_error: float  # 跟踪误差率
    rating: int = Field(ge=1, le=5)  # 1-5星评级
    expense_ratio: float  # 费率
    establishment_date: datetime
    description: Optional[str] = None
    
class FundCreate(FundBase):
    pass

class FundUpdate(BaseModel):
    name: Optional[str] = None
    tracking_index: Optional[str] = None
    fund_size: Optional[float] = None
    company: Optional[str] = None
    manager: Optional[str] = None
    experience_years: Optional[float] = None
    tracking_error: Optional[float] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    expense_ratio: Optional[float] = None
    description: Optional[str] = None
    
class FundInDB(FundBase):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True

class FundPrice(BaseModel):
    fund_code: str
    date: datetime
    price: float
    daily_change: float  # 日涨跌幅
    
class FundPriceInDB(FundPrice):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True