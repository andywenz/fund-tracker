import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Tag, 
  Descriptions, 
  Button, 
  Divider, 
  Spin,
  Empty,
  message,
  Typography
} from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  RollbackOutlined,
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  LineChartOutlined,
  DollarOutlined,
  StarFilled
} from '@ant-design/icons';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import { Line } from '@ant-design/plots';
import moment from 'moment';

const { Title, Text } = Typography;

const FundDetail = () => {
  const { fundCode } = useParams();
  const navigate = useNavigate();
  const [fund, setFund] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(true);

  // 加载基金详情
  useEffect(() => {
    const fetchFundDetail = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/funds/code/${fundCode}`);
        setFund(response.data);
      } catch (error) {
        console.error('加载基金详情失败', error);
        message.error('加载基金详情失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchFundDetail();
  }, [fundCode]);

  // 加载价格历史
  useEffect(() => {
    const fetchPriceHistory = async () => {
      setPriceLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/funds/${fundCode}/prices`, {
          params: { days: 90 }
        });
        setPrices(response.data);
      } catch (error) {
        console.error('加载价格历史失败', error);
        message.error('加载价格历史失败，请稍后重试');
      } finally {
        setPriceLoading(false);
      }
    };

    if (fundCode) {
      fetchPriceHistory();
    }
  }, [fundCode]);

  // 处理返回按钮
  const handleBack = () => {
    navigate('/funds');
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

  // 渲染评级星星
  const renderRating = (rating) => {
    const stars = [];
    for (let i = 0; i < rating; i++) {
      stars.push(<StarFilled key={i} style={{ color: '#ffce3d', marginRight: 2 }} />);
    }
    return stars;
  };

  // 准备图表数据
  const chartData = prices.map(item => ({
    date: moment(item.date).format('YYYY-MM-DD'),
    value: item.price
  }));

  // 计算收益率
  const calculateReturn = (days) => {
    if (prices.length < 2) return null;
    
    const latestPrice = prices[prices.length - 1].price;
    const startIndex = prices.findIndex(p => 
      moment(p.date).isAfter(moment().subtract(days, 'days'))
    );
    
    if (startIndex === -1) return null;
    
    const startPrice = prices[startIndex].price;
    return ((latestPrice - startPrice) / startPrice * 100).toFixed(2);
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" tip="加载基金详情..." />
      </div>
    );
  }

  // 渲染基金不存在
  if (!fund) {
    return (
      <Empty
        description={`未找到基金代码为 ${fundCode} 的基金`}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" onClick={handleBack}>返回基金列表</Button>
      </Empty>
    );
  }

  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Button icon={<RollbackOutlined />} onClick={handleBack}>返回列表</Button>
          <Title level={2} style={{ display: 'inline-block', margin: '0 0 0 16px' }}>
            {fund.name} <Text type="secondary">{fund.code}</Text>
          </Title>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24} md={8} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="最新净值"
              value={latestPrice ? latestPrice.price : '-'}
              precision={4}
              suffix={latestPrice ? <Text type="secondary">{moment(latestPrice.date).format('YYYY-MM-DD')}</Text> : ''}
            />
            <div style={{ marginTop: 8 }}>
              {latestPrice && renderChange(latestPrice.daily_change)}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="跟踪指数"
              value={fund.tracking_index || '-'}
              valueStyle={{ fontSize: '18px' }}
            />
            <div style={{ marginTop: 8 }}>
              <Tag color="blue">指数基金</Tag>
              <Tag color={fund.tracking_error <= 1 ? 'green' : fund.tracking_error <= 2 ? 'orange' : 'red'}>
                跟踪误差: {fund.tracking_error.toFixed(2)}%
              </Tag>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="基金规模"
              value={fund.fund_size}
              precision={2}
              suffix="亿元"
            />
            <div style={{ marginTop: 8 }}>
              <Tag icon={<CalendarOutlined />} color="default">
                成立日期: {moment(fund.establishment_date).format('YYYY-MM-DD')}
              </Tag>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={24} md={24} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="晨星评级"
              value={" "}
              valueStyle={{ fontSize: '24px' }}
              prefix={renderRating(fund.rating)}
            />
            <div style={{ marginTop: 8 }}>
              <Tag icon={<TeamOutlined />} color="default">{fund.company}</Tag>
              <Tag icon={<UserOutlined />} color="default">
                {fund.manager} ({fund.experience_years.toFixed(1)}年)
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card 
            title={<span><LineChartOutlined /> 净值走势（90天）</span>}
            bordered={false}
            loading={priceLoading}
          >
            {chartData.length > 0 ? (
              <Line
                data={chartData}
                height={300}
                xField="date"
                yField="value"
                point={{
                  size: 3,
                  shape: 'circle',
                }}
                smooth
                meta={{
                  value: {
                    formatter: (v) => `${v.toFixed(4)}`,
                  },
                }}
              />
            ) : (
              <Empty description="暂无净值数据" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="近一周收益"
              value={calculateReturn(7) || '-'}
              precision={2}
              suffix="%"
              valueStyle={{ 
                color: calculateReturn(7) > 0 ? '#cf1322' : calculateReturn(7) < 0 ? '#3f8600' : 'inherit' 
              }}
              prefix={calculateReturn(7) > 0 ? <ArrowUpOutlined /> : calculateReturn(7) < 0 ? <ArrowDownOutlined /> : null}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="近一月收益"
              value={calculateReturn(30) || '-'}
              precision={2}
              suffix="%"
              valueStyle={{ 
                color: calculateReturn(30) > 0 ? '#cf1322' : calculateReturn(30) < 0 ? '#3f8600' : 'inherit' 
              }}
              prefix={calculateReturn(30) > 0 ? <ArrowUpOutlined /> : calculateReturn(30) < 0 ? <ArrowDownOutlined /> : null}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="近三月收益"
              value={calculateReturn(90) || '-'}
              precision={2}
              suffix="%"
              valueStyle={{ 
                color: calculateReturn(90) > 0 ? '#cf1322' : calculateReturn(90) < 0 ? '#3f8600' : 'inherit' 
              }}
              prefix={calculateReturn(90) > 0 ? <ArrowUpOutlined /> : calculateReturn(90) < 0 ? <ArrowDownOutlined /> : null}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="费率"
              value={fund.expense_ratio}
              precision={2}
              suffix="%"
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
      <Divider />
      
      <Descriptions title="基金详情" bordered column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
        <Descriptions.Item label="基金代码">{fund.code}</Descriptions.Item>
        <Descriptions.Item label="基金名称">{fund.name}</Descriptions.Item>
        <Descriptions.Item label="基金类型">指数基金</Descriptions.Item>
        <Descriptions.Item label="跟踪指数">{fund.tracking_index || '-'}</Descriptions.Item>
        <Descriptions.Item label="基金公司">{fund.company}</Descriptions.Item>
        <Descriptions.Item label="基金经理">{fund.manager}</Descriptions.Item>
        <Descriptions.Item label="从业年限">{fund.experience_years.toFixed(1)}年</Descriptions.Item>
        <Descriptions.Item label="基金规模">{fund.fund_size.toFixed(2)}亿元</Descriptions.Item>
        <Descriptions.Item label="成立日期">{moment(fund.establishment_date).format('YYYY-MM-DD')}</Descriptions.Item>
        <Descriptions.Item label="跟踪误差">{fund.tracking_error.toFixed(2)}%</Descriptions.Item>
        <Descriptions.Item label="管理费率">{fund.expense_ratio.toFixed(2)}%</Descriptions.Item>
        <Descriptions.Item label="晨星评级">{renderRating(fund.rating)}</Descriptions.Item>
      </Descriptions>
    </div>
  );
};

export default FundDetail;