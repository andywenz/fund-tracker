import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Button, 
  Alert, 
  Spin, 
  Divider,
  Typography,
  Empty
} from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  ReloadOutlined,
  DashboardOutlined,
  FireOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import { Pie } from '@ant-design/plots';
import moment from 'moment';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 加载所有基金数据
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/funds`);
      
      // 获取最新价格数据
      const fundsWithPrices = await Promise.all(
        response.data.map(async (fund) => {
          try {
            const priceResponse = await axios.get(`${API_BASE_URL}/funds/${fund.code}/prices`, {
              params: { days: 30 }
            });
            
            const prices = priceResponse.data;
            const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;
            const monthAgoPrice = prices.length > 0 ? prices[0] : null;
            
            return {
              ...fund,
              latest_price: latestPrice?.price || null,
              daily_change: latestPrice?.daily_change || null,
              monthly_change: latestPrice && monthAgoPrice ? 
                ((latestPrice.price - monthAgoPrice.price) / monthAgoPrice.price * 100) : null
            };
          } catch (error) {
            console.error(`获取 ${fund.code} 价格失败`, error);
            return fund;
          }
        })
      );
      
      setFunds(fundsWithPrices);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('加载基金数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 计算总资产
  const getTotalAssets = () => {
    return funds.reduce((total, fund) => {
      return total + (fund.fund_size || 0);
    }, 0).toFixed(2);
  };

  // 获取平均跟踪误差
  const getAverageTrackingError = () => {
    const fundsWithError = funds.filter(fund => fund.tracking_error !== undefined && fund.tracking_error !== null);
    if (fundsWithError.length === 0) return null;
    
    const sum = fundsWithError.reduce((total, fund) => total + fund.tracking_error, 0);
    return (sum / fundsWithError.length).toFixed(2);
  };

  // 获取基金公司分布
  const getCompanyDistribution = () => {
    const companies = {};
    funds.forEach(fund => {
      if (fund.company) {
        companies[fund.company] = (companies[fund.company] || 0) + (fund.fund_size || 0);
      }
    });
    
    return Object.entries(companies).map(([company, size]) => ({
      type: company,
      value: size,
    })).sort((a, b) => b.value - a.value);
  };

  // 按日涨跌幅排序的表格数据
  const getSortedByDailyChange = () => {
    return [...funds]
      .filter(fund => fund.daily_change !== null && fund.daily_change !== undefined)
      .sort((a, b) => b.daily_change - a.daily_change);
  };

  // 按月涨跌幅排序的表格数据
  const getSortedByMonthlyChange = () => {
    return [...funds]
      .filter(fund => fund.monthly_change !== null && fund.monthly_change !== undefined)
      .sort((a, b) => b.monthly_change - a.monthly_change);
  };

  // 渲染涨跌幅
  const renderChange = (change) => {
    if (change === null || change === undefined) return '-';
    
    const color = change > 0 ? '#cf1322' : change < 0 ? '#3f8600' : '';
    const icon = change > 0 ? <ArrowUpOutlined /> : change < 0 ? <ArrowDownOutlined /> : null;
    
    return (
      <span style={{ color }}>
        {icon} {Math.abs(change).toFixed(2)}%
      </span>
    );
  };

  // 表格列定义
  const columns = [
    {
      title: '基金代码',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: '基金名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text, record) => (
        <a onClick={() => navigate(`/funds/${record.code}`)}>{text}</a>
      ),
    },
    {
      title: '最新净值',
      key: 'latest_price',
      width: 100,
      render: (_, record) => record.latest_price?.toFixed(4) || '-',
    },
    {
      title: '涨跌幅',
      key: 'change',
      width: 100,
      render: (_, record) => renderChange(record.daily_change),
    },
  ];

  const pieConfig = {
    appendPadding: 10,
    data: getCompanyDistribution(),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}',
    },
    interactions: [
      {
        type: 'pie-legend-active',
      },
      {
        type: 'element-active',
      },
    ],
  };

  if (loading && funds.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" tip="加载仪表盘数据..." />
      </div>
    );
  }

  const topGainers = getSortedByDailyChange().slice(0, 5);
  const topLosers = getSortedByDailyChange().slice(-5).reverse();
  const monthlyTopPerformers = getSortedByMonthlyChange().slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}><DashboardOutlined /> 基金仪表盘</Title>
        <div>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            loading={loading}
            onClick={loadData}
          >
            刷新数据
          </Button>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            {lastUpdated ? `最后更新: ${moment(lastUpdated).format('YYYY-MM-DD HH:mm:ss')}` : ''}
          </Text>
        </div>
      </div>

      {funds.length === 0 ? (
        <Empty description="暂无基金数据" />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card bordered={false}>
                <Statistic
                  title="跟踪基金数量"
                  value={funds.length}
                  suffix="只"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card bordered={false}>
                <Statistic
                  title="基金总规模"
                  value={getTotalAssets()}
                  precision={2}
                  suffix="亿元"
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} md={8}>
              <Card bordered={false}>
                <Statistic
                  title="平均跟踪误差"
                  value={getAverageTrackingError() || '-'}
                  suffix="%"
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={24} md={12}>
              <Card 
                title={<span><FireOutlined style={{ color: '#cf1322' }} /> 今日涨幅榜</span>} 
                bordered={false}
              >
                <Table 
                  dataSource={topGainers} 
                  columns={columns} 
                  pagination={false}
                  size="small"
                  rowKey="_id"
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Card 
                title={<span><FireOutlined style={{ color: '#3f8600' }} /> 今日跌幅榜</span>} 
                bordered={false}
              >
                <Table 
                  dataSource={topLosers} 
                  columns={columns} 
                  pagination={false}
                  size="small"
                  rowKey="_id"
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={24} md={12}>
              <Card 
                title={<span><TrophyOutlined style={{ color: '#faad14' }} /> 近30天表现最佳</span>} 
                bordered={false}
              >
                <Table 
                  dataSource={monthlyTopPerformers} 
                  columns={[
                    ...columns.slice(0, 3),
                    {
                      title: '30天涨跌幅',
                      key: 'monthly_change',
                      width: 120,
                      render: (_, record) => renderChange(record.monthly_change),
                    },
                  ]} 
                  pagination={false}
                  size="small"
                  rowKey="_id"
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Card 
                title="基金公司分布" 
                bordered={false}
              >
                {getCompanyDistribution().length > 0 ? (
                  <Pie {...pieConfig} height={240} />
                ) : (
                  <Empty description="暂无数据" />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Dashboard;