import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Input, Button, Space, Tooltip, message } from 'antd';
import { 
  SyncOutlined, 
  StarOutlined, 
  StarFilled,
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  QuestionCircleOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

const { Search } = Input;

const FundList = ({ searchQuery = '' }) => {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(searchQuery);
  const navigate = useNavigate();

  // 加载基金数据
  const loadFunds = async (searchTerm = '') => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/funds`, {
        params: { search: searchTerm }
      });
      setFunds(response.data);
    } catch (error) {
      console.error('加载基金列表失败', error);
      message.error('加载基金列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和搜索词变化时重新加载
  useEffect(() => {
    setSearch(searchQuery);
    loadFunds(searchQuery);
  }, [searchQuery]);

  // 手动搜索
  const handleSearch = value => {
    setSearch(value);
    loadFunds(value);
  };

  // 点击行跳转到详情页
  const handleRowClick = (record) => {
    navigate(`/funds/${record.code}`);
  };

  // 渲染评级星星
  const renderRating = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        i < rating ? 
          <StarFilled key={i} style={{ color: '#ffce3d' }} /> : 
          <StarOutlined key={i} style={{ color: '#d9d9d9' }} />
      );
    }
    return <span>{stars}</span>;
  };

  // 渲染涨跌幅
  const renderChange = (change) => {
    if (change === null || change === undefined) return '-';
    
    const color = change > 0 ? '#f50' : change < 0 ? '#52c41a' : '';
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
      width: 120,
      fixed: 'left',
    },
    {
      title: '基金名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
    },
    {
      title: '跟踪指数',
      dataIndex: 'tracking_index',
      key: 'tracking_index',
      width: 180,
      render: (text) => text || '-',
    },
    {
      title: '最新净值',
      key: 'latest_price',
      width: 120,
      render: (_, record) => record.latest_price?.toFixed(4) || '-',
    },
    {
      title: '日涨跌幅',
      key: 'daily_change',
      width: 120,
      render: (_, record) => renderChange(record.daily_change),
    },
    {
      title: '基金规模(亿)',
      dataIndex: 'fund_size',
      key: 'fund_size',
      width: 120,
      render: (text) => text?.toFixed(2) || '-',
    },
    {
      title: '基金公司',
      dataIndex: 'company',
      key: 'company',
      width: 180,
    },
    {
      title: '跟踪误差',
      dataIndex: 'tracking_error',
      key: 'tracking_error',
      width: 120,
      render: (text) => {
        if (!text && text !== 0) return '-';
        const color = text <= 1 ? 'green' : text <= 2 ? 'orange' : 'red';
        return <Tag color={color}>{text.toFixed(2)}%</Tag>;
      },
    },
    {
      title: (
        <span>
          评级 
          <Tooltip title="基于晨星评级系统">
            <QuestionCircleOutlined style={{ marginLeft: 4 }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'rating',
      key: 'rating',
      width: 150,
      render: renderRating,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>基金列表</h2>
        <Space>
          <Search
            placeholder="搜索基金代码或名称"
            allowClear
            value={search}
            onChange={e => setSearch(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            loading={loading}
            onClick={() => loadFunds(search)}
          >
            刷新
          </Button>
        </Space>
      </div>
      
      <Table
        dataSource={funds}
        columns={columns}
        rowKey="_id"
        scroll={{ x: 1300 }}
        loading={loading}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          showTotal: total => `共 ${total} 只基金`
        }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' }
        })}
      />
    </div>
  );
};

export default FundList;